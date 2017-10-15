/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

class StorageManager {
    static get KEY() {
        return "handlers";
    }

    static get ID_KEY() {
        return "handlerId";
    }

    static createRecord(storageInstance) {
        return {
            [StorageManager.ID_KEY]: storageInstance.storageId
        };
    }

    constructor(storageConstructor = window.Storage, area = "local") {
        this.StorageInstance = storageConstructor;
        this.area = area;
    }

    async getInstances() {
        const records = await this.getRecords();
        return records.map((record) => new this.StorageInstance(record[StorageManager.ID_KEY], this.area));
    }

    async getRecords() {
        const results = await browser.storage[this.area].get({
            [StorageManager.KEY]: []
        });
        return results[StorageManager.KEY];
    }

    setRecords(array) {
        return browser.storage[this.area].set({
            [StorageManager.KEY]: array
        });
    }
}
window.StorageManager = StorageManager;
