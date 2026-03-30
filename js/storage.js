// JSMess Storage - localStorage + URL hash (LZ-String)

import LZString from 'lz-string';
import { getState, setMultiple, get } from './state.js';
import { setContent } from './editors.js';

const PREFIX = 'jsmess_mess_';

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
    });
    setContent('html', data.html || '');
    setContent('css', data.css || '');
    setContent('js', data.js || '');
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
        });
      } catch (e) {
        // skip corrupt entries
      }
    }
  }
  return messes.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

// Encode state to shareable URL hash
export function exportToHash() {
  const data = {
    h: get('html'),
    c: get('css'),
    j: get('js'),
    w: get('wrapMode'),
    s: get('styleType'),
    l: get('libraries'),
    t: get('title'),
  };
  const json = JSON.stringify(data);
  const compressed = LZString.compressToEncodedURIComponent(json);

  if (compressed.length > 2000) {
    console.warn('Mess is large — URL may be truncated by some browsers.');
  }

  return `code=${compressed}`;
}

// Import from URL hash
export function importFromHash() {
  const hash = window.location.hash.substring(1);
  if (!hash) return false;

  if (hash.startsWith('id=')) {
    const id = hash.substring(3);
    return loadMess(id);
  }

  if (hash.startsWith('code=')) {
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
    styleType: get('styleType'),
    libraries: get('libraries'),
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
