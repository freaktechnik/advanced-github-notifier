class GitHub {
    static get BASE_URI() {
        return 'https://api.github.com/';
    }

    static get REDIRECT_URI() {
        return '';
    }

    constructor(clientID, clientSecret) {
        this.clientID = clientID;
        this.clientSecret = clientSecret;
        this.lastUpdate = null;
        this.forceRefresh = false;
        this.pollInterval = 60;
        this.headers =  {
            Accept: "application/vnd.github.v3+json"
        };
    }

    get authorized() {
        return "Authorization" in this.headers;
    }

    async getToken(code, authState) {
        const params = new URLSearchParams();
        params.append("client_id", this.clientID);
        params.append("client_secret", this.clientSecret);
        params.append("code", code);
        params.append("redirect_uri", GitHub.REDIRECT_URI);
        params.append("state", authState);

        const response = await fetch("https://github.com/login/oauth/access_token", {
            method: "POST",
            body: params,
            headers: {
                Accept: "application/json"
            }
        });
        if(response.ok) {
            const { access_token: accessToken } = await response.json();
            this.headers.Authorization = `token ${accessToken}`;
            return accessToken;
        }
        else {
            throw response;
        }
    }

    async authorize(token, method = "GET") {
        const response = await fetch(`${GitHub.BASE_URI}applications/${clientId}/tokens/${token}`, {
            method,
            headers: {
                Authorization: `Basic ${window.btoa(this.clientID+":"+this.clientSecret)}`
            }
        });
        if(method == "GET") {
            if(response.status === 200) {
                return response.json();
            }
            else {
                throw "Token invalid";
            }
        }
    }

    deauthorize(token) {
        return this.authorize(token, "DELETE");
    }

    async markNotificationsRead() {
        if(this.lastUpdate !== null && this.authorized) {
            const body = JSON.stringify({ last_read_at: this.lastUpdate });
            const response = await fetch(`${GitHub.BASE_URI}notifications`, {
                headers: this.headers,
                method: "PUT",
                body
            });
            if(response.status == 205) {
                browser.runtime.sendMessage({
                    target: "all-notifications-read"
                });
            } else {
                throw `Marking all notifications read returned a ${response.status} error`;
            }
        }
    }

    async markNotificationRead(notificationID) {
        const response = await fetch(`${GitHub.BASE_URI}notifications/threads/${message.notificationId}`, {
            method: "PATCH",
            headers: this.headers
        });
        if(response.ok) {
            browser.runtime.sendMessage({
                target: "notification-read",
                notificationId: message.notificationId
            });
        } else {
            throw response.status;
        }
    }

    async getNotifications() {
        const response = await fetch(`${GitHub.BASE_URI}notifications`, {
            headers: this.headers,
            // Have to bypass cache when there are notifications, as the Etag doesn't
            // change when notifications are read.
            cache: this.forceRefresh ? "reload" : "no-cache"
        });

        if(response.ok) {
            this.pollInterval = Math.max(
                response.headers.get("X-Poll-Interval"),
                Math.ceil((response.headers.get("X-RateLimit-Reset") - Math.floor(Date.now() / 1000)) / response.headers.get("X-RateLimit-Remaining"))
            );

            const now = new Date();
            this.lastUpdate = now.toISOString();

            if(response.status === 200) {
                const json = await response.json();
                this.forceRefresh = json.length > 0;
                return json;
            }
            return false;
        }
        else {
            throw `${response.status} ${response.statusText}`;
        }
    }

    async getNotificationDetails(notification) {
        const apiEndpoint = notification.subject.url;
        const response = await fetch(apiEndpoint, {
            headers: this.headers
        });
        if(response.ok) {
            return response.json();
        }
        else {
            throw `Could not load details for ${notification.subject.title}: Error ${response.status}`;
        }
    };
}
