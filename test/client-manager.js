import test from 'ava';
import getEnv from './_env';
import { FakeClient } from './_mocks';

test.beforeEach(async (t) => {
    const dom = await getEnv([
        '../scripts/handler.js',
        '../scripts/client-manager.js'
    ]);
    t.context.window = dom.window;
});

test.afterEach.always((t) => {
    t.context.window.close();
});

test('constructor', (t) => {
    const manager = new t.context.window.ClientManager();
    t.is(manager.clients.size, 0);
});

test('add non-handler Client', (t) => {
    const manager = new t.context.window.ClientManager();
    return t.throws(manager.addClient({}), t.context.window.TypeError);
});

test('add handler client', async (t) => {
    const handler = new t.context.window.ClientHandler(new FakeClient());
    const manager = new t.context.window.ClientManager();

    await manager.addClient(handler);
    t.is(manager.clients.size, 1);
    t.true(t.context.window.browser.storage.local.set.calledOnce);
    t.deepEqual(t.context.window.browser.storage.local.set.lastCall.args[0], {
        notifications: [
            handler.NOTIFICATIONS_NAME
        ]
    });
});

test('saveNotificationFields', async (t) => {
    const manager = new t.context.window.ClientManager();

    await manager.saveNotificationFields();
    t.true(t.context.window.browser.storage.local.set.calledOnce);
    t.deepEqual(t.context.window.browser.storage.local.set.lastCall.args[0], {
        notifications: []
    });
});

test('getCount', async (t) => {
    const manager = new t.context.window.ClientManager();

    const count = await manager.getCount();
    t.is(count, 0);
});
