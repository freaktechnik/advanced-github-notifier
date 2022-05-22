/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const S_TO_MS = 1000;
const HEX = 16;
const TYPES = {
    RepositoryInvitation: "invite",
    Issue: "issue",
    PullRequest: "pull",
    Tag: "release",
    Release: "release",
    RepositoryVulnerabilityAlert: "security",
    RepositoryDependabotAlertsThread: "security",
    TeamDiscussion: "discussion",
    Commit: "commit",
    CheckSuite: "ci",
    Discussion: "discussion"
};
const ICONS = {
    invite: "mail",
    release: "tag",
    security: "alert",
    discussion: "comment",
    commit: "commit",
    ci: "ci"
};

class ClientHandler extends window.Storage {
    static get NOTIFICATIONS() {
        return "notifications";
    }

    static get TOKEN() {
        return "token";
    }

    static get USERNAME() {
        return "username";
    }

    static get SHOW_NOTIFICATIONS() {
        return "showNotifications";
    }

    static getNormalizedType(notification) {
        return TYPES[notification.subject.type] ?? "commit";
    }

    static getNotificationState(notification) {
        if(notification.normalizedType === "issue") {
            return notification.subjectDetails.state;
        }
        if(notification.normalizedType === "pull") {
            if(notification.subjectDetails.merged) {
                return "merged";
            }
            if(notification.subjectDetails.draft && notification.subjectDetails.state === "open") {
                return "wip";
            }
            return notification.subjectDetails.state;
        }
    }

    static getNotificationIcon(notification) {
        if(ICONS[notification.normalizedType]) {
            return `${ICONS[notification.normalizedType]}.`;
        }
        if(notification.normalizedType == "issue") {
            return `issue-${notification.detailState}.`;
        }
        if(notification.normalizedType == "pull") {
            if(notification.detailState === "merged") {
                return "git-merge.";
            }
            if(notification.detailState === "wip") {
                return "git-pull-request-draft.";
            }
            if(notification.detailState === 'open') {
                return "git-pull-request.";
            }
            if(notification.detailState === 'closed') {
                return "git-pull-request-closed.";
            }

            return "git-pull-request-undefined.";
        }

        return "commit.";
    }

    static buildNotificationDetails(notification) {
        // Try to build the details as good as we can
        const subjectDetails = {
            "html_url": this.client.buildSiteURL()
        };

        /* eslint-disable camelcase */
        if(notification.subject.type === "Issue" || notification.subject.type === "PullRequest") {
            subjectDetails.state = "undefined";
            subjectDetails.merged = false;
            subjectDetails.number = parseInt(notification.subject.url.split("/").pop(), 10);
            if("repository" in notification.subject) {
                subjectDetails.html_url = `${notification.subject.repository.html_url}/issues/${subjectDetails.number}`;
            }
        }
        else if("repository" in notification.subject) {
            subjectDetails.html_url = notification.subject.repository.html_url;
        }
        /* eslint-enable camelcase */
        return subjectDetails;
    }

    constructor(client, area) {
        const uri = new URL(client.buildSiteURL());
        super(uri.hostname + client.id, area);
        this._prefix = uri.hostname;
        this.client = client;
        this.pollInterval = 60;
    }

    get STORE_PREFIX() {
        return this.storageId;
    }

    get NOTIFICATION_NAME() {
        return this.getStorageKey(ClientHandler.NOTIFICATIONS);
    }

    get TOKEN_NAME() {
        return this.getStorageKey(ClientHandler.TOKEN);
    }

    get SHOW_NAME() {
        return this.getStorageKey(ClientHandler.SHOW_NOTIFICATIONS);
    }

    get NOTIFICATION_PREFIX() {
        return `${this.STORE_PREFIX}|`;
    }

    get id() {
        return this.client.id;
    }

    set id(id) {
        this.client.id = id;
        this.storageId = this._prefix + id;
    }

    ownsNotification(id) {
        return id.startsWith(this.NOTIFICATION_PREFIX);
    }

