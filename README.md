# JSMess
An open source ([MIT](LICENSE)) HTML/JS/CSS IDE and fiddling system. 
JSMess is a fork of [Jstinker](https://github.com/johncipponeri/jstinker) which itself was inspired by [JSFiddle](http://jsfiddle.net/). 

## Features
* HTML/CSS/JS Editors
* Preview
* Syntax checks
* Tidy Up
* Script wrapping
* Isolated iFrame sandbox

## Changelog

_2026_07_30_
* Editor colour themes &mdash; 16 themes from [thememirror](https://github.com/vadimdemedes/thememirror) selectable in Settings, plus "Default" which follows the light/dark toggle
* Share links now use native browser compression (smaller URLs, no vendored library) &mdash; old share links no longer work
* New Share dialog with copy button and native share support, reachable from the toolbar, the Export menu, and the My Messes list
* Share link format documented in [docs/SHARE-FORMAT.md](docs/SHARE-FORMAT.md)

_2026_03_24_
* Mini Map
* Undo / Redo Buttons

_2026_03_23_
* Rework and modernize the codebase. Complete rewrite
* Upgrade to latest codemirror
* export/import functionality
* Column or Grid Layout
* Replace NPM package chooser with jsdelivr
* Dark and light themes available
* Consistent JSMess branding/naming
* Line Number option toggle

_2025-07-26_
* Rename project to JSMess

_2025-07-25_
* Forked from [Jstinker](https://github.com/johncipponeri/jstinker) 
* Localized all third party CSS/JS libraries and fonts

## Todo

* Remove dropdown lists of libraries for inclusion
* Implement autocomplete search of CDNJS collection for dynamic inclusion
* Save/Export/Import function
* New UX
* Update original libraries and frameworks
* Publish to jsmess.com

## Credits

#### Contributors
* Claude Opus
* Claude Sonnet
* Google Jules
* Ethan Piliavin - [https://github.com/ethanpil](https://github.com/ethanpil)
* John Cipponeri ([@johncipponeri](http://twitter.com/johncipponeri))

## License

JSMess is released under the MIT License &mdash; Copyright &copy; 2025-2026 Ethan Piliavin.
The full text is in [LICENSE](LICENSE).

### Third-party licenses

Every third-party dependency is MIT or MIT-compatible.

Loaded at runtime from a CDN (not redistributed by this repository):

| Dependency | License |
| --- | --- |
| [CodeMirror 6](https://codemirror.net/) &mdash; `state`, `view`, `commands`, `search`, `autocomplete`, `language`, `lint`, `lang-html`, `lang-css`, `lang-javascript`, `theme-one-dark` | MIT |
| [Lezer](https://lezer.codemirror.net/) &mdash; `common`, `highlight`, `lr`, `html`, `css`, `javascript` | MIT |
| [@replit/codemirror-minimap](https://github.com/replit/codemirror-minimap) | MIT |
| [Prettier](https://prettier.io/) (standalone + babel/html/postcss plugins) | MIT |
| [Dart Sass](https://sass-lang.com/dart-sass/) | MIT |
| [JSZip](https://stuk.github.io/jszip/) | MIT or GPL-3.0-or-later &mdash; used under MIT |
| [Google Fonts](https://fonts.google.com/) &mdash; the nine editor fonts | SIL Open Font License 1.1, except Ubuntu Mono (Ubuntu Font Licence 1.0) |

Vendored into this repository, each carrying its upstream license notice:

| Dependency | License |
| --- | --- |
| [Split.js](https://split.js.org/) &mdash; `js/vendor/split.min.js` | MIT &copy; Nathan Cahill |
| [thememirror](https://github.com/vadimdemedes/thememirror) &mdash; `js/vendor/thememirror.js`, `thememirror-meta.js` | MIT &copy; Vadim Demedes |

Assets:

| Asset | License |
| --- | --- |
| App logo by [Solar Icons](https://www.figma.com/community/file/1166831539721848736?ref=svgrepo.com) | CC Attribution &mdash; credited in the app's About panel |
| GitHub mark (`img/github-mark.svg`) | Used per [GitHub's logo guidelines](https://github.com/logos) to link to this repository |

Fonts are linked from Google's CDN rather than bundled, so their licenses govern the
font files themselves and place no redistribution obligation on this repository.
