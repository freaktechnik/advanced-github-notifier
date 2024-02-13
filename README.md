# ![](images/icon-48.png) Advanced GitHub Notifier

[![Add-On Version](https://img.shields.io/amo/v/advanced-github-notifier.svg)](https://addons.mozilla.org/addon/advanced-github-notifier/?utm_source=github&utm_content=version) [![AMO Rating](https://img.shields.io/amo/stars/advanced-github-notifier.svg)](https://addons.mozilla.org/addon/advanced-github-notifier/?utm_source=github&utm_content=rating) [![AMO User Count](https://img.shields.io/amo/users/advanced-github-notifier.svg)](https://addons.mozilla.org/addon/advanced-github-notifier/?utm_source=github&utm_content=users) [![AMO Download Count](https://img.shields.io/amo/d/advanced-github-notifier.svg)](https://addons.mozilla.org/addon/advanced-github-notifier/?utm_source=ghdownloads)<br>
[![codecov](https://codecov.io/gh/freaktechnik/advanced-github-notifier/graph/badge.svg?token=i1mW9Zwa89)](https://codecov.io/gh/freaktechnik/advanced-github-notifier)

A Firefox extension, that not only shows a count of notifications, but also
shows notification popups and has a popup that gives direct access to the
notifications. Supports github.com, GitHub Enterprise, GitLab and Gitea.

## Installation

A stable release version is availabe here:

[![addons.mozilla.org/](https://addons.cdn.mozilla.net/static/img/addons-buttons/AMO-button_2.png)](https://addons.mozilla.org/addon/advanced-github-notifier/?utm_source=github&utm_content=installation)

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
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
    <tr>
        <td align="center"><a href="https://humanoids.be"><img src="https://avatars0.githubusercontent.com/u/640949?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Martin Giger</b></sub></a><br /><a href="https://github.com/freaktechnik/advanced-github-notifier/commits?author=freaktechnik" title="Code">💻</a> <a href="https://www.transifex.com/freaktechnik/advanced-github-notifier/dashboard/" title="Translation">🌍</a> <a href="https://github.com/freaktechnik/advanced-github-notifier/commits?author=freaktechnik" title="Tests">⚠️</a> <a href="https://github.com/freaktechnik/advanced-github-notifier/commits?author=freaktechnik" title="Documentation">📖</a></td>
        <td align="center"><a href="https://www.google.com/+SaranTanpituckpong"><img src="https://avatars3.githubusercontent.com/u/4688092?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Saran Tanpituckpong</b></sub></a><br /><a href="https://github.com/freaktechnik/advanced-github-notifier/commits?author=gluons" title="Code">💻</a> <a href="https://github.com/freaktechnik/advanced-github-notifier/issues?q=author%3Agluons" title="Bug reports">🐛</a> <a href="https://www.transifex.com/freaktechnik/advanced-github-notifier/dashboard/" title="Translation">🌍</a></td>
        <td align="center"><a href="https://edubxb.net"><img src="https://avatars1.githubusercontent.com/u/1192339?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Eduardo Bellido Bellido</b></sub></a><br /><a href="https://github.com/freaktechnik/advanced-github-notifier/commits?author=edubxb" title="Code">💻</a></td>
        <td align="center"><a href="https://daniele.tech"><img src="https://avatars2.githubusercontent.com/u/403283?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Daniele Scasciafratte</b></sub></a><br /><a href="https://github.com/freaktechnik/advanced-github-notifier/issues?q=author%3AMte90" title="Bug reports">🐛</a> <a href="https://www.transifex.com/freaktechnik/advanced-github-notifier/dashboard/" title="Translation">🌍</a> <a href="#ideas-Mte90" title="Ideas, Planning, & Feedback">🤔</a></td>
        <td align="center"><a href="https://github.com/Acid-Crash"><img src="https://avatars3.githubusercontent.com/u/32600318?v=4?s=100" width="100px;" alt=""/><br /><sub><b>acid-crash</b></sub></a><br /><a href="https://github.com/freaktechnik/advanced-github-notifier/issues?q=author%3AAcid-Crash" title="Bug reports">🐛</a> <a href="https://github.com/freaktechnik/advanced-github-notifier/commits?author=Acid-Crash" title="Tests">⚠️</a></td>
        <td align="center"><a href="http://sid-kap.github.io"><img src="https://avatars0.githubusercontent.com/u/6425077?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Sid Kapur</b></sub></a><br /><a href="https://github.com/freaktechnik/advanced-github-notifier/issues?q=author%3Asid-kap" title="Bug reports">🐛</a></td>
        <td align="center"><a href="http://raskchanky.com"><img src="https://avatars1.githubusercontent.com/u/947?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Josh Black</b></sub></a><br /><a href="#ideas-raskchanky" title="Ideas, Planning, & Feedback">🤔</a></td>
    </tr>
    <tr>
        <td align="center"><a href="https://github.com/Keith94"><img src="https://avatars3.githubusercontent.com/u/5490615?v=4?s=100" width="100px;" alt=""/><br /><sub><b>keith94</b></sub></a><br /><a href="#ideas-Keith94" title="Ideas, Planning, & Feedback">🤔</a></td>
        <td align="center"><a href="https://github.com/sergioc"><img src="https://avatars1.githubusercontent.com/u/493451?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Sergio</b></sub></a><br /><a href="https://github.com/freaktechnik/advanced-github-notifier/issues?q=author%3Asergioc" title="Bug reports">🐛</a> <a href="#ideas-sergioc" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/freaktechnik/advanced-github-notifier/commits?author=sergioc" title="Tests">⚠️</a></td>
        <td align="center"><a href="https://www.transifex.com/user/profile/vl.maksime/"><img src="https://secure.gravatar.com/avatar/4feb84897d4178746e4b0a63a79a7dff?s=100&d=identicon?s=100" width="100px;" alt=""/><br /><sub><b>Vladimir Maksimenko</b></sub></a><br /><a href="https://www.transifex.com/freaktechnik/advanced-github-notifier/dashboard/" title="Translation">🌍</a></td>
        <td align="center"><a href="http://wiki.mozilla.org/User:YFdyh000"><img src="https://avatars0.githubusercontent.com/u/1769875?v=4?s=100" width="100px;" alt=""/><br /><sub><b>YFdyh000</b></sub></a><br /><a href="https://www.transifex.com/freaktechnik/advanced-github-notifier/dashboard/" title="Translation">🌍</a></td>
        <td align="center"><a href="https://www.transifex.com/user/profile/tw0517tw/"><img src="https://secure.gravatar.com/avatar/5ede715d039ef2ff3e747ae6ce2a9ff5?s=100&d=identicon?s=100" width="100px;" alt=""/><br /><sub><b>東曄 吳</b></sub></a><br /><a href="https://www.transifex.com/freaktechnik/advanced-github-notifier/dashboard/" title="Translation">🌍</a></td>
        <td align="center"><a href="https://github.com/tooomm"><img src="https://avatars1.githubusercontent.com/u/9874850?v=4?s=100" width="100px;" alt=""/><br /><sub><b>tooomm</b></sub></a><br /><a href="https://github.com/freaktechnik/advanced-github-notifier/commits?author=tooomm" title="Documentation">📖</a> <a href="https://github.com/freaktechnik/advanced-github-notifier/issues?q=author%3Atooomm" title="Bug reports">🐛</a> <a href="#ideas-tooomm" title="Ideas, Planning, & Feedback">🤔</a> <a href="https://github.com/freaktechnik/advanced-github-notifier/commits?author=tooomm" title="Code">💻</a></td>
        <td align="center"><a href="https://www.transifex.com/user/profile/AlexDafonte/"><img src="https://secure.gravatar.com/avatar/0598a2be942c96cbc8fe77232d95389d?s=128&d=identicon?s=100" width="100px;" alt=""/><br /><sub><b>Alejandro Dafonte</b></sub></a><br /><a href="https://www.transifex.com/freaktechnik/advanced-github-notifier/dashboard/" title="Translation">🌍</a></td>
    </tr>
    <tr>
        <td align="center"><a href="https://github.com/Vistaus"><img src="https://avatars1.githubusercontent.com/u/1716229?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Heimen Stoffels</b></sub></a><br /><a href="https://www.transifex.com/freaktechnik/advanced-github-notifier/dashboard/" title="Translation">🌍</a></td>
        <td align="center"><a href="https://www.transifex.com/user/profile/Doryan/"><img src="https://secure.gravatar.com/avatar/22de3450962f68fefa85cfe4d65148e7?s=128&d=identicon?s=100" width="100px;" alt=""/><br /><sub><b>Doryan R</b></sub></a><br /><a href="https://www.transifex.com/freaktechnik/advanced-github-notifier/dashboard/" title="Translation">🌍</a></td>
        <td align="center"><a href="https://www.domoritz.de"><img src="https://avatars2.githubusercontent.com/u/589034?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Dominik Moritz</b></sub></a><br /><a href="#ideas-domoritz" title="Ideas, Planning, & Feedback">🤔</a></td>
        <td align="center"><a href="https://www.linkedin.com/in/PeterKehl"><img src="https://avatars.githubusercontent.com/u/4270240?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Peter Kehl</b></sub></a><br /><a href="https://github.com/freaktechnik/advanced-github-notifier/issues?q=author%3Apeter-kehl" title="Bug reports">🐛</a></td>
    </tr>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/kentcdodds/all-contributors) specification. Contributions of any kind welcome!
