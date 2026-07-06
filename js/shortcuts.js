// JSMess Keyboard Shortcuts

import { run } from './preview.js';
import { focusEditor } from './editors.js';

const shortcuts = [];

const IS_MAC = /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent);
const MOD_LABEL = IS_MAC ? '⌘' : 'Ctrl';

// notInEditor: skip the shortcut while typing in an editor or form field —
// needed for bindings without a modifier key (e.g. '?').
function registerShortcut(key, ctrl, shift, callback, description, notInEditor = false) {
  shortcuts.push({ key: key.toLowerCase(), ctrl, shift, callback, description, notInEditor });
}

export function initShortcuts() {
  // Ctrl/Cmd+Enter → Run
  registerShortcut('Enter', true, false, () => {
    run();
  }, 'Run preview');

  // Ctrl/Cmd+S → Save
  registerShortcut('s', true, false, () => {
    document.dispatchEvent(new CustomEvent('action-save'));
  }, 'Save mess');

  // Ctrl/Cmd+Shift+F → Format
  registerShortcut('f', true, true, () => {
    document.dispatchEvent(new CustomEvent('action-format'));
  }, 'Format code');

  // Ctrl/Cmd+1 → Focus HTML editor
  registerShortcut('1', true, false, () => {
    focusEditor('html');
  }, 'Focus HTML editor');

  // Ctrl/Cmd+2 → Focus CSS editor
  registerShortcut('2', true, false, () => {
    focusEditor('css');
  }, 'Focus CSS editor');

  // Ctrl/Cmd+3 → Focus JS editor
  registerShortcut('3', true, false, () => {
    focusEditor('js');
  }, 'Focus JS editor');

  // ? → Show shortcut help (outside the editors; Cmd/Ctrl+/ is taken by
  // CodeMirror's toggle-comment inside them)
  registerShortcut('?', false, true, () => {
    document.dispatchEvent(new CustomEvent('action-show-shortcuts'));
  }, 'Show keyboard shortcuts (when not typing in an editor)', true);

  document.addEventListener('keydown', handleKeydown);
}

function isEditableTarget(el) {
  if (!el || !el.closest) return false;
  if (el.closest('.cm-editor')) return true;
  const tag = el.tagName;
  return el.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

function handleKeydown(e) {
  const isMod = e.ctrlKey || e.metaKey;

  for (const shortcut of shortcuts) {
    if (
      shortcut.key === e.key.toLowerCase() &&
      shortcut.ctrl === isMod &&
      shortcut.shift === e.shiftKey
    ) {
      if (shortcut.notInEditor && isEditableTarget(e.target)) return;
      e.preventDefault();
      shortcut.callback();
      return;
    }
  }
}

export function getShortcutList() {
  return shortcuts.map((s) => {
    let keys;
    if (!s.ctrl && s.shift && s.key.length === 1) {
      // A shifted character key displays as the character itself ('?')
      keys = s.key;
    } else {
      const key = s.key.length === 1
        ? s.key.toUpperCase()
        : s.key.charAt(0).toUpperCase() + s.key.slice(1);
      keys = `${s.ctrl ? MOD_LABEL + '+' : ''}${s.shift ? 'Shift+' : ''}${key}`;
    }
    return { keys, description: s.description };
  });
}
