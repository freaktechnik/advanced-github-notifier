# Contributing to AGHN

## Translations
The strings for this extension can be translated on [Transifex](https://www.transifex.com/freaktechnik/advanced-github-notifier/).

## Issues etc.
Feel free to file issues and describe your problem. I'll likely try to solve it
when I find time for it. Or maybe someone else will step up and fix it :)

## Writing code
In theory all you should have to do is run `npm ci` (after installing npm and node)
and you should be able to launch a Firefox instance with the extension in debugging
mode with live reloading with `npm start`.

There are some linters and tests. `npm test` runs all linters and tests.

### Updating config.js

To avoid comitting production values in `config.js`, make sure to ignore it with
```bash
git update-index --assume-unchanged scripts/config.js
```

If you want to commit a change to the checked in version, you can use the following to
track changes again:
```bash
git update-index --no-assume-unchanged scripts/config.js
```

### License
All code should be licensed under the [MPL-2.0](LICENSE). By submitting a pull
request you agree that your code is licensed that way.
