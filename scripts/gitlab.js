/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/* global STATUS_OK, STATUS_RESET, parseLinks */

// https://docs.gitlab.com/ee/api/todos.html

class GitLab {
    static get TYPE_TO_GH() {
        return {
            Issue: 'Issue',
            MergeRequest: 'PullRequest',
            Commit: 'Commit',
            Epic: 'Issue',
            'DesignManagement::Design': 'TeamDiscussion',
            'AlertManagement::Alert': 'RepositoryVulnerabilityAlert'
        };
    }
    static get STATE_TO_GH() {
        return {
            opened: 'open',
            closed: 'closed',
            merged: 'closed',
            locked: 'undefined'
        };
    }
    static get PREFIX_BY_TYPE() {
        return {
            Issue: '#',
            MergeRequest: '!',
            Epic: '&'
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
        this.headers['PRIVATE-TOKEN'] = token;
    }

    get authorized() {
        return "PRIVATE-TOKEN" in this.headers;
    }

    get infoURL() {
        return this.buildSiteURL('-/profile/personal_access_tokens');
    }

    get username() {
        return this._username;
    }

    get shouldStayUnread() {
        return true;
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
            this._username = json.username;
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
        return this.buildSiteURL(`api/v4/${endpoint}`);
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

    async markNotificationsRead() {
        if(this.lastUpdate !== undefined && this.authorized) {
            const response = await fetch(this.buildAPIURL('todos/mark_as_done'), {
                headers: this.headers,
                method: 'POST'
            });
            if(response.ok && response.status == STATUS_RESET) {
                return true;
            }

            throw new Error(`Marking all notifications read returned a ${response.status} error`);
        }
        return false;
    }

    async markNotificationRead(notificationID) {
        const response = await fetch(this.buildAPIURL(`todos/${notificationID}/mark_as_done`, {
            headers: this.headers,
            method: 'POST'
        }));
        if(response.ok && response.status == STATUS_RESET) {
            return true;
        }
        throw new Error(`Marking ${notificationID} as read returned a ${response.status} error`);
    }

    async unsubscribeNotification() {
        throw new Error("Not available");
    }
    async ignoreNotification() {
        throw new Error("Not available");
    }

    async getNotifications(url = this.buildAPIURL('todos?per_page=100')) {
        const response = await fetch(url, {
            headers: this.headers
        });
        if(response.ok) {
            this.lastUpdate = new Date().toISOString();
            if(response.status === STATUS_OK) {
                const json = (await response.json()).map((todo) => {
                    const subject = {
                        type: GitLab.TYPE_TO_GH[todo.target_type],
                        url: todo.target_url,
                        state: todo.target.state,
                        originalTarget: todo.target,
                        originalType: todo.target_type,
                        title: todo.body
                    };
                    if(todo.project) {
                        subject.repository = {
                            'html_url': this.buildSiteURL(todo.project.path_with_namespace),
                            'full_name': todo.project.path_with_namespace
                        };
                    }
                    return {
                        id: todo.id,
                        subject,
                        'updated_at': todo.updated_at,
                        unread: todo.state === 'pending',
                        repository: subject.repository
                    };
                });

                if(response.headers.has('Link')) {
                    const links = parseLinks(response.headers.get('Link'));
                    if("next" in links) {
                        const nextPage = await this.getNoficiations(links.next);
                        return json.concat(nextPage);
                    }
                }
                return json;
            }
            return false;
        }

        throw new Error(`${response.status} ${response.statusText}`);
    }

    async getNotificationDetails(notification) {
        return {
            'html_url': notification.subject.url,
            state: GitLab.STATE_TO_GH[notification.subject.state],
            merged: notification.subject.state === "merged",
            draft: notification.subject.originalTarget.draft,
            number: notification.subject.originalTarget.iid,
            prefix: GitLab.PREFIX_BY_TYPE[notification.subject.originalType] ?? '',
            canUnsubscribe: false,
            canIgnore: false
        };
    }
}

window.GitLab = GitLab;
