/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

class GitHubEnterprise extends window.GitHub {
    static buildArgs(clientID, clientSecret, details) {
        return [
            details.clientId,
            details.clientSecret,
            details.instanceURL
        ];
    }

    constructor(clientID, clientSecret, baseURI) {
        super(clientID, clientSecret);
        this.instanceURL = baseURI;
        if(!this.instanceURL.endsWith('/')) {
            this.instanceURL += '/';
        }
    }

    buildSiteURL(endpoint = '') {
        return this.instanceURL + endpoint;
    }

    buildAPIURL(endpoint = '') {
        return this.buildSiteURL(`api/v3/${endpoint}`);
    }

    getDetails() {
        return {
            clientId: this.clientID,
            clientSecret: this.clientSecret,
            instanceURL: this.instanceURL
        };
    }
}

window.GitHubEnterprise = GitHubEnterprise;
