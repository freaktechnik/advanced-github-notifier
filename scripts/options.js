/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import Storage from "./storage.js";
import StorageManager from "./storage-manager.js";

const PASSIVE_EVENT = {
        capturing: false,
        passive: true,
    },
    MIN_OAUTH_VERSION = 60,
    HAS_INSTANCE_URL = new Set([
        'enterprise',
        'enterprise-pat',
        'gitlab',
        'gitea',
    ]),
    IS_TOKEN = new Set([
        'enterprise-pat',
        'github-user',
        'gitlab',
        'gitea',
    ]);

class Account extends Storage {
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
        if(IS_TOKEN.has(this.type)) {
            return browser.i18n.getMessage('remove');
        }
        return browser.i18n.getMessage('logout');
    }

    async buildAccount() {
        const start = document.createElement("div");
        const typeNode = document.createElement("small");
        typeNode.textContent = browser.i18n.getMessage(`account_${this.type}`);

        // Show what enterprise instance the account belongs to
        if(HAS_INSTANCE_URL.has(this.type)) {
            typeNode.textContent += ` - ${this.details.instanceURL}`;
        }

        const username = await this.getValue('username');
        const usernameNode = document.createTextNode(username);

        const controls = document.createElement("div");
        controls.classList.add("account-controls");

        const showNotifications = document.createElement("label");
        const checkbox = document.createElement("input");
        showNotifications.classList.add("browser-style");
        showNotifications.append(document.createTextNode(browser.i18n.getMessage('showNotifications')));

        checkbox.type = "checkbox";
        checkbox.disabled = !document.getElementById("notifications").checked;
        checkbox.id = `notifs-${this.id}`;
        checkbox.classList.add('account-notifs');
        checkbox.checked = await this.getValue('showNotifications', true); // eslint-disable-line require-atomic-updates
        checkbox.addEventListener("input", () => {
            this.setValue('showNotifications', checkbox.checked);
        }, PASSIVE_EVENT);

        showNotifications.classList.toggle("disabled", checkbox.disabled);
        showNotifications.append(checkbox);
        showNotifications.append(' ');

        const logout = document.createElement("button");
        logout.classList.add('browser-style');
        logout.textContent = this.removeAction;
        logout.addEventListener("click", () => this.logout(), PASSIVE_EVENT);

        start.append(usernameNode);
        start.append(typeNode);
        this.root.append(start);
        controls.append(showNotifications);
        controls.append(logout);
        this.root.append(controls);
    }

    logout() {
        browser.runtime.sendMessage({
            topic: "logout",
            handlerId: this.id,
        });
        this.root.remove();
    }
}

