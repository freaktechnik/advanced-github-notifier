/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

export const parseLinks = (links) => {
    const linkInfo = links.split(",");
    const linkObject = {};
    for(const link of linkInfo) {
        const [
            match,
            url,
            relation,
        ] = link.match(/<([^>]+)>;\s+rel="([^"]+)"/) || [];
        if(match && url && relation) {
            linkObject[relation] = url;
        }
    }
    return linkObject;
};
