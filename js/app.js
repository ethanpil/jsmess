// JSMess App - Entry Point

import { initCM } from './cm.js';
import { initEditors } from './editors.js';
import { initLayout } from './layout.js';
import { initShortcuts } from './shortcuts.js';
import { initTheme } from './themes.js';
import { initUI } from './ui.js';
import { importFromHash } from './storage.js';
import { run, preloadSass } from './preview.js';

let initialized = false;
async function init() {
  if (initialized) return;
  initialized = true;

  // Phase 1: immediate visual feedback (no CodeMirror needed)
  initTheme();

  // Phase 2: load CodeMirror modules, then initialize everything
  await initCM();

  initEditors();

  // Load content before layout so Split.js sizes correctly
  const loaded = importFromHash();

  initLayout();
  initShortcuts();
  initUI();

  // Run initial preview
  run();

  // Remove loading skeleton
  document.getElementById('app')?.classList.remove('loading');

  // Preload SASS compiler in background for faster first Run
  preloadSass();

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
