// JSMess App - Entry Point

import { initCM } from './cm.js';
import { initEditors } from './editors.js';
import { initLayout } from './layout.js';
import { initShortcuts } from './shortcuts.js';
import { initTheme } from './themes.js';
import { initUI, showToast, updateLastCleanupDisplay } from './ui.js';
import {
  importFromHash, cleanupExpiredMesses, getLastCleanupDate, consumeHashChangeSuppression,
  saveDraft, loadDraftData, restoreDraft, clearDraft,
} from './storage.js';
import { isDirty, onStateChange } from './state.js';
import { run, preloadSass } from './preview.js';

let initialized = false;
async function init() {
  if (initialized) return;
  initialized = true;

  // Phase 1: immediate visual feedback (no CodeMirror needed)
  initTheme();

  // Phase 2: load CodeMirror modules, then initialize everything
  try {
    await initCM();
  } catch (e) {
    console.error('Failed to load editor modules:', e);
    initialized = false; // allow a retry to re-enter init
    showLoadError();
    return;
  }

  initEditors();

  // Load content before layout so Split.js sizes correctly
  const loaded = await importFromHash();
  if (!loaded) maybeRestoreDraft();

  initLayout();
  initShortcuts();
  initUI();

  // Run initial preview
  run();

  // Smooth skeleton fade-out, then remove
  const appEl = document.getElementById('app');
  if (appEl) {
    appEl.classList.add('loading-done');
    setTimeout(() => appEl.classList.remove('loading', 'loading-done'), 150);
  }

  // Preload SASS compiler in background — defer to avoid bandwidth contention
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => preloadSass());
  } else {
    setTimeout(() => preloadSass(), 2000);
  }

  // Listen for hash changes (skip ones we caused ourselves via save/share)
  window.addEventListener('hashchange', async () => {
    if (consumeHashChangeSuppression()) return;
    await importFromHash();
    run();
  });

  // Auto-save a recovery draft while there are unsaved changes
  initDraftAutoSave();

  // Warn before closing the tab with unsaved changes
  window.addEventListener('beforeunload', (e) => {
    if (isDirty()) {
      e.preventDefault();
      e.returnValue = ''; // required by Chrome to show the prompt
    }
  });

  // Idle auto-cleanup: run once per day after 30s of inactivity
  initIdleCleanup();

  console.log('JSMess initialized');
}

// Offer to bring back unsaved work from the last session. Declining
// discards the draft so the prompt doesn't nag on every load.
function maybeRestoreDraft() {
  const draft = loadDraftData();
  if (!draft) return;
  const when = draft.savedAt ? new Date(draft.savedAt).toLocaleString() : 'your last session';
  if (confirm(`Restore your unsaved draft from ${when}?`)) {
    restoreDraft();
  } else {
    clearDraft();
  }
}

const DRAFT_SAVE_DELAY_MS = 2000;

function initDraftAutoSave() {
  let timer = null;
  onStateChange((detail) => {
    if (detail.key !== 'html' && detail.key !== 'css' && detail.key !== 'js') return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (isDirty()) saveDraft();
    }, DRAFT_SAVE_DELAY_MS);
  });
}

// Shown when the CodeMirror CDN modules can't be fetched (offline/blocked).
// Without this the loading skeleton animates forever with no explanation.
function showLoadError() {
  const appEl = document.getElementById('app');
  if (appEl) appEl.classList.remove('loading');

  if (document.getElementById('load-error')) return;
  const overlay = document.createElement('div');
  overlay.id = 'load-error';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 1000;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 12px; background: var(--bg-primary, #fff); color: var(--text-primary, #222);
    font-family: system-ui, sans-serif; text-align: center; padding: 20px;
  `;
  overlay.innerHTML = `
    <div style="font-size:17px;font-weight:600;">Couldn&rsquo;t load the editor</div>
    <div style="font-size:13px;max-width:420px;color:var(--text-secondary,#666);">
      JSMess needs a network connection to fetch its editor modules.
      Check your connection and try again.
    </div>
  `;
  const retry = document.createElement('button');
  retry.textContent = 'Retry';
  retry.style.cssText = `
    padding: 6px 22px; font-size: 13px; cursor: pointer; border-radius: 6px;
    border: 1px solid var(--border, #ccc); background: var(--bg-secondary, #f5f5f5);
    color: inherit;
  `;
  retry.addEventListener('click', () => window.location.reload());
  overlay.appendChild(retry);
  document.body.appendChild(overlay);
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
