// JSMess CodeMirror Wrapper
// All CodeMirror imports go through this file to ensure shared singleton instances.
// We import all @codemirror/* packages without pinned versions so esm.sh resolves
// them to consistent transitive dependency versions (avoiding duplicate @codemirror/state).

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
    import('https://esm.sh/@codemirror/state'),
    import('https://esm.sh/@codemirror/view'),
    import('https://esm.sh/@codemirror/commands'),
    import('https://esm.sh/@codemirror/search'),
    import('https://esm.sh/@codemirror/autocomplete'),
    import('https://esm.sh/@codemirror/language'),
    import('https://esm.sh/@codemirror/lint'),
    import('https://esm.sh/@codemirror/lang-html'),
    import('https://esm.sh/@codemirror/lang-css'),
    import('https://esm.sh/@codemirror/lang-javascript'),
    import('https://esm.sh/@codemirror/theme-one-dark'),
    import('https://esm.sh/@replit/codemirror-minimap'),
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
