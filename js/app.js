// JSMess App - Entry Point

import { initCM } from './cm.js';
import { initEditors } from './editors.js';
import { initLayout } from './layout.js';
import { initShortcuts } from './shortcuts.js';
import { initTheme } from './themes.js';
import { initUI, showToast, updateLastCleanupDisplay } from './ui.js';
import { importFromHash, cleanupExpiredMesses, getLastCleanupDate } from './storage.js';
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

  // Idle auto-cleanup: run once per day after 30s of inactivity
  initIdleCleanup();

  console.log('JSMess initialized');
}

function initIdleCleanup() {
  let lastActivity = Date.now();
  const onActivity = () => { lastActivity = Date.now(); };

  window.addEventListener('mousemove', onActivity, { passive: true });
  window.addEventListener('keydown', onActivity, { passive: true });
  window.addEventListener('scroll', onActivity, { passive: true });

  setInterval(() => {
    if (Date.now() - lastActivity < 30000) return;
    const today = new Date().toISOString().slice(0, 10);
    if (getLastCleanupDate() === today) return;

    const result = cleanupExpiredMesses();
    updateLastCleanupDisplay();
    if (result.removed > 0) {
      showToast(`Auto-cleaned ${result.removed} expired mess(es)`);
    }
  }, 5000);
}

// Wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
