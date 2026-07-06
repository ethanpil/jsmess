// JSMess Themes - Dark/Light toggle

import { setState, get } from './state.js';
import { setTheme as setEditorTheme } from './editors.js';

const THEME_KEY = 'jsmess_theme';

export function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) {
    applyTheme(saved);
    setState('theme', saved);
  } else {
    // Detect system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
    setState('theme', prefersDark ? 'dark' : 'light');
  }

  // Listen for system theme changes (only while following the system, i.e.
  // no explicit user choice saved). Keep state in sync so isDark() and the
  // toolbar icon reflect the new theme.
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem(THEME_KEY)) {
      const next = e.matches ? 'dark' : 'light';
      applyTheme(next);
      setState('theme', next);
    }
  });
}

export function toggleTheme() {
  const current = get('theme');
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  setState('theme', next);
  localStorage.setItem(THEME_KEY, next);
}

export function isDark() {
  return get('theme') === 'dark';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  setEditorTheme(theme === 'dark');
}
