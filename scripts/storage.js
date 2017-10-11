/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

class Storage {
    constructor(storageId, area = "local") {
        this.storageId = storageId;
        this.area = area;
    }

    getStorageKey(key) {
        return `${this.storageId}_${key}`;
    }

    async getValue(key, defaultValue) {
        const storageKey = this.getStorageKey(key);
        const result = await browser.storage[this.area].get(storageKey);
        if(defaultValue !== undefined && (!(storageKey in result) || result[storageKey] === undefined)) {
            return defaultValue;
        }
        return result[storageKey];
    }

    setValue(key, value) {
        return browser.storage[this.area].set({
            [this.getStorageKey(key)]: value
        });
    }

    removeValues(keys) {
        return browser.storage[this.area].remove(keys.map(this.getStorageKey, this));
    }
}
window.Storage = Storage;
