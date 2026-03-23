// JSMess Storage - localStorage + URL hash (LZ-String)

import LZString from 'lz-string';
import { getState, setMultiple, get } from './state.js';
import { setContent } from './editors.js';

const PREFIX = 'jsmess_fiddle_';

export function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

// Save current fiddle to localStorage
export function saveFiddle(title) {
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
    libraries: get('libraries'),
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
  window.location.hash = `id=${id}`;
  return id;
}

// Load fiddle from localStorage
export function loadFiddle(id) {
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
      libraries: data.libraries || [],
    });
    setContent('html', data.html || '');
    setContent('css', data.css || '');
    setContent('js', data.js || '');
    return true;
  } catch (e) {
    console.error('Failed to load fiddle:', e);
    return false;
  }
}

// Fork: clone current state with new ID
export function forkFiddle() {
  const newId = generateId();
  setMultiple({ id: newId, title: get('title') + ' (fork)' });
  saveFiddle();
  return newId;
}

// Delete fiddle
export function deleteFiddle(id) {
  localStorage.removeItem(PREFIX + id);
}

// List all saved fiddles
export function listFiddles() {
  const fiddles = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(PREFIX)) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        fiddles.push({
          id: data.id,
          title: data.title,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      } catch (e) {
        // skip corrupt entries
      }
    }
  }
  return fiddles.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

// Encode state to shareable URL hash
export function exportToHash() {
  const data = {
    h: get('html'),
    c: get('css'),
    j: get('js'),
    w: get('wrapMode'),
    l: get('libraries'),
    t: get('title'),
  };
  const json = JSON.stringify(data);
  const compressed = LZString.compressToEncodedURIComponent(json);

  if (compressed.length > 2000) {
    console.warn('Fiddle is large — URL may be truncated by some browsers.');
  }

  return `code=${compressed}`;
}

// Import from URL hash
export function importFromHash() {
  const hash = window.location.hash.substring(1);
  if (!hash) return false;

  if (hash.startsWith('id=')) {
    const id = hash.substring(3);
    return loadFiddle(id);
  }

  if (hash.startsWith('code=')) {
    const compressed = hash.substring(5);
    try {
      const json = LZString.decompressFromEncodedURIComponent(compressed);
      if (!json) return false;
      const data = JSON.parse(json);
      setMultiple({
        id: null,
        title: data.t || 'Shared Fiddle',
        html: data.h || '',
        css: data.c || '',
        js: data.j || '',
        wrapMode: data.w || 'onLoad',
        libraries: data.l || [],
      });
      setContent('html', data.h || '');
      setContent('css', data.c || '');
      setContent('js', data.j || '');
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
    libraries: get('libraries'),
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${get('title') || 'fiddle'}.jsmess`;
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
          title: data.title || 'Imported Fiddle',
          html: data.html || '',
          css: data.css || '',
          js: data.js || '',
          wrapMode: data.wrapMode || 'onLoad',
          libraries: data.libraries || [],
        });
        setContent('html', data.html || '');
        setContent('css', data.css || '');
        setContent('js', data.js || '');
        resolve(true);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
