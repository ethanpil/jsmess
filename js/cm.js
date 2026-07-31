// JSMess CodeMirror Wrapper
// All CodeMirror imports go through this file to ensure shared singleton instances.
// Versions are pinned so upstream releases can't break the site and so the CDN
// serves immutable, long-cached URLs. Update the modulepreload links in
// index.html in lockstep — including the ?deps= query strings, or the preloads
// miss and every module is fetched twice.
//
// Pinning our own imports is not enough on its own: each CodeMirror package
// declares its peers as semver RANGES (theme-one-dark wants
// @codemirror/view@^6.0.0, language wants ^6.23.0, ...) which esm.sh resolves to
// whatever is latest at request time. Those ranges drift away from our pins the
// moment upstream publishes, leaving two copies of EditorView whose facets don't
// compare equal — extensions are then silently ignored, with no error. That is
// exactly how oneDark stopped applying once view 6.43.7 shipped while we pinned
// 6.43.5. So every import also carries ?deps=, which rewrites those ranges to
// our exact versions and propagates transitively. See the note above the
// constants below for why the deps list differs per package.

// Deferred initialization — exports are populated by initCM() so the module graph
// is not blocked by network requests.  All consumers use these via live bindings
// (ES module `export let`) which update once initCM() resolves.

// Roster only (~1KB). The theme definitions themselves are ~26KB and are loaded
// on demand by initCM(), so a CDN/network failure there surfaces through the
// same "Couldn't load the editor" path as every other module.
import { THEMES } from './vendor/thememirror-meta.js';

// Each package must be asked for with exactly the shared deps IT uses, no more:
// esm.sh keys the build on the full dep list it is given and does NOT drop deps
// the package doesn't need. Requesting view with the whole set yields
// .../view@6.43.7/X-<language,state,lezer>/... while every sibling internally
// imports .../view@6.43.7/X-<state>/... — two EditorViews again. So state and
// @lezer/highlight (no shared deps of their own) are requested bare, view gets
// state, language gets state+view+highlight, and everything downstream gets the
// full set. Verified: all packages then resolve to one URL per dependency.
const STATE = '@codemirror/state@6.7.1';
const VIEW = `@codemirror/view@6.43.7?deps=${STATE}`;
const HIGHLIGHT = '@lezer/highlight@1.2.3';
const LANGUAGE = `@codemirror/language@6.12.4?deps=${STATE},@codemirror/view@6.43.7,${HIGHLIGHT}`;
const DEPS = `deps=${STATE},@codemirror/view@6.43.7,@codemirror/language@6.12.4,${HIGHLIGHT}`;

// Core classes
export let EditorState, Compartment, EditorView;

// Language support
export let html, css, javascript;

// Theme
export let oneDark;

// Minimap
export let showMinimap;

// History commands
export let undo, redo;

// Line-number toggling helpers
export let lineNumbers, highlightActiveLineGutter;

// Indentation
export let indentUnit;

// basicSetup extension array
export let basicSetup;

// Editor color themes. The roster is owned by the vendored file (single source
// of truth for ids, labels and light/dark variant); 'default' is prepended here
// because it is ours, not thememirror's. Static, so the settings dropdown can be
// built without waiting on initCM(); the extensions themselves arrive with it.
export const EDITOR_THEMES = [
  { id: 'default', label: 'Default', variant: null },
  ...THEMES,
];
export let editorThemeById = {};

// Single source of truth for "is this a usable theme id?" — every consumer
// validates through here so a corrupt stored preference can't reach CodeMirror.
export function normalizeEditorThemeId(id) {
  return EDITOR_THEMES.some((t) => t.id === id) ? id : 'default';
}

let _readyPromise = null;

