// JSMess Keyboard Shortcuts

import { run } from './preview.js';
import { focusEditor } from './editors.js';

const shortcuts = [];

function registerShortcut(key, ctrl, shift, callback, description) {
  shortcuts.push({ key: key.toLowerCase(), ctrl, shift, callback, description });
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

  document.addEventListener('keydown', handleKeydown);
}

function handleKeydown(e) {
  const isMod = e.ctrlKey || e.metaKey;

  for (const shortcut of shortcuts) {
    if (
      shortcut.key === e.key.toLowerCase() &&
      shortcut.ctrl === isMod &&
      shortcut.shift === e.shiftKey
    ) {
      e.preventDefault();
      shortcut.callback();
      return;
    }
  }
}

export function getShortcutList() {
  return shortcuts.map((s) => ({
    keys: `${s.ctrl ? 'Ctrl+' : ''}${s.shift ? 'Shift+' : ''}${s.key}`,
    description: s.description,
  }));
}
