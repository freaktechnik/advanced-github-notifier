import {
    JSDOM,
    VirtualConsole
} from 'jsdom';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { mkdirp } from 'mkdirp';
import fs from 'node:fs';
import util from 'node:util';
import sinon from 'sinon';
import { createRequire } from 'node:module';

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
const ef = util.promisify(execFile);
const rf = util.promisify(fs.readFile);

const instrumentCache = new Map();
// the nyc integration here is hacky as hell, but it works, so who am I to judge.
// inspired by https://github.com/lukasoppermann/html5sortable/pull/269
const instrument = async (sourcePath) => {
    if(!instrumentCache.has(sourcePath.href)) {
        if(!process.env.NYC_CONFIG) {
            const source = await rf(sourcePath, 'utf8');
            instrumentCache.set(sourcePath.href, source);
        }
        else {
            const instrumented = await ef(process.execPath, [
                './node_modules/.bin/nyc',
                'instrument',
                sourcePath.pathname
            ], {
                cwd: process.cwd(),
                env: process.env
            });
            instrumentCache.set(sourcePath.href, instrumented.stdout.toString('utf-8'));
        }
    }
    return instrumentCache.get(sourcePath.href);
};

export const getEnvironment = async (files, html = aboutBlank) => {
    const dom = new JSDOM(html, {
        runScripts: 'outside-only',
        virtualConsole
    });
    dom.window.fetch = sinon.stub();
    const require = createRequire(import.meta.url);
    dom.window.browser = require("sinon-chrome/webextensions");
    // Purge that instance of the browser stubs, so tests have their own env.
    delete require.cache[new URL('../node_modules/sinon-chrome/webextensions/index.js', import.meta.url).pathname];
    for(const file of files) {
        //TODO instrumenting
        dom.window.eval(await instrument(new URL(file, import.meta.url), 'utf-8'));
    }
    return dom;
};

let id = 0;
export const cleanUp = async (window) => {
    if(process.env.NYC_CONFIG) {
        const nycConfig = JSON.parse(process.env.NYC_CONFIG);
        await mkdirp(nycConfig.tempDir);
        await wf(path.join(nycConfig.tempDir, `${Date.now()}_${process.pid}_${++id}.json`), JSON.stringify(window.__coverage__), 'utf-8');
    }
    window.close();
};
