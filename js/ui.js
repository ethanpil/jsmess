// JSMess UI - Toolbar, settings drawer, modals, console panel

import { get, setState, onStateChange } from './state.js';
import { run, onConsoleMessage } from './preview.js';
import { formatAll } from './format.js';
import { toggleTheme, isDark } from './themes.js';
import {
  saveMess,
  forkMess,
  listMesses,
  loadMess,
  deleteMess,
  exportToHash,
  exportToFile,
  importFromFile,
} from './storage.js';
import {
  debouncedSearch,
  addLibrary,
  removeLibrary,
  getPackageVersions,
  getCdnUrl,
} from './libraries.js';
import { setLayout, getLayoutOptions } from './layout.js';
import { setLineNumbers, setMinimap, getActiveEditor } from './editors.js';
import { undo, redo } from './cm.js';

let consoleEntries = [];

export function initUI() {
  setupToolbarActions();
  setupConsole();
  setupSettingsDrawer();
  setupMessesModal();
  setupLibrarySearch();
  updateLibraryTags();
  setupWrapModeSelector();
  setupLayoutSelector();
  setupLineNumbersToggle();
  setupMinimapToggle();

  // Listen for custom action events from shortcuts
  document.addEventListener('action-save', () => handleSave());
  document.addEventListener('action-format', () => handleFormat());

  // Update library tags when state changes
  onStateChange((detail) => {
    if (detail.key === 'libraries' || detail.bulk) {
      updateLibraryTags();
    }
  });
}

function setupToolbarActions() {
  // Run button
  const runBtn = document.getElementById('btn-run');
  if (runBtn) {
    runBtn.addEventListener('click', () => {
      clearConsole();
      run();
    });
  }

  // Format button
  const formatBtn = document.getElementById('btn-format');
  if (formatBtn) {
    formatBtn.addEventListener('click', handleFormat);
  }

  // Undo button
  const undoBtn = document.getElementById('btn-undo');
  if (undoBtn) {
    undoBtn.addEventListener('click', () => {
      const editor = getActiveEditor();
      if (editor) { undo(editor); editor.focus(); }
    });
  }

  // Redo button
  const redoBtn = document.getElementById('btn-redo');
  if (redoBtn) {
    redoBtn.addEventListener('click', () => {
      const editor = getActiveEditor();
      if (editor) { redo(editor); editor.focus(); }
    });
  }

  // Save button
  const saveBtn = document.getElementById('btn-save');
  if (saveBtn) {
    saveBtn.addEventListener('click', handleSave);
  }

  // Fork button
  const forkBtn = document.getElementById('btn-fork');
  if (forkBtn) {
    forkBtn.addEventListener('click', () => {
      forkMess();
      showToast('Forked!');
    });
  }

  // Share button
  const shareBtn = document.getElementById('btn-share');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      const hash = exportToHash();
      window.location.hash = hash;
      navigator.clipboard.writeText(window.location.href).then(() => {
        showToast('Link copied to clipboard!');
      }).catch(() => {
        showToast('URL updated — copy from address bar');
      });
    });
  }

  // Theme toggle
  const themeBtn = document.getElementById('btn-theme');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      toggleTheme();
      updateThemeIcon();
    });
  }

  // Settings toggle
  const settingsBtn = document.getElementById('btn-settings');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', toggleSettings);
  }

  // My Messes button
  const messesBtn = document.getElementById('btn-messes');
  if (messesBtn) {
    messesBtn.addEventListener('click', openMessesModal);
  }

  // Export button
  const exportBtn = document.getElementById('btn-export');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportToFile);
  }

  // Import button
  const importBtn = document.getElementById('btn-import');
  if (importBtn) {
    importBtn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.jsmess';
      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
          try {
            await importFromFile(file);
            showToast('Imported!');
            run();
          } catch (err) {
            showToast('Import failed: ' + err.message);
          }
        }
      };
      input.click();
    });
  }

  updateThemeIcon();
}

function handleSave() {
  const title = get('title') || prompt('Name:', 'Untitled') || 'Untitled';
  saveMess(title);
  showToast('Saved!');
}