class AccountManager extends StorageManager {
    constructor(root) {
        super(Account);
        this.root = root;
        this.form = root.querySelector("#login");
        this.list = root.querySelector("#active");

        const typeForm = this.form.querySelector("select");

        browser.runtime.getBrowserInfo()
            .then(({ version }) => {
                const [ major ] = version.split('.');
                if(parseInt(major, 10) >= MIN_OAUTH_VERSION) {
                    const disabledOptions = typeForm.querySelectorAll('option[disabled]');
                    for(const option of disabledOptions) {
                        option.disabled = false;
                    }
                    // Default selection
                    typeForm.value = "github";
                    typeForm.dispatchEvent(new Event("change"));
                }
            })
            .catch(console.error);

        browser.storage.onChanged.addListener((changes, areaName) => {
            if(areaName === "local" && "handlers" in changes) {
                const handlerIds = new Set();
                for(const handler of changes.handlers.newValue) {
                    handlerIds.add(handler[StorageManager.ID_KEY]);
                    if(!this.getAccountRoot(handler[StorageManager.ID_KEY])) {
                        this.addAccount(handler.type, handler[StorageManager.ID_KEY], handler.details);
                    }
                }
                if("oldValue" in changes.handlers && changes.handlers.oldValue) {
                    for(const oldHandler of changes.handlers.oldValue) {
                        if(!handlerIds.has(oldHandler[StorageManager.ID_KEY])) {
                            const node = this.getAccountRoot(oldHandler[StorageManager.ID_KEY]);
                            if(node) {
                                node.querySelector("button")
                                    .click();
                            }
                        }
                    }
                }
            }
        });

        this.form.addEventListener("submit", async (event) => {
            //TODO disable form "during" submit
            event.preventDefault();
            if(!this.validateForm()) {
                //TODO show error
                return;
            }
            let type = typeForm.value,
                details;
            if(type === 'enterprise-preconfig') {
                type = 'enterprise';
                details = this.enterpriseInstance;
            }
            else {
                details = this.getDetails(type);
            }

            if(type === 'enterprise') {
                let permissionURL = details.instanceURL;
                if(!permissionURL.endsWith('/')) {
                    permissionURL += '/';
                }
                permissionURL += 'login/oauth/access_token';
                const granted = await browser.permissions.request({
                    origins: [ permissionURL ],
                });
                if(!granted) {
                    this.showError(browser.i18n.getMessage("error_host_enterprise"));
                    return;
                }
            }
            if(type == 'gitea') {
                let permissionURL = details.instanceURL;
                if(!permissionURL.endsWith('/')) {
                    permissionURL += '/';
                }
                const granted = await browser.permissions.request({
                    origins: [ permissionURL ],
                });
                if(!granted) {
                    this.showError(browser.i18n.getMessage("error_host_gitea"));
                    return;
                }
            }
            try {
                await browser.runtime.sendMessage({
                    topic: "login",
                    type,
                    details,
                });
                this.form.reset();
                typeForm.value = "github"; // eslint-disable-line require-atomic-updates
            }
            catch(error) {
                this.showError(error.message);
            }
        }, {
            passive: false,
        });

        typeForm.addEventListener("change", () => {
            this.validateForm();
        }, {
            passive: true,
            capture: false,
        });

        // Ensure the corect things are shown
        this.validateForm();
    }

    async getInstances() {
        const records = await this.getRecords();
        return records.map((r) => this.addAccount(r.type, r[StorageManager.ID_KEY], r.details));
    }

    addAccount(type, id, details) {
        const account = new this.StorageInstance(type, id, this.area, details);
        this.list.append(account.root);
        return account;
    }

    getAccountRoot(id) {
        return this.list.querySelector(`[data-id="${CSS.escape(id)}"]`);
    }

    getDetails(type) {
        const inputs = this.form.querySelectorAll(`fieldset[name="${CSS.escape(type)}"] input`),
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

    addEnterpriseInstance(instanceConfig) {
        if(this.enterpriseInstance) {
            document.getElementById('enterprise-preconfigured').remove();
        }
        this.enterpriseInstance = instanceConfig;
        const optgroup = document.createElement("optgroup");
        optgroup.label = instanceConfig.instanceURL;
        optgroup.id = 'enterprise-preconfigured';
        const option = new Option(browser.i18n.getMessage('account_enterprise-preconfig', instanceConfig.instanceURL), 'enterprise-preconfig', true, true);
        optgroup.append(option);
        this.form.querySelector("select").append(optgroup);
    }
}

globalThis.addEventListener("DOMContentLoaded", () => {
    document.getElementById("enterprise-redirect").textContent = browser.i18n.getMessage("enterprise_redirect", `${browser.identity.getRedirectURL()}login`);
    const notifications = document.getElementById("notifications");
    const badge = document.getElementById("badge");
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

    badge.addEventListener("change", () => {
        browser.storage.local.set({ disableBadge: !badge.checked });
    }, PASSIVE_EVENT);

    footer.addEventListener("change", () => {
        browser.storage.local.set({ footer: footer.value });
    }, PASSIVE_EVENT);

    browser.storage.onChanged.addListener((changes, areaName) => {
        if(areaName === "local" && changes.disableBadge) {
            badge.checked = !changes.disableBadge.newValue;
        }
    });

    browser.storage.local.get([
        "hide",
        "disableBadge",
        "footer",
    ])
        .then((result) => {
            if(result.hide) {
                notifications.checked = false;
            }
            if(result.disableBadge) {
                badge.checked = false;
            }
            if(result.footer) {
                footer.value = result.footer;
            }
        })
        .catch(console.error);

    if("managed" in browser.storage) {
        browser.storage.managed.get('enterprise')
            .then((result) => {
                if(result.enterprise) {
                    manager.addEnterpriseInstance(result.enterprise);
                }
            })
            .catch(console.error);
    }
}, PASSIVE_EVENT);
