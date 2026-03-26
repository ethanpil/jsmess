// JSMess State - Simple pub/sub via CustomEvent

const state = {
  html: '',
  css: '',
  js: '',
  title: 'Untitled',
  id: null,
  wrapMode: 'onLoad', // onLoad, onDomReady, noWrapHead, noWrapBody
  libraries: [], // [{name, version, url}]
  styleType: 'sass', // css, sass
  layout: 'classic', // classic, left, columns, tabs
  theme: null, // null = system, 'light', 'dark'
};

export function getState() {
  return { ...state };
}

export function get(key) {
  return state[key];
}

export function setState(key, value) {
  state[key] = value;
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
