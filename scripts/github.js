/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* global redirectUri */
//TODO make the URIs overridable for Enterprise
//TODO replace redirectUri with identity API (blocked by 53 being stable)

const STATUS_OK = 200;
const STATUS_RESET = 205;
const MS_TO_S = 1000;

const parseLinks = (links) => {
    const linkInfo = links.split(",");
    const linkObj = {};
    linkInfo.forEach((link) => {
        const [
            match,
            url,
            rel
        ] = link.match(/<([^>]+)>;\s+rel="([^"]+)"/) || [];
        if(match && url && rel) {
            linkObj[rel] = url;
        }
    });
    return linkObj;
};

// eslint-disable-next-line no-unused-vars
class GitHub {
    static get BASE_URI() {
        return 'https://api.github.com/';
    }

    static get SITE_URI() {
        return 'https://github.com/';
    }

    static get REDIRECT_URI() {
        return new URL(redirectUri);
    }

    static get SCOPE() {
        return "repo";
    }

    static get FOOTER_URLS() {
        return {
            "index": GitHub.SITE_URI,
            "unread": `${GitHub.SITE_URI}notifications`,
            "all": `${GitHub.SITE_URI}notifications?all=1`,
            "participating": `${GitHub.SITE_URI}notifications/participating`,
            "watched": `${GitHub.SITE_URI}watched`
        };
    }

    constructor(clientID, clientSecret) {
        this.clientID = clientID;
        this.clientSecret = clientSecret;
        this.lastUpdate = null;
        this.forceRefresh = false;
        this.pollInterval = 60;
        this._username = "";
        this.headers = {
            Accept: "application/vnd.github.v3+json"
        };
    }

    get authorized() {
        return "Authorization" in this.headers;
    }

    get infoURL() {
        return `${GitHub.SITE_URI}settings/connections/applications/${this.clientID}`;
    }

    get username() {
        return this._username;
    }

    authURL(authState) {
        return `${GitHub.SITE_URI}login/oauth/authorize?client_id=${this.clientID}&scope=${GitHub.SCOPE}&state=${authState}&redirect_uri=${GitHub.REDIRECT_URI.toString()}`;
    }

    setToken(token) {
        this.headers.Authorization = `token ${token}`;
    }

    unsetToken() {
        delete this.headers.Authorization;
    }

    async getToken(code, authState) {
        const params = new URLSearchParams();
        params.append("client_id", this.clientID);
        params.append("client_secret", this.clientSecret);
        params.append("code", code);
        params.append("redirect_uri", GitHub.REDIRECT_URI.toString());
        params.append("state", authState);

        const response = await fetch(`${GitHub.SITE_URI}login/oauth/access_token`, {
            method: "POST",
            body: params,
            headers: {
                Accept: "application/json"
            }
        });
        //TODO requeue on network errors
        if(response.ok) {
            const {
                access_token: accessToken, scope
            } = await response.json();
            if(!scope.includes(GitHub.SCOPE)) {
                throw new Error("Was not granted required permissions");
            }
            else {
                this.setToken(accessToken);
                await this.getUsername();
                return accessToken;
            }
        }
        else {
            throw response;
        }
    }

    async getUsername() {
        const response = await fetch(`${GitHub.BASE_URI}user`, {
            headers: this.headers
        });
        if(response.ok && response.status === STATUS_OK) {
            const json = await response.json();
            this._username = json.login;
            this.id = json.id;
        }
    }

    async authorize(token, method = "GET") {
        const response = await fetch(`${GitHub.BASE_URI}applications/${this.clientID}/tokens/${token}`, {
            method,
            headers: {
                Authorization: `Basic ${window.btoa(`${this.clientID}:${this.clientSecret}`)}`
            }
        });
        if(method == "GET") {
            if(response.ok && response.status === STATUS_OK) {
                const json = await response.json();
                this._username = json.user.login;
                this.id = json.user.id;
                if(json.scopes.includes(GitHub.SCOPE)) {
                    this.setToken(token);
                    return true;
                }

                throw new Error("Not all required scopes given");
            }
            else {
                throw new Error("Token invalid");
            }
        }
        else if(method == "DELETE") {
            this.unsetToken();
        }
        return "Token updated";
    }

    deauthorize(token) {
        return this.authorize(token, "DELETE");
    }

    async markNotificationsRead() {
        if(this.lastUpdate !== null && this.authorized) {
            const body = JSON.stringify({ "last_read_at": this.lastUpdate });
            const response = await fetch(`${GitHub.BASE_URI}notifications`, {
                headers: this.headers,
                method: "PUT",
                body
            });
            if(response.ok && response.status == STATUS_RESET) {
                return true;
            }

            throw new Error(`Marking all notifications read returned a ${response.status} error`);
        }
        return false;
    }

    async markNotificationRead(notificationID) {
        const response = await fetch(`${GitHub.BASE_URI}notifications/threads/${notificationID}`, {
            method: "PATCH",
            headers: this.headers
        });
        if(response.ok) {
            return true;
        }
        throw new Error(`Marking ${notificationID} as read returned a ${response.status} error`);
    }

    async unsubscribeNotification(notificationId) {
        const response = await fetch(`${GitHub.BASE_URI}notifications/threads/${notificationId}/subscription`, {
            method: "PUT",
            headers: this.headers,
            body: `{"subscribed":false}`
        });

        if(!response.ok) {
            throw new Error(response.status);
        }
    }

    async ignoreNotification(notificationId) {
        const response = await fetch(`${GitHub.BASE_URI}notifications/threads/${notificationId}/subscription`, {
            method: "PUT",
            headers: this.headers,
            body: `{"subscribed":false,"ignored":true}`
        });

        if(!response.ok) {
            throw new Error(response.status);
        }
    }

    async getNotifications(url = `${GitHub.BASE_URI}notifications`) {
        const response = await fetch(url, {
            headers: this.headers,
            // Have to bypass cache when there are notifications, as the Etag doesn't
            // change when notifications are read.
            cache: this.forceRefresh ? "reload" : "no-cache"
        });

        if(response.ok) {
            this.pollInterval = Math.max(
                response.headers.get("X-Poll-Interval"),
                Math.ceil((response.headers.get("X-RateLimit-Reset") - Math.floor(Date.now() / MS_TO_S)) / response.headers.get("X-RateLimit-Remaining"))
            );

            const now = new Date();
            this.lastUpdate = now.toISOString();

            if(response.status === STATUS_OK) {
                const json = await response.json();

                // There is some pagination here.
                if(response.headers.has('Link')) {
                    const links = parseLinks(response.headers.get('Link'));
                    if("next" in links) {
                        // get next page
                        const nextPage = await this.getNotifications(links.next);
                        this.forceRefresh = !!json.length;
                        return json.concat(nextPage);
                    }
                }
                this.forceRefresh = !!json.length;
                return json;
            }
            return false;
        }

        throw new Error(`${response.status} ${response.statusText}`);
    }

    async getNotificationDetails(notification) {
        const apiEndpoint = notification.subject.url;
        const response = await fetch(apiEndpoint, {
            headers: this.headers
        });
        if(response.ok) {
            return response.json();
        }

        throw new Error(`Could not load details for ${notification.subject.title}: Error ${response.status}`);
    }
}
