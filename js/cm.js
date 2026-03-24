// JSMess CodeMirror Wrapper
// All CodeMirror imports go through this file to ensure shared singleton instances.
// We import all @codemirror/* packages without pinned versions so esm.sh resolves
// them to consistent transitive dependency versions (avoiding duplicate @codemirror/state).

const [stateM, viewM, commandsM, searchM, autoM, langM, lintM, htmlM, cssM, jsM, darkM, minimapM] =
  await Promise.all([
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
  ]);

// Core classes
export const { EditorState, Compartment } = stateM;
export const { EditorView } = viewM;

// Language support
export const { html } = htmlM;
export const { css } = cssM;
export const { javascript } = jsM;

// Theme
export const { oneDark } = darkM;

// Minimap
export const { showMinimap } = minimapM;

// Custom basicSetup (equivalent to codemirror meta-package's basicSetup)
// Exports for dynamic line-number toggling via Compartment
export const lineNumbers = viewM.lineNumbers;
export const highlightActiveLineGutter = viewM.highlightActiveLineGutter;

export const basicSetup = [
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
    ...autoM.closeBracketsKeymap,
    ...commandsM.defaultKeymap,
    ...searchM.searchKeymap,
    ...commandsM.historyKeymap,
    ...langM.foldKeymap,
    ...autoM.completionKeymap,
    ...lintM.lintKeymap,
  ]),
];
