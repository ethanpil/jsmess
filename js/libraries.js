// JSMess Libraries - simple URL-based external library management

import { get, setState } from './state.js';
import { inferTypeFromUrl } from './util.js';

export function addLibrary(url) {
  const trimmed = url.trim();
  if (!trimmed) return;
  const libs = [...(get('libraries') || [])];
  if (libs.some((l) => l.url === trimmed)) return;
  const type = inferTypeFromUrl(trimmed) || 'js';
  libs.push({ url: trimmed, type });
  setState('libraries', libs);
}

export function removeLibrary(index) {
  const libs = [...(get('libraries') || [])];
  libs.splice(index, 1);
  setState('libraries', libs);
}

export function setLibraryType(index, type) {
  const libs = [...(get('libraries') || [])];
  if (libs[index]) {
    libs[index] = { ...libs[index], type };
    setState('libraries', libs);
  }
}

export function moveLibrary(fromIndex, toIndex) {
  const libs = [...(get('libraries') || [])];
  if (fromIndex < 0 || fromIndex >= libs.length) return;
  if (toIndex < 0 || toIndex >= libs.length) return;
  const [item] = libs.splice(fromIndex, 1);
  libs.splice(toIndex, 0, item);
  setState('libraries', libs);
}

export function clearLibraries() {
  setState('libraries', []);
}
