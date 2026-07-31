# JSMess
An open source (MIT) HTML/JS/CSS IDE and fiddling system. 
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

The MIT License (MIT)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
