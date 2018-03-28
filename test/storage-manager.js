import test from 'ava';
import {
    getEnv, cleanUp
} from './_env';

test.beforeEach(async (t) => {
    const dom = await getEnv([
        '../scripts/storage.js',
        '../scripts/storage-manager.js'
    ]);
    t.context.window = dom.window;
});

test.afterEach.always((t) => cleanUp(t.context.window));

const STATIC_MEMBERS = [
    'KEY',
    'ID_KEY'
];

const testStaticMember = (t, prop) => {
    t.true(prop in t.context.window.StorageManager);
    t.is(typeof t.context.window.StorageManager[prop], 'string');
};
testStaticMember.title = (title, prop) => `${title} ${prop}`;

for(const prop of STATIC_MEMBERS) {
    test('static', testStaticMember, prop);
}

test('create record', (t) => {
    const storageId = 'lorem ipsum';
    const record = t.context.window.StorageManager.createRecord({
        storageId
    });

    t.true(t.context.window.StorageManager.ID_KEY in record);
    t.is(record[t.context.window.StorageManager.ID_KEY], storageId);
});

test('construction with default arguments', (t) => {
    const storageManager = new t.context.window.StorageManager();
    t.true("StorageInstance" in storageManager);
    t.true("area" in storageManager);

    t.is(storageManager.StorageInstance, t.context.window.Storage);
    t.is(storageManager.area, 'local');
});

test('construction with arguments', (t) => {
    const storageConstructor = class Test {};
    const area = 'managed';
    const storageManager = new t.context.window.StorageManager(storageConstructor, area);

    t.true("StorageInstance" in storageManager);
    t.true("area" in storageManager);

    t.is(storageManager.StorageInstance, storageConstructor);
    t.is(storageManager.area, area);
});

test('set records', async (t) => {
    t.context.window.browser.storage.local.set.resolves();
    const storageManager = new t.context.window.StorageManager();

    const instances = [
        'foo',
        'bar'
    ];
    await storageManager.setRecords(instances);

    t.true(t.context.window.browser.storage.local.set.calledWithMatch({
        [t.context.window.StorageManager.KEY]: instances
    }));
});

test('get records', async (t) => {
    const {
        StorageManager,
        browser
    } = t.context.window;

    const storageManager = new StorageManager();
    const data = [
        'foo',
        'bar'
    ];
    browser.storage.local.get.resolves({
        [StorageManager.KEY]: data
    });

    const results = await storageManager.getRecords();

    t.deepEqual(results, data);
    t.true(browser.storage.local.get.calledWithMatch({
        [StorageManager.KEY]: []
    }));
});

test('get instances', async (t) => {
    const {
        StorageManager,
        browser
    } = t.context.window;

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
            [StorageManager.ID_KEY]: storageId
        } ]
    });

    const results = await storageManager.getInstances();
    t.is(results.length, 1);
    const [ instance ] = results;
    t.true(instance instanceof storageManager.StorageInstance);
    t.is(instance.storageId, storageId);
    t.is(instance.area, storageManager.area);
});
