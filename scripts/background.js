/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* global GitHub, ClientManager */
const manager = new ClientManager(),
    BASE = 10;

//TODO migrate existing crap.

browser.notifications.onShown.addListener(() => {
    browser.runtime.sendMessage("@notification-sound", "new-notification");
});

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
        for(const handler of manager.getClients()) {
            const update = await handler.check();
            if(update) {
                updateBadge(await manager.getCount());
            }
            browser.alarms.create({
                when: handler.getNextCheckTime()
            });
        }
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
    const handler = manager.getClientForNotificationID(id);
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
        //TODO
        manager.login()
            .then(() => {
                browser.browserAction.setPopup({ popup: browser.extension.getURL("popup.html") });
                browser.runtime.sendMessage({ topic: "login" });
                return setupNotificationWorker();
            })
            .catch(console.error);
    });
};

//TODO logout is not such a simple operation anymore with multiple accounts.
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
                throw new Error(`No matching footer action implemented for '${footer}'`);
            })
            .catch(console.error);
        break;
    case "mark-all-read":
        Promise.all(Array.from(manager.getClients(), (handler) => handler.markAsRead()))
            .then(() => updateBadge([]))
            .catch((e) => console.error(e));
        break;
    case "mark-notification-read": {
        const handler = manager.getClientForNotificationID(message.notificationId);
        handler.markAsRead(message.notificationId)
            .then(() => manager.getCount())
            .then(updateBadge)
            .catch((e) => console.error(e));
        break;
    }
    case "unsubscribe-notification": {
        const handler = manager.getClientForNotificationID(message.notificationId);
        handler.unsubscribeNotification(message.notificationId).catch(console.error);
        break;
    }
    case "ignore-notification": {
        const handler = manager.getClientForNotificationID(message.notificationId);
        handler.ignoreNotification(message.notificationId).catch(console.error);
        break;
    }
    case "logout":
        clearToken().catch(console.error);
        break;
    default:
    }
});

const init = async () => {
    const count = await manager.loadClients();
    if(!count) {
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