export function initCM() {
  if (_readyPromise) return _readyPromise;

  _readyPromise = Promise.all([
    import(`https://esm.sh/${STATE}`),
    import(`https://esm.sh/${VIEW}`),
    import(`https://esm.sh/@codemirror/commands@6.10.4?${DEPS}`),
    import(`https://esm.sh/@codemirror/search@6.7.1?${DEPS}`),
    import(`https://esm.sh/@codemirror/autocomplete@6.20.3?${DEPS}`),
    import(`https://esm.sh/${LANGUAGE}`),
    import(`https://esm.sh/@codemirror/lint@6.9.7?${DEPS}`),
    import(`https://esm.sh/@codemirror/lang-html@6.4.11?${DEPS}`),
    import(`https://esm.sh/@codemirror/lang-css@6.3.1?${DEPS}`),
    import(`https://esm.sh/@codemirror/lang-javascript@6.2.5?${DEPS}`),
    import(`https://esm.sh/@codemirror/theme-one-dark@6.1.3?${DEPS}`),
    import(`https://esm.sh/@replit/codemirror-minimap@0.5.2?${DEPS}`),
    // Supplies the `tags` the vendored themes' highlight styles reference. Tag
    // identity is what the highlighter matches on, so this must be the same
    // instance @codemirror/language uses — which ?deps= above guarantees.
    import(`https://esm.sh/${HIGHLIGHT}`),
    import('./vendor/thememirror.js'),
  ]).then(([stateM, viewM, commandsM, searchM, autoM, langM, lintM, htmlM, cssM, jsM, darkM, minimapM, lezerHighlightM, themeMirrorM]) => {
    // Core classes
    EditorState = stateM.EditorState;
    Compartment = stateM.Compartment;
    EditorView = viewM.EditorView;

    // Language support
    html = htmlM.html;
    css = cssM.css;
    javascript = jsM.javascript;

    // Theme
    oneDark = darkM.oneDark;

    // Editor color themes (vendored thememirror, built from the singletons above)
    editorThemeById = themeMirrorM.buildThemes({
      EditorView: viewM.EditorView,
      HighlightStyle: langM.HighlightStyle,
      syntaxHighlighting: langM.syntaxHighlighting,
      tags: lezerHighlightM.tags,
    });

    // The roster and the definitions are vendored from the same package but
    // live in two files, so an upgrade can leave them out of step. Selecting a
    // listed-but-missing theme would silently fall back to Default while the
    // themed CSS stayed switched off — make that loud instead of invisible.
    const missing = THEMES.filter((t) => !Object.hasOwn(editorThemeById, t.id));
    if (missing.length) {
      console.error('Editor themes listed in thememirror-meta.js but not built:',
        missing.map((t) => t.id).join(', '));
    }

    // Minimap
    showMinimap = minimapM.showMinimap;

    // History commands
    undo = commandsM.undo;
    redo = commandsM.redo;

    // Line-number toggling
    lineNumbers = viewM.lineNumbers;
    highlightActiveLineGutter = viewM.highlightActiveLineGutter;

    // Indentation
    indentUnit = langM.indentUnit;

    // Custom basicSetup (equivalent to codemirror meta-package's basicSetup)
    basicSetup = [
      viewM.highlightSpecialChars(),
      commandsM.history(),
      langM.foldGutter(),
      viewM.drawSelection(),
      viewM.dropCursor(),
      viewM.rectangularSelection(),
      viewM.crosshairCursor(),
      viewM.highlightActiveLine(),
      stateM.EditorState.allowMultipleSelections.of(true),
      langM.indentOnInput(),
      langM.syntaxHighlighting(langM.defaultHighlightStyle, { fallback: true }),
      langM.bracketMatching(),
      autoM.closeBrackets(),
      autoM.autocompletion(),
      searchM.highlightSelectionMatches(),
      viewM.keymap.of([
        commandsM.indentWithTab,
        ...autoM.closeBracketsKeymap,
        ...commandsM.defaultKeymap,
        ...searchM.searchKeymap,
        ...commandsM.historyKeymap,
        ...langM.foldKeymap,
        ...autoM.completionKeymap,
        ...lintM.lintKeymap,
      ]),
    ];
  });

  return _readyPromise;
}
