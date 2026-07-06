// JSMess Storage - localStorage + URL hash (LZ-String)

import { getState, setMultiple, get, setDirty } from './state.js';
import { setContent } from './editors.js';
import { compileSass, wrapJsCode } from './preview.js';

// Lazy-loaded — only needed for shared links (code= hash) and share export
let _lz = null;
async function getLZ() {
  if (!_lz) _lz = (await import('lz-string')).default;
  return _lz;
}

const PREFIX = 'jsmess_mess_';

// Self-initiated hash writes (save/share) must not trigger the global
// hashchange re-import, which would reset editor content and cursor.
let suppressNextHashChange = false;

export function setHashSilently(hash) {
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
    title: title || get('title') || 'Untitled',
    html: get('html'),
    css: get('css'),
    js: get('js'),
    wrapMode: get('wrapMode'),
    styleType: get('styleType'),
    libraries: get('libraries'),
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
  return id;
}

// Load mess from localStorage
export function loadMess(id) {
  const raw = localStorage.getItem(PREFIX + id);
  if (!raw) return false;

  try {
    const data = JSON.parse(raw);
    setMultiple({
      id: data.id,
      title: data.title || 'Untitled',
      html: data.html || '',
      css: data.css || '',
      js: data.js || '',
      wrapMode: data.wrapMode || 'onLoad',
      styleType: data.styleType || 'sass',
      libraries: data.libraries || [],
      expiration: data.expiration || 0,
    });
    setContent('html', data.html || '');
    setContent('css', data.css || '');
    setContent('js', data.js || '');
    setDirty(false);
    return true;
  } catch (e) {
    console.error('Failed to load mess:', e);
    return false;
  }
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

// Encode state to shareable URL hash
export async function exportToHash() {
  const LZString = await getLZ();
  const data = {
    h: get('html'),
    c: get('css'),
    j: get('js'),
    w: get('wrapMode'),
    s: get('styleType'),
    l: get('libraries'),
    t: get('title'),
    e: get('expiration') || 0,
  };
  const json = JSON.stringify(data);
  const compressed = LZString.compressToEncodedURIComponent(json);

  if (compressed.length > 2000) {
    console.warn('Mess is large — URL may be truncated by some browsers.');
  }

  return `code=${compressed}`;
}

// Import from URL hash
export async function importFromHash() {
  const hash = window.location.hash.substring(1);
  if (!hash) return false;

  if (hash.startsWith('id=')) {
    const id = hash.substring(3);
    return loadMess(id);
  }

  if (hash.startsWith('code=')) {
    const LZString = await getLZ();
    const compressed = hash.substring(5);
    try {
      const json = LZString.decompressFromEncodedURIComponent(compressed);
      if (!json) return false;
      const data = JSON.parse(json);
      setMultiple({
        id: null,
        title: data.t || 'Shared Mess',
        html: data.h || '',
        css: data.c || '',
        js: data.j || '',
        wrapMode: data.w || 'onLoad',
        styleType: data.s || 'sass',
        libraries: data.l || [],
        expiration: data.e || 0,
      });
      setContent('html', data.h || '');
      setContent('css', data.c || '');
      setContent('js', data.j || '');
      setDirty(false);
      return true;
    } catch (e) {
      console.error('Failed to import from hash:', e);
      return false;
    }
  }

  return false;
}

// Export as downloadable .jsmess file
export function exportToFile() {
  const data = {
    title: get('title'),
    html: get('html'),
    css: get('css'),
    js: get('js'),
    wrapMode: get('wrapMode'),
    styleType: get('styleType'),
    libraries: get('libraries'),
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
        setMultiple({
          id: null,
          title: data.title || 'Imported Mess',
          html: data.html || '',
          css: data.css || '',
          js: data.js || '',
          wrapMode: data.wrapMode || 'onLoad',
          styleType: data.styleType || 'sass',
          libraries: data.libraries || [],
          expiration: data.expiration || 0,
        });
        setContent('html', data.html || '');
        setContent('css', data.css || '');
        setContent('js', data.js || '');
        setDirty(false);
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
  const safeTitle = title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
