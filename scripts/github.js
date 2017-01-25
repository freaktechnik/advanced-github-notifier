/* global redirectUri */
class GitHub {
    static get BASE_URI() {
        return 'https://api.github.com/';
    }

    static get REDIRECT_URI() {
        return new URL(redirectUri);
    }

    static get SCOPE() {
        return "repo";
    }

    constructor(clientID, clientSecret) {
        this.clientID = clientID;
        this.clientSecret = clientSecret;
        this.lastUpdate = null;
        this.forceRefresh = false;
        this.pollInterval = 60;
        this.headers = {
            Accept: "application/vnd.github.v3+json"
        };
    }

    get authorized() {
        return "Authorization" in this.headers;
    }

    authURL(authState) {
        return `https://github.com/login/oauth/authorize?client_id=${this.clientID}&scope=${GitHub.SCOPE}&state=${authState}&redirect_uri=${GitHub.REDIRECT_URI.toString()}`;
    }

    setToken(token) {
        this.headers.Authorization = `token ${token}`;
    }

    async getToken(code, authState) {
        const params = new URLSearchParams();
        params.append("client_id", this.clientID);
        params.append("client_secret", this.clientSecret);
        params.append("code", code);
        params.append("redirect_uri", GitHub.REDIRECT_URI.toString());
        params.append("state", authState);

        const response = await fetch("https://github.com/login/oauth/access_token", {
            method: "POST",
            body: params,
            headers: {
                Accept: "application/json"
            }
        });
        if(response.ok) {
            const { access_token: accessToken, scope } = await response.json();
            if(!scope.includes(GitHub.SCOPE)) {
                throw "Was not granted required permissions";
            }
            else {
                this.setToken(accessToken);
                return accessToken;
            }
        }
        else {
            throw response;
        }
    }

    async authorize(token, method = "GET") {
        const response = await fetch(`${GitHub.BASE_URI}applications/${this.clientID}/tokens/${token}`, {
            method,
            headers: {
                Authorization: `Basic ${window.btoa(this.clientID + ":" + this.clientSecret)}`
            }
        });
        if(method == "GET") {
            if(response.status === 200) {
                const json = await response.json();
                if(json.scopes.includes(GitHub.SCOPE)) {
                    this.setToken(token);
                    return true;
                }
                else {
                    throw "Not all required scopes given";
                }
            }
            else {
                throw "Token invalid";
            }
        }
        return "Token updated";
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
                return true;
            }
            else {
                throw `Marking all notifications read returned a ${response.status} error`;
            }
        }
        return false;
    }

    async markNotificationRead(notificationID) {
        const response = await fetch(`${GitHub.BASE_URI}notifications/threads/${notificationID}`, {
            method: "PATCH",
            headers: this.headers
        });
        if(response.ok) {
            browser.runtime.sendMessage({
                target: "notification-read",
                notificationId: notificationID
            });
        }
        else {
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
    }
}
