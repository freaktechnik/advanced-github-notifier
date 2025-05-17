import freaktechnikConfigExtension from "@freaktechnik/eslint-config-extension";
import freaktechnikConfigTest from "@freaktechnik/eslint-config-test";
import freaktechnikConfigNode from "@freaktechnik/eslint-config-node";

const LAST_ITEM = -1;

export default [
    ...freaktechnikConfigExtension,
    ...freaktechnikConfigTest,
    freaktechnikConfigNode.at(LAST_ITEM),
    {
        files: [ "scripts/**/*.js" ],
        rules: {
            "one-var": "off",
        },
    },
    {
        ignores: [ "scripts/config.js" ],
    },
];
