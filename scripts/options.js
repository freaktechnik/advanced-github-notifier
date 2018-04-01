/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const PASSIVE_EVENT = {
    capturing: false,
    passive: true
};

class Account extends window.Storage {
    static get TYPES() {
        return Object.freeze({
            GITHUB: "github",
            GITHUB_LIGHT: "github-light",
            ENTERPRISE: "enterprise"
        });
    }

    constructor(type, id, area) {
        super(id, area);
        this.id = id;
        this.type = type;
        this.root = document.createElement("li");
        this.root.dataset.id = this.id;
        this.buildAccount();
    }

    async buildAccount() {
        const typeNode = document.createElement("small");
        typeNode.textContent = browser.i18n.getMessage(`account_${this.type}`);

        const username = await this.getValue('username');
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

class AccountManager extends window.StorageManager {
    constructor(root) {
        super(Account);
        this.root = root;
        this.form = root.querySelector("#login");
        this.list = root.querySelector("#active");

        const typeForm = this.form.querySelector("select");

        browser.storage.onChanged.addListener((changes, areaName) => {
            if(areaName === "local" && "handlers" in changes) {
                const handlerIds = new Set();
                for(const handler of changes.handlers.newValue) {
                    handlerIds.add(handler[window.StorageManager.ID_KEY]);
                    if(!this.getAccountRoot(handler[window.StorageManager.ID_KEY])) {
                        this.addAccount(handler.type, handler[window.StorageManager.ID_KEY]);
                    }
                }
                if("oldValue" in changes.handlers && changes.handlers.oldValue) {
                    for(const oldHandler of changes.handlers.oldValue) {
                        if(!handlerIds.has(oldHandler[window.StorageManager.ID_KEY])) {
                            const node = this.getAccountRoot(oldHandler[window.StorageManager.ID_KEY]);
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
            if(!this.validateForm()) {
                //TODO show error
                return;
            }
            browser.runtime.sendMessage({
                topic: "login",
                type: typeForm.value,
                details: this.getDetails()
            }).catch((error) => {
                this.showError(error.message);
            });
        }, {
            passive: false
        });

        typeForm.addEventListener("change", () => {
            this.validateForm();
        }, {
            passive: true,
            capture: false
        });

        // Ensure the corect things are shown
        this.validateForm();
    }

    async getInstances() {
        const records = await this.getRecords();
        return records.map((r) => this.addAccount(r.type, r[window.StorageManager.ID_KEY]));
    }

    addAccount(type, id) {
        const account = new this.StorageInstance(type, id, this.area);
        this.list.append(account.root);
        return account;
    }

    getAccountRoot(id) {
        return this.list.querySelector(`[data-id="${id}"]`);
    }

    getDetails() {
        const inputs = this.form.querySelectorAll('fieldset[nane="enterprise"] input'),
            details = {};
        for(const input of inputs) {
            if(input.value && !input.disabled) {
                details[input.name] = input.value;
            }
        }
        return details;
    }

    validateFieldset(fieldset, current) {
        const visible = fieldset.name === current;
        if(fieldset.hidden !== visible) {
            // Only update if visibility state is different.
            return;
        }
        const inputs = fieldset.querySelectorAll('input');
        fieldset.hidden = !visible;
        for(const input of inputs) {
            input.disabled = !visible;
            input.required = visible;
        }
    }

    validateForm() {
        this.hideError();
        const current = this.form.querySelector("select").value;
        const fieldsets = this.form.querySelectorAll('fieldset');
        for(const fieldset of fieldsets) {
            this.validateFieldset(fieldset, current);
        }
        return this.form.checkValidity();
    }

    showError(error) {
        const errorContainer = this.form.querySelector("#error");
        errorContainer.querySelector("output").textContent = error;
        errorContainer.hidden = false;
    }

    hideError() {
        this.form.querySelector("#error").hidden = true;
    }
}

window.addEventListener("DOMContentLoaded", () => {
    const notifications = document.getElementById("notifications");
    const footer = document.getElementById("footer");
    const manager = new AccountManager(document.getElementById("accounts"));
    manager.getInstances().catch(console.error);

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
