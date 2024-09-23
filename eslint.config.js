import freaktechnikConfigExtension from "@freaktechnik/eslint-config-extension";
import freaktechnikConfigTest from "@freaktechnik/eslint-config-test";
import freaktechnikConfigNode from "@freaktechnik/eslint-config-node";

export default [
    ...freaktechnikConfigExtension,
    ...freaktechnikConfigTest,
    freaktechnikConfigNode.at(-1),
    {
        files: ["scripts/**/*.js"],
        rules: {
            "one-var": "off",
        },
    },
    {
        ignores: [ "scripts/config.js" ],
    },
]
