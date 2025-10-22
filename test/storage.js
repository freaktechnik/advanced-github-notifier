import test from 'ava';
import browser from "sinon-chrome/webextensions/index.js";
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

test('constructor', (t) => {
    const storage = new Storage('foo');
    t.is(storage.storageId, 'foo');
    t.is(storage.area, 'local');
});

test('generate key', (t) => {
    const storage = new Storage('foo');
    const key = storage.getStorageKey('test');
    t.true(key.includes('foo'));
    t.true(key.includes('test'));
});

test.serial('get default value', async (t) => {
    browser.storage.local.get.resolves({});
    const storage = new Storage('foo');
    t.is(await storage.getValue('test', 1), 1);
});

test.serial('get default without default', async (t) => {
    browser.storage.local.get.resolves({});
    const storage = new Storage('foo');
    t.is(await storage.getValue('test'), undefined);
});

test.serial('get value', async (t) => {
    browser.storage.local.get.resolves({
        'foo_test': 2,
    });
    const storage = new Storage('foo');
    t.is(await storage.getValue('test', 1), 2);
});

test.serial('set value', (t) => {
    const storage = new Storage('foo');
    storage.setValue('test', 1);
    t.true(browser.storage.local.set.calledOnce);
    t.deepEqual(browser.storage.local.set.lastCall.args[0], {
        'foo_test': 1,
    });
});

test.serial('reset values', (t) => {
    const storage = new Storage('foo');
    storage.removeValues([
        'lorem',
        'ipsum',
    ]);
    t.true(browser.storage.local.remove.calledOnce);
    t.deepEqual(browser.storage.local.remove.lastCall.args[0], [
        'foo_lorem',
        'foo_ipsum',
    ]);
});
