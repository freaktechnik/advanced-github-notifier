import freaktechnikConfigExtension from "@freaktechnik/eslint-config-extension";
import freaktechnikConfigTest from "@freaktechnik/eslint-config-test";

const SECOND_ITEM = 1;

export default [
    ...freaktechnikConfigExtension,
    ...freaktechnikConfigTest,
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
