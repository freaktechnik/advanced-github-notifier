/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* global GitHub, ClientManager, MENU_SPEC */
const manager = new ClientManager(),
    MISSING_AUTH = '?',
    BASE = 10;

browser.notifications.onShown.addListener(() => {
    browser.runtime.sendMessage("@notification-sound", "new-notification");
});

//TODO open latest comment?

const updateBadge = async (count) => {
    const { disableBadge = false } = browser.storage.local.get('disableBadge');
    let text = MISSING_AUTH;
    if(count !== undefined) {
        if(disableBadge) {
            text = "";
        }
        else {
            text = count ? count.toString(BASE) : "";
        }
    }

    return browser.browserAction.setBadgeText({
        text
    });
};

const getNotifications = async (alarm) => {
    if(navigator.onLine) {
        const handler = manager.getClientById(alarm.name);
        try {
            const update = await handler.check();
            if(update) {
                await updateBadge(await manager.getCount());
            }
        }
        catch(error) {
            console.error(error);
        }
        finally {
            browser.alarms.create(handler.STORE_PREFIX, {
                when: handler.getNextCheckTime()
            });
        }
    }
    else {
        window.addEventListener('online', () => getNotifications(alarm), {
            once: true,
            capture: false,
            passive: true
        });
    }
};

const setupNotificationWorker = (handler) => {
    browser.alarms.onAlarm.addListener(getNotifications);
    return getNotifications({
        name: handler.STORE_PREFIX
    });
};

const setupNotificationWorkers = () => Promise.all(Array.from(manager.getClients(), setupNotificationWorker));

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
        const newCount = await manager.getCount();
        await updateBadge(newCount);
    }
};
browser.notifications.onClicked.addListener(openNotification);

const needsAuth = () => {
    browser.browserAction.setPopup({
        popup: ""
    });
    updateBadge();
    browser.browserAction.onClicked.addListener(() => {
        browser.runtime.openOptionsPage();
    });
};

const afterAdd = async (handler) => {
    setupNotificationWorker(handler);

    const popupURL = await browser.browserAction.getPopup({});
    if(popupURL === "") {
        browser.browserAction.setPopup({
            popup: browser.extension.getURL('popup.html')
        });
        await updateBadge();
    }
};

const createHandler = async (type, details) => {
    const handler = await ClientManager.createClient(type, undefined, details);
    if(await handler.login()) {
        manager.addClient(handler);
        await afterAdd(handler);
    }
};

browser.runtime.onMessage.addListener((message) => {
    switch(message.topic) {
    case "open-notification":
        openNotification(message.notificationId).catch((error) => console.error(error));
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
            .then(() => updateBadge(''))
            .catch((error) => console.error(error));
        break;
    case "mark-notification-read": {
        const handler = manager.getClientForNotificationID(message.notificationId);
        handler.markAsRead(message.notificationId)
            .then(() => manager.getCount())
            .then(updateBadge)
            .catch((error) => console.error(error));
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
    case "logout": {
        const handler = manager.getClientById(message.handlerId);
        handler.logout().catch(console.error);
        manager.removeClient(handler);
        if(!manager.clients.size) {
            needsAuth();
        }
        break;
    }
    case "login":
        return createHandler(message.type, message.details);
    default:
    }
});

browser.runtime.onInstalled.addListener(async (details) => {
    if(details.reason === "update") {
        const { token } = await browser.storage.local.get("token");
        if(token) {
            const handler = ClientManager.createClient(ClientManager.GITHUB);
            await handler.setValue("token", token);
            const authValid = await handler.checkAuth();
            if(authValid) {
                manager.addClient(handler);
                await afterAdd(handler);
            }

            await browser.storage.local.remove("token");
        }
    }
});

const init = async () => {
    browser.storage.onChanged.addListener((changes, area) => {
        if(area === 'local' && changes.disableBadge) {
            browser.menus.update('badge', {
                checked: !changes.disableBadge.newValue
            })
                .catch(console.error);
            Promise.all([
                browser.browserAction.getBadgeText(),
                manager.getCount()
            ])
                .then(([
                    currentText,
                    count
                ]) => {
                    if(currentText === MISSING_AUTH) {
                        return updateBadge();
                    }
                    return updateBadge(count);
                })
                .catch(console.error);
        }
    });
    browser.menus.onClicked.addListener(({ menuItemId, checked }) => {
        if(menuItemId === 'badge') {
            browser.storage.local.set({
                disableBadge: !checked
            });
        }
    });
    const count = await manager.getInstances();
    if(!count) {
        needsAuth();
    }
    else {
        await setupNotificationWorkers();
    }
};

window.requestIdleCallback(async () => {
    for(const [
        id,
        messageId
    ] of Object.entries(MENU_SPEC)) {
        browser.menus.create({
            viewTypes: [ 'popup' ],
            documentUrlPatterns: [ browser.runtime.getURL('popup.html') ],
            id,
            title: browser.i18n.getMessage(messageId),
            enabled: false
        });
    }
    const { disableBadge = false } = await browser.storage.local.get('disableBadge');
    browser.menus.create({
        contexts: [ 'browser_action' ],
        title: browser.i18n.getMessage('showBadge'),
        type: 'checkbox',
        id: 'badge',
        checked: !disableBadge
    });
    if(navigator.onLine) {
        await init().catch(console.error);
    }
    else {
        // If we can't retrieve the accounts, wait for internet and try again.
        const records = await manager.getRecords().catch(() => [
            'foo',
            'bar'
        ]);
        if(!records.length) {
            needsAuth();
        }
        else {
            window.addEventListener("online", () => {
                init().catch(console.error);
            }, {
                passive: true,
                capture: false,
                once: true
            });
        }
    }
});
