/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/* global GitHub */
class GitHubEnterprise extends GitHub {
    constructor(clientID, clientSecret, baseURI) {
        super(clientID, clientSecret);
        this.instanceURL = baseURI;
        if(!this.instanceURL.endsWith('/')) {
            this.instanceURL += '/';
        }
    }

    buildSiteUrl(endpoint) {
        return this.instanceURL + endpoint;
    }

    buildAPIUrl(endpoint) {
        return this.buildSiteUrl(`api/v3/${endpoint}`);
    }
}

window.GitHubEnterprise = GitHubEnterprise;
