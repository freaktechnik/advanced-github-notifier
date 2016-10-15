let authState;
let lastUpdate;

//TODO pagination
//TODO check scopes after every request?

const startAuthListener = () => {
    authState = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
    browser.tabs.create({
        url: `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=notifications&state=${authState}&redirect_uri=${redirectUri.toString()}`
    });
};

const getNotificationDetails = (notification) => {
    const apiEndpoint = notification.subject.url;
    return fetch(apiEndpoint, {
        headers
    }).then((response) => {
        if(response.ok) {
            return response.json();
        }
        else {
            throw response.status;
        }
    });
};

const getNotificationIcon = (notification) => {
    if(notification.subject.type == "Issue") {
        return `images/issue-${notification.subjectDetails.state}.svg`;
    }
    else if(notification.subject.type == "PullRequest") {
        if(notification.subjectDetails.merged) {
            return "images/pull-merged.svg";
        }
        else {
            return `images/pull-${notification.subjectDetails.state}.svg`;
        }
    }
    // It's a commit
    else {
        return "images/comment.svg";
    }
};

const processNewNotifications = (json) => {
    return browser.storage.local.get("notifications").then(({ notifications = [] }) => {
        const stillNotificationIds = [];
        return Promise.all(json.filter((n) => n.unread).map((notification) => {
            stillNotificationIds.push(notification.id);
            let fetchDetails = false;
            const existingNotif = notifications.find((n) => n.id == notification.id);
            if(!existingNotif) {
                notification.new = true;
                fetchDetails = true;
            }
            else if(existingNotif.updated_at != notification.updated_at) {
                fetchDetails = true;
            }
            else {
                notification.subjectDetails = existingNotif.subjectDetails;
                notification.icon = existingNotif.icon;
            }

            if(fetchDetails) {
                return getNotificationDetails(notification).then((details) => {
                    notification.subjectDetails = details;
                    notification.icon = getNotificationIcon(notification);
                    return notification;
                });
            }
            return Promise.resolve(notification);
        })).then((notifs) => {
            notifs.forEach((notification) => {
                if(notification.new) {
                    browser.notifications.create(notification.id, {
                        type: "basic",
                        title: notification.subject.title,
                        message: notification.repository.full_name,
                        eventTime: Date.parse(notification.updated_at),
                        iconUrl: notification.icon
                    });
                    browser.runtime.sendMessage({
                        topic: "new-notification",
                        notification
                    });
                }
            });

            notifications.filter((n) => !stillNotificationIds.includes(n.id)).forEach((notification) => {
                browser.runtime.sendMessage({
                    topic: "notification-read",
                    notificationId: notification.id
                });
            });

            browser.browserAction.setBadgeText({
                text: stillNotificationIds.length > 0 ? stillNotificationIds.length.toString() : ""
            });
            return browser.storage.local.set({
                notifications: notifs
            });
        });
    });
};

let headers = {
        Accept: "application/vnd.github.v3+json"
    },
    pollInterval = 60,
    forceRefresh = false;
const getNotifications = () => {
    fetch("https://api.github.com/notifications", {
        headers,
        cache: forceRefresh ? "reload" : "no-cache"
    }).then((response) => {
        let p = Promise.resolve(false);
        if(response.ok) {
            pollInterval = Math.max(response.headers.get("X-Poll-Interval"), Math.ceil((response.headers.get("X-RateLimit-Reset") - Math.floor(Date.now() / 1000)) / response.headers.get("X-RateLimit-Remaining")));

            const now = new Date();
            lastUpdate = now.toISOString();

            if(response.status === 200) {
                p = response.json().then((json) => {
                    forceRefresh = json.length > 0;
                    return processNewNotifications(json);
                });
            }
        }
        else {
            p = Promise.reject(`${response.status} ${response.statusText}`)
        }

        browser.alarms.create({
            when: Date.now() + (pollInterval * 1000)
        });
        return p;
    }).catch((e) => console.error(e));
};

