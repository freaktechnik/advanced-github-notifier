/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

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

const clickListener = (id) => {
    browser.runtime.sendMessage({
        topic: "open-notification",
        notificationId: id
    });
    window.close();
};

const contextMenu = {
    target: null,
    init() {
        this.addListener("markAsRead", "markAsRead");
        this.addListener("unsubscribe", "unsubscribe");
        this.addListener("ignore", "ignore");
    },
    addListener(id, listenerName) {
        document.getElementById(id).addEventListener("click", () => this[listenerName](), {
            capture: false,
            passive: true
        });
    },
    openFor(notificationId) {
        this.target = notificationId;
    },
    markAsRead() {
        browser.runtime.sendMessage({
            topic: "mark-notification-read",
            notificationId: this.target
        });
    },
    unsubscribe() {
        browser.runtime.sendMessage({
            topic: "unsubscribe-notification",
            notificationId: this.target
        });
    },
    ignore() {
        browser.runtime.sendMessage({
            topic: "ignore-notification",
            notificationId: this.target
        });
    }
};

const notificationList = {
    IMAGE_SIZE: 16,
    root: null,
    markRead: null,
    init() {
        this.root = document.getElementById("notifications");
        this.markRead = document.getElementById("mark-read");
        this.markRead.addEventListener("click", () => {
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
    create(notification) {
        const root = document.createElement("li");
        root.id = idPrefix + notification.id;
        root.classList.add("panel-list-item");
        const date = new Date(notification.updated_at);
        root.title = formatter.format(date);

        if(notification.subject.type == "Issue" || notification.subject.type == "PullRequest") {
            root.title = `#${notification.subjectDetails.number} (${root.title})`;
        }

        const image = new Image(this.IMAGE_SIZE, this.IMAGE_SIZE);
        image.src = `${notification.icon}svg`;
        image.classList.add("icon");

        const title = document.createElement("span");
        title.classList.add("text");
        title.textContent = notification.subject.title;

        const repo = document.createElement("span");
        repo.classList.add("text-shortcut");
        repo.textContent = notification.repository.full_name;

        root.append(image, title, repo);
        root.addEventListener("click", clickListener.bind(null, notification.id));
        root.addEventListener("contextmenu", () => contextMenu.openFor(notification.id));
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

        let notifications = [];
        for(const r in storedNotifications) {
            notifications = notifications.concat(storedNotifications[r]);
        }
        for(const notification of notifications) {
            this.create(notification);
        }
    }
};

const accountSelector = {
    SINGLE_ACCOUNT: 1,
    ALL_ACCOUNTS: "all",
    root: null,
    storage: null,
    init() {
        this.storage = new window.StorageManager(window.Storage);
        this.root = document.getElementById("accounts");

        this.root.addEventListener("input", () => {
            this.selectAccount(this.currentAccout);
        }, {
            passive: true,
            capture: false
        });

        browser.storage.onChanged.addListener((changes, area) => {
            // Only listening for notification changes, since accounts shouldn't
            // change while the popup is open.
            if(area === this.storage.area && (this.currentAccout === this.ALL_ACCOUNTS || this.currentAccout in changes)) {
                this.selectAccount(this.currentAccout);
            }
        });

        this.storage.getInstances()
            .then((accounts) => this.setAccounts(accounts))
            .catch(console.error);
    },
    get currentAccout() {
        return this.root.value;
    },
    async addAccount(account) {
        const username = await account.getValue("username");
        const option = new Option(account.getStorageKey("notifications"), username);
        this.root.append(option);
    },
    setAccounts(accounts) {
        if(accounts.length === this.SINGLE_ACCOUNT) {
            this.root.hidden = true;
            return;
        }
        for(const account of accounts) {
            this.addAccount(account);
        }
    },
    getAccounts() {
        return Array.from(this.root.options)
            .filter((o) => o.value === this.ALL_ACCOUNTS)
            .map((o) => o.value);
    },
    selectAccount(account) {
        if(account === this.ALL_ACCOUNTS) {
            notificationList.show(this.getAccounts()).catch(console.error);
        }
        else {
            notificationList.show(account).catch(console.error);
        }
    }
};

loaded
    .then(() => {
        contextMenu.init();
        notificationList.init();
        accountSelector.init();
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

Promise.all([
    browser.storage.local.get({
        [window.StorageManager.KEY]: []
    }),
    loaded
])
    .then(([ { [window.StorageManager.KEY]: result } ]) => notificationList.show(result.map((h) => h.notifications)))
    .catch(console.error);
