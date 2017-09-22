import { JSDOM, VirtualConsole } from 'jsdom';
import fetch from 'node-fetch';
import path from 'path';
import { spawnSync } from 'child_process';
import mkdirp from 'mkdirp';
import fs from 'fs';
import util from 'util';

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
const wf = util.promisify(fs.writeFile);
const mk = util.promisify(mkdirp);

const instrumentCache = new Map();
// the nyc integration here is hacky as hell, but it works, so who am I to judge.
// inspired by https://github.com/lukasoppermann/html5sortable/pull/269
const instrument = (sourcePath) => {
    if(!instrumentCache.has(sourcePath)) {
        const instrumented = spawnSync(process.execPath, [
            './node_modules/.bin/nyc',
            'instrument',
            sourcePath
        ], {
            cwd: process.cwd(),
            env: process.env
        });
        instrumentCache.set(sourcePath, instrumented.stdout.toString('utf-8'));
    }
    return instrumentCache.get(sourcePath);
};

export const getEnv = async (files, html = aboutBlank) => {
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
        dom.window.eval(instrument(path.join(__dirname, file), 'utf-8'));
    }
    return dom;
};

let id = 0;
export const cleanUp = async (window) => {
    await mk('./.nyc_output');
    await wf(`./.nyc_output/${Date.now()}_${process.pid}_${++id}.json`, JSON.stringify(window.__coverage__), 'utf-8');
    window.close();
};
