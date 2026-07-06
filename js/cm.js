// JSMess CodeMirror Wrapper
// All CodeMirror imports go through this file to ensure shared singleton instances.
// Versions are pinned so upstream releases can't break the site and so the CDN
// serves immutable, long-cached URLs. Keep all pins on versions whose shared
// dependencies (@codemirror/state, @codemirror/view) resolve identically, and
// update the modulepreload links in index.html in lockstep.

// Deferred initialization — exports are populated by initCM() so the module graph
// is not blocked by network requests.  All consumers use these via live bindings
// (ES module `export let`) which update once initCM() resolves.

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

let _readyPromise = null;

export function initCM() {
  if (_readyPromise) return _readyPromise;

  _readyPromise = Promise.all([
    import('https://esm.sh/@codemirror/state@6.7.1'),
    import('https://esm.sh/@codemirror/view@6.43.5'),
    import('https://esm.sh/@codemirror/commands@6.10.4'),
    import('https://esm.sh/@codemirror/search@6.7.1'),
    import('https://esm.sh/@codemirror/autocomplete@6.20.3'),
    import('https://esm.sh/@codemirror/language@6.12.4'),
    import('https://esm.sh/@codemirror/lint@6.9.7'),
    import('https://esm.sh/@codemirror/lang-html@6.4.11'),
    import('https://esm.sh/@codemirror/lang-css@6.3.1'),
    import('https://esm.sh/@codemirror/lang-javascript@6.2.5'),
    import('https://esm.sh/@codemirror/theme-one-dark@6.1.3'),
    import('https://esm.sh/@replit/codemirror-minimap@0.5.2'),
  ]).then(([stateM, viewM, commandsM, searchM, autoM, langM, lintM, htmlM, cssM, jsM, darkM, minimapM]) => {
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
