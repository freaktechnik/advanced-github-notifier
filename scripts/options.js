const PASSIVE_EVENT = {
    capturing: false,
    passive: true
};

window.addEventListener("DOMContentLoaded", () => {
    const button = document.getElementById("logout");
    const notifications = document.getElementById("notifications");
    button.textContent = browser.i18n.getMessage("logout");
    document.querySelector('label[for="notifications"]').textContent = browser.i18n.getMessage("showNotifications");

    button.addEventListener("click", () => {
        browser.runtime.sendMessage({
            topic: "logout"
        });
        button.disabled = true;
    }, PASSIVE_EVENT);

    notifications.addEventListener("change", () => {
        browser.storage.local.set({ hide: !notifications.checked });
    }, PASSIVE_EVENT);

    browser.storage.local.get([ "token", "hide" ]).then((result) => {
        if(result.token) {
            button.disabled = false;
        }
        if(result.hide) {
            notifications.checked = false;
        }
    });

    browser.runtime.onMessage.addListener(({ topic }) => {
        if(topic == "login") {
            button.disabled = false;
        }
    });
}, PASSIVE_EVENT);
