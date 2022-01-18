/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/* global MENU_SPEC */

const loaded = new Promise((resolve) => {
    window.addEventListener("DOMContentLoaded", resolve, {
        capture: true,
        passive: true,
        once: true
    });
});
const idPrefix = "ghnotif";
const formatter = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
});
const HAS_INSTANCE_URL = new Set([
        'enterprise',
        'enterprise-pat',
        'gitlab',
        'gitea'
    ]),
    SINGLE_ACCOUNT = 1;

const clickListener = (id) => {
    browser.runtime.sendMessage({
        topic: "open-notification",
        notificationId: id
    });
    window.close();
};

const contextMenu = {
    items: Object.keys(MENU_SPEC),
    menuId: 0,
    areVisible: undefined,
    init() {
        //TODO maybe one can toggle shown/hidden from a contextmenu event, i.e. it's early enough?
        browser.menus.onClicked.addListener(({
            menuItemId,
            targetElementId
        }) => {
            const target = this.getTarget(targetElementId);
            this[menuItemId](target);
        });
        browser.menus.onShown.addListener(({ targetElementId }) => {
            const notificationId = this.getTarget(targetElementId),
                isNotification = notificationId !== undefined,
                { menuId } = this;
            let canUnsubscribe = false,
                canIgnore = false;
            if(isNotification) {
                const notifElement = document.getElementById(`${idPrefix}${notificationId}`);
                canUnsubscribe = notifElement.dataset.canUnsubscribe == "true";
                canIgnore = notifElement.dataset.canIgnore == "true";
            }
            if(this.areVisible !== isNotification || isNotification) {
                Promise.all(this.items.map((id) => {
                    let enabled = isNotification;
                    if(id == "unsubscribe") {
                        enabled &&= canUnsubscribe;
                    }
                    if(id == "ignore") {
                        enabled &&= canIgnore;
                    }
                    return browser.menus.update(id, {
                        enabled
                    });
                }))
                    .then(() => {
                        if(menuId === this.menuId) {
                            browser.menus.refresh();
                        }
                    })
                    .catch(console.error);
                this.areVisible = isNotification;
            }
        });
        browser.menus.onHidden.addListener(() => {
            ++this.menuId;
        });
    },
    getTarget(targetElementId) {
        let target = browser.menus.getTargetElement(targetElementId);
        if(!target.tagName.toLowerCase() !== 'li') {
            target = target.closest('li');
        }
        if(target != undefined && target.classList.contains('panel-list-item')) {
            return target.id.slice(idPrefix.length);
        }
    },
    open() {
        browser.menus.overrideContext({
            showDefaults: true
        });
    },
    markAsRead(notificationId) {
        browser.runtime.sendMessage({
            topic: "mark-notification-read",
            notificationId
        });
    },
    unsubscribe(notificationId) {
        browser.runtime.sendMessage({
            topic: "unsubscribe-notification",
            notificationId
        });
    },
    ignore(notificationId) {
        browser.runtime.sendMessage({
            topic: "ignore-notification",
            notificationId
        });
    }
};

const notificationList = {
    IMAGE_SIZE: 16,
    root: undefined,
    markRead: undefined,
    init() {
        this.root = document.getElementById("notifications");
        this.markRead = document.getElementById("mark-read");
        this.markRead.addEventListener("click", () => {
            //TODO only mark current account as read
            if(!this.markRead.classList.contains("disabled")) {
                browser.runtime.sendMessage({ topic: "mark-all-read" });
            }
        }, {
            capture: false,
            passive: true
        });
    },
    toggleEmpty(state) {
        this.root.hidden = state;
        document.getElementById("empty").hidden = !state;
        this.markRead.classList.toggle("disabled", state);
    },
    create(notification, singleAccount = false) {
        const root = document.createElement("li");
        root.id = idPrefix + notification.id;
        root.dataset.canUnsubscribe = notification.subjectDetails.canUnsubscribe ?? true;
        root.dataset.canIgnore = notification.subjectDetails.canIgnore ?? true;
        root.classList.add("panel-list-item");
        const date = new Date(notification.updated_at);
        let typeMessage = browser.i18n.getMessage(`type_${notification.normalizedType}`);
        if([
            "issue",
            "pull"
        ].includes(notification.normalizedType)) {
            const prefix = notification.subjectDetails.prefix ?? '#';
            typeMessage += ` ${prefix}${notification.subjectDetails.number}`;
        }
        let stateMessage = '';
        if(notification.detailState) {
            const stateMessageId = `status_${notification.detailState}`;
            stateMessage = ` (${browser.i18n.getMessage(stateMessageId)})`;
        }
        let accountInfo = '';
        if(!singleAccount) {
            //TODO should use accountselector instance
            const account = document.querySelector(`[value=${CSS.escape(notification.accountId)}]`);
            accountInfo = ` - ${account.textContent}`;
        }
        root.title = `${typeMessage}${stateMessage}${accountInfo} ${formatter.format(date)}`;

        const image = new Image(this.IMAGE_SIZE, this.IMAGE_SIZE);
        image.src = `images/small/${notification.icon}svg`;
        image.classList.add("icon");

        const title = document.createElement("span");
        title.classList.add("text");
        title.textContent = notification.subject.title;

        root.append(image, title);
        if(notification.repository) {
            const repo = document.createElement("span");
            repo.classList.add("text-shortcut");
            repo.textContent = notification.repository.full_name;
            root.append(repo);
        }

        root.addEventListener("click", () => clickListener(notification.id), {
            passive: true
        });
        root.addEventListener("contextmenu", () => contextMenu.open(), {
            passive: true
        });
        this.root.append(root);

        this.toggleEmpty(false);
    },
    delete(notificationId) {
        const root = document.getElementById(idPrefix + notificationId);
        if(root) {
            root.remove();
        }
        if(!parent.childElementCount) {
            this.toggleEmpty(true);
        }
    },
    clear() {
        while(this.root.hasChildNodes()) {
            this.root.firstChild.remove();
        }
    },
    async show(stores = []) {
        const storedNotifications = await browser.storage.local.get(stores);

        this.clear();

        const notifications = Object.entries(storedNotifications).flatMap(([
            accountId,
            notifs
        ]) => notifs.map((n) => {
            n.accountId = accountId;
            return n;
        }));
        this.toggleEmpty(!notifications.length);
        for(const notification of notifications) {
            this.create(notification, !Array.isArray(stores));
        }
    }
};

