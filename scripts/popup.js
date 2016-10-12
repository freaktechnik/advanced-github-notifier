const loaded = new Promise((resolve) => {
    window.addEventListener("DOMContentLoaded", resolve);
});
const idPrefix = "ghnotif";

const clickListener = (id) => {
    browser.runtime.sendMessage({
        topic: "open-notification",
        notificationId: id
    });
    window.close();
};

const createNotification = (notification) => {
    const root = document.createElement("li");
    root.id = idPrefix + notification.id;
    root.classList.add("panel-list-item");

    const title = document.createElement("span");
    title.classList.add("text");
    title.textContent = notification.subject.title;

    const repo = document.createElement("span");
    repo.classList.add("text-shortcut");
    repo.textContent = notification.repository.full_name;

    root.append(title, repo);
    root.addEventListener("click", clickListener.bind(null, notification.id));
    const parent = document.getElementById("notifications");
    parent.append(root);
    parent.hidden = false;

    document.getElementById("empty").hidden = true;
}

const deleteNotification = (notificationId) => {
    const root = document.getElementById(idPrefix + notificationId);
    if(root) {
        root.remove();
    }

    const parent = document.getElementById("notifications");
    if(parent.childElementCount == 0) {
        document.getElementById("empty").hidden = false;
        parent.hidden = true;
    }
};

browser.runtime.onMessage.addListener((mesage) => {
    if(message.topic === "new-notification") {
        createNotification(message.notification);
    }
    else if(message.topic == "notification-read") {
        deleteNotification(message.notificationId);
    }
});

loaded.then(() => {
    document.getElementById("open").addEventListener("click", () => {
        browser.runtime.sendMessage({ topic: "open-notifications" });
    });
});

Promise.all([
    browser.storage.local.get("notifications"),
    loaded
]).then(([result, l]) => {
    const notifications = result.notifications || [];
    for(let notification of notifications) {
        createNotification(notification);
    }
});
