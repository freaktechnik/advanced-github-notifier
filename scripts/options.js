/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

const PASSIVE_EVENT = {
    capturing: false,
    passive: true
};

window.addEventListener("DOMContentLoaded", () => {
    const button = document.getElementById("logout");
    const notifications = document.getElementById("notifications");
    const footer = document.getElementById("footer");
    button.addEventListener("click", () => {
        browser.runtime.sendMessage({
            topic: "logout"
        });
        button.disabled = true;
        button.classList.add("disabled");
    }, PASSIVE_EVENT);

    notifications.addEventListener("change", () => {
        browser.storage.local.set({ hide: !notifications.checked });
    }, PASSIVE_EVENT);

    footer.addEventListener("change", () => {
        browser.storage.local.set({ footer: footer.value });
    }, PASSIVE_EVENT);

    browser.storage.local.get([
        "token",
        "hide",
        "footer"
    ])
        .then((result) => {
            if(result.token) {
                button.disabled = false;
                button.classList.remove("disabled");
            }
            if(result.hide) {
                notifications.checked = false;
            }
            if(result.footer) {
                footer.value = result.footer;
            }
        })
        .catch(console.error);

    browser.runtime.onMessage.addListener(({ topic }) => {
        if(topic == "login") {
            button.disabled = false;
            button.classList.remove("disabled");
        }
    });
}, PASSIVE_EVENT);
