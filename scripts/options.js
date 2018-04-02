/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

//TODO add enterprise login via management.
const PASSIVE_EVENT = {
    capturing: false,
    passive: true
};

class Account extends window.Storage {
    constructor(type, id, area, details = {}) {
        super(id, area);
        this.id = id;
        this.type = type;
        this.details = details;
        this.root = document.createElement("li");
        this.root.dataset.id = this.id;
        this.buildAccount();
    }

    get removeAction() {
        if(this.type === 'enterprise-pat' || this.type === 'github-user') {
            return browser.i18n.getMessage('remove');
        }
        return browser.i18n.getMessage('logout');
    }

    async buildAccount() {
        const typeNode = document.createElement("small");
        typeNode.textContent = browser.i18n.getMessage(`account_${this.type}`);

        // Show what enterprise instance the account belongs to
        if(this.type.startsWith('enterprise')) {
            typeNode.textContent += ` - ${this.details.instanceURL}`;
        }

        const username = await this.getValue('username');
        const usernameNode = document.createTextNode(username);

        const controls = document.createElement("div");
        controls.classList.add("account-controls")

        const showNotifications = document.createElement("label");
        const checkbox = document.createElement("input");
        const checkboxDummy = document.createElement("label");
        showNotifications.classList.add("browser-style");
        showNotifications.append(document.createTextNode(browser.i18n.getMessage('showNotifications')));

        checkbox.type = "checkbox";
        checkbox.disabled = !document.getElementById("notifications").checked;
        checkbox.id = `notifs-${this.id}`;
        checkbox.classList.add('visually-hidden');
        checkbox.classList.add('account-notifs');
        checkbox.checked = await this.getValue('showNotifications', true);
        //TODO add setting and listener and all that

        checkboxDummy.htmlFor = checkbox.id;

        showNotifications.classList.toggle("disabled", checkbox.disabled);
        showNotifications.append(checkbox);
        showNotifications.insertAdjacentText('beforeend', ' ');
        showNotifications.append(checkboxDummy);

        const logout = document.createElement("button");
        logout.classList.add('browser-style');
        logout.textContent = this.removeAction;
        logout.addEventListener("click", () => this.logout(), PASSIVE_EVENT);

        this.root.append(usernameNode);
        this.root.append(typeNode);
        controls.append(showNotifications);
        controls.append(logout);
        this.root.append(controls);
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
                details: this.getDetails(typeForm.value)
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
        return records.map((r) => this.addAccount(r.type, r[window.StorageManager.ID_KEY], r.details));
    }

    addAccount(type, id, details) {
        const account = new this.StorageInstance(type, id, this.area, details);
        this.list.append(account.root);
        return account;
    }

    getAccountRoot(id) {
        return this.list.querySelector(`[data-id="${id}"]`);
    }

    getDetails(type) {
        const inputs = this.form.querySelectorAll(`fieldset[name="${type}"] input`),
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
        // Disable account-specific notifications checkboxes if notifications are not to be shown
        const accountCheckboxes = document.querySelectorAll('input.account-notifs');
        for(const checkbox of accountCheckboxes) {
            checkbox.disabled = !notifications.checked;
            checkbox.parentNode.classList.toggle("disabled", !notifications.checked);
        }
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
