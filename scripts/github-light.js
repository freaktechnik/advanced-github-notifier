/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */
/* global GitHub */
//TODO should filter private repos for getting notification details.
class GitHubLight extends GitHub {
    static get SCOPE() {
        return "notifications";
    }

    get scope() {
        return GitHubLight.SCOPE;
    }
}

window.GitHubLight = GitHubLight;
