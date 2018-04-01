class FakeClient {
    static get SITE_URI() {
        return 'https://example.com';
    }

    buildSiteURL(endpoint = '') {
        return FakeClient.SITE_URI + endpoint;
    }

    getDetails() {
        return {};
    }
}

export { FakeClient };
