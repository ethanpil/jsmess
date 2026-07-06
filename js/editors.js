// JSMess Editors - CodeMirror 6 Instances

import {
  EditorView, basicSetup,
  EditorState, Compartment,
  html, css, javascript,
  oneDark,
  lineNumbers, highlightActiveLineGutter,
  showMinimap,
  indentUnit,
} from './cm.js';
import { setState } from './state.js';
import { getPref } from './prefs.js';

const FONT_FALLBACK = "'SF Mono', 'Consolas', 'Monaco', monospace";
const MINIMAP_HIDE_DELAY = 1500;
let themeCompartment;
let lineNumbersCompartment;
let minimapCompartment;
let tabSizeCompartment;
let indentUnitCompartment;
let fontCompartment;
const editors = {};
const scrollCleanups = {};
let activeEditor = null;

function getLineNumbersExtensions() {
  return [lineNumbers(), highlightActiveLineGutter()];
}

function isLineNumbersEnabled() {
  return getPref('lineNumbers') !== 'false';
}

function isMinimapEnabled() {
  return getPref('minimap') === 'true';
}

function getMinimapExtension() {
  return showMinimap.compute(['doc'], () => ({
    create: () => ({ dom: document.createElement('div') }),
    displayText: 'blocks',
    showOverlay: 'always',
  }));
}

function getIndentType() {
  return getPref('indentType') || 'spaces';
}

function getIndentSize() {
  return parseInt(getPref('indentSize'), 10) || 2;
}

function getEditorFont() {
  return getPref('editorFont') || 'Source Code Pro';
}

function getFontSize() {
  return parseInt(getPref('fontSize'), 10) || 13;
}

function getFontTheme(family, size) {
  return EditorView.theme({
    '&': { fontSize: size + 'px' },
    '.cm-scroller': { fontFamily: `'${family}', ${FONT_FALLBACK}` },
  });
}

function createEditor(container, lang, stateKey) {
  const langExtension = lang === 'html' ? html() : lang === 'css' ? css() : javascript();

  const updateListener = EditorView.updateListener.of((update) => {
    if (update.docChanged) {
      setState(stateKey, update.state.doc.toString());
    }
  });

  const view = new EditorView({
    state: EditorState.create({
      doc: '',
      extensions: [
        basicSetup,
        lineNumbersCompartment.of(isLineNumbersEnabled() ? getLineNumbersExtensions() : []),
        minimapCompartment.of(isMinimapEnabled() ? getMinimapExtension() : []),
        langExtension,
        updateListener,
        themeCompartment.of([]),
        EditorView.theme({
          '&': { height: '100%' },
          '.cm-scroller': { overflow: 'auto' },
        }),
        tabSizeCompartment.of(EditorState.tabSize.of(getIndentSize())),
        indentUnitCompartment.of(indentUnit.of(getIndentType() === 'tabs' ? '\t' : ' '.repeat(getIndentSize()))),
        fontCompartment.of(getFontTheme(getEditorFont(), getFontSize())),
        EditorView.contentAttributes.of({
          'aria-label': `${lang.toUpperCase()} editor`,
        }),
      ].flat(),
    }),
    parent: container,
  });

  editors[stateKey] = view;

  view.dom.addEventListener('focusin', () => {
    activeEditor = view;
  });

  if (isMinimapEnabled()) {
    attachScrollListener(stateKey, view);
  }

  return view;
}

export function initEditors() {
  // Create compartments here (after initCM() has populated the Compartment constructor)
  themeCompartment = new Compartment();
  lineNumbersCompartment = new Compartment();
  minimapCompartment = new Compartment();
  tabSizeCompartment = new Compartment();
  indentUnitCompartment = new Compartment();
  fontCompartment = new Compartment();

  const htmlContainer = document.querySelector('#html-panel .panel-body');
  const cssContainer = document.querySelector('#css-panel .panel-body');
  const jsContainer = document.querySelector('#js-panel .panel-body');

  if (htmlContainer) createEditor(htmlContainer, 'html', 'html');
  if (cssContainer) createEditor(cssContainer, 'css', 'css');
  if (jsContainer) createEditor(jsContainer, 'javascript', 'js');
}

export function getEditor(key) {
  return editors[key];
}

export function getContent(key) {
  const editor = editors[key];
  return editor ? editor.state.doc.toString() : '';
}

export function setContent(key, value) {
  const editor = editors[key];
  if (!editor) return;
  editor.dispatch({
    changes: { from: 0, to: editor.state.doc.length, insert: value },
  });
}

export function setTheme(isDark) {
  const theme = isDark ? oneDark : [];
  for (const editor of Object.values(editors)) {
    editor.dispatch({
      effects: themeCompartment.reconfigure(theme),
    });
  }
}

export function getActiveEditor() {
  return activeEditor || editors['html'];
}

export function getActiveEditorKey() {
  for (const [key, view] of Object.entries(editors)) {
    if (view === activeEditor) return key;
  }
  return 'html';
}

export { getIndentType, getIndentSize };

export function focusEditor(key) {
  const editor = editors[key];
  if (editor) editor.focus();
}

export function setLineNumbers(show) {
  const ext = show ? getLineNumbersExtensions() : [];
  for (const editor of Object.values(editors)) {
    editor.dispatch({
      effects: lineNumbersCompartment.reconfigure(ext),
    });
  }
}

export function setMinimap(show) {
  if (show) {
    // Enable the extension on all editors and attach scroll listeners
    for (const [key, editor] of Object.entries(editors)) {
      editor.dispatch({
        effects: minimapCompartment.reconfigure(getMinimapExtension()),
      });
      attachScrollListener(key, editor);
    }
  } else {
    // Disable the extension and remove scroll listeners
    for (const [key, editor] of Object.entries(editors)) {
      editor.dom.classList.remove('minimap-visible');
      editor.dispatch({
        effects: minimapCompartment.reconfigure([]),
      });
      detachScrollListener(key);
    }
  }
}

export function setEditorFont(family, size) {
  const theme = getFontTheme(family, size);
  for (const editor of Object.values(editors)) {
    editor.dispatch({
      effects: fontCompartment.reconfigure(theme),
    });
  }
}

export function setIndentation(type, size) {
  const unit = type === 'tabs' ? '\t' : ' '.repeat(size);
  for (const editor of Object.values(editors)) {
    editor.dispatch({
      effects: [
        tabSizeCompartment.reconfigure(EditorState.tabSize.of(size)),
        indentUnitCompartment.reconfigure(indentUnit.of(unit)),
      ],
    });
  }
}

function attachScrollListener(key, editor) {
  detachScrollListener(key);
  let timer = null;
  const scroller = editor.scrollDOM;
  const handler = () => {
    editor.dom.classList.add('minimap-visible');
    clearTimeout(timer);
    timer = setTimeout(() => {
      editor.dom.classList.remove('minimap-visible');
    }, MINIMAP_HIDE_DELAY);
  };
  scroller.addEventListener('scroll', handler);
  scrollCleanups[key] = () => {
    scroller.removeEventListener('scroll', handler);
    clearTimeout(timer);
  };
}

function detachScrollListener(key) {
  if (scrollCleanups[key]) {
    scrollCleanups[key]();
    delete scrollCleanups[key];
  }
}

export function refreshEditors() {
  for (const editor of Object.values(editors)) {
    editor.requestMeasure();
  }
}
