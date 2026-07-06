// JSMess UI - Toolbar, settings drawer, modals, console panel

import { get, setState, onStateChange, isDirty } from './state.js';
import { run, onConsoleMessage } from './preview.js';
import { formatAll } from './format.js';
import { toggleTheme, isDark } from './themes.js';
import {
  saveMess,
  forkMess,
  listMesses,
  loadMess,
  deleteMess,
  updateMessTitle,
  exportToHash,
  exportToFile,
  importFromFile,
  exportStaticSite,
  exportFullBackup,
  parseBackupFile,
  restoreFullBackup,
  cleanupExpiredMesses,
  getLastCleanupDate,
  setHashSilently,
} from './storage.js';
import {
  addLibrary,
  removeLibrary,
  setLibraryType,
  moveLibrary,
} from './libraries.js';
import { setLayout, getLayoutOptions } from './layout.js';
import { setLineNumbers, setMinimap, setIndentation, setEditorFont, getActiveEditor, getActiveEditorKey, getContent, setContent, getIndentSize, getIndentType } from './editors.js';
import { undo, redo } from './cm.js';

// Console rendering: entries are buffered and flushed once per animation
// frame, and only the newest MAX_CONSOLE_ENTRIES stay in the DOM — a user
// loop logging 100k messages must not freeze the page.
const MAX_CONSOLE_ENTRIES = 500;
let consoleTotalCount = 0;      // all messages received since last clear
let consoleRetainedCount = 0;   // entry nodes currently in the DOM
let consoleDroppedCount = 0;    // entries removed to stay under the cap
let pendingConsoleEntries = [];
let consoleFlushScheduled = false;

export function initUI() {
  setupToolbarActions();
  setupToolsDropdown();
  setupExportDropdown();
  setupImportDropdown();
  setupConsole();
  setupSettingsDrawer();
  setupMessesModal();
  setupMessTitle();
  setupLibraryInput();
  updateLibraryList();
  setupStyleTypeSelector();
  setupWrapModeSelector();
  setupExpirationSelector();
  setupCleanupButton();
  setupLayoutSelector();
  setupLineNumbersToggle();
  setupMinimapToggle();
  setupIndentSettings();
  setupFontSettings();

  // Listen for custom action events from shortcuts
  document.addEventListener('action-save', () => handleSave());
  document.addEventListener('action-format', () => handleFormat());

  // Update library tags and style type when state changes
  onStateChange((detail) => {
    if (detail.key === 'libraries' || detail.bulk) {
      updateLibraryList();
    }
    if (detail.key === 'styleType' || detail.bulk) {
      const styleType = get('styleType') || 'sass';
      updateCssPanelLabel(styleType);
      const selector = document.getElementById('style-type');
      if (selector) selector.value = styleType;
    }
    if (detail.key === 'title' || detail.bulk) {
      const titleInput = document.getElementById('mess-title');
      // Don't echo state back into the input while the user is typing in it —
      // the trimmed value would delete the space they just typed.
      if (titleInput && document.activeElement !== titleInput) {
        titleInput.value = get('title') || 'Untitled';
      }
    }
    if (detail.key === 'wrapMode' || detail.bulk) {
      const wrapSelector = document.getElementById('wrap-mode');
      if (wrapSelector) wrapSelector.value = get('wrapMode') || 'onLoad';
    }
    if (detail.key === 'expiration' || detail.bulk) {
      const expSelector = document.getElementById('mess-expiration');
      if (expSelector) expSelector.value = String(get('expiration') || 0);
    }
    if (detail.key === 'theme') {
      updateThemeIcon();
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
      try {
        forkMess();
        showToast('Forked!');
      } catch (e) {
        console.error('Fork failed:', e);
        showToast('Fork failed — storage may be full. Export or clean up old messes.');
      }
    });
  }

  // Share button
  const shareBtn = document.getElementById('btn-share');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const hash = await exportToHash();
      setHashSilently(hash);
      // Beyond ~2000 chars, URLs get truncated by some browsers and chat apps
      const lengthNote = hash.length > 2000 ? ' Note: link is very long and may not work everywhere.' : '';
      navigator.clipboard.writeText(window.location.href).then(() => {
        showToast('Link copied to clipboard!' + lengthNote);
      }).catch(() => {
        showToast('URL updated — copy from address bar.' + lengthNote);
      });
    });
  }

  // Theme toggle
  const themeBtn = document.getElementById('btn-theme');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      toggleTheme(); // icon updates via the theme state-change listener
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

  updateThemeIcon();
}

