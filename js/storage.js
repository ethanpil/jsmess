// JSMess Storage - localStorage + URL hash share links

import { getState, setMultiple, get, setDirty } from './state.js';
import { setContent } from './editors.js';
import { compileSass, wrapJsCode } from './preview.js';
import { escapeHtml } from './util.js';
// Cyclic with ui.js (which imports this module) — safe because showToast is a
// hoisted function declaration and neither module calls the other at top level.
import { showToast } from './ui.js';

const PREFIX = 'jsmess_mess_';

// ---- Mess normalization ----------------------------------------------
// The single source of truth for the per-mess fields and their defaults.
// Every serialization surface (localStorage records, .jsmess files, share
// links, drafts) encodes and decodes through this helper — add new per-mess
// fields HERE, not at the call sites. See docs/SHARE-FORMAT.md.

const WRAP_MODES = ['onLoad', 'onDomReady', 'noWrapHead', 'noWrapBody'];

function normalizeMess(raw, { titleFallback = 'Untitled' } = {}) {
  const data = raw && typeof raw === 'object' ? raw : {};
  const str = (v, fallback) => (typeof v === 'string' && v ? v : fallback);
  const libraries = Array.isArray(data.libraries)
    ? data.libraries
        .filter((l) => l && typeof l.url === 'string')
        .map((l) => ({ url: l.url, type: l.type === 'css' ? 'css' : 'js' }))
    : [];
  return {
    title: str(data.title, titleFallback),
    html: typeof data.html === 'string' ? data.html : '',
    css: typeof data.css === 'string' ? data.css : '',
    js: typeof data.js === 'string' ? data.js : '',
    wrapMode: WRAP_MODES.includes(data.wrapMode) ? data.wrapMode : 'onLoad',
    styleType: data.styleType === 'sass' ? 'sass' : 'css',
    libraries,
  };
}

// Apply a mess to state + editors (the decode-side counterpart).
function applyMess(raw, { id = null, expiration = 0, titleFallback, dirty = false } = {}) {
  const mess = normalizeMess(raw, { titleFallback });
  setMultiple({ id, expiration, ...mess });
  setContent('html', mess.html);
  setContent('css', mess.css);
  setContent('js', mess.js);
  setDirty(dirty);
}

// ---- Share link codec ------------------------------------------------
// Format: #code=<base64url(deflate-raw(UTF-8 JSON envelope))>
// Envelope: { v: SHARE_FORMAT_VERSION, mess: {...} } — see docs/SHARE-FORMAT.md
// for the schema and the forward-compatibility rules before changing it.

const SHARE_FORMAT_VERSION = 1;

export function isCompressionSupported() {
  // Probe the actual format: some engines (Chromium 80-102) have the
  // constructors but not 'deflate-raw', which throws TypeError here.
  try {
    new CompressionStream('deflate-raw');
    new DecompressionStream('deflate-raw');
    return true;
  } catch (e) {
    return false;
  }
}

async function deflateRaw(text) {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function inflateRaw(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Response(stream).text(); // decodes UTF-8
}

function bytesToBase64Url(bytes) {
  let binary = '';
  // Chunked — fromCharCode.apply on the whole array hits argument-count limits
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(str) {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded); // throws on malformed input — caught by caller
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}


// Self-initiated hash writes (save/share) must not trigger the global
// hashchange re-import, which would reset editor content and cursor.
let suppressNextHashChange = false;

function setHashSilently(hash) {
  if (window.location.hash === '#' + hash) return; // no event will fire
  suppressNextHashChange = true;
  window.location.hash = hash;
}

export function consumeHashChangeSuppression() {
  const suppressed = suppressNextHashChange;
  suppressNextHashChange = false;
  return suppressed;
}

export function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

// Save current mess to localStorage
export function saveMess(title) {
  let id = get('id');
  if (!id) {
    id = generateId();
    setMultiple({ id, title: title || 'Untitled' });
  }

  const data = {
    id,
    ...getCurrentMessData(),
    title: title || get('title') || 'Untitled',
    expiration: get('expiration') || 0,
    updatedAt: Date.now(),
  };

  // Set createdAt only on first save
  const existing = localStorage.getItem(PREFIX + id);
  if (existing) {
    try {
      data.createdAt = JSON.parse(existing).createdAt;
    } catch (e) {
      data.createdAt = Date.now();
    }
  } else {
    data.createdAt = Date.now();
  }

  localStorage.setItem(PREFIX + id, JSON.stringify(data));
  setHashSilently(`id=${id}`);
  setDirty(false);
  clearDraft(); // the work is saved; the recovery draft is obsolete
  return id;
}

// Load mess from localStorage
export function loadMess(id) {
  const data = getSavedMessData(id);
  if (!data) return false;
  applyMess(data, { id: data.id || id, expiration: data.expiration || 0 });
  return true;
}

// Fork: clone current state with new ID
export function forkMess() {
  const newId = generateId();
  setMultiple({ id: newId, title: get('title') + ' (fork)' });
  saveMess();
  return newId;
}

// Update title in localStorage for an already-saved mess
export function updateMessTitle(newTitle) {
  const id = get('id');
  if (!id) return;
  const raw = localStorage.getItem(PREFIX + id);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    data.title = newTitle;
    localStorage.setItem(PREFIX + id, JSON.stringify(data));
  } catch (e) {
    // skip corrupt entries
  }
}

