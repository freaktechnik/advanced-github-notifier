/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* global GitHub, clientId, clientSecret */

let updating = false;

const github = new GitHub(clientId, clientSecret);

//TODO open latest comment?

const getNotificationIcon = (notification) => {
    if(notification.subject.type == "Issue") {
        return `images/issue-${notification.subjectDetails.state}.`;
    }
    else if(notification.subject.type == "PullRequest") {
        if(notification.subjectDetails.merged) {
            return "images/pull-merged.";
        }
        else {
            return `images/pull-${notification.subjectDetails.state}.`;
        }
    }
    // It's a commit
    else {
        return "images/comment.";
    }
};

const updateBadge = (notifArray) => {
    let text = "?";
    if(Array.isArray(notifArray)) {
        text = notifArray.length > 0 ? notifArray.length.toString() : "";
    }

    browser.browserAction.setBadgeText({
        text
    });
};

const processNewNotifications = async (json) => {
    updating = true;
    const { notifications = [], hide } = await browser.storage.local.get([
        "notifications",
        "hide"
    ]);
    const stillNotificationIds = [];
    let notifs = await Promise.all(json.filter((n) => n.unread).map(async (notification) => {
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
            try {
                const details = await github.getNotificationDetails(notification);
                notification.subjectDetails = details;
                notification.icon = getNotificationIcon(notification);
            }
            catch(e) {
                return null;
            }
        }
        if(notification.new) {
            if(!hide) {
                await browser.notifications.create(notification.id, {
                    type: "basic",
                    title: notification.subject.title,
                    message: notification.repository.full_name,
                    eventTime: Date.parse(notification.updated_at),
                    iconUrl: notification.icon + "png"
                });
            }
            browser.runtime.sendMessage({
                topic: "new-notification",
                notification
            });
        }
        return notification;
    }));
    notifs = notifs.filter((n) => n !== null);

    notifications.filter((n) => !stillNotificationIds.includes(n.id)).forEach((notification) => {
        browser.runtime.sendMessage({
            topic: "notification-read",
            notificationId: notification.id
        });
    });

    updateBadge(notifs);
    updating = false;
    return browser.storage.local.set({
        notifications: notifs
    });
};

const markNotificationAsRead = async (notificationId) => {
    if(!updating) {
        const { notifications = [] } = await browser.storage.local.get("notifications");
        const notifs = notifications.filter((notification) => notification.id != notificationId);
        updateBadge(notifs);
        await browser.storage.local.set({ notifs });
    }
};

const getNotifications = async () => {
    if(navigator.onLine) {
        const result = await github.getNotifications();
        if(result) {
            await processNewNotifications(result);
        }

        browser.alarms.create({
            when: Date.now() + (github.pollInterval * 1000)
        });
    }
    else {
        window.addEventListener('online', getNotifications, {
            once: true,
            capturing: false,
            passive: true
        });
    }
};

const setupNotificationWorker = () => {
    browser.alarms.onAlarm.addListener(getNotifications);
    return getNotifications();
};

const openNotification = async (id) => {
    const { notifications } = await browser.storage.local.get("notifications");
    const notification = notifications.find((n) => n.id == id);
    if(notification) {
        const tab = await browser.tabs.create({
            url: notification.subjectDetails.html_url
        });
        await browser.windows.update(tab.windowId, {
            focused: true
        });
        await markNotificationAsRead(id);
    }
};
browser.notifications.onClicked.addListener(openNotification);

const needsAuth = () => {
    browser.browserAction.setPopup({ popup: "" });
    updateBadge();
    const authState = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16);
    browser.browserAction.onClicked.addListener(function authListener() {
        browser.identity.launchWebAuthFlow({
            url: github.authURL(authState),
            interactive: true
        }).then((rawURL) => {
            const url = new URL(rawURL);
            if(!url.searchParams.has("error") && url.searchParams.has("code") &&
                url.searchParams.get("state") == authState) {
                return github.getToken(url.searchParams.get('code'), authState);
            }
            else {
                throw `An error occurred during authorization: ${url.searchParams.get("error_description")}. See ${url.searchParams.get("error_uri")}`;
            }
        }).then((token) => {
            browser.browserAction.onClicked.removeListener(authListener);
            return browser.storage.local.set({ token });
        }, (e) => {
            if(typeof e == "string" && e.startsWith("An error occurred during auth")) {
                throw e;
            }
            throw "Was not granted required permissions";
        }).then(() => {
            browser.browserAction.setPopup({ popup: browser.extension.getURL("popup.html") });
            browser.runtime.sendMessage({ topic: "login" });
            return setupNotificationWorker();
        }).catch(console.error);
    });
};

const clearToken = () => {
    return browser.storage.local.set({
        token: "",
        notifications: []
    }).then(() => needsAuth());
};

browser.runtime.onMessage.addListener((message) => {
    if(message.topic === "open-notification") {
        openNotification(message.notificationId).catch((e) => console.error(e));
    }
    else if(message.topic === "open-notifications") {
        browser.tabs.create({ url: GitHub.ALL_NOTIFS_URL });
    }
    else if(message.topic === "mark-all-read") {
        github.markNotificationsRead().then((result) => {
            if(result) {
                updateBadge([]);
                return browser.storage.local.set({ notifications: [] });
            }
        }).catch((e) => console.error(e));
    }
    else if(message.topic === "mark-notification-read") {
        github.makrNotificationRead(message.notificationId).then(() => {
            return markNotificationAsRead(message.notificationId);
        }).catch((e) => console.error(e));
    }
    else if(message.topic == "logout") {
        browser.storage.local.get("token").then(({ token }) => {
            return github.authorize(token, "DELETE");
        }).then((response) => {
            return clearToken();
        }).catch((e) => console.error(e));
    }
});

const init = async () => {
    const { token } = await browser.storage.local.get("token");
    if(!token) {
        needsAuth();
    }
    else {
        try {
            await github.authorize(token);
            await setupNotificationWorker();
        }
        catch(e) {
            await github.authorize(token, "DELETE");
            throw "Scopes removed";
        }
    }
};

if(navigator.onLine) {
    init().catch((e) => {
        clearToken();
        console.error(e);
    });
}
else {
    window.addEventListener("online", () => {
        init().catch((e) => {
            clearToken();
            console.error(e);
        });
    }, {
        passive: true,
        capturing: false,
        once: true
    });
}
