import freaktechnikConfigExtension from "@freaktechnik/eslint-config-extension";
import freaktechnikConfigTest from "@freaktechnik/eslint-config-test";

export default [
    ...freaktechnikConfigExtension,
    ...freaktechnikConfigTest,
    {
        name: "disable one-var in scripts",
        files: [ "scripts/**/*.js" ],
        rules: {
            "one-var": "off",
        },
    },
    {
        name: "ignore config script",
        ignores: [ "scripts/config.js" ],
    },
    {
        name: "disable no unresolved for tests",
        files: [ "test/**.js" ],
        rules: {
            "import/no-unresolved": "off",
        },
    },
];
