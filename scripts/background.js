/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* global GitHub, clientId, clientSecret, ClientHandler, ClientManager */
const github = new GitHub(clientId, clientSecret),
    handler = new ClientHandler(github),
    manager = new ClientManager(),
    BASE = 10;

manager.addClient(handler);

//TODO open latest comment?

const updateBadge = (count) => {
    let text = "?";
    if(count !== undefined) {
        text = count ? count.toString(BASE) : "";
    }

    browser.browserAction.setBadgeText({
        text
    });
};

const getNotifications = async () => {
    if(navigator.onLine) {
        const update = await handler.check();
        if(update) {
            updateBadge(await manager.getCount());
        }
        browser.alarms.create({
            when: handler.getNextCheckTime()
        });
    }
    else {
        window.addEventListener('online', getNotifications, {
            once: true,
            capture: false,
            passive: true
        });
    }
};

const setupNotificationWorker = () => {
    browser.alarms.onAlarm.addListener(getNotifications);
    return getNotifications();
};

const openNotification = async (id) => {
    const url = await handler.getNotificationURL(id);
    if(url) {
        const tab = await browser.tabs.create({
            url
        });
        await browser.windows.update(tab.windowId, {
            focused: true
        });
        await handler.markAsRead(id, false);
    }
};
browser.notifications.onClicked.addListener(openNotification);

const needsAuth = () => {
    browser.browserAction.setPopup({ popup: "" });
    updateBadge();
    browser.browserAction.onClicked.addListener(() => {
        handler.login()
            .then(() => {
                browser.browserAction.setPopup({ popup: browser.extension.getURL("popup.html") });
                browser.runtime.sendMessage({ topic: "login" });
                return setupNotificationWorker();
            })
            .catch(console.error);
    });
};

const clearToken = () => handler.logout().then(() => needsAuth());

browser.runtime.onMessage.addListener((message) => {
    switch(message.topic) {
    case "open-notification":
        openNotification(message.notificationId).catch((e) => console.error(e));
        break;
    case "open-notifications":
        browser.storage.local.get({
            "footer": "all"
        })
            .then(({ footer }) => {
                if(footer == "options") {
                    return browser.runtime.openOptionsPage();
                }
                else if(footer in GitHub.FOOTER_URLS) {
                    return browser.tabs.create({ url: GitHub.FOOTER_URLS[footer] });
                }
            })
            .catch(console.error);
        break;
    case "mark-all-read":
        handler.markAsRead()
            .then(() => {
                updateBadge([]);
            })
            .catch((e) => console.error(e));
        break;
    case "mark-notification-read":
        handler.markAsRead(message.notificationId)
            .then(() => manager.getCount())
            .then((count) => {
                updateBadge(count);
            })
            .catch((e) => console.error(e));
        break;
    case "unsubscribe-notification":
        handler.unsubscribeNotification(message.notificationId).catch(console.error);
        break;
    case "ignore-notification":
        handler.ignoreNotification(message.notificationId).catch(console.error);
        break;
    case "logout":
        clearToken().catch(console.error);
        break;
    default:
    }
});

const init = async () => {
    const token = await handler.checkAuth();
    if(!token) {
        needsAuth();
    }
    else {
        await setupNotificationWorker();
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
        capture: false,
        once: true
    });
}