    /**
     * @returns {boolean} If something changed.
     */
    async check() {
        if(!this.client.authorized) {
            const authSuccess = await this.checkAuth();
            if(!authSuccess) {
                return false;
            }
        }
        const notifications = await this.client.getNotifications();
        if(notifications) {
            await this._processNewNotifications(notifications);
            return true;
        }
        return false;
    }

    getNextCheckTime() {
        return Date.now() + (this.client.pollInterval * S_TO_MS);
    }

    async login() {
        // User Token Client.
        if(this.client.token) {
            await this.client.getUsername();
            this.storageId = this._prefix + this.client.id;
            await this.setValue(ClientHandler.TOKEN, this.client.token);
            await this.setValue(ClientHandler.USERNAME, this.client._username);
            return true;
        }
        // Do OAuth for non-User-Token clients
        const authState = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(HEX);
        let url;
        try {
            const rawURL = await browser.identity.launchWebAuthFlow({
                url: this.client.authURL(authState),
                interactive: true
            });
            url = new URL(rawURL);
        }
        catch(error) {
            // Ignore if the user cancelled.
            if(error.message === 'User cancelled or denied access.') {
                return false;
            }
            throw error;
        }
        if(!url.searchParams.has("error") && url.searchParams.has("code") &&
            url.searchParams.get("state") == authState) {
            try {
                const token = await this.client.getToken(url.searchParams.get('code'), authState);
                this.storageId = this._prefix + this.client.id;
                await this.setValue(ClientHandler.TOKEN, token);
                await this.setValue(ClientHandler.USERNAME, this.client._username);
            }
            catch(error) {
                throw new Error("Was not granted required permissions");
            }
            return true;
        }
        else if(url.searchParams.get('error') !== 'access_denied') {
            throw new Error(`An error occurred during authorization: "${url.searchParams.get("error_description")}". See ${url.searchParams.get("error_uri")}`);
        }
        // Access denied
        return false;
    }

    async logout(cleanUp = false) {
        if(cleanUp) {
            const token = await this.getValue(ClientHandler.TOKEN);
            await this.client.deauthorize(token);
        }
        const valueToRemove = [ ClientHandler.NOTIFICATIONS ];
        if(cleanUp) {
            valueToRemove.push(ClientHandler.TOKEN, ClientHandler.SHOW_NOTIFICATIONS, ClientHandler.USERNAME);
        }
        else if(this.client.isOauth) {
            valueToRemove.push(ClientHandler.TOKEN);
        }
        await this.removeValues(valueToRemove);
    }

    async checkAuth() {
        if(!this.client.id) {
            return false;
        }
        const token = await this.getValue(ClientHandler.TOKEN);
        if(!token) {
            return false;
        }
        try {
            await this.client.authorize(token);
            await this.setValue(ClientHandler.USERNAME, this.client._username);
        }
        catch(error) {
            await this.logout();
            return false;
        }
        return true;
    }

    async markAsRead(id, remote = true) {
        if(!id) {
            if(remote) {
                await this.client.markNotificationsRead();
            }
            await this.setValue(ClientHandler.NOTIFICATIONS, []);
        }
        else {
            if(remote) {
                const githubID = this._getOriginalID(id);
                await this.client.markNotificationRead(githubID);
            }
            else if(this.client.shouldStayUnread) {
                return;
            }
            const notifications = await this._getNotifications();
            const notifs = notifications.filter((notification) => notification.id != id);
            await this.setValue(ClientHandler.NOTIFICATIONS, notifs);
            try {
                await browser.notifications.clear(id);
            }
            catch(error) {
                // Don't care about notification clear failing
            }
        }
    }

    async getNotificationURL(id) {
        const notifications = await this._getNotifications();
        const notification = notifications.find((n) => n.id == id);
        //TODO get anchor to events after last_read_at for issues/prs
        if(notification) {
            if(!notification.subjectDetails.html_url) {
                return notification.repository.html_url;
            }
            return notification.subjectDetails.html_url;
        }
        return "";
    }

