// JSMess Libraries - jsdelivr API search + CDN URL generation

import { get, setState } from './state.js';

const ALGOLIA_APP_ID = 'OFCNCOG2CU';
const ALGOLIA_API_KEY = 'f54e21fa3a2a0160595bb058179bfb1e';
const ALGOLIA_URL = `https://${ALGOLIA_APP_ID}-dsn.algolia.net/1/indexes/npm-search/query`;

let searchTimeout = null;

export async function searchPackages(query) {
  if (!query || query.length < 2) return [];

  try {
    const resp = await fetch(ALGOLIA_URL, {
      method: 'POST',
      headers: {
        'x-algolia-application-id': ALGOLIA_APP_ID,
        'x-algolia-api-key': ALGOLIA_API_KEY,
      },
      body: JSON.stringify({
        query,
        hitsPerPage: 10,
        attributesToRetrieve: ['name', 'version', 'description'],
      }),
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    return (data.hits || []).map((hit) => ({
      name: hit.name,
      version: hit.version,
      description: hit.description || '',
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

// Synchronous type inference from URL extension only. Returns 'js', 'css', or null.
export function inferTypeFromUrl(url) {
  try {
    const path = new URL(url, 'https://x/').pathname.toLowerCase();
    const ext = path.slice(path.lastIndexOf('.'));
    if (ext === '.css') return 'css';
    if (ext === '.scss' || ext === '.sass') return 'css';
    if (ext === '.js' || ext === '.mjs' || ext === '.cjs') return 'js';
  } catch (_) {
    // ignore
  }
  return null;
}

// Resolve a library URL to 'js' or 'css'. Tries extension first, then a HEAD
// request to inspect Content-Type and final redirected URL. Defaults to 'js'.
export async function resolveLibraryType(url) {
  const fromExt = inferTypeFromUrl(url);
  if (fromExt) return fromExt;

  try {
    const resp = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    const ct = (resp.headers.get('content-type') || '').toLowerCase();
    if (ct.startsWith('text/css')) return 'css';
    if (ct.includes('javascript') || ct.includes('ecmascript')) return 'js';
    if (ct.includes('scss') || ct.includes('sass')) return 'css';

    // Inspect final redirected URL's extension
    const fromFinal = inferTypeFromUrl(resp.url || url);
    if (fromFinal) return fromFinal;
  } catch (_) {
    // network failure — fall through
  }

  return 'js';
}

export async function addLibrary(name, version, url) {
  const libs = [...(get('libraries') || [])];
  // Don't add duplicates
  if (libs.some((l) => l.name === name && l.version === version)) return;
  const finalUrl = url || getCdnUrl(name, version);
  const type = await resolveLibraryType(finalUrl);
  libs.push({ name, version, url: finalUrl, type });
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