async function handleFormat() {
  try {
    await formatAll();
    showToast('Formatted!');
  } catch (e) {
    showToast('Format failed');
  }
}

// Console
function setupConsole() {
  onConsoleMessage((entry) => {
    consoleEntries.push(entry);
    renderConsoleEntry(entry);
    updateConsoleCount();
  });

  // Console tabs
  const previewTab = document.getElementById('tab-preview');
  const consoleTab = document.getElementById('tab-console');
  if (previewTab) {
    previewTab.addEventListener('click', () => switchResultTab('preview'));
  }
  if (consoleTab) {
    consoleTab.addEventListener('click', () => switchResultTab('console'));
  }

  // Clear console button
  const clearBtn = document.getElementById('btn-clear-console');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearConsole);
  }
}

function switchResultTab(tab) {
  const previewTab = document.getElementById('tab-preview');
  const consoleTab = document.getElementById('tab-console');
  const previewView = document.getElementById('preview-view');
  const consoleView = document.getElementById('console-view');

  if (tab === 'preview') {
    previewTab?.classList.add('active');
    consoleTab?.classList.remove('active');
    previewView?.classList.remove('hidden');
    consoleView?.classList.add('hidden');
  } else {
    previewTab?.classList.remove('active');
    consoleTab?.classList.add('active');
    previewView?.classList.add('hidden');
    consoleView?.classList.remove('hidden');
  }
}

function renderConsoleEntry(entry) {
  const output = document.getElementById('console-output');
  if (!output) return;

  const emptyMsg = output.querySelector('.console-empty');
  if (emptyMsg) emptyMsg.remove();

  const div = document.createElement('div');
  div.className = `console-entry ${entry.method}`;
  div.textContent = entry.args.join(' ');
  output.appendChild(div);
  output.scrollTop = output.scrollHeight;
}

function clearConsole() {
  consoleEntries = [];
  const output = document.getElementById('console-output');
  if (output) {
    output.innerHTML = '<div class="console-empty">Console output will appear here...</div>';
  }
  updateConsoleCount();
}

function updateConsoleCount() {
  const badge = document.getElementById('console-count');
  if (badge) {
    badge.textContent = consoleEntries.length > 0 ? `(${consoleEntries.length})` : '';
  }
}

// Settings drawer
function setupSettingsDrawer() {
  const overlay = document.getElementById('settings-overlay');
  if (overlay) {
    overlay.addEventListener('click', toggleSettings);
  }
}

function toggleSettings() {
  const drawer = document.getElementById('settings-drawer');
  const overlay = document.getElementById('settings-overlay');
  if (drawer) drawer.classList.toggle('open');
  if (overlay) overlay.classList.toggle('open');
}

// Wrap mode selector
function setupWrapModeSelector() {
  const selector = document.getElementById('wrap-mode');
  if (!selector) return;

  selector.value = get('wrapMode');
  selector.addEventListener('change', () => {
    setState('wrapMode', selector.value);
  });
}

// Layout selector
function setupLayoutSelector() {
  const selector = document.getElementById('layout-mode');
  if (!selector) return;

  const options = getLayoutOptions();
  selector.innerHTML = options.map((o) =>
    `<option value="${o.id}">${o.label}</option>`
  ).join('');
  selector.value = get('layout');
  selector.addEventListener('change', () => {
    setLayout(selector.value);
  });
}

// Line numbers toggle
const LINENUMBERS_KEY = 'jsmess_lineNumbers';

function setupLineNumbersToggle() {
  const toggle = document.getElementById('line-numbers-toggle');
  if (!toggle) return;

  toggle.checked = localStorage.getItem(LINENUMBERS_KEY) !== 'false';
  toggle.addEventListener('change', () => {
    const show = toggle.checked;
    localStorage.setItem(LINENUMBERS_KEY, show);
    setLineNumbers(show);
  });
}

// Minimap toggle
const MINIMAP_KEY = 'jsmess_minimap';

function setupMinimapToggle() {
  const toggle = document.getElementById('minimap-toggle');
  if (!toggle) return;

  toggle.checked = localStorage.getItem(MINIMAP_KEY) === 'true';
  toggle.addEventListener('change', () => {
    const show = toggle.checked;
    localStorage.setItem(MINIMAP_KEY, show);
    setMinimap(show);
  });
}

