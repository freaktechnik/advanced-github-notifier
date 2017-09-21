import { JSDOM, VirtualConsole } from 'jsdom';
import fetch from 'node-fetch';
import fs from 'fs';
import util from 'util';
import path from 'path';

const rf = util.promisify(fs.readFile);
const aboutBlank = `<!DOCTYPE html>
<html>
    <head>
    </head>
    <body>
    </body>
</html>`;
const virtualConsole = new VirtualConsole();
virtualConsole.sendTo(console);
virtualConsole.on("jsdomError", (error) => {
    console.error(error.stack, error.detail);
});

export default async (files, html = aboutBlank) => {
    const dom = new JSDOM(html, {
        runScripts: 'outside-only',
        virtualConsole
    });
    dom.window.fetch = fetch;
    dom.window.browser = require("sinon-chrome/webextensions");
    // Purge that instance of the browser stubs, so tests have their own env.
    delete require.cache[path.join(__dirname, '../node_modules/sinon-chrome/webextensions/index.js')];
    for(const file of files) {
        //TODO instrumenting
        dom.window.eval(await rf(path.join(__dirname, file), 'utf-8'));
    }
    return dom;
};
