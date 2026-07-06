// JSMess State - Simple pub/sub via CustomEvent

const state = {
  html: '',
  css: '',
  js: '',
  title: 'Untitled',
  id: null,
  wrapMode: 'onLoad', // onLoad, onDomReady, noWrapHead, noWrapBody
  libraries: [], // [{name, version, url}]
  expiration: 0, // 0 = keep forever, or days (1, 10, 30, 180, 365)
  styleType: 'css', // css, sass — css default: plain CSS skips the heavy remote compiler
  layout: 'classic', // classic, columns, tabs
  theme: null, // null = system, 'light', 'dark'
};

// Unsaved-changes tracking: content edits set the flag, save/load clear it.
let dirty = false;

export function isDirty() {
  return dirty;
}

export function setDirty(value) {
  dirty = value;
}

export function getState() {
  return { ...state };
}

export function get(key) {
  return state[key];
}

export function setState(key, value) {
  state[key] = value;
  if (key === 'html' || key === 'css' || key === 'js') dirty = true;
  document.dispatchEvent(new CustomEvent('state-change', { detail: { key, value } }));
}

export function setMultiple(updates) {
  for (const [key, value] of Object.entries(updates)) {
    state[key] = value;
  }
  document.dispatchEvent(new CustomEvent('state-change', { detail: { bulk: true, updates } }));
}

export function onStateChange(callback) {
  document.addEventListener('state-change', (e) => callback(e.detail));
}
