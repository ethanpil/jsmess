// JSMess shared utilities

// Escape text for safe interpolation into HTML (element content or
// double-quoted attribute values).
export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// A literal </script> inside user JS (e.g. in a string) would terminate an
// inline script tag and corrupt the surrounding document. <\/script is
// equivalent inside JS strings/regex, so this is safe to apply to whole
// source files.
export function escapeScriptEnd(code) {
  return code.replace(/<\/script/gi, '<\\/script');
}

// Last path segment of a URL, for compact display. Falls back to the raw
// string if it doesn't parse.
export function filenameFromUrl(url) {
  try {
    const path = new URL(url, 'https://x/').pathname;
    return path.split('/').pop() || url;
  } catch (_) {
    return url;
  }
}

// Infer a library type from a URL's file extension: 'js', 'css', or null.
export function inferTypeFromUrl(url) {
  try {
    const path = new URL(url, 'https://x/').pathname.toLowerCase();
    const ext = path.slice(path.lastIndexOf('.'));
    if (ext === '.css') return 'css';
    if (ext === '.js' || ext === '.mjs' || ext === '.cjs') return 'js';
  } catch (_) {
    // ignore
  }
  return null;
}
