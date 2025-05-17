import test from 'ava';
import { default as browser } from "sinon-chrome/webextensions/index.js";
import StorageManager from '../scripts/storage-manager.js';
import Storage from '../scripts/storage.js';

test.before(() => {
    globalThis.browser = browser;
});

test.after(() => {
    globalThis.browser = undefined;
});

test.serial.afterEach.always(() => {
    browser.flush();
});

const STATIC_MEMBERS = [
    'KEY',
    'ID_KEY',
];

const testStaticMember = (t, property) => {
    t.true(property in StorageManager);
    t.is(typeof StorageManager[property], 'string');
};
testStaticMember.title = (title, property) => `${title} ${property}`;

for(const property of STATIC_MEMBERS) {
    test('static', testStaticMember, property);
}

test.serial('create record', (t) => {
    const storageId = 'lorem ipsum';
    const record = StorageManager.createRecord({
        storageId,
    });

    t.true(StorageManager.ID_KEY in record);
    t.is(record[StorageManager.ID_KEY], storageId);
});

test('construction with default arguments', (t) => {
    const storageManager = new StorageManager();
    t.true("StorageInstance" in storageManager);
    t.true("area" in storageManager);

    t.is(storageManager.StorageInstance, Storage);
    t.is(storageManager.area, 'local');
});

test('construction with arguments', (t) => {
    const storageConstructor = class Test {};
    const area = 'managed';
    const storageManager = new StorageManager(storageConstructor, area);

    t.true("StorageInstance" in storageManager);
    t.true("area" in storageManager);

    t.is(storageManager.StorageInstance, storageConstructor);
    t.is(storageManager.area, area);
});

test.serial('set records', async (t) => {
    browser.storage.local.set.resolves();
    const storageManager = new StorageManager();

    const instances = [
        'foo',
        'bar',
    ];
    await storageManager.setRecords(instances);

    t.true(browser.storage.local.set.calledWithMatch({
        [StorageManager.KEY]: instances,
    }));
});

test.serial('get records', async (t) => {
    const storageManager = new StorageManager();
    const data = [
        'foo',
        'bar',
    ];
    browser.storage.local.get.resolves({
        [StorageManager.KEY]: data,
    });

    const results = await storageManager.getRecords();

    t.deepEqual(results, data);
    t.true(browser.storage.local.get.calledWithMatch({
        [StorageManager.KEY]: [],
    }));
});

test.serial('get instances', async (t) => {
    const Instance = class {
        constructor(storageId, area) {
            this.storageId = storageId;
            this.area = area;
        }
    };

    const storageManager = new StorageManager(Instance);
    const storageId = 'foo';
    browser.storage.local.get.resolves({
        [StorageManager.KEY]: [ {
            [StorageManager.ID_KEY]: storageId,
        } ],
    });

    const results = await storageManager.getInstances();
    t.is(results.length, 1);
    const [ instance ] = results;
    t.true(instance instanceof storageManager.StorageInstance);
    t.is(instance.storageId, storageId);
    t.is(instance.area, storageManager.area);
});