// Delete mess
export function deleteMess(id) {
  localStorage.removeItem(PREFIX + id);
}

// List all saved messes
export function listMesses() {
  const messes = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(PREFIX)) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        messes.push({
          id: data.id,
          title: data.title,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          expiration: data.expiration || 0,
        });
      } catch (e) {
        // skip corrupt entries
      }
    }
  }
  return messes.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

// Current editor state, share-scope only (no expiration, no global prefs)
export function getCurrentMessData() {
  return normalizeMess(getState());
}

// Full saved record for the My Messes share path (listMesses() only
// returns summaries)
export function getSavedMessData(id) {
  const raw = localStorage.getItem(PREFIX + id);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

// Build a full shareable URL from a mess-shaped object (state snapshot or
// a saved localStorage record — extra fields like id/expiration are dropped).
export async function buildShareUrl(mess) {
  const envelope = {
    v: SHARE_FORMAT_VERSION,
    mess: normalizeMess(mess),
  };
  const bytes = await deflateRaw(JSON.stringify(envelope));
  // origin + pathname only — never carry the sharer's query string into links
  const base = window.location.origin + window.location.pathname;
  return `${base}#code=${bytesToBase64Url(bytes)}`;
}

// Import from URL hash.
// Returns 'loaded' (content applied), 'none' (no hash / nothing to load),
// or 'error' (a share link was present but could not be read) — callers
// must not treat 'error' like an empty page (e.g. by offering draft restore).
export async function importFromHash() {
  const hash = window.location.hash.substring(1);
  if (!hash) return 'none';

  if (hash.startsWith('id=')) {
    const id = hash.substring(3);
    return loadMess(id) ? 'loaded' : 'none';
  }

  if (hash.startsWith('code=')) {
    if (!isCompressionSupported()) {
      showToast('This share link needs a newer browser — yours is missing compression support.');
      return 'error';
    }
    try {
      const json = await inflateRaw(base64UrlToBytes(hash.substring(5)));
      const envelope = JSON.parse(json);
      if (!envelope || typeof envelope !== 'object' || !envelope.mess) {
        throw new Error('Unrecognized share payload');
      }
      if (typeof envelope.v === 'number' && envelope.v > SHARE_FORMAT_VERSION) {
        showToast('This link is from a newer version of JSMess — loading what we can.');
      }
      // normalizeMess ignores unknown fields, defaults missing ones, and
      // clamps wrong-typed values, so additive format changes and hostile
      // payloads never break the app (docs/SHARE-FORMAT.md).
      // Recipient always gets expiration 0 (Keep Forever) and no id.
      applyMess(envelope.mess, { titleFallback: 'Shared Mess' });
      return 'loaded';
    } catch (e) {
      console.error('Failed to import from hash:', e);
      showToast('Could not read this share link — it may be corrupted or from an old version of JSMess.');
      return 'error';
    }
  }

  return 'none';
}

// Export as downloadable .jsmess file
export function exportToFile() {
  const data = {
    ...getCurrentMessData(),
    expiration: get('expiration') || 0,
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${get('title') || 'mess'}.jsmess`;
  a.click();
  URL.revokeObjectURL(url);
}

// Import from uploaded .jsmess file
export function importFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        applyMess(data, {
          titleFallback: 'Imported Mess',
          expiration: data.expiration || 0,
        });
        resolve(true);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// Export as static site ZIP
export async function exportStaticSite(onProgress, signal) {
  onProgress('Compiling styles...', 10);
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  const styleType = get('styleType');
  let cssCode = get('css');
  if (styleType === 'sass' && cssCode.trim()) {
    cssCode = await compileSass(cssCode);
  }

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  onProgress('Preparing JavaScript...', 30);

  const jsCode = get('js');
  const wrapMode = get('wrapMode');
  const wrappedJs = wrapJsCode(jsCode, wrapMode);

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  onProgress('Building HTML...', 50);

  const libraries = get('libraries') || [];
  const libTags = libraries
    .map(lib => {
      return lib.type === 'css'
        ? `  <link rel="stylesheet" href="${lib.url}">`
        : `  <script src="${lib.url}"><\/script>`;
    })
    .join('\n');

  let headScript = '';
  let bodyScript = '';
  if (wrapMode === 'noWrapHead') {
    headScript = '  <script src="script.js"><\/script>';
  } else {
    bodyScript = '  <script src="script.js"><\/script>';
  }

  const title = get('title') || 'Untitled';
  const safeTitle = escapeHtml(title);
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeTitle}</title>
  <link rel="stylesheet" href="style.css">
${libTags}
${headScript}
</head>
<body>
${get('html')}
${bodyScript}
</body>
</html>`;

  const jsFileContent = (wrapMode === 'noWrapHead') ? jsCode : wrappedJs;

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  onProgress('Loading ZIP library...', 60);

  const JSZip = (await import('jszip')).default;

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  onProgress('Creating ZIP...', 75);

  const zip = new JSZip();
  zip.file('index.html', htmlContent);
  zip.file('style.css', cssCode);
  zip.file('script.js', jsFileContent);

  onProgress('Compressing...', 85);
  const blob = await zip.generateAsync({ type: 'blob' });

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  onProgress('Done!', 100);

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

// Export full backup of all messes and config
export function exportFullBackup(onProgress, signal) {
  onProgress('Gathering data...', 20);
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  const backup = {
    version: 1,
    type: 'jsmess-backup',
    exportedAt: new Date().toISOString(),
    messes: [],
    config: {},
  };

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith('jsmess_')) continue;

    if (key.startsWith(PREFIX)) {
      try {
        backup.messes.push(JSON.parse(localStorage.getItem(key)));
      } catch (e) { /* skip corrupt */ }
    } else {
      backup.config[key] = localStorage.getItem(key);
    }
  }

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  onProgress('Creating file...', 80);

  const blob = new Blob(
    [JSON.stringify(backup, null, 2)],
    { type: 'application/json' }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `jsmess-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);

  onProgress('Done!', 100);
}

// Parse a backup file and validate its structure
export function parseBackupFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data.type !== 'jsmess-backup' || !Array.isArray(data.messes)) {
          reject(new Error('Not a valid JSMess backup file'));
          return;
        }
        resolve(data);
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// Restore a full backup into localStorage. Skips malformed entries
// (no string id) instead of writing jsmess_mess_undefined keys.
// Returns { restored, skipped }.
export function restoreFullBackup(backupData, onProgress, signal) {
  onProgress('Restoring messes...', 20);

  const total = backupData.messes.length;
  let restored = 0;
  let skipped = 0;
  for (let i = 0; i < total; i++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const mess = backupData.messes[i];
    if (!mess || typeof mess.id !== 'string' || !mess.id) {
      skipped++;
      continue;
    }
    localStorage.setItem(PREFIX + mess.id, JSON.stringify(mess));
    restored++;
    onProgress(`Restoring mess ${i + 1} of ${total}...`, 20 + (i / total) * 60);
  }

  onProgress('Restoring config...', 85);
  if (backupData.config) {
    for (const [key, value] of Object.entries(backupData.config)) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      // Only restore our own config keys — a crafted backup must not be
      // able to write arbitrary localStorage entries.
      if (typeof key === 'string' && key.startsWith('jsmess_') && typeof value === 'string') {
        localStorage.setItem(key, value);
      }
    }
  }

  onProgress('Done!', 100);
  return { restored, skipped };
}

// ---- Draft auto-save -------------------------------------------------
// One rolling draft of unsaved work, written on a debounce while dirty and
// offered for recovery on the next plain (hash-less) load.

const DRAFT_KEY = 'jsmess_draft';

export function saveDraft() {
  const data = {
    id: get('id'),
    ...getCurrentMessData(),
    expiration: get('expiration') || 0,
    savedAt: Date.now(),
  };
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch (e) {
    // storage full — drafts are best-effort
  }
}

export function loadDraftData() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function restoreDraft() {
  const data = loadDraftData();
  if (!data) return false;
  applyMess(data, {
    id: data.id || null,
    expiration: data.expiration || 0,
    dirty: true, // restored content is still unsaved
  });
  return true;
}

export function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

// Clean up expired messes from localStorage
export function cleanupExpiredMesses() {
  const now = Date.now();
  const removed = [];

  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(PREFIX)) continue;

    try {
      const data = JSON.parse(localStorage.getItem(key));
      if (!data.expiration || data.expiration === 0) continue;

      const expiresAt = (data.updatedAt || 0) + data.expiration * 86400000;
      if (now >= expiresAt) {
        removed.push(data.title || data.id);
        localStorage.removeItem(key);
      }
    } catch (e) {
      // skip corrupt entries
    }
  }

  localStorage.setItem('jsmess_lastCleanup', new Date().toISOString().slice(0, 10));
  return { removed: removed.length, names: removed };
}

// Get the last cleanup date string (YYYY-MM-DD) or null
export function getLastCleanupDate() {
  return localStorage.getItem('jsmess_lastCleanup') || null;
}
