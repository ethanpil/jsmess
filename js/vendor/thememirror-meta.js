// Theme roster vendored from thememirror@2.0.1 (https://github.com/vadimdemedes/thememirror)
//
// MIT License
//
// Copyright (c) Vadim Demedes <vadimdemedes@hey.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//
// ---------------------------------------------------------------------------
// HOW THIS FILE WAS GENERATED — repeat these steps to upgrade:
//
//   1. npm pack thememirror@<version> && tar -xzf thememirror-<version>.tgz
//   2. Concatenate package/dist/create-theme.js followed by each
//      package/dist/themes/*.js in the order listed by package/dist/index.js.
//   3. Delete every `import` line; change `export const <id>` to `const <id>`.
//   4. Wrap the result in buildThemes() below and alias `const t = tags`.
//   5. Rebuild the THEMES table in thememirror-meta.js from each theme's
//      `variant` and the labels in the upstream readme, then update the
//      return object here to match. cm.js cross-checks the two at runtime.
//
// Two deliberate deviations from upstream dist:
//   * Imports of @codemirror/view, @codemirror/language and @lezer/highlight
//     are replaced by buildThemes()'s parameters, so themes are constructed
//     from cm.js's singleton CodeMirror instances. Importing them here would
//     create a second copy of each module and the extensions would be silently
//     ignored.
//   * The `.cm-selectionBackground` selector in createTheme() is corrected —
//     see the comment at that line.
// ---------------------------------------------------------------------------

// Theme metadata. Static (no CodeMirror needed) so the settings dropdown can be
// built without waiting on initCM(). `variant` is the theme's own light/dark
// declaration, kept so surrounding UI can adapt to the editor's brightness.
// Keep in sync with the return value of buildThemes() — same ids, same order.
export const THEMES = [
  { id: 'amy', label: 'Amy', variant: 'dark' },
  { id: 'ayuLight', label: 'Ayu Light', variant: 'light' },
  { id: 'barf', label: 'Barf', variant: 'dark' },
  { id: 'bespin', label: 'Bespin', variant: 'dark' },
  { id: 'birdsOfParadise', label: 'Birds of Paradise', variant: 'dark' },
  { id: 'boysAndGirls', label: 'Boys and Girls', variant: 'dark' },
  { id: 'clouds', label: 'Clouds', variant: 'light' },
  { id: 'cobalt', label: 'Cobalt', variant: 'dark' },
  { id: 'coolGlow', label: 'Cool Glow', variant: 'dark' },
  { id: 'dracula', label: 'Dracula', variant: 'dark' },
  { id: 'espresso', label: 'Espresso', variant: 'light' },
  { id: 'noctisLilac', label: 'Noctis Lilac', variant: 'light' },
  { id: 'rosePineDawn', label: 'Rosé Pine Dawn', variant: 'light' },
  { id: 'smoothy', label: 'Smoothy', variant: 'light' },
  { id: 'solarizedLight', label: 'Solarized Light', variant: 'light' },
  { id: 'tomorrow', label: 'Tomorrow', variant: 'light' },
];
