// JSMess Editors - CodeMirror 6 Instances

import {
  EditorView, basicSetup,
  EditorState, Compartment,
  html, css, javascript,
  oneDark,
  lineNumbers, highlightActiveLineGutter,
  showMinimap,
} from './cm.js';
import { setState } from './state.js';

const LINENUMBERS_KEY = 'jsmess_lineNumbers';
const MINIMAP_KEY = 'jsmess_minimap';
const MINIMAP_HIDE_DELAY = 1500;
let themeCompartment;
let lineNumbersCompartment;
let minimapCompartment;
const editors = {};
const scrollCleanups = {};
let activeEditor = null;

function getLineNumbersExtensions() {
  return [lineNumbers(), highlightActiveLineGutter()];
}

function isLineNumbersEnabled() {
  return localStorage.getItem(LINENUMBERS_KEY) !== 'false';
}

function isMinimapEnabled() {
  return localStorage.getItem(MINIMAP_KEY) === 'true';
}

function getMinimapExtension() {
  return showMinimap.compute(['doc'], () => ({
    create: () => ({ dom: document.createElement('div') }),
    displayText: 'blocks',
    showOverlay: 'always',
  }));
}

function createEditor(container, lang, stateKey, placeholder) {
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
        EditorState.tabSize.of(2),
        EditorView.contentAttributes.of({
          'aria-label': `${lang.toUpperCase()} editor`,
        }),
        placeholder ? placeholderExtension(placeholder) : [],
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

function placeholderExtension(text) {
  // Simple placeholder via DOM
  return EditorView.theme({
    '.cm-placeholder': {
      color: 'var(--text-muted)',
      fontStyle: 'italic',
    },
  });
}

export function initEditors() {
  // Create compartments here (after initCM() has populated the Compartment constructor)
  themeCompartment = new Compartment();
  lineNumbersCompartment = new Compartment();
  minimapCompartment = new Compartment();

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
