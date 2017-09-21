/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/* global ClientHandler */

// eslint-disable-next-line no-unused-vars
class ClientManager {
    constructor() {
        this.clients = new Set();
    }

    addClient(client) {
        if(client instanceof ClientHandler) {
            this.clients.add(client);
            return this.saveNotificationFields();
        }
        return Promise.resolve();
    }

    removeClient(client) {
        this.clients.remove(client);
        return this.saveNotificationFields();
    }

    saveNotificationFields() {
        const fields = [];
        for(const client of this.clients.values()) {
            fields.push(client.NOTIFICATIONS_NAME);
        }
        return browser.storage.local.set({
            notifications: fields
        });
    }

    async getCount() {
        const clientCounts = await Promise.all(Array.from(this.clients.values()).map((c) => c.getCount()));
        return clientCounts.reduce((p, c) => p + c, 0);
    }
}