function handleSave() {
  try {
    saveMess(get('title'));
    showToast('Saved!');
  } catch (e) {
    // localStorage.setItem throws when the quota is exceeded
    console.error('Save failed:', e);
    showToast('Save failed — storage may be full. Export or clean up old messes.');
  }
}

async function handleFormat() {
  try {
    await formatAll();
    showToast('Formatted!');
  } catch (e) {
    showToast('Format failed');
  }
}

function setupToolsDropdown() {
  const dropdown = document.getElementById('tools-dropdown');
  if (!dropdown) return;
  const btn = document.getElementById('btn-tools');
  const menu = dropdown.querySelector('.toolbar-dropdown-menu');

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeAllDropdowns();
    menu.classList.toggle('open');
  });

  document.addEventListener('click', () => {
    menu.classList.remove('open');
  });

  menu.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]');
    if (!action) return;
    menu.classList.remove('open');
    handleToolAction(action.dataset.action);
  });
}

async function handleToolAction(action) {
  const editor = getActiveEditor();
  const key = getActiveEditorKey();

  if (action === 'tidy') {
    await handleFormat();
    return;
  }

  if (action === 'tabs-to-spaces') {
    const size = getIndentSize();
    const spaces = ' '.repeat(size);
    setContent(key, getContent(key).replace(/\t/g, spaces));
    showToast('Tabs converted to spaces');
    return;
  }

  if (action === 'spaces-to-tabs') {
    const size = getIndentSize();
    const regex = new RegExp(`^( {${size}})+`, 'gm');
    const text = getContent(key).replace(regex, (match) => '\t'.repeat(match.length / size));
    setContent(key, text);
    showToast('Spaces converted to tabs');
    return;
  }

  // Selection-based tools
  const sel = editor.state.selection.main;
  if (sel.from === sel.to) {
    showToast('No text selected');
    return;
  }
  const selected = editor.state.sliceDoc(sel.from, sel.to);
  let result;

  if (action === 'uppercase') {
    result = selected.toUpperCase();
  } else if (action === 'lowercase') {
    result = selected.toLowerCase();
  } else if (action === 'propercase') {
    result = selected.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  if (result !== undefined) {
    editor.dispatch({ changes: { from: sel.from, to: sel.to, insert: result } });
    showToast('Done');
  }
}

// Console
function setupConsole() {
  onConsoleMessage((entry) => {
    consoleTotalCount++;
    // Cap the buffer at intake so a logging loop can't grow memory while
    // a flush is pending (or while the tab is hidden and flushes are slow).
    if (pendingConsoleEntries.length >= MAX_CONSOLE_ENTRIES) {
      pendingConsoleEntries.shift();
      consoleDroppedCount++;
    }
    pendingConsoleEntries.push(entry);
    scheduleConsoleFlush();
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

function scheduleConsoleFlush() {
  if (consoleFlushScheduled) return;
  consoleFlushScheduled = true;
  // requestAnimationFrame never fires while the tab is hidden — fall back
  // to a timer there so entries still land (and the badge stays current).
  if (document.hidden) {
    setTimeout(flushConsoleEntries, 50);
  } else {
    requestAnimationFrame(flushConsoleEntries);
  }
}

function flushConsoleEntries() {
  consoleFlushScheduled = false;
  const output = document.getElementById('console-output');
  const pending = pendingConsoleEntries;
  pendingConsoleEntries = [];
  if (!output || pending.length === 0) {
    updateConsoleCount();
    return;
  }

  const emptyMsg = output.querySelector('.console-empty');
  if (emptyMsg) emptyMsg.remove();

  const frag = document.createDocumentFragment();
  for (const entry of pending) {
    const div = document.createElement('div');
    div.className = `console-entry ${entry.method}`;
    div.textContent = entry.args.join(' ');
    frag.appendChild(div);
  }
  output.appendChild(frag);
  consoleRetainedCount += pending.length;

  // Evict oldest entries beyond the cap (skip the dropped-notice node).
  while (consoleRetainedCount > MAX_CONSOLE_ENTRIES) {
    const first = output.querySelector('.console-entry:not(.console-dropped)');
    if (!first) break;
    first.remove();
    consoleRetainedCount--;
    consoleDroppedCount++;
  }

  if (consoleDroppedCount > 0) {
    let notice = output.querySelector('.console-dropped');
    if (!notice) {
      notice = document.createElement('div');
      notice.className = 'console-entry console-dropped debug';
      output.prepend(notice);
    }
    notice.textContent = `… ${consoleDroppedCount} earlier message(s) dropped`;
  }

  output.scrollTop = output.scrollHeight;
  updateConsoleCount();
}

function clearConsole() {
  consoleTotalCount = 0;
  consoleRetainedCount = 0;
  consoleDroppedCount = 0;
  pendingConsoleEntries = [];
  const output = document.getElementById('console-output');
  if (output) {
    output.innerHTML = '<div class="console-empty">Console output will appear here...</div>';
  }
  updateConsoleCount();
}

function updateConsoleCount() {
  const badge = document.getElementById('console-count');
  if (badge) {
    badge.textContent = consoleTotalCount > 0 ? `(${consoleTotalCount})` : '';
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

// Mess title input
function setupMessTitle() {
  const input = document.getElementById('mess-title');
  if (!input) return;

  input.value = get('title') || 'Untitled';

  input.addEventListener('input', () => {
    const value = input.value.trim() || 'Untitled';
    setState('title', value);
    updateMessTitle(value);
  });

  // Normalize the displayed value to the trimmed state once editing ends
  input.addEventListener('blur', () => {
    input.value = get('title') || 'Untitled';
  });
}

// Style type selector
const STYLETYPE_KEY = 'jsmess_styleType';

function setupStyleTypeSelector() {
  const selector = document.getElementById('style-type');
  if (!selector) return;

  const saved = localStorage.getItem(STYLETYPE_KEY) || 'sass';
  setState('styleType', saved);
  selector.value = saved;
  updateCssPanelLabel(saved);

  selector.addEventListener('change', () => {
    const value = selector.value;
    localStorage.setItem(STYLETYPE_KEY, value);
    setState('styleType', value);
    updateCssPanelLabel(value);
  });
}

function updateCssPanelLabel(styleType) {
  const label = document.getElementById('css-panel-label');
  if (!label) return;
  label.innerHTML = `<span class="panel-icon css">{ }</span> ${styleType === 'sass' ? 'SASS' : 'CSS'}`;
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

// Expiration selector
function setupExpirationSelector() {
  const selector = document.getElementById('mess-expiration');
  if (!selector) return;

  selector.value = String(get('expiration') || 0);
  selector.addEventListener('change', () => {
    setState('expiration', Number(selector.value));
  });
}

// Cleanup button
function setupCleanupButton() {
  updateLastCleanupDisplay();
  const btn = document.getElementById('btn-cleanup');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const result = cleanupExpiredMesses();
    updateLastCleanupDisplay();
    if (result.removed > 0) {
      showToast(`Cleaned up ${result.removed} expired mess(es)`);
    } else {
      showToast('No expired messes found');
    }
  });
}

export function updateLastCleanupDisplay() {
  const el = document.getElementById('last-cleanup');
  if (!el) return;
  const date = getLastCleanupDate();
  el.textContent = date ? `Last Cleanup: ${date}` : 'Last Cleanup: Never';
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

// Indent settings
const INDENT_TYPE_KEY = 'jsmess_indentType';
const INDENT_SIZE_KEY = 'jsmess_indentSize';

function setupIndentSettings() {
  const typeSelector = document.getElementById('indent-type');
  const sizeSelector = document.getElementById('indent-size');
  if (!typeSelector || !sizeSelector) return;

  const savedType = localStorage.getItem(INDENT_TYPE_KEY) || 'spaces';
  const savedSize = localStorage.getItem(INDENT_SIZE_KEY) || '2';
  typeSelector.value = savedType;
  sizeSelector.value = savedSize;
  updateIndentSizeState(typeSelector, sizeSelector);

  typeSelector.addEventListener('change', () => {
    const type = typeSelector.value;
    localStorage.setItem(INDENT_TYPE_KEY, type);
    updateIndentSizeState(typeSelector, sizeSelector);
    setIndentation(type, parseInt(sizeSelector.value, 10));
  });

  sizeSelector.addEventListener('change', () => {
    const size = sizeSelector.value;
    localStorage.setItem(INDENT_SIZE_KEY, size);
    setIndentation(typeSelector.value, parseInt(size, 10));
  });
}

function updateIndentSizeState(typeSelector, sizeSelector) {
  const isTabs = typeSelector.value === 'tabs';
  sizeSelector.disabled = isTabs;
  sizeSelector.style.opacity = isTabs ? '0.5' : '1';
}

// Font settings
const FONT_KEY = 'jsmess_editorFont';
const FONT_SIZE_KEY = 'jsmess_fontSize';

function setupFontSettings() {
  const fontSelector = document.getElementById('editor-font');
  const sizeSlider = document.getElementById('font-size');
  const sizeValue = document.getElementById('font-size-value');
  if (!fontSelector || !sizeSlider) return;

  const savedFont = localStorage.getItem(FONT_KEY) || 'Source Code Pro';
  const savedSize = localStorage.getItem(FONT_SIZE_KEY) || '13';
  fontSelector.value = savedFont;
  sizeSlider.value = savedSize;
  if (sizeValue) sizeValue.textContent = savedSize + 'px';

  // Lazy-load all Google Fonts when the selector is first opened
  fontSelector.addEventListener('focus', () => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Cascadia+Code&family=Fira+Code&family=IBM+Plex+Mono&family=Inconsolata&family=JetBrains+Mono&family=Overpass+Mono&family=Source+Code+Pro&family=Space+Mono&family=Ubuntu+Mono&display=swap';
    document.head.appendChild(link);
  }, { once: true });

  fontSelector.addEventListener('change', () => {
    localStorage.setItem(FONT_KEY, fontSelector.value);
    setEditorFont(fontSelector.value, parseInt(sizeSlider.value, 10));
  });

  sizeSlider.addEventListener('input', () => {
    const size = sizeSlider.value;
    if (sizeValue) sizeValue.textContent = size + 'px';
    localStorage.setItem(FONT_SIZE_KEY, size);
    setEditorFont(fontSelector.value, parseInt(size, 10));
  });
}

// Library URL input
function setupLibraryInput() {
  const input = document.getElementById('library-url-input');
  const addBtn = document.getElementById('library-add-btn');
  if (!input || !addBtn) return;

  const doAdd = () => {
    const url = input.value.trim();
    if (url) {
      addLibrary(url);
      input.value = '';
    }
  };

  addBtn.addEventListener('click', doAdd);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doAdd();
  });
}

function filenameFromUrl(url) {
  try {
    const path = new URL(url, 'https://x/').pathname;
    return path.split('/').pop() || url;
  } catch (_) {
    return url;
  }
}

function updateLibraryList() {
  const container = document.getElementById('library-list');
  if (!container) return;

  const libs = get('libraries') || [];
  container.innerHTML = '';

  for (let i = 0; i < libs.length; i++) {
    const lib = libs[i];
    const row = document.createElement('div');
    row.className = 'library-item';

    const label = document.createElement('span');
    label.className = 'library-item-url';
    label.textContent = filenameFromUrl(lib.url);
    label.title = lib.url;

    const typeSelect = document.createElement('select');
    typeSelect.className = 'library-type-select';
    typeSelect.innerHTML = '<option value="js">JS</option><option value="css">CSS</option>';
    typeSelect.value = lib.type || 'js';
    typeSelect.addEventListener('change', () => setLibraryType(i, typeSelect.value));

    const actions = document.createElement('span');
    actions.className = 'library-item-actions';

    const upBtn = document.createElement('button');
    upBtn.textContent = '\u2191';
    upBtn.title = 'Move up';
    upBtn.disabled = i === 0;
    upBtn.addEventListener('click', () => moveLibrary(i, i - 1));

    const downBtn = document.createElement('button');
    downBtn.textContent = '\u2193';
    downBtn.title = 'Move down';
    downBtn.disabled = i === libs.length - 1;
    downBtn.addEventListener('click', () => moveLibrary(i, i + 1));

    const delBtn = document.createElement('button');
    delBtn.className = 'library-delete-btn';
    delBtn.textContent = '\u00d7';
    delBtn.title = 'Remove';
    delBtn.addEventListener('click', () => removeLibrary(i));

    actions.append(upBtn, downBtn, delBtn);
    row.append(label, typeSelect, actions);
    container.appendChild(row);
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
  let search = document.getElementById('messes-search');
  if (!modal || !list) return;

  modal.classList.remove('hidden');
  if (search) search.value = '';

  const messes = listMesses();

  function renderList(items) {
    list.innerHTML = '';
    if (messes.length === 0) {
      list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">No saved messes yet.</p>';
      return;
    }
    if (items.length === 0) {
      list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:20px;">No messes match your search.</p>';
      return;
    }
    for (const f of items) {
      const item = document.createElement('div');
      item.className = 'mess-item';
      const date = f.updatedAt ? new Date(f.updatedAt).toLocaleDateString() : '';
      let expiryLabel = '';
      if (f.expiration && f.expiration > 0 && f.updatedAt) {
        const expiresAt = f.updatedAt + f.expiration * 86400000;
        const daysLeft = Math.ceil((expiresAt - Date.now()) / 86400000);
        if (daysLeft <= 0) {
          expiryLabel = '<span class="mess-item-expiry expired">Expired</span>';
        } else if (daysLeft === 1) {
          expiryLabel = '<span class="mess-item-expiry">Expires tomorrow</span>';
        } else {
          expiryLabel = `<span class="mess-item-expiry">Expires in ${daysLeft} days</span>`;
        }
      }
      item.innerHTML = `
        <div>
          <div class="mess-item-title">${escapeHtml(f.title)}</div>
          <div class="mess-item-date">${date} ${expiryLabel}</div>
        </div>
        <div class="mess-item-actions">
          <button class="load" title="Load">Open</button>
          <button class="delete" title="Delete">&times;</button>
        </div>
      `;
      item.querySelector('.load').addEventListener('click', () => {
        if (isDirty() && !confirm('You have unsaved changes that will be lost. Load anyway?')) {
          return;
        }
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

  renderList(messes);

  if (search) {
    const fresh = search.cloneNode(true);
    search.replaceWith(fresh);
    fresh.addEventListener('input', () => {
      const q = fresh.value.trim().toLowerCase();
      renderList(q ? messes.filter(f => f.title.toLowerCase().includes(q)) : messes);
    });
  }
}

function closeMessesModal() {
  const modal = document.getElementById('messes-modal');
  if (modal) modal.classList.add('hidden');
}

// Toast notification
export function showToast(message) {
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

// Close all open dropdown menus
function closeAllDropdowns() {
  document.querySelectorAll('.toolbar-dropdown-menu.open').forEach(m => m.classList.remove('open'));
}

// Export dropdown
function setupExportDropdown() {
  const dropdown = document.getElementById('export-dropdown');
  if (!dropdown) return;
  const btn = document.getElementById('btn-export');
  const menu = dropdown.querySelector('.toolbar-dropdown-menu');

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeAllDropdowns();
    menu.classList.toggle('open');
  });

  document.addEventListener('click', () => {
    menu.classList.remove('open');
  });

  menu.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]');
    if (!action) return;
    menu.classList.remove('open');
    handleExportAction(action.dataset.action);
  });
}

async function handleExportAction(action) {
  if (action === 'export-mess') {
    exportToFile();
    return;
  }

  if (action === 'export-static') {
    const controller = new AbortController();
    showProgress('Exporting Static Site...', controller);
    try {
      await exportStaticSite(updateProgress, controller.signal);
      showToast('Static site exported!');
    } catch (err) {
      if (err.name !== 'AbortError') showToast('Export failed: ' + err.message);
    } finally {
      hideProgress();
    }
    return;
  }

  if (action === 'export-backup') {
    const controller = new AbortController();
    showProgress('Exporting Full Backup...', controller);
    try {
      exportFullBackup(updateProgress, controller.signal);
      showToast('Backup exported!');
    } catch (err) {
      if (err.name !== 'AbortError') showToast('Backup failed: ' + err.message);
    } finally {
      hideProgress();
    }
    return;
  }
}

// Import dropdown
function setupImportDropdown() {
  const dropdown = document.getElementById('import-dropdown');
  if (!dropdown) return;
  const btn = document.getElementById('btn-import');
  const menu = dropdown.querySelector('.toolbar-dropdown-menu');

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeAllDropdowns();
    menu.classList.toggle('open');
  });

  document.addEventListener('click', () => {
    menu.classList.remove('open');
  });

  menu.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]');
    if (!action) return;
    menu.classList.remove('open');
    handleImportAction(action.dataset.action);
  });
}

