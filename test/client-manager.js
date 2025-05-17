import test from 'ava';
import { FakeClient } from './_mocks.js';
import ClientManager from '../scripts/client-manager.js';
import ClientHandler from '../scripts/handler.js';
import browser from "sinon-chrome/webextensions/index.js";

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
    const manager = new ClientManager();
    t.is(manager.clients.size, 0);
});

test('add non-handler Client', (t) => {
    const manager = new ClientManager();
    return t.throwsAsync(manager.addClient({}), {
        instanceOf: TypeError,
    });
});

test.serial('add handler client', async (t) => {
    const handler = new ClientHandler(new FakeClient());
    const manager = new ClientManager();

    await manager.addClient(handler);
    t.is(manager.clients.size, 1);
    t.true(browser.storage.local.set.calledOnce);
    t.deepEqual(browser.storage.local.set.lastCall.args[0], {
        handlers: [ {
            details: {},
            type: ClientManager.GITHUB,
            notifications: handler.NOTIFICATION_NAME,
            id: handler.id,
            handlerId: handler.STORE_PREFIX,
        } ],
    });
});

test.serial('saveNotificationFields', async (t) => {
    const manager = new ClientManager();

    await manager.saveFields();
    t.true(browser.storage.local.set.calledOnce);
    t.deepEqual(browser.storage.local.set.lastCall.args[0], {
        handlers: [],
    });
});

test('getCount', async (t) => {
    const manager = new ClientManager();

    const count = await manager.getCount();
    t.is(count, 0);
});

test.serial('removeClient', async (t) => {
    const handler = new ClientHandler(new FakeClient());
    const manager = new ClientManager();

    await manager.addClient(handler);
    t.is(manager.clients.size, 1);

    await manager.removeClient(handler);
    t.is(manager.clients.size, 0);
    t.true(browser.storage.local.set.calledTwice);
    t.deepEqual(browser.storage.local.set.lastCall.args[0], {
        handlers: [],
    });
});
