/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const loaded = new Promise((resolve) => {
    window.addEventListener("DOMContentLoaded", resolve, {
        capture: true,
        passive: true,
        once: true
    });
});
const idPrefix = "ghnotif";

const clickListener = (id) => {
    browser.runtime.sendMessage({
        topic: "open-notification",
        notificationId: id
    });
    window.close();
};

const contextMenu = {
    target: null,
    init() {
        document.getElementById("markAsRead").addEventListener("click", () => this.markAsRead(), {
            capture: false,
            passive: true
        });
    },
    openFor(notificationId) {
        this.target = notificationId;
    },
    markAsRead() {
        browser.runtime.sendMessage({
            topic: "mark-notification-read",
            notificationId: this.target
        });
    }
};

const createNotification = (notification) => {
    const root = document.createElement("li");
    root.id = idPrefix + notification.id;
    root.classList.add("panel-list-item");

    const image = new Image(16, 16);
    image.src = notification.icon + "svg";
    image.classList.add("icon");

    const title = document.createElement("span");
    title.classList.add("text");
    title.textContent = notification.subject.title;

    const repo = document.createElement("span");
    repo.classList.add("text-shortcut");
    repo.textContent = notification.repository.full_name;

    root.append(image, title, repo);
    root.addEventListener("click", clickListener.bind(null, notification.id));
    root.addEventListener("contextmenu", () => contextMenu.openFor(notification.id));
    const parent = document.getElementById("notifications");
    parent.append(root);
    parent.hidden = false;

    document.getElementById("empty").hidden = true;
    document.getElementById("mark-read").classList.remove("disabled");
};

const deleteNotification = (notificationId) => {
    const root = document.getElementById(idPrefix + notificationId);
    if(root) {
        root.remove();
    }

    const parent = document.getElementById("notifications");
    if(parent.childElementCount == 0) {
        document.getElementById("empty").hidden = false;
        parent.hidden = true;
        document.getElementById("mark-read").classList.remove("disabled");
    }
};

browser.runtime.onMessage.addListener((message) => {
    if(message.topic === "new-notification") {
        createNotification(message.notification);
    }
    else if(message.topic === "notification-read") {
        deleteNotification(message.notificationId);
    }
    else if(message.topic === "all-notifications-read") {
        const container = document.getElementById("notifications");
        while(container.hasChildNodes()) {
            container.firstChild.remove();
        }
    }
});

loaded.then(() => {
    const open = document.getElementById("open");
    browser.storage.local.get({
        "footer": "all"
    }).then(({ footer }) => {
        if(footer == "hidden") {
            open.parentNode.hidden = true;
        }
        else {
            open.addEventListener("click", () => {
                browser.runtime.sendMessage({ topic: "open-notifications" });
                window.close();
            }, {
                capture: false,
                passive: true
            });
            open.textContent = browser.i18n.getMessage(`footer_${footer}`);
        }
    });

    const markRead = document.getElementById("mark-read");
    markRead.addEventListener("click", () => {
        if(!markRead.classList.contains("disabled")) {
            browser.runtime.sendMessage({ topic: "mark-all-read" });
        }
    }, {
        capture: false,
        passive: true
    });

    contextMenu.init();
});

Promise.all([
    browser.storage.local.get("notifications"),
    loaded
]).then(([ result, l ]) => {
    const notifications = result.notifications || [];
    for(let notification of notifications) {
        createNotification(notification);
    }
});
