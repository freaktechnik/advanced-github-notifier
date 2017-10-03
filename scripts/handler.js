/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

//TODO handler-specific notification IDs
//TODO fix panel

const S_TO_MS = 1000;
const HEX = 16;

class ClientHandler {
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

    constructor(client) {
        this.client = client;
        const uri = new URL(Object.getPrototypeOf(this.client).constructor.SITE_URI);
        this._prefix = uri.hostname;
    }

    get STORE_PREFIX() {
        return this._prefix + this.client.id;
    }

    get TOKEN_NAME() {
        return `${this.STORE_PREFIX}_token`;
    }

    get NOTIFICATIONS_NAME() {
        return `${this.STORE_PREFIX}_notifications`;
    }

    async _getNotifications() {
        const { [this.NOTIFICATIONS_NAME]: notifications = [] } = await browser.storage.local.get(this.NOTIFICATIONS_NAME);
        return notifications;
    }

    async _processNewNotifications(json) {
        const {
            [this.NOTIFICATIONS_NAME]: notifications = [], hide
        } = await browser.storage.local.get([
            this.NOTIFICATIONS_NAME,
            "hide"
        ]);
        const stillNotificationIds = [];
        let notifs = await Promise.all(json.filter((n) => n.unread).map(async (notification) => {
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
                browser.runtime.sendMessage({
                    topic: "new-notification",
                    notification
                });
            }
            return notification;
        }));
        notifs = notifs.filter((n) => n !== null);

        notifications.filter((n) => !stillNotificationIds.includes(n.id)).forEach((notification) => {
            //TODO shouldn't be here
            browser.runtime.sendMessage({
                topic: "notification-read",
                notificationId: notification.id
            });
        });

        await browser.storage.local.set({
            [this.NOTIFICATIONS_NAME]: notifs
        });
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
                await browser.storage.local.set({
                    [this.TOKEN_NAME]: token
                });
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
        const { [this.TOKEN_NAME]: token } = await browser.storage.local.get(this.TOKEN_NAME);
        await this.client.authorize(token, "DELETE");
        await browser.storage.local.set({
            [this.TOKEN_NAME]: "",
            [this.NOTIFICATIONS_NAME]: []
        });
    }

    async checkAuth() {
        const { [this.TOKEN_NAME]: token } = await browser.storage.local.get(this.TOKEN_NAME);
        if(!token) {
            return false;
        }
        try {
            await this.client.authorize(token);
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
            await browser.storage.local.set({
                [this.NOTIFICATIONS_NAME]: []
            });
        }
        else {
            if(remote) {
                await this.client.markNotificationRead(id);
            }
            const notifications = await this._getNotifications();
            const notifs = notifications.filter((notification) => notification.id != id);
            await browser.storage.local.set({
                [this.NOTIFICATIONS_NAME]: notifs
            });
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
        return this.client.ignoreNotification(id);
    }

    unsubscribeNotification(id) {
        return this.client.unsubscribeNotification(id);
    }
}
window.ClientHandler = ClientHandler;
