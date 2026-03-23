// JSMess Editors - CodeMirror 6 Instances

import {
  EditorView, basicSetup,
  EditorState, Compartment,
  html, css, javascript,
  oneDark,
} from './cm.js';
import { setState } from './state.js';

const themeCompartment = new Compartment();
const editors = {};

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

export function focusEditor(key) {
  const editor = editors[key];
  if (editor) editor.focus();
}

export function refreshEditors() {
  for (const editor of Object.values(editors)) {
    editor.requestMeasure();
  }
}