class Account extends window.Storage {
    constructor(type, id, area, details = {}) {
        super(id, area);
        this.id = id;
        this.type = type;
        this.details = details;
        this.ready = this.buildRoot();
    }

    async buildRoot() {
        this.root = new Option(await this.getLabel(), this.getStorageKey("notifications"));
    }

    async getLabel() {
        if(HAS_INSTANCE_URL.has(this.type)) {
            return browser.i18n.getMessage('username_instance', [
                await this.getValue('username'),
                this.details.instanceURL
            ]);
        }
        return this.getValue('username');
    }
}

class AccountSelector extends window.StorageManager {
    static get ALL_ACCOUNTS() {
        return "all";
    }

    constructor(root) {
        super(Account);
        this.root = root;
        this.root.addEventListener("input", () => {
            this.selectAccount(this.currentAccount);
        }, {
            passive: true,
            capture: false
        });
        browser.storage.onChanged.addListener((changes, area) => {
            // Only listening for notification changes, since accounts shouldn't
            // change while the popup is open.
            if(area === "local" && (this.currentAccount === AccountSelector.ALL_ACCOUNTS || this.currentAccount in changes)) {
                this.selectAccount(this.currentAccount);
            }
        });
        this.getInstances()
            .then(() => this.selectAccount(this.currentAccount))
            .catch(console.error);
    }

    get currentAccount() {
        return this.root.value;
    }

    async getInstances() {
        const records = await this.getRecords();
        if(records.length == SINGLE_ACCOUNT) {
            this.root.hidden = true;
            this.root.disabled = true;
        }
        return Promise.all(records.map((r) => this.addAccount(r.type, r[window.StorageManager.ID_KEY], r.details)));
    }

    async addAccount(type, id, details) {
        const account = new this.StorageInstance(type, id, this.area, details);
        await account.ready;
        this.root.append(account.root);
        return account;
    }

    getAccountRoot(id) {
        return this.root.querySelector(`[value="${CSS.escape(id)}"]`);
    }
    getAccounts() {
        return Array.from(this.root.options)
            .filter((o) => o.value !== AccountSelector.ALL_ACCOUNTS)
            .map((o) => o.value);
    }

    selectAccount(account) {
        if(account === AccountSelector.ALL_ACCOUNTS) {
            notificationList.show(this.getAccounts()).catch(console.error);
        }
        else {
            notificationList.show(account).catch(console.error);
        }
    }
}

loaded
    .then(() => {
        contextMenu.init();
        notificationList.init();
        new AccountSelector(document.getElementById("accounts"));
        return browser.storage.local.get({
            "footer": "all"
        });
    })
    .then(({ footer }) => {
        const open = document.getElementById("open");
        if(footer == "hidden") {
            open.parentNode.hidden = true;
        }
        else {
            open.addEventListener("click", () => {
                browser.runtime.sendMessage({ topic: "open-notifications" });
                window.close();
            }, {
                capture: false,
                passive: true
            });
            open.textContent = browser.i18n.getMessage(`footer_${footer}`);
        }
    })
    .catch(console.error);