    async willAutoMarkAsRead(id) {
        if(this.client.shouldStayUnread) {
            return false;
        }
        const notifications = await this._getNotifications();
        const notification = notifications.find((n) => n.id == id);
        if(notification?.willStayUnread) {
            return false;
        }
        return true;
    }

    async getCount() {
        const notifications = await this._getNotifications();
        return notifications.length;
    }

    ignoreNotification(id) {
        return this.client.ignoreNotification(this._getOriginalID(id));
    }

    unsubscribeNotification(id) {
        return this.client.unsubscribeNotification(this._getOriginalID(id));
    }

    getDetails() {
        return this.client.getDetails();
    }

    _getNotifications() {
        return this.getValue(ClientHandler.NOTIFICATIONS, []);
    }

    _getNotificationID(githubID) {
        return this.NOTIFICATION_PREFIX + githubID;
    }

    _getOriginalID(id) {
        return id.slice(this.NOTIFICATION_PREFIX.length);
    }

    async _processNewNotifications(json) {
        const { hide } = await browser.storage.local.get({
            hide: false
        });
        const notifications = await this._getNotifications();
        const showNotifications = await this.getValue(ClientHandler.SHOW_NOTIFICATIONS, true);
        const stillNotificationIds = [];
        let notifs = await Promise.all(json.filter((n) => n.unread).map(async (notification) => {
            notification.id = this._getNotificationID(notification.id);
            const existingNotif = notifications.find((n) => n.id == notification.id);
            if(existingNotif) {
                stillNotificationIds.push(notification.id);
            }
            let fetchDetails = true;
            if(!existingNotif) {
                notification.new = true;
            }
            else if(existingNotif.updated_at == notification.updated_at) {
                notification.subjectDetails = existingNotif.subjectDetails;
                notification.normalizedType = ClientHandler.getNormalizedType(notification);
                notification.detailState = ClientHandler.getNotificationState(notification);
                notification.icon = ClientHandler.getNotificationIcon(notification);
                fetchDetails = false;
            }

            if(fetchDetails) {
                try {
                    /* eslint-disable require-atomic-updates */
                    try {
                        const details = await this.client.getNotificationDetails(notification);
                        notification.subjectDetails = details;
                    }
                    catch(error) {
                        notification.subjectDetails = ClientHandler.buildNotificationDetails(notification);
                    }
                    notification.normalizedType = ClientHandler.getNormalizedType(notification);
                    notification.detailState = ClientHandler.getNotificationState(notification);
                    notification.icon = ClientHandler.getNotificationIcon(notification);
                    /* eslint-enable require-atomic-updates */
                }
                catch(error) {
                    return null;
                }
            }
            if(notification.new) {
                //TODO shouldn't be here
                if(!hide && showNotifications) {
                    const typeMessage = browser.i18n.getMessage(`type_${notification.normalizedType}`);
                    let stateMessage = '';
                    if(notification.detailState) {
                        const stateMessageId = `status_${notification.detailState}`;
                        stateMessage = ` (${browser.i18n.getMessage(stateMessageId)})`;
                    }
                    const repoName = notification.repository?.full_name ?? '';
                    const message = `${repoName}
${typeMessage}${stateMessage}`;
                    await browser.notifications.create(notification.id, {
                        type: "basic",
                        title: notification.subject.title,
                        message,
                        eventTime: Date.parse(notification.updated_at),
                        iconUrl: `images/large/${notification.icon}png`
                    });
                }
                delete notification.new;
            }
            return notification;
        }));
        notifs = notifs.filter((n) => n !== null);

        if(!hide && showNotifications) {
            for(const existingNotification of notifications) {
                if(!stillNotificationIds.includes(existingNotification.id)) {
                    try {
                        await browser.notifications.clear(existingNotification.id);
                    }
                    catch(error) {
                        // ignore clearing errors.
                    }
                }
            }
        }

        await this.setValue(ClientHandler.NOTIFICATIONS, notifs);
        return notifs;
    }
}
window.ClientHandler = ClientHandler;
