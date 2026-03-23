// JSMess Libraries - jsdelivr API search + CDN URL generation

import { get, setState } from './state.js';

let searchTimeout = null;

export async function searchPackages(query) {
  if (!query || query.length < 2) return [];

  try {
    const resp = await fetch(
      `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=10`
    );
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data.objects || []).map((obj) => ({
      name: obj.package.name,
      version: obj.package.version,
      description: obj.package.description || '',
    }));
  } catch (e) {
    console.error('Package search failed:', e);
    return [];
  }
}

export async function getPackageVersions(name) {
  try {
    const resp = await fetch(`https://data.jsdelivr.com/v1/packages/npm/${encodeURIComponent(name)}`);
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data.versions || []).map((v) => v.version || v).slice(0, 20);
  } catch (e) {
    console.error('Version fetch failed:', e);
    return [];
  }
}

export function getCdnUrl(name, version) {
  return `https://cdn.jsdelivr.net/npm/${name}@${version}`;
}

export function addLibrary(name, version, url) {
  const libs = [...(get('libraries') || [])];
  // Don't add duplicates
  if (libs.some((l) => l.name === name && l.version === version)) return;
  libs.push({ name, version, url: url || getCdnUrl(name, version) });
  setState('libraries', libs);
}

export function removeLibrary(index) {
  const libs = [...(get('libraries') || [])];
  libs.splice(index, 1);
  setState('libraries', libs);
}

export function clearLibraries() {
  setState('libraries', []);
}

// Debounced search for UI
export function debouncedSearch(query, callback) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    const results = await searchPackages(query);
    callback(results);
  }, 300);
}
