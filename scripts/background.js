const clientId = "",
    clientSecret = "",
    redirectUri = "";
let authState;

//TODO pagination

const startAuthListener = () => {
    authState = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
    browser.tabs.create({
        url: `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=notifications&state=${authState}&redirect_uri=${redirectUri}`
    });
};

const processNewNotifications = (json) => {
    return browser.storage.local.get("notifications").then(({ notifications = [] }) => {
        let stillNotificationIds = [];
        for(let notification of json) {
            stillNotificationIds.push(notification.id);
            if(!notifications.find((n) => n.id == notification.id)) {
                browser.notifications.create(notification.id, {
                    type: "basic",
                    title: notification.subject.title,
                    message: notification.repository.full_name,
                    eventTime: Date.parse(notification.updated_at),
                    iconUrl: browser.extension.getURL("images/github.svg")
                });
                browser.runtime.sendMessage({
                    topic: "new-notification",
                    notification
                });
            }
        }

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
            notifications: json
        });
    });
};

let headers = {
    Accept: "application/vnd.github.v3+json"
},
pollInterval = 60;
const getNotifications = () => {
    fetch("https://api.github.com/notifications", {
        headers
    }).then((response) => {
        let p = Promise.resolve();
        if(response.ok) {
            pollInterval = response.headers.get("X-Poll-Interval");
            // LastModified should be handled by the browser

            if(response.status === 200) {
                p = response.json().then(processNewNotifications);
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
            const apiEndpoint = notification.subject.latest_comment_url || notification.subject.url;
            return fetch(apiEndpoint, {
                headers
            }).then((response) => {
                if(response.ok) {
                    return response.json();
                }
                else {
                    throw response.status;
                }
            }).then((json) => {
                return browser.tabs.create({ url: json.html_url });
            });
        }
    });
};

browser.notifications.onClicked.addListener(openNotification);
browser.runtime.onMessage.addListener((message) => {
    if(message.topic === "open-notification") {
        openNotification(message.notificationId);
    }
    else if(message.topic === "open-notifications") {
        browser.tabs.create({ url: "https://github.com/notifications" });
    }
});

const needsAuth = () => {
    browser.browserAction.setPopup({ popup: "" });
    browser.browserAction.onClicked.addListener(startAuthListener);
    browser.webNavigation.onCommitted.addListener((details) => {
        const url = new URL(details.url);
        if(!url.searchParams.has("error") && url.searchParams.has("code")
            && url.searchParams.get("state") == authState) {

            const params = new URLSearchParams();
            params.append("client_id", clientId);
            params.append("client_secret", clientSecret);
            params.append("code", url.searchParams.get("code"));
            params.append("redirect_uri", redirectUri);
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
            hostEquals: "humanoids.be",
            pathEquals: "/github-auth",
            schemes: ["https"]
        }]
    });
};

browser.storage.local.get("token").then((result) => {
    if(!result.token) {
        needsAuth();
    }
    else {
        fetch(`https://api.github.com/applications/${clientId}/tokens/${result.token}`, {
            headers: {
                Authorization: `Basic ${window.btoa(clientId+":"+clientSecret)}`,
                Accept: "application/vnd.github.damage-preview"
            }
        }).then((response) => {
            if(response.status === 200) {
                setupNotificationWorker(result.token);
            }
            else {
                return browser.storage.local.set({
                    token: ""
                }).then(() => needsAuth());
            }
        }).catch((e) => console.error(e));
    }
});
