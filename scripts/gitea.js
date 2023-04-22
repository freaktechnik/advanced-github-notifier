/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/* global STATUS_OK, STATUS_RESET */
const PAGE_SIZE = 100;

class Gitea {
    static get TYPE_TO_GH() {
        return {
            Pull: 'PullRequest',
            Issue: 'Issue',
            Commit: 'Commit',
            Repository: 'Repository'
        };
    }

    static buildArgs(clientID, clientSecret, details) {
        return [
            details.token,
            details.instanceURL
        ];
    }

    constructor(token, baseURI) {
        this.token = token;
        this.instanceURL = baseURI;
        if(!this.instanceURL.endsWith('/')) {
            this.instanceURL += '/';
        }
        this.lastUpdate = undefined;
        this.pollInterval = 60;
        this._username = "";
        this.headers = {
            Accept: "application/json"
        };
        this.headers.Authorization = `token ${token}`;
    }

    get authorized() {
        return "Authorization" in this.headers;
    }

    get infoURL() {
        return this.buildSiteURL(`settings/connections/applications/${this.clientID}`);
    }

    get username() {
        return this._username;
    }

    get isOauth() {
        return false;
    }

    async getToken() {
        return this.token;
    }

    async getUsername() {
        const response = await fetch(this.buildAPIURL('user'), {
            headers: this.headers
        });
        if(response.ok && response.status === STATUS_OK) {
            const json = await response.json();
            this._username = json.login;
            this.id = json.id;
        }
    }

    async authorize(token, method = "POST") {
        //TODO check scopes of token we have in this.token.
        if(method === "POST") {
            await this.getUsername();
        }
    }


    buildSiteURL(endpoint = '') {
        return this.instanceURL + endpoint;
    }

    buildAPIURL(endpoint = '') {
        return this.buildSiteURL(`api/v1/${endpoint}`);
    }

    deauthorize() {
        // noop, user token is created by user.
    }

    getDetails() {
        return {
            token: this.token,
            instanceURL: this.instanceURL
        };
    }

    async unsubscribeNotification() {
        throw new Error("Not available");
    }
    async ignoreNotification() {
        throw new Error("Not available");
    }

    async markNotificationsRead() {
        if(this.lastUpdate !== undefined && this.authorized) {
            const response = await fetch(this.buildAPIURL(`notifications?last_read_at=${this.lastUpdate}`), {
                headers: this.headers,
                method: 'PUT'
            });
            if(response.ok && response.status == STATUS_RESET) {
                return true;
            }

            throw new Error(`Marking all notifications read returned a ${response.status} error`);
        }
        return false;
    }

    async markNotificationRead(notificationID) {
        const response = await fetch(this.buildAPIURL(`notifications/threads/${notificationID}`, {
            headers: this.headers,
            method: 'PATCH'
        }));
        if(response.ok && response.status == STATUS_RESET) {
            return true;
        }
        throw new Error(`Marking ${notificationID} as read returned a ${response.status} error`);
    }

    async getNotifications(url = this.buildAPIURL(`notifications?limit=${PAGE_SIZE}`)) {
        const response = await fetch(url, {
            headers: this.headers
        });
        if(response.ok) {
            this.lastUpdate = new Date().toISOString();
            if(response.status === STATUS_OK) {
                const json = (await response.json()).map((notification) => {
                    notification.subject.type = Gitea.TYPE_TO_GH[notification.subject.type];
                    return notification;
                });
                if(json.length === PAGE_SIZE) {
                    const NEXT = 1;
                    const parsedUrl = new URL(url);
                    const currentPage = Number.parseInt(parsedUrl.searchParams.get('page') ?? '1', 10);
                    const nextPage = await this.getNotifications(this.buildAPIURL(`notifications?limit=${PAGE_SIZE}&page=${currentPage + NEXT}`));
                    return json.concat(nextPage);
                }
                return json;
            }
            return false;
        }

        throw new Error(`${response.status} ${response.statusText}`);
    }

    async getNotificationDetails(notification) {
        const response = await fetch(notification.subject.url, {
            headers: this.headers
        });
        if(response.ok) {
            const json = await response.json();
            json.canUnsubscribe = false;
            json.canIgnore = false;
            if(json.pull_request) {
                json.merged = json.pull_request.merged;
            }
            if(notification.subject.latest_comment_url) {
                try {
                    const comment = await fetch(notification.subject.latest_comment_url, {
                        headers: this.headers
                    });
                    if(comment.ok) {
                        const commentDetails = await comment.json();
                        json.html_url = commentDetails.html_url; // eslint-disable-line camelcase, xss/no-mixed-html
                    }
                    else {
                        throw new Error("could not fetch comment details");
                    }
                }
                catch{
                    json.html_url = notification.subject.latest_comment_url; // eslint-disable-line camelcase, xss/no-mixed-html
                }
            }
            return json;
        }
        let fallbackUrl = this.buildSiteURL();
        if(notification.subject.latest_comment_url) {
            try {
                const comment = await fetch(notification.subject.latest_comment_url, {
                    headers: this.headers
                });
                if(comment.ok) {
                    const commentDetails = await comment.json();
                    fallbackUrl = commentDetails.html_url; // eslint-disable-line xss/no-mixed-html
                }
                else {
                    throw new Error("could not fetch comment details");
                }
            }
            catch{
                fallbackUrl = notification.subject.latest_comment_url; // eslint-disable-line xss/no-mixed-html
            }
        }
        else if(notification.subject.type === 'Issue' || notification.subject.type === 'PullRequest') {
            fallbackUrl = `${notification.subject.repository.html_url}/issues/${notification.subject.number}`; // eslint-disable-line xss/no-mixed-html
        }
        else if(notification.repository?.html_url) {
            fallbackUrl = notification.repository.html_url; // eslint-disable-line xss/no-mixed-html
        }
        return {
            'html_url': fallbackUrl,
            state: notification.subject.state,
            title: notification.subject.title,
            number: Number.parseInt(notification.subject.url.split('/').pop(), 10),
            canUnsubscribe: false,
            canIgnore: false
        };
    }
}

window.Gitea = Gitea;
