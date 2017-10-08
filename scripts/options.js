/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const PASSIVE_EVENT = {
    capturing: false,
    passive: true
};

class Account {
    static get TYPES() {
        return Object.freeze({
            GITHUB: "github",
            ENTERPRISE: "enterprise"
        });
    }

    constructor(type, id) {
        this.id = id;
        this.type = type;
        this.root = document.createElement("li");
        this.root.dataset.id = this.id;
        this.buildAccount();
    }

    async buildAccount() {
        const typeNode = document.createElement("small");
        typeNode.textContent = browser.i18n.getMessage(`account_${this.type}`);

        const usernameProperty = `${this.id}_username`;

        const { [usernameProperty]: username } = await browser.storage.local.get({
            [usernameProperty]: ""
        });
        const usernameNode = document.createTextNode(username);

        const logout = document.createElement("button");
        logout.classList.add('browser-style');
        logout.textContent = browser.i18n.getMessage("logout");
        logout.addEventListener("click", () => this.logout(), PASSIVE_EVENT);

        this.root.append(usernameNode);
        this.root.append(typeNode);
        this.root.append(logout);
    }

    logout() {
        browser.runtime.sendMessage({
            topic: "logout",
            handlerId: this.id
        });
        this.root.remove();
    }
}

class AccountManager {
    constructor(root) {
        this.root = root;
        this.form = root.querySelector("#login");
        this.list = root.querySelector("#active");

        const typeForm = this.form.querySelector("select");

        browser.storage.onChanged.addListener((changes, areaName) => {
            if(areaName === "local" && "handlers" in changes) {
                const handlerIds = new Set();
                for(const handler of changes.handlers.newValue) {
                    handlerIds.add(handler.storeId);
                    if(!this.getAccountRoot(handler.storeId)) {
                        this.addAccount(handler.type, handler.storeId);
                    }
                }
                if("oldValue" in changes.handlers) {
                    for(const oldHandler of changes.handlers.oldValue) {
                        if(!handlerIds.has(oldHandler.storeId)) {
                            const node = this.getAccountRoot(oldHandler.storeId);
                            if(node) {
                                node.querySelector("button")
                                    .click();
                            }
                        }
                    }
                }
            }
        });

        this.form.addEventListener("submit", async (e) => {
            e.preventDefault();
            browser.runtime.sendMessage({
                topic: "login",
                type: typeForm.value
            });
        });

        browser.storage.local.get({
            handlers: []
        })
            .then(({ handlers }) => {
                for(const handler of handlers) {
                    this.addAccount(handler.type, handler.storeId);
                }
            })
            .catch(console.error);
    }

    addAccount(type, id) {
        const account = new Account(type, id);
        this.list.append(account.root);
    }

    getAccountRoot(id) {
        return this.list.querySelector(`[data-id="${id}"]`);
    }
}

window.addEventListener("DOMContentLoaded", () => {
    const notifications = document.getElementById("notifications");
    const footer = document.getElementById("footer");
    new AccountManager(document.getElementById("accounts"));

    notifications.addEventListener("change", () => {
        browser.storage.local.set({ hide: !notifications.checked });
    }, PASSIVE_EVENT);

    footer.addEventListener("change", () => {
        browser.storage.local.set({ footer: footer.value });
    }, PASSIVE_EVENT);

    browser.storage.local.get([
        "hide",
        "footer"
    ])
        .then((result) => {
            if(result.hide) {
                notifications.checked = false;
            }
            if(result.footer) {
                footer.value = result.footer;
            }
        })
        .catch(console.error);
}, PASSIVE_EVENT);
