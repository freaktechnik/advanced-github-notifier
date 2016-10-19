window.addEventListener("DOMContentLoaded", () => {
    const button = document.getElementById("logout");
    button.textContent = browser.i18n.getMessage("logout");

    button.addEventListener("click", () => {
        browser.runtime.sendMessage({
            topic: "logout"
        });
        button.disabled = true;
    }, {
        capturing: false,
        passive: true
    });

    browser.storage.local.get("token").then((result) => {
        if(result.token) {
            button.disabled = false;
        }
    });

    browser.runtime.onMessage.addListener(({ topic }) => {
        if(topic == "login") {
            button.disabled = false;
        }
    });
});