// Library search
function setupLibrarySearch() {
  const input = document.getElementById('library-search-input');
  const results = document.getElementById('library-search-results');
  if (!input || !results) return;

  input.addEventListener('input', () => {
    const query = input.value.trim();
    if (query.length < 2) {
      results.classList.remove('open');
      return;
    }

    debouncedSearch(query, (packages) => {
      results.innerHTML = '';
      if (packages.length === 0) {
        results.classList.remove('open');
        return;
      }

      for (const pkg of packages) {
        const div = document.createElement('div');
        div.className = 'library-result';
        div.innerHTML = `
          <div class="library-result-name">${escapeHtml(pkg.name)}@${escapeHtml(pkg.version)}</div>
          <div class="library-result-desc">${escapeHtml(pkg.description)}</div>
        `;
        div.addEventListener('click', () => {
          addLibrary(pkg.name, pkg.version, getCdnUrl(pkg.name, pkg.version));
          input.value = '';
          results.classList.remove('open');
        });
        results.appendChild(div);
      }
      results.classList.add('open');
    });
  });

  // Close results on click outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.library-search')) {
      results.classList.remove('open');
    }
  });
}

function updateLibraryTags() {
  const container = document.getElementById('library-tags');
  if (!container) return;

  const libs = get('libraries') || [];
  container.innerHTML = '';

  for (let i = 0; i < libs.length; i++) {
    const tag = document.createElement('span');
    tag.className = 'library-tag';
    tag.innerHTML = `${escapeHtml(libs[i].name)}@${escapeHtml(libs[i].version)}
      <button data-index="${i}" title="Remove">&times;</button>`;
    tag.querySelector('button').addEventListener('click', () => {
      removeLibrary(i);
    });
    container.appendChild(tag);
  }
}

// Messes modal
function setupMessesModal() {
  const overlay = document.getElementById('messes-modal');
  const closeBtn = document.getElementById('messes-modal-close');

  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeMessesModal();
    });
  }
  if (closeBtn) {
    closeBtn.addEventListener('click', closeMessesModal);
  }
}

function openMessesModal() {
  const modal = document.getElementById('messes-modal');
  const list = document.getElementById('messes-list');
  if (!modal || !list) return;

  modal.classList.remove('hidden');

  const messes = listMesses();
  list.innerHTML = '';

  if (messes.length === 0) {
    list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">No saved messes yet.</p>';
    return;
  }

  for (const f of messes) {
    const item = document.createElement('div');
    item.className = 'mess-item';
    const date = f.updatedAt ? new Date(f.updatedAt).toLocaleDateString() : '';
    item.innerHTML = `
      <div>
        <div class="mess-item-title">${escapeHtml(f.title)}</div>
        <div class="mess-item-date">${date}</div>
      </div>
      <div class="mess-item-actions">
        <button class="load" title="Load">Open</button>
        <button class="delete" title="Delete">&times;</button>
      </div>
    `;
    item.querySelector('.load').addEventListener('click', () => {
      loadMess(f.id);
      closeMessesModal();
      run();
    });
    item.querySelector('.delete').addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`Delete "${f.title}"?`)) {
        deleteMess(f.id);
        openMessesModal(); // refresh list
      }
    });
    list.appendChild(item);
  }
}

function closeMessesModal() {
  const modal = document.getElementById('messes-modal');
  if (modal) modal.classList.add('hidden');
}

// Toast notification
function showToast(message) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%);
      padding: 8px 20px; border-radius: 6px; font-size: 13px; font-weight: 500;
      background: var(--text-primary); color: var(--bg-primary);
      box-shadow: var(--shadow-md); z-index: 999;
      opacity: 0; transition: opacity 0.2s ease;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.opacity = '1';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.opacity = '0';
  }, 2000);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function updateThemeIcon() {
  const btn = document.getElementById('btn-theme');
  if (btn) {
    const icon = btn.querySelector('.theme-icon');
    if (icon) icon.textContent = isDark() ? '☀️' : '🌙';
  }
}
