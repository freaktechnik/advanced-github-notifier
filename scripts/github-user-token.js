/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import GitHub from "./github.js";

export default class GitHubUserToken extends GitHub {
    static buildArgs(clientID, clientSecret, details) {
        return [ details.token ];
    }

    constructor(token) {
        super();
        this.token = token;
        this.setToken(token);
    }

    get isOauth() {
        return false;
    }

    async getToken() {
        return this.token;
    }

    async authorize(token, method = "POST") {
        //TODO check scopes of token we have in this.token.
        if(method === "POST") {
            await this.getUsername();
        }
    }

    deauthorize() {
        // noop, user token is created by user.
    }

    getDetails() {
        return {
            token: this.token,
        };
    }
}
