import test from 'ava';
import { getEnv, cleanUp } from './_env';

test.beforeEach(async (t) => {
    const dom = await getEnv([ '../scripts/storage.js' ]);
    t.context.window = dom.window;
});

test.afterEach.always((t) => cleanUp(t.context.window));

test('constructor', (t) => {
    const storage = new t.context.window.Storage('foo');
    t.is(storage.storageId, 'foo');
    t.is(storage.area, 'local');
});

test('generate key', (t) => {
    const storage = new t.context.window.Storage('foo');
    const key = storage.getStorageKey('test');
    t.true(key.includes('foo'));
    t.true(key.includes('test'));
});

test('get default value', async (t) => {
    t.context.window.browser.storage.local.get.resolves({});
    const storage = new t.context.window.Storage('foo');
    t.is(await storage.getValue('test', 1), 1);
});

test('get default without default', async (t) => {
    t.context.window.browser.storage.local.get.resolves({});
    const storage = new t.context.window.Storage('foo');
    t.is(await storage.getValue('test'), undefined);
});

test('get value', async (t) => {
    t.context.window.browser.storage.local.get.resolves({
        'foo_test': 2
    });
    const storage = new t.context.window.Storage('foo');
    t.is(await storage.getValue('test', 1), 2);
});

test('set value', (t) => {
    const storage = new t.context.window.Storage('foo');
    storage.setValue('test', 1);
    t.true(t.context.window.browser.storage.local.set.calledOnce);
    t.deepEqual(t.context.window.browser.storage.local.set.lastCall.args[0], {
        'foo_test': 1
    });
});

test('reset values', (t) => {
    const storage = new t.context.window.Storage('foo');
    storage.removeValues([
        'lorem',
        'ipsum'
    ]);
    t.true(t.context.window.browser.storage.local.remove.calledOnce);
    t.deepEqual(t.context.window.browser.storage.local.remove.lastCall.args[0], [
        'foo_lorem',
        'foo_ipsum'
    ]);
});
