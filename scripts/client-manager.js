/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/* global GitHub, clientId, clientSecret, ClientHandler */
//TODO some way to handle accounts that have failing logins instead of just removing them.

class ClientManager {
    static get GITHUB() {
        return "github";
    }

    static get ENTERPRISE() {
        return "enterprise";
    }

    constructor() {
        this.clients = new Set();
    }

    async loadClients() {
        const { handlers } = await browser.storage.local.get("handlers");
        let successful = 0;
        for(const handler of handlers) {
            if(handler.type === ClientManager.GITHUB) {
                const client = new GitHub(clientId, clientSecret);
                client.id = handler.id;
                const wrapper = new ClientHandler(client);
                const token = await wrapper.checkAuth();
                if(token) {
                    this.addClient(wrapper);
                }
            }
        }

        return !!this.clients.size;
    }

    addClient(client) {
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
        for(const client of this.clients.values()) {
            handlers.push({
                type: ClientManager.GITHUB,
                token: client.TOKEN_NAME,
                notifications: client.NOTIFICATIONS_NAME,
                id: client.id
            });
        }
        return browser.storage.local.set({
            handlers
        });
    }

    async getCount() {
        const clientCounts = await Promise.all(Array.from(this.clients.values()).map((c) => c.getCount()));
        const START_COUNT = 0;
        return clientCounts.reduce((p, c) => p + c, START_COUNT);
    }

    getClientForNotificationID(id) {
        //TODO
        return id;
    }
}
window.ClientManager = ClientManager;
