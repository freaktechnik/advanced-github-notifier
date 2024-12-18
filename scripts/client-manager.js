/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/* global clientId, clientSecret */
//TODO some way to handle accounts that have failing logins instead of just removing them.

class ClientManager extends globalThis.StorageManager {
    static get GITHUB() {
        return "github";
    }

    static get ENTERPRISE() {
        return "enterprise";
    }

    static get GITHUB_LIGHT() {
        return "github-light";
    }

    static get GITHUB_USER_TOKEN() {
        return "github-user";
    }

    static get ENTERPRISE_PAT() {
        return "enterprise-pat";
    }

    static get GITLAB() {
        return "gitlab";
    }

    static get GITEA() {
        return "gitea";
    }

    static getTypeForClient(client) {
        if(client instanceof globalThis.GitHubEnterpriseUserToken) {
            return ClientManager.ENTERPRISE_PAT;
        }
        if(client instanceof globalThis.GitHubEnterprise) {
            return ClientManager.ENTERPRISE;
        }
        else if(client instanceof globalThis.GitHubLight) {
            return ClientManager.GITHUB_LIGHT;
        }
        else if(client instanceof globalThis.GitHubUserToken) {
            return ClientManager.GITHUB_USER_TOKEN;
        }
        else if(client instanceof globalThis.GitLab) {
            return ClientManager.GITLAB;
        }
        else if(client instanceof globalThis.Gitea) {
            return ClientManager.GITEA;
        }
        return ClientManager.GITHUB;
    }

    static async createClient(type, id, details) {
        let ClientFactory;
        switch(type) {
        case ClientManager.GITHUB:
            ClientFactory = globalThis.GitHub;
            break;
        case ClientManager.GITHUB_LIGHT:
            ClientFactory = globalThis.GitHubLight;
            break;
        case ClientManager.ENTERPRISE:
            ClientFactory = globalThis.GitHubEnterprise;
            if(!details) {
                throw new Error("Details required to create enterprise client");
            }
            break;
        case ClientManager.GITHUB_USER_TOKEN:
            ClientFactory = globalThis.GitHubUserToken;
            if(!details) {
                throw new Error("Details required to create PAT client");
            }
            break;
        case ClientManager.ENTERPRISE_PAT:
            ClientFactory = globalThis.GitHubEnterpriseUserToken;
            if(!details) {
                throw new Error("Details required to create enterprise PAT client");
            }
            break;
        case ClientManager.GITLAB:
            ClientFactory = globalThis.GitLab;
            if(!details) {
                throw new Error("Details required to create new GitLab client");
            }
            break;
        case ClientManager.GITEA:
            ClientFactory = globalThis.Gitea;
            if(!details) {
                throw new Error("Details required to create new Gitea client");
            }
            break;
        default:
            throw new Error("Unknown account type");
        }
        const factoryArguments = ClientFactory.buildArgs(clientId, clientSecret, details);
        const client = new ClientFactory(...factoryArguments);
        if(id) {
            client.id = id;
        }
        const wrapper = new globalThis.ClientHandler(client, this.area);
        return wrapper;
    }

    constructor() {
        super(globalThis.ClientHandler);
        this.clients = new Set();
        this.loadedInstances = false;
    }

    getClients() {
        return this.clients.values();
    }

    async getInstances() {
        if(this.loadedInstances) {
            return !!this.clients.size;
        }
        const handlers = await this.getRecords();
        for(const handler of handlers) {
            const wrapper = await ClientManager.createClient(handler.type, handler.id, handler.details);
            await wrapper.checkAuth();
            this.addClient(wrapper, true)
                .catch((error) => console.error("Error adding client", handler.type, handler.id, error));
        }
        await this.saveFields();

        this.loadedInstances = true;
        return !!this.clients.size;
    }

    addClient(client, noSave = false) {
        for(const otherClient of this.clients) {
            if(otherClient.id === client.id && otherClient.type === client.type) {
                otherClient.checkAuth();
                return Promise.resolve();
            }
        }
        if(client instanceof globalThis.ClientHandler) {
            this.clients.add(client);
            if(!noSave) {
                return this.saveFields();
            }
            return Promise.resolve();
        }
        return Promise.reject(new TypeError('Client is not a ClientHandler'));
    }

    removeClient(client) {
        this.clients.delete(client);
        return this.saveFields();
    }

    saveFields() {
        const handlers = [];
        for(const client of this.getClients()) {
            const object = globalThis.StorageManager.createRecord(client);
            object.type = ClientManager.getTypeForClient(client.client);
            object.notifications = client.NOTIFICATION_NAME;
            object.id = client.id;
            object.details = client.getDetails();
            handlers.push(object);
        }
        return this.setRecords(handlers);
    }

    async getCount() {
        const clientCounts = await Promise.all(Array.from(this.getClients(), (c) => c.getCount()));
        const START_COUNT = 0;
        return clientCounts.reduce((p, c) => p + c, START_COUNT);
    }

    getClientForNotificationID(id) {
        for(const client of this.getClients()) {
            if(client.ownsNotification(id)) {
                return client;
            }
        }
        throw new Error(`No client has a notification with the id ${id}`);
    }

    getClientById(id) {
        for(const client of this.getClients()) {
            if(client.STORE_PREFIX === id) {
                return client;
            }
        }
        throw new Error(`No client with the id ${id} is registered.`);
    }
}
globalThis.ClientManager = ClientManager;
