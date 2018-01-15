import { JSDOM, VirtualConsole } from 'jsdom';
import path from 'path';
import { execFile } from 'child_process';
import mkdirp from 'mkdirp';
import fs from 'fs';
import util from 'util';
import sinon from 'sinon';

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
const ef = util.promisify(execFile);
const rf = util.promisify(fs.readFile);

const instrumentCache = new Map();
// the nyc integration here is hacky as hell, but it works, so who am I to judge.
// inspired by https://github.com/lukasoppermann/html5sortable/pull/269
const instrument = async (sourcePath) => {
    if(!instrumentCache.has(sourcePath)) {
        if(!process.env.NYC_CONFIG) {
            const source = await rf(sourcePath, 'utf8');
            instrumentCache.set(sourcePath, source);
        }
        else {
            const instrumented = await ef(process.execPath, [
                './node_modules/.bin/nyc',
                'instrument',
                sourcePath
            ], {
                cwd: process.cwd(),
                env: process.env
            });
            instrumentCache.set(sourcePath, instrumented.stdout.toString('utf-8'));
        }
    }
    return instrumentCache.get(sourcePath);
};

export const getEnv = async (files, html = aboutBlank) => {
    const dom = new JSDOM(html, {
        runScripts: 'outside-only',
        virtualConsole
    });
    dom.window.fetch = sinon.stub();
    dom.window.browser = require("sinon-chrome/out/webextensions");
    // Purge that instance of the browser stubs, so tests have their own env.
    delete require.cache[path.join(__dirname, '../node_modules/sinon-chrome/webextensions/index.js')];
    for(const file of files) {
        //TODO instrumenting
        dom.window.eval(await instrument(path.join(__dirname, file), 'utf-8'));
    }
    return dom;
};

let id = 0;
export const cleanUp = async (window) => {
    if(process.env.NYC_CONFIG) {
        const nycConfig = JSON.parse(process.env.NYC_CONFIG);
        await mk(nycConfig.tempDirectory);
        await wf(path.join(nycConfig.tempDirectory, `${Date.now()}_${process.pid}_${++id}.json`), JSON.stringify(window.__coverage__), 'utf-8');
    }
    window.close();
};
