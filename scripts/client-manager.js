/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/* global GitHub, clientId, clientSecret, ClientHandler, GitHubLight, GitHubEnterprise */
//TODO some way to handle accounts that have failing logins instead of just removing them.

class ClientManager extends window.StorageManager {
    static get GITHUB() {
        return "github";
    }

    static get ENTERPRISE() {
        return "enterprise";
    }

    static get GITHUB_LIGHT() {
        return "github-light";
    }

    static async createClient(type, id, details) {
        let ClientFactory;
        const factoryArgs = [];
        if(type === ClientManager.GITHUB) {
            ClientFactory = GitHub;
            factoryArgs.push(clientId);
            factoryArgs.push(clientSecret);
        }
        else if(type === ClientManager.GITHUB_LIGHT) {
            ClientFactory = GitHubLight;
            factoryArgs.push(clientId);
            factoryArgs.push(clientSecret);
        }
        else if(type === ClientManager.ENTERPRISE) {
            ClientFactory = GitHubEnterprise;
            if(!details) {
                throw new Error("Details required to create enterprise client");
            }
            factoryArgs.push(details.clientId);
            factoryArgs.push(details.clientSecret);
            factoryArgs.push(details.instanceURL);
        }
        const client = new ClientFactory(...factoryArgs);
        if(id) {
            client.id = id;
        }
        const wrapper = new ClientHandler(client, this.area);
        return wrapper;
    }

    constructor() {
        super(window.ClientHandler);
        this.clients = new Set();
    }

    getClients() {
        return this.clients.values();
    }

    async getInstances() {
        const handlers = await this.getRecords();
        for(const handler of handlers) {
            const wrapper = await ClientManager.createClient(handler.type, handler.id, handler.details);
            const authValid = await wrapper.checkAuth();
            if(authValid) {
                this.addClient(wrapper);
            }
        }

        return !!this.clients.size;
    }

    addClient(client) {
        //TODO ensure no duplicates of accounts are added.
        if(client instanceof ClientHandler) {
            this.clients.add(client);
            return this.saveFields();
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
            const obj = window.StorageManager.createRecord(client);
            obj.type = ClientManager.GITHUB;
            obj.notifications = client.NOTIFICATION_NAME;
            obj.id = client.id;
            handlers.push(obj);
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
window.ClientManager = ClientManager;
