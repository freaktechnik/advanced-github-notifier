import test from 'ava';
import { default as browser } from "sinon-chrome/webextensions/index.js";
import GitHub from '../scripts/github.js';
import { stub } from "sinon";

test.before((t) => {
    globalThis.browser = browser;
    t.context.originalFetch = fetch;
    globalThis.fetch = stub();
    browser.identity.getRedirectURL.returns('https://example.com');
});

test.after((t) => {
    globalThis.browser = undefined;
    globalThis.fetch = t.context.originalFetch;
});

test.serial.afterEach.always(() => {
    browser.flush();
});

const STATIC_STRING_CONSTANTS = [
    'BASE_URI',
    'SITE_URI',
    'SCOPE',
];

const testStaticConstants = (t, property) => {
    t.true(property in GitHub);
    t.is(typeof GitHub[property], 'string');
};
testStaticConstants.title = (title, property) => `${title} ${property}`;

for(const property of STATIC_STRING_CONSTANTS) {
    test('static', testStaticConstants, property);
}

test('redirect URI', (t) => {
    t.true(GitHub.REDIRECT_URI instanceof URL);

    const redirectUri = new URL(`${browser.identity.getRedirectURL()}login`);
    t.deepEqual(GitHub.REDIRECT_URI.toString(), redirectUri.toString());
});

test('footer urls', (t) => {
    t.true("FOOTER_URLS" in GitHub);

    t.is(typeof GitHub.FOOTER_URLS, 'object');

    const properties = [
        'index',
        'unread',
        'all',
        'participating',
        'watched',
    ];
    for(const p of properties) {
        t.true(p in GitHub.FOOTER_URLS);
        t.true(GitHub.FOOTER_URLS[p].includes(GitHub.SITE_URI));
    }
});

test('construction', (t) => {
    const clientId = 'foo';
    const clientSecret = 'bar';
    const client = new GitHub(clientId, clientSecret);

    t.is(client.clientID, clientId);
    t.is(client.clientSecret, clientSecret);
    t.is(client.lastUpdate, null);
    t.false(client.forceRefresh);
    t.is(client.pollInterval, 60);
    t.is(client._username, '');
    t.deepEqual(client.headers, {
        Accept: "application/vnd.github+json",
        'X-GitHub-Api-Version': '2022-11-28',
    });
});

test('not authorized', (t) => {
    const client = new GitHub();

    t.false(client.authorized);
});

test('authorized', (t) => {
    const client = new GitHub();
    client.headers.Authorization = 'lorem upsum';

    t.true(client.authorized);
});

test('info url', (t) => {
    const clientId = 'foo';
    const client = new GitHub(clientId);

    t.is(client.infoURL, `${GitHub.SITE_URI}settings/connections/applications/${clientId}`);
});

test('username', (t) => {
    const client = new GitHub();

    t.is(client.username, '');

    client._username = 'lorem upsum';
    t.is(client.username, 'lorem upsum');
});

test('auth url', (t) => {
    const clientId = 'foo bar';
    const client = new GitHub(clientId);
    const authState = 'lorem ipsum';
    t.is(client.authURL(authState), `${GitHub.SITE_URI}login/oauth/authorize?client_id=${clientId}&scope=${GitHub.SCOPE}&state=${authState}&redirect_uri=${encodeURIComponent(GitHub.REDIRECT_URI.toString())}`);
});

test('set token', (t) => {
    const client = new GitHub();

    const token = 'baz';
    client.setToken(token);

    t.true(client.authorized);
    t.is(client.headers.Authorization, `token ${token}`);
});

test('unset token', (t) => {
    const client = new GitHub();
    client.setToken('lorem ipsum');

    client.unsetToken();
    t.false(client.authorized);
});
