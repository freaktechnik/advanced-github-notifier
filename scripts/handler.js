/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const S_TO_MS = 1000;
const HEX = 16;

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

    static getNotificationIcon(notification) {
        if(notification.reason === "invitation") {
            return "images/repo.";
        }
        else if(notification.subject.type == "Issue") {
            return `images/issue-${notification.subjectDetails.state}.`;
        }
        else if(notification.subject.type == "PullRequest") {
            if(notification.subjectDetails.merged) {
                return "images/pull-merged.";
            }

            return `images/pull-${notification.subjectDetails.state}.`;
        }
        else if(notification.subject.type == "Tag" || notification.subject.type == "Release") {
            return "images/tag.";
        }
        // It's a commit

        return "images/comment.";
    }

    constructor(client, area) {
        const uri = new URL(Object.getPrototypeOf(client).constructor.SITE_URI);
        super(uri.hostname + client.id, area);
        this._prefix = uri.hostname;
        this.client = client;
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

    _getNotifications() {
        return this.getValue(ClientHandler.NOTIFICATIONS, []);
    }

    _getNotificationID(githubID) {
        return this.NOTIFICATION_PREFIX + githubID;
    }

    _getOriginalID(id) {
        return id.substr(this.NOTIFICATION_PREFIX.length);
    }

    ownsNotification(id) {
        return id.startsWith(this.NOTIFICATION_PREFIX);
    }

    async _processNewNotifications(json) {
        const { hide } = await browser.storage.local.get({
            hide: false
        });
        const notifications = await this.getValue(ClientHandler.NOTIFICATIONS, []);
        const stillNotificationIds = [];
        let notifs = await Promise.all(json.filter((n) => n.unread).map(async (notification) => {
            notification.id = this._getNotificationID(notification.id);
            stillNotificationIds.push(notification.id);
            let fetchDetails = false;
            const existingNotif = notifications.find((n) => n.id == notification.id);
            if(!existingNotif) {
                notification.new = true;
                fetchDetails = true;
            }
            else if(existingNotif.updated_at != notification.updated_at) {
                fetchDetails = true;
            }
            else {
                notification.subjectDetails = existingNotif.subjectDetails;
                notification.icon = existingNotif.icon;
            }

            if(fetchDetails) {
                try {
                    const details = await this.client.getNotificationDetails(notification);
                    notification.subjectDetails = details;
                    notification.icon = ClientHandler.getNotificationIcon(notification);
                }
                catch(e) {
                    return null;
                }
            }
            if(notification.new) {
                //TODO shouldn't be here
                if(!hide) {
                    await browser.notifications.create(notification.id, {
                        type: "basic",
                        title: notification.subject.title,
                        message: notification.repository.full_name,
                        eventTime: Date.parse(notification.updated_at),
                        iconUrl: `${notification.icon}png`
                    });
                }
            }
            return notification;
        }));
        notifs = notifs.filter((n) => n !== null);

        await this.setValue(ClientHandler.NOTIFICATIONS, notifs);
        return notifs;
    }

    /**
     * @returns {boolean} If something changed.
     */
    async check() {
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
        const authState = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(HEX);
        const rawURL = await browser.identity.launchWebAuthFlow({
            url: this.client.authURL(authState),
            interactive: true
        });
        const url = new URL(rawURL);
        if(!url.searchParams.has("error") && url.searchParams.has("code") &&
            url.searchParams.get("state") == authState) {
            try {
                const token = await this.client.getToken(url.searchParams.get('code'), authState);
                this.storageId = this._prefix + this.client.id;
                await this.setValue(ClientHandler.TOKEN, token);
                await this.setValue(ClientHandler.USERNAME, this.client._username);
            }
            catch(e) {
                throw new Error("Was not granted required permissions");
            }
        }
        else {
            throw new Error(`An error occurred during authorization: ${url.searchParams.get("error_description")}. See ${url.searchParams.get("error_uri")}`);
        }
    }

    async logout() {
        const token = await this.getValue(ClientHandler.TOKEN);
        await this.client.authorize(token, "DELETE");
        await this.removeValues([
            ClientHandler.TOKEN,
            ClientHandler.NOTIFICATIONS,
            ClientHandler.USERNAME
        ]);
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
        catch(e) {
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
            const notifications = await this._getNotifications();
            const notifs = notifications.filter((notification) => notification.id != id);
            await this.set(ClientHandler.NOTIFICATIONS, notifs);
        }
    }

    async getNotificationURL(id) {
        const notifications = await this._getNotifications();
        const notification = notifications.find((n) => n.id == id);
        if(notification) {
            return notification.subjectDetails.html_url;
        }
        return "";
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
}
window.ClientHandler = ClientHandler;
