# ![](images/icon-48.png) Advanced GitHub Notifier

[![Add-On Version](https://img.shields.io/amo/v/advanced-github-notifier.svg)](https://addons.mozilla.org/addon/advanced-github-notifier/?src=external-ghversion) [![AMO Rating](https://img.shields.io/amo/stars/advanced-github-notifier.svg)](https://addons.mozilla.org/addon/advanced-github-notifier/?src=external-ghrating) [![AMO User Count](https://img.shields.io/amo/users/advanced-github-notifier.svg)](https://addons.mozilla.org/addon/advanced-github-notifier/?src=external-ghusers) [![AMO Download Count](https://img.shields.io/amo/d/advanced-github-notifier.svg)](https://addons.mozilla.org/addon/advanced-github-notifier/?src=external-ghdownloads)<br>
[![Build Status](https://travis-ci.com/freaktechnik/advanced-github-notifier.svg?branch=master)](https://travis-ci.com/freaktechnik/advanced-github-notifier)  [![Greenkeeper badge](https://badges.greenkeeper.io/freaktechnik/advanced-github-notifier.svg)](https://greenkeeper.io/)  [![codecov](https://codecov.io/gh/freaktechnik/advanced-github-notifier/branch/master/graph/badge.svg)](https://codecov.io/gh/freaktechnik/advanced-github-notifier)

A Firefox extension, that not only shows a count of notifications, but also
shows notification popups and has a popup that gives direct access to the
notifications.

## Installation
A stable release version is availabe here:

[![addons.mozilla.org/](https://addons.cdn.mozilla.net/static/img/addons-buttons/AMO-button_2.png)](https://addons.mozilla.org/addon/advanced-github-notifier/?src=external-ghreadme)

To run the in-development version from this repository, you either need to use
about:debugging or the `web-ext` tool. Further the API credentials stored in `config.js` are not
included in this repo.

### Pre-configuring a GitHub enterprise OAuth app
You can pre-configure an OAuth app to authenticate against your enterprise installation using [Firefox Enterprise Policies](https://support.mozilla.org/en-US/kb/enforcing-policies-firefox-enterprise). The policy should look something like this (or equivalent registry keys, however that works):

```json
{
    "policies": {
        "3rdparty": {
            "Extensions": {
                "{8d4b86c5-64bf-4780-b029-0112386735ab}": {
                    "enterprise": {
                        "instanceURL": "Base URL of your GitHub enterprise instance (HTTPS only)",
                        "clientId": "Client ID of the OAuth app",
                        "clientSecret": "Client secret of the OAuth app"
                    }
                }
            }
        }
    }
}
```

The OAuth app's redirect URL should be set to `https://8317bdea4958553dcce6194bd09e3d5a2b504f5b.extensions.allizom.org/login` for the release version of this extension.

## Contributing
Please check the [CONTRIBUTING.md](CONTRIBUTING.md)

## License
This extension is licensed under the [MPL-2.0](LICENSE), the octocat and octicons
are licensed under the [MIT license](images/LICENSE) according to their source.

This product is not developed or run by GitHub. It is a hobbyist project that
uses the official GitHub API to display information about the notifications
of a user on the GitHub platform. GitHub and the associated imagery are subject
to copyright and trademarks of GitHub, Inc.

## Contributors

Thanks goes to these wonderful people ([emoji key](https://github.com/kentcdodds/all-contributors#emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore -->
| [<img src="https://avatars0.githubusercontent.com/u/640949?v=4" width="100px;" alt="Martin Giger"/><br /><sub><b>Martin Giger</b></sub>](https://humanoids.be)<br />[💻](https://github.com/freaktechnik/advanced-github-notifier/commits?author=freaktechnik "Code") [🌍](https://www.transifex.com/freaktechnik/advanced-github-notifier/dashboard/ "Translation") [⚠️](https://github.com/freaktechnik/advanced-github-notifier/commits?author=freaktechnik "Tests") [📖](https://github.com/freaktechnik/advanced-github-notifier/commits?author=freaktechnik "Documentation") | [<img src="https://avatars3.githubusercontent.com/u/4688092?v=4" width="100px;" alt="Saran Tanpituckpong"/><br /><sub><b>Saran Tanpituckpong</b></sub>](https://www.google.com/+SaranTanpituckpong)<br />[💻](https://github.com/freaktechnik/advanced-github-notifier/commits?author=gluons "Code") [🐛](https://github.com/freaktechnik/advanced-github-notifier/issues?q=author%3Agluons "Bug reports") [🌍](https://www.transifex.com/freaktechnik/advanced-github-notifier/dashboard/ "Translation") | [<img src="https://avatars1.githubusercontent.com/u/1192339?v=4" width="100px;" alt="Eduardo Bellido Bellido"/><br /><sub><b>Eduardo Bellido Bellido</b></sub>](https://edubxb.net)<br />[💻](https://github.com/freaktechnik/advanced-github-notifier/commits?author=edubxb "Code") | [<img src="https://avatars2.githubusercontent.com/u/403283?v=4" width="100px;" alt="Daniele Scasciafratte"/><br /><sub><b>Daniele Scasciafratte</b></sub>](https://daniele.tech)<br />[🐛](https://github.com/freaktechnik/advanced-github-notifier/issues?q=author%3AMte90 "Bug reports") [🌍](https://www.transifex.com/freaktechnik/advanced-github-notifier/dashboard/ "Translation") [🤔](#ideas-Mte90 "Ideas, Planning, & Feedback") | [<img src="https://avatars3.githubusercontent.com/u/32600318?v=4" width="100px;" alt="acid-crash"/><br /><sub><b>acid-crash</b></sub>](https://github.com/Acid-Crash)<br />[🐛](https://github.com/freaktechnik/advanced-github-notifier/issues?q=author%3AAcid-Crash "Bug reports") [⚠️](https://github.com/freaktechnik/advanced-github-notifier/commits?author=Acid-Crash "Tests") | [<img src="https://avatars0.githubusercontent.com/u/6425077?v=4" width="100px;" alt="Sid Kapur"/><br /><sub><b>Sid Kapur</b></sub>](http://sid-kap.github.io)<br />[🐛](https://github.com/freaktechnik/advanced-github-notifier/issues?q=author%3Asid-kap "Bug reports") | [<img src="https://avatars1.githubusercontent.com/u/947?v=4" width="100px;" alt="Josh Black"/><br /><sub><b>Josh Black</b></sub>](http://raskchanky.com)<br />[🤔](#ideas-raskchanky "Ideas, Planning, & Feedback") |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| [<img src="https://avatars3.githubusercontent.com/u/5490615?v=4" width="100px;" alt="keith94"/><br /><sub><b>keith94</b></sub>](https://github.com/Keith94)<br />[🤔](#ideas-Keith94 "Ideas, Planning, & Feedback") | [<img src="https://avatars1.githubusercontent.com/u/493451?v=4" width="100px;" alt="Sergio"/><br /><sub><b>Sergio</b></sub>](https://github.com/sergioc)<br />[🐛](https://github.com/freaktechnik/advanced-github-notifier/issues?q=author%3Asergioc "Bug reports") [🤔](#ideas-sergioc "Ideas, Planning, & Feedback") [⚠️](https://github.com/freaktechnik/advanced-github-notifier/commits?author=sergioc "Tests") | [<img src="https://secure.gravatar.com/avatar/4feb84897d4178746e4b0a63a79a7dff?s=100&d=identicon" width="100px;" alt="Vladimir Maksimenko"/><br /><sub><b>Vladimir Maksimenko</b></sub>](https://www.transifex.com/user/profile/vl.maksime/)<br />[🌍](https://www.transifex.com/freaktechnik/advanced-github-notifier/dashboard/ "Translation") | [<img src="https://avatars0.githubusercontent.com/u/1769875?v=4" width="100px;" alt="YFdyh000"/><br /><sub><b>YFdyh000</b></sub>](http://wiki.mozilla.org/User:YFdyh000)<br />[🌍](https://www.transifex.com/freaktechnik/advanced-github-notifier/dashboard/ "Translation") | [<img src="https://secure.gravatar.com/avatar/5ede715d039ef2ff3e747ae6ce2a9ff5?s=100&d=identicon" width="100px;" alt="東曄 吳"/><br /><sub><b>東曄 吳</b></sub>](https://www.transifex.com/user/profile/tw0517tw/)<br />[🌍](https://www.transifex.com/freaktechnik/advanced-github-notifier/dashboard/ "Translation") | [<img src="https://avatars1.githubusercontent.com/u/9874850?v=4" width="100px;" alt="tooomm"/><br /><sub><b>tooomm</b></sub>](https://github.com/tooomm)<br />[📖](https://github.com/freaktechnik/advanced-github-notifier/commits?author=tooomm "Documentation") [🐛](https://github.com/freaktechnik/advanced-github-notifier/issues?q=author%3Atooomm "Bug reports") [🤔](#ideas-tooomm "Ideas, Planning, & Feedback") | [<img src="https://secure.gravatar.com/avatar/0598a2be942c96cbc8fe77232d95389d?s=128&d=identicon" width="100px;" alt="Alejandro Dafonte"/><br /><sub><b>Alejandro Dafonte</b></sub>](https://www.transifex.com/user/profile/AlexDafonte/)<br />[🌍](https://www.transifex.com/freaktechnik/advanced-github-notifier/dashboard/ "Translation") |
| [<img src="https://avatars1.githubusercontent.com/u/1716229?v=4" width="100px;" alt="Heimen Stoffels"/><br /><sub><b>Heimen Stoffels</b></sub>](https://github.com/Vistaus)<br />[🌍](https://www.transifex.com/freaktechnik/advanced-github-notifier/dashboard/ "Translation") | [<img src="https://secure.gravatar.com/avatar/22de3450962f68fefa85cfe4d65148e7?s=128&d=identicon" width="100px;" alt="Doryan R"/><br /><sub><b>Doryan R</b></sub>](https://www.transifex.com/user/profile/Doryan/)<br />[🌍](https://www.transifex.com/freaktechnik/advanced-github-notifier/dashboard/ "Translation") | [<img src="https://avatars2.githubusercontent.com/u/589034?v=4" width="100px;" alt="Dominik Moritz"/><br /><sub><b>Dominik Moritz</b></sub>](https://www.domoritz.de)<br />[🤔](#ideas-domoritz "Ideas, Planning, & Feedback") |
<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/kentcdodds/all-contributors) specification. Contributions of any kind welcome!
