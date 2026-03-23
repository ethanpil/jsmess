// JSMess App - Entry Point

import { initEditors } from './editors.js';
import { initLayout } from './layout.js';
import { initShortcuts } from './shortcuts.js';
import { initTheme } from './themes.js';
import { initUI } from './ui.js';
import { importFromHash } from './storage.js';
import { run } from './preview.js';

let initialized = false;
async function init() {
  if (initialized) return;
  initialized = true;

  // Initialize editors first (they need to exist before loading content)
  initEditors();

  // Initialize theme (applies to editors too)
  initTheme();

  // Initialize layout (Split.js panes)
  initLayout();

  // Initialize keyboard shortcuts
  initShortcuts();

  // Initialize UI (toolbar, console, settings, modals)
  initUI();

  // Load from URL hash if present
  const loaded = importFromHash();

  // Run initial preview
  run();

  // Listen for hash changes
  window.addEventListener('hashchange', () => {
    importFromHash();
    run();
  });

  console.log('JSMess initialized');
}

// Wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
