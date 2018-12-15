import test from 'ava';
import {
    getEnv, cleanUp
} from './_env';
import { FakeClient } from './_mocks';

test.beforeEach(async (t) => {
    const dom = await getEnv([
        '../scripts/storage.js',
        '../scripts/storage-manager.js',
        '../scripts/handler.js',
        '../scripts/github.js',
        '../scripts/github-enterprise.js',
        '../scripts/github-light.js',
        '../scripts/github-user-token.js',
        '../scripts/github-enterprise-pat.js',
        '../scripts/client-manager.js'
    ]);
    t.context.window = dom.window;
});

test.afterEach.always((t) => cleanUp(t.context.window));

test('constructor', (t) => {
    const manager = new t.context.window.ClientManager();
    t.is(manager.clients.size, 0);
});

test('add non-handler Client', (t) => {
    const manager = new t.context.window.ClientManager();
    return t.throwsAsync(manager.addClient({}), t.context.window.TypeError);
});

test('add handler client', async (t) => {
    const handler = new t.context.window.ClientHandler(new FakeClient());
    const manager = new t.context.window.ClientManager();

    await manager.addClient(handler);
    t.is(manager.clients.size, 1);
    t.true(t.context.window.browser.storage.local.set.calledOnce);
    t.deepEqual(t.context.window.browser.storage.local.set.lastCall.args[0], {
        handlers: [ {
            details: {},
            type: t.context.window.ClientManager.GITHUB,
            notifications: handler.NOTIFICATION_NAME,
            id: handler.id,
            handlerId: handler.STORE_PREFIX
        } ]
    });
});

test('saveNotificationFields', async (t) => {
    const manager = new t.context.window.ClientManager();

    await manager.saveFields();
    t.true(t.context.window.browser.storage.local.set.calledOnce);
    t.deepEqual(t.context.window.browser.storage.local.set.lastCall.args[0], {
        handlers: []
    });
});

test('getCount', async (t) => {
    const manager = new t.context.window.ClientManager();

    const count = await manager.getCount();
    t.is(count, 0);
});

test('removeClient', async (t) => {
    const handler = new t.context.window.ClientHandler(new FakeClient());
    const manager = new t.context.window.ClientManager();

    await manager.addClient(handler);
    t.is(manager.clients.size, 1);

    await manager.removeClient(handler);
    t.is(manager.clients.size, 0);
    t.true(t.context.window.browser.storage.local.set.calledTwice);
    t.deepEqual(t.context.window.browser.storage.local.set.lastCall.args[0], {
        handlers: []
    });
});