async function handleImportAction(action) {
  if (action === 'import-mess') {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.jsmess';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const controller = new AbortController();
      showProgress('Importing Mess...', controller);
      try {
        await importFromFile(file);
        showToast('Imported!');
        run();
      } catch (err) {
        if (err.name !== 'AbortError') showToast('Import failed: ' + err.message);
      } finally {
        hideProgress();
      }
    };
    input.click();
    return;
  }

  if (action === 'import-restore') {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const backupData = await parseBackupFile(file);
        const count = backupData.messes.length;
        const configCount = Object.keys(backupData.config || {}).length;
        const confirmed = confirm(
          `This will restore ${count} mess(es) and ${configCount} config setting(s).\n\n` +
          `Existing messes with the same IDs will be overwritten.\n\n` +
          `Continue?`
        );
        if (!confirmed) return;

        const controller = new AbortController();
        showProgress('Restoring Backup...', controller);
        try {
          const result = restoreFullBackup(backupData, updateProgress, controller.signal);
          showToast(result.skipped > 0
            ? `Restored ${result.restored} mess(es), skipped ${result.skipped} malformed entr${result.skipped === 1 ? 'y' : 'ies'}`
            : `Restored ${result.restored} mess(es)!`);
        } catch (err) {
          if (err.name !== 'AbortError') showToast('Restore failed: ' + err.message);
        } finally {
          hideProgress();
        }
      } catch (err) {
        showToast('Invalid backup file: ' + err.message);
      }
    };
    input.click();
    return;
  }
}

// Progress overlay
function showProgress(title, controller) {
  const overlay = document.getElementById('progress-overlay');
  const titleEl = document.getElementById('progress-title');
  const bar = document.getElementById('progress-bar');
  const message = document.getElementById('progress-message');
  const cancelBtn = document.getElementById('progress-cancel');

  if (titleEl) titleEl.textContent = title;
  if (bar) bar.style.width = '0%';
  if (message) message.textContent = 'Preparing...';
  if (overlay) overlay.classList.remove('hidden');

  const onCancel = () => {
    controller.abort();
    hideProgress();
    showToast('Cancelled');
  };
  if (cancelBtn) {
    cancelBtn.removeEventListener('click', cancelBtn._handler);
    cancelBtn._handler = onCancel;
    cancelBtn.addEventListener('click', onCancel);
  }
}

function updateProgress(msg, pct) {
  const bar = document.getElementById('progress-bar');
  const message = document.getElementById('progress-message');
  if (bar) bar.style.width = pct + '%';
  if (message) message.textContent = msg;
}

function hideProgress() {
  const overlay = document.getElementById('progress-overlay');
  if (overlay) overlay.classList.add('hidden');
}
