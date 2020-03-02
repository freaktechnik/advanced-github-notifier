import test from 'ava';
import {
    getEnv as getEnvironment, cleanUp
} from './_env';

test.beforeEach(async (t) => {
    const dom = await getEnvironment([ '../scripts/github.js' ]);
    t.context.window = dom.window;
    dom.window.redirectUri = 'https://example.com';
});

test.afterEach.always((t) => {
    cleanUp(t.context.window);
});

const STATIC_STRING_CONSTANTS = [
    'BASE_URI',
    'SITE_URI',
    'SCOPE'
];

const testStaticConstants = (t, property) => {
    t.true(property in t.context.window.GitHub);
    t.is(typeof t.context.window.GitHub[property], 'string');
};
testStaticConstants.title = (title, property) => `${title} ${property}`;

for(const property of STATIC_STRING_CONSTANTS) {
    test('static', testStaticConstants, property);
}

test('redirect URI', (t) => {
    t.true(t.context.window.GitHub.REDIRECT_URI instanceof t.context.window.URL);

    const redirectUri = new t.context.window.URL(t.context.window.redirectUri);
    t.deepEqual(t.context.window.GitHub.REDIRECT_URI.toString(), redirectUri.toString());
});

test('footer urls', (t) => {
    const { GitHub } = t.context.window;
    t.true("FOOTER_URLS" in GitHub);

    t.is(typeof GitHub.FOOTER_URLS, 'object');

    const properties = [
        'index',
        'unread',
        'all',
        'participating',
        'watched'
    ];
    for(const p of properties) {
        t.true(p in GitHub.FOOTER_URLS);
        t.true(GitHub.FOOTER_URLS[p].includes(GitHub.SITE_URI));
    }
});

test('construction', (t) => {
    const clientId = 'foo';
    const clientSecret = 'bar';
    const client = new t.context.window.GitHub(clientId, clientSecret);

    t.is(client.clientID, clientId);
    t.is(client.clientSecret, clientSecret);
    t.is(client.lastUpdate, null);
    t.false(client.forceRefresh);
    t.is(client.pollInterval, 60);
    t.is(client._username, '');
    t.deepEqual(client.headers, {
        Accept: "application/vnd.github.v3+json"
    });
});

test('not authorized', (t) => {
    const client = new t.context.window.GitHub();

    t.false(client.authorized);
});

test('authorized', (t) => {
    const client = new t.context.window.GitHub();
    client.headers.Authorization = 'lorem upsum';

    t.true(client.authorized);
});

test('info url', (t) => {
    const clientId = 'foo';
    const client = new t.context.window.GitHub(clientId);

    t.is(client.infoURL, `${t.context.window.GitHub.SITE_URI}settings/connections/applications/${clientId}`);
});

test('username', (t) => {
    const client = new t.context.window.GitHub();

    t.is(client.username, '');

    client._username = 'lorem upsum';
    t.is(client.username, 'lorem upsum');
});

test('auth url', (t) => {
    const { GitHub } = t.context.window;
    const clientId = 'foo bar';
    const client = new GitHub(clientId);
    const authState = 'lorem ipsum';
    t.is(client.authURL(authState), `${GitHub.SITE_URI}login/oauth/authorize?client_id=${clientId}&scope=${GitHub.SCOPE}&state=${authState}&redirect_uri=${encodeURIComponent(GitHub.REDIRECT_URI.toString())}`);
});

test('set token', (t) => {
    const client = new t.context.window.GitHub();

    const token = 'baz';
    client.setToken(token);

    t.true(client.authorized);
    t.is(client.headers.Authorization, `token ${token}`);
});

test('unset token', (t) => {
    const client = new t.context.window.GitHub();
    client.setToken('lorem ipsum');

    client.unsetToken();
    t.false(client.authorized);
});
