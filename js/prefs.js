// JSMess Preferences - single source of truth for persisted user settings.
//
// Every preference key lives in this table so no key string is ever defined
// twice (previously editors.js and ui.js each declared their own copies).
//
// NOTE: the inline <script> in index.html reads the theme and editorFont
// keys directly because it runs before any module loads — keep those two
// key names in sync with it.

const KEYS = {
  theme: 'jsmess_theme',
  layout: 'jsmess_layout',
  styleType: 'jsmess_styleType',
  lineNumbers: 'jsmess_lineNumbers',
  minimap: 'jsmess_minimap',
  indentType: 'jsmess_indentType',
  indentSize: 'jsmess_indentSize',
  editorFont: 'jsmess_editorFont',
  fontSize: 'jsmess_fontSize',
};

function keyFor(name) {
  const key = KEYS[name];
  if (!key) throw new Error(`Unknown preference: ${name}`);
  return key;
}

export function getPref(name) {
  return localStorage.getItem(keyFor(name));
}

export function setPref(name, value) {
  localStorage.setItem(keyFor(name), String(value));
}