const setupNotificationWorker = (token) => {
    headers.Authorization = `token ${token}`;
    browser.alarms.onAlarm.addListener(getNotifications);
    getNotifications();
};

const openNotification = (id) => {
    browser.storage.local.get("notifications").then(({ notifications }) => {
        const notification = notifications.find((n) => n.id == id);
        if(notification) {
            return browser.tabs.create({ url: notification.subjectDetails.html_url });
        }
    });
};

browser.notifications.onClicked.addListener(openNotification);
browser.runtime.onMessage.addListener((message) => {
    if(message.topic === "open-notification") {
        openNotification(message.notificationId).catch((e) => console.error(e));
    }
    else if(message.topic === "open-notifications") {
        browser.tabs.create({ url: "https://github.com/notifications" });
    }
    else if(message.topic === "mark-all-read") {
        if(lastUpdate) {
            const body = JSON.stringify({"last_read_at": lastUpdate});
            fetch("https://api.github.com/notifications", {
                headers,
                method: "PUT",
                body
            }).catch((e) => console.error(e));
            //TODO mark all as read on the client side on success.
        }
    }
    else if(message.topic === "mark-notification-read") {
        fetch(`https://api.github.com/notifications/threads/${message.notificationId}`, {
            method: "PATCH"
        }).then((response) => {
            if(response.ok) {
                browser.runtime.sendMessage({
                    target: "notification-read",
                    notificationId: message.notificationId
                });
            }
        }).catch((e) => console.error(e));
    }
});

const needsAuth = () => {
    browser.browserAction.setPopup({ popup: "" });
    browser.browserAction.setBadgeText({
        text: "?"
    });
    browser.browserAction.onClicked.addListener(startAuthListener);
    browser.webNavigation.onCommitted.addListener((details) => {
        const url = new URL(details.url);
        if(!url.searchParams.has("error") && url.searchParams.has("code")
            && url.searchParams.get("state") == authState) {

            const params = new URLSearchParams();
            params.append("client_id", clientId);
            params.append("client_secret", clientSecret);
            params.append("code", url.searchParams.get("code"));
            params.append("redirect_uri", redirectUri.toString());
            params.append("state", authState);

            fetch("https://github.com/login/oauth/access_token", {
                method: "POST",
                body: params,
                headers: {
                    "Accept": "application/json"
                }
            }).then((response) => {
                if(response.ok) {
                    return response.json();
                }
                else {
                    throw response;
                }
            }).then((json) => {
                if(json.scope.includes("notifications")) {
                    browser.browserAction.onClicked.removeListener(startAuthListener);
                    setupNotificationWorker(json.access_token);
                    return Promise.all([
                        browser.storage.local.set({
                            token: json.access_token
                        }),
                        browser.tabs.remove(details.tabId)
                    ]);
                }
                else {
                    throw "Was not granted required permissions";
                }
            }).then(() => {
                browser.browserAction.setPopup({ popup: browser.extension.getURL("popup.html") });
            }).catch((e) => console.error(e));
        }
        else {
            console.error("An error occurred during authorization");
        }
    }, {
        url: [{
            hostEquals: redirectUri.hostname,
            pathEquals: redirectUri.pathname,
            schemes: [ redirectUri.protocol.substr(0, redirectUri.protocol.length - 1) ]
        }]
    });
};

const clearToken = () => {
    browser.storage.local.set({
        token: ""
    }).then(() => needsAuth());
};

browser.storage.local.get("token").then((result) => {
    if(!result.token) {
        needsAuth();
    }
    else {
        return fetch(`https://api.github.com/applications/${clientId}/tokens/${result.token}`, {
            headers: {
                Authorization: `Basic ${window.btoa(clientId+":"+clientSecret)}`
            }
        }).then((response) => {
            if(response.status === 200) {
                setupNotificationWorker(result.token);
            }
            else {
                return clearToken();
            }
        }, clearToken);
    }
}).catch((e) => console.error(e));
