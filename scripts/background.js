/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import ClientManager from "./client-manager.js";
import { MENU_SPEC } from "./menu-spec.js";
import GitHub from "./github.js";

const manager = new ClientManager(),
    MISSING_AUTH = '?',
    BASE = 10;

browser.notifications.onShown.addListener(() => {
    browser.runtime.sendMessage("@notification-sound", "new-notification");
});

//TODO open latest comment?

const updateBadge = async (count) => {
    const { disableBadge = false } = await browser.storage.local.get('disableBadge');
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
        text,
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
                when: handler.getNextCheckTime(),
            });
        }
    }
    else {
        globalThis.addEventListener('online', () => getNotifications(alarm), {
            once: true,
            capture: false,
            passive: true,
        });
    }
};

const setupNotificationWorker = (handler) => {
    browser.alarms.onAlarm.addListener(getNotifications);
    return getNotifications({
        name: handler.STORE_PREFIX,
    });
};

const setupNotificationWorkers = () => Promise.all(Array.from(manager.getClients(), setupNotificationWorker));

const openNotification = async (id) => {
    const handler = manager.getClientForNotificationID(id);
    const url = await handler.getNotificationURL(id);
    if(url) {
        const tab = await browser.tabs.create({
            url,
        });
        await browser.windows.update(tab.windowId, {
            focused: true,
        });
        if(await handler.willAutoMarkAsRead(id)) {
            await handler.markAsRead(id, false);
        }
        const newCount = await manager.getCount();
        await updateBadge(newCount);
    }
};
browser.notifications.onClicked.addListener(openNotification);

const needsAuth = () => {
    browser.browserAction.setPopup({
        popup: "",
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
            popup: browser.runtime.getURL('popup.html'),
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

/**
 * A runtime.onMessage handler that runs asynchronously, without sending a response.
 *
 * @param {any} message - Message from another part of the extension.
 * @returns {undefined}
 */
const handleMessage = async (message) => {
    switch(message.topic) {
    case "open-notification":
        await openNotification(message.notificationId);
        break;
    case "open-notifications": {
        const { footer } = await browser.storage.local.get({
            "footer": "all",
        });
        if(footer == "options") {
            await browser.runtime.openOptionsPage();
            break;
        }
        else if(footer in GitHub.FOOTER_URLS) {
            await browser.tabs.create({ url: GitHub.FOOTER_URLS[footer] });
            break;
        }
        throw new Error(`No matching footer action implemented for '${footer}'`);
    }
    case "mark-all-read":
        await Promise.all(Array.from(manager.getClients(), (handler) => handler.markAsRead()));
        await updateBadge('');
        break;
    case "mark-notification-read": {
        const handler = manager.getClientForNotificationID(message.notificationId);
        await handler.markAsRead(message.notificationId);
        const count = await manager.getCount();
        await updateBadge(count);
        break;
    }
    case "unsubscribe-notification": {
        const handler = manager.getClientForNotificationID(message.notificationId);
        await handler.unsubscribeNotification(message.notificationId);
        break;
    }
    case "ignore-notification": {
        const handler = manager.getClientForNotificationID(message.notificationId);
        await handler.ignoreNotification(message.notificationId);
        break;
    }
    case "logout": {
        const handler = manager.getClientById(message.handlerId);
        try {
            await handler.logout(true);
        }
        catch(error) {
            console.error(error);
        }
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
};

const handleStorageChange = async (changes) => {
    await browser.menus.update('badge', {
        type: 'checkbox',
        checked: !changes.disableBadge.newValue,
    });
    const [
        currentText,
        count,
    ] = await Promise.all([
        browser.browserAction.getBadgeText({}),
        manager.getCount(),
    ]);
    if(currentText === MISSING_AUTH) {
        await updateBadge();
    }
    else {
        await updateBadge(count);
    }
};

browser.runtime.onMessage.addListener((message) => {
    handleMessage(message).catch(console.error);
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
    const count = await manager.getInstances();
    if(count) {
        await setupNotificationWorkers();
    }
    else {
        needsAuth();
    }
};

browser.storage.onChanged.addListener((changes, area) => {
    if(area === 'local' && changes.disableBadge) {
        try {
            handleStorageChange(changes);
        }
        catch(error) {
            console.error(error);
        }
    }
});

browser.menus.onClicked.addListener(({
    menuItemId, checked,
}) => {
    if(menuItemId === 'badge') {
        browser.storage.local.set({
            disableBadge: !checked,
        });
    }
});

globalThis.requestIdleCallback(async () => {
    for(const [
        id,
        messageId,
    ] of Object.entries(MENU_SPEC)) {
        browser.menus.create({
            viewTypes: [ 'popup' ],
            documentUrlPatterns: [ browser.runtime.getURL('popup.html') ],
            id,
            title: browser.i18n.getMessage(messageId),
            enabled: false,
        });
    }
    const { disableBadge = false } = await browser.storage.local.get('disableBadge');
    browser.menus.create({
        contexts: [ 'browser_action' ],
        title: browser.i18n.getMessage('showBadge'),
        type: 'checkbox',
        id: 'badge',
        checked: !disableBadge,
    });
    if(navigator.onLine) {
        await init().catch(console.error);
    }
    else {
        // If we can't retrieve the accounts, wait for internet and try again.
        const records = await manager.getRecords().catch(() => [
            'foo',
            'bar',
        ]);
        if(records.length) {
            globalThis.addEventListener("online", () => {
                init().catch(console.error);
            }, {
                passive: true,
                capture: false,
                once: true,
            });
        }
        else {
            needsAuth();
        }
    }
});
