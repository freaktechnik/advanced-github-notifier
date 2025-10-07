import freaktechnikConfigExtension from "@freaktechnik/eslint-config-extension";
import freaktechnikConfigTest from "@freaktechnik/eslint-config-test";
import freaktechnikConfigNode from "@freaktechnik/eslint-config-node";

const SECOND_ITEM = 1;

export default [
    ...freaktechnikConfigExtension,
    ...freaktechnikConfigTest,
    ...freaktechnikConfigNode.slice(SECOND_ITEM),
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
