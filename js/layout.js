// JSMess Layout - Split.js resizable panes

import Split from 'split.js';
import { get, setState } from './state.js';
import { refreshEditors, focusEditor } from './editors.js';
import { getPref, setPref } from './prefs.js';

let splits = [];

// Below this width none of the three desktop layouts fit: two panes side by
// side leave ~186px each, and Split.js gutters are not draggable by touch at
// that size. Mobile gets its own single-pane layout instead. Kept in sync with
// the breakpoint in css/layout.css.
export const MOBILE_QUERY = '(max-width: 768px)';

// The unified mobile tab bar. 'JavaScript' and 'Console' are shortened because
// five tabs share the width: at 375px each cell is ~69px, and 'Console' plus
// its message count is the widest label - it clips at 320, 360 and 375px while
// 'JS' alone does not rescue it.
const MOBILE_TABS = [
  { key: 'html', label: 'HTML' },
  { key: 'css', label: 'CSS' },
  { key: 'js', label: 'JS' },
  { key: 'result', label: 'Result' },
  { key: 'log', label: 'Log' },
];

export function isMobileLayout() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

// The saved preference always describes the desktop choice; mobile overrides it
// rather than overwriting it, so the layout returns as-is on a wider screen.
function effectiveLayout() {
  return isMobileLayout() ? 'mobile' : get('layout');
}

export function initLayout() {
  const saved = getPref('layout');
  if (saved) setState('layout', saved);

  applyLayout(effectiveLayout());
  watchBreakpoint();
}

// Re-lay out only when the viewport actually crosses the breakpoint. Both
// listeners are needed: the matchMedia change event is the correct signal but
// does not fire in every environment (notably when the viewport is driven
// programmatically), and resize alone would rebuild Split.js on every pixel of
// a window drag. The lastWasMobile guard makes the common case a boolean
// compare and keeps a stuck mobile layout off a desktop-sized window.
let lastWasMobile = null;

function watchBreakpoint() {
  lastWasMobile = isMobileLayout();
  const check = () => {
    const nowMobile = isMobileLayout();
    if (nowMobile === lastWasMobile) return;
    lastWasMobile = nowMobile;
    applyLayout(effectiveLayout());
  };
  window.matchMedia(MOBILE_QUERY).addEventListener('change', check);
  window.addEventListener('resize', check);
}

export function setLayout(layout) {
  setState('layout', layout);
  setPref('layout', layout);
  applyLayout(effectiveLayout());
}

export function getLayoutOptions() {
  return [
    { id: 'classic', label: 'Classic (2×2)' },
    { id: 'columns', label: 'Columns' },
    { id: 'tabs', label: 'Tabs' },
  ];
}

function destroySplits() {
  splits.forEach(s => { try { s.destroy(); } catch(e) {} });
  splits = [];
}

// Remove any leftover Split.js gutters from a container
function removeGutters(container) {
  container.querySelectorAll('.gutter').forEach(g => g.remove());
}

function applyLayout(layout) {
  destroySplits();

  const area = document.querySelector('.editor-area');
  if (!area) return;

  const topRow = document.getElementById('top-row');
  const bottomRow = document.getElementById('bottom-row');
  const htmlPanel = document.getElementById('html-panel');
  const cssPanel = document.getElementById('css-panel');
  const jsPanel = document.getElementById('js-panel');
  const resultPanel = document.getElementById('result-panel');

  // Clean up gutters and inline styles from previous layout
  removeGutters(area);
  removeGutters(topRow);
  removeGutters(bottomRow);

  [htmlPanel, cssPanel, jsPanel, resultPanel, topRow, bottomRow].forEach(el => {
    el.style.width = '';
    el.style.height = '';
    el.style.flex = '';
  });

  // Clean up tabs layout container if it exists
  const oldTabsLeft = document.getElementById('tabs-left');
  if (oldTabsLeft) oldTabsLeft.remove();
  const oldMobileBar = document.getElementById('mobile-tab-bar');
  if (oldMobileBar) oldMobileBar.remove();

  // Ensure all panels are visible (tabs and mobile layouts hide some)
  [htmlPanel, cssPanel, jsPanel, resultPanel].forEach(el => el.classList.remove('hidden'));

  if (layout === 'mobile') {
    topRow.style.display = 'none';
    bottomRow.style.display = 'none';
    area.style.flexDirection = 'column';

    // A preview maximized on desktop would otherwise hide every pane here,
    // since .result-maximized hides the editor panels outright.
    area.classList.remove('result-maximized');

    const tabBar = document.createElement('div');
    tabBar.className = 'tab-bar';
    tabBar.id = 'mobile-tab-bar';

    MOBILE_TABS.forEach((t, i) => {
      const btn = document.createElement('button');
      btn.className = 'tab-bar-btn' + (i === 0 ? ' active' : '');
      btn.textContent = t.label;
      btn.dataset.tab = t.key;
      if (t.key === 'log') {
        // ui.js fills every .console-count, so the badge tracks the desktop one
        const badge = document.createElement('span');
        badge.className = 'console-count';
        btn.appendChild(badge);
      }
      btn.addEventListener('click', () => switchMobileTab(t.key));
      tabBar.appendChild(btn);
    });

    area.appendChild(tabBar);
    area.appendChild(htmlPanel);
    area.appendChild(cssPanel);
    area.appendChild(jsPanel);
    area.appendChild(resultPanel);

    switchMobileTab('html');
  } else if (layout === 'columns') {
    // Move all panels to be direct children of .editor-area (Split.js needs shared parent)
    topRow.style.display = 'none';
    bottomRow.style.display = 'none';
    area.style.flexDirection = 'row';

    area.appendChild(htmlPanel);
    area.appendChild(cssPanel);
    area.appendChild(jsPanel);
    area.appendChild(resultPanel);

    splits.push(Split(['#html-panel', '#css-panel', '#js-panel', '#result-panel'], {
      sizes: [25, 25, 25, 25],
      minSize: 80,
      gutterSize: 6,
      onDragEnd: () => refreshEditors(),
    }));
  } else if (layout === 'tabs') {
    topRow.style.display = 'none';
    bottomRow.style.display = 'none';
    area.style.flexDirection = 'row';

    // Create left container with tab bar
    const tabsLeft = document.createElement('div');
    tabsLeft.id = 'tabs-left';

    const tabBar = document.createElement('div');
    tabBar.className = 'tab-bar';
    const tabs = [
      { key: 'html', label: 'HTML', panel: htmlPanel },
      { key: 'css', label: 'CSS', panel: cssPanel },
      { key: 'js', label: 'JavaScript', panel: jsPanel },
    ];
    tabs.forEach(t => {
      const btn = document.createElement('button');
      btn.className = 'tab-bar-btn' + (t.key === 'html' ? ' active' : '');
      btn.textContent = t.label;
      btn.dataset.tab = t.key;
      btn.addEventListener('click', () => switchEditorTab(t.key, tabsLeft));
      tabBar.appendChild(btn);
    });
    tabsLeft.appendChild(tabBar);

    // Reparent editor panels into left container
    tabsLeft.appendChild(htmlPanel);
    tabsLeft.appendChild(cssPanel);
    tabsLeft.appendChild(jsPanel);

    // Show only HTML editor by default
    htmlPanel.classList.remove('hidden');
    cssPanel.classList.add('hidden');
    jsPanel.classList.add('hidden');

    area.appendChild(tabsLeft);
    area.appendChild(resultPanel);

    splits.push(Split(['#tabs-left', '#result-panel'], {
      sizes: [50, 50],
      minSize: 200,
      gutterSize: 6,
      onDragEnd: () => refreshEditors(),
    }));
  } else {
    // Classic 2×2: panels inside their row containers
    area.style.flexDirection = 'column';
    topRow.style.display = '';
    bottomRow.style.display = '';

    // Reparent panels back into rows (in case they were moved for columns)
    topRow.appendChild(htmlPanel);
    topRow.appendChild(cssPanel);
    bottomRow.appendChild(jsPanel);
    bottomRow.appendChild(resultPanel);

    // Vertical split between rows
    splits.push(Split(['#top-row', '#bottom-row'], {
      direction: 'vertical',
      sizes: [50, 50],
      minSize: 60,
      gutterSize: 6,
      onDragEnd: () => refreshEditors(),
    }));

    // Horizontal split within top row
    splits.push(Split(['#html-panel', '#css-panel'], {
      sizes: [50, 50],
      minSize: 60,
      gutterSize: 6,
      onDragEnd: () => refreshEditors(),
    }));

    // Horizontal split within bottom row
    splits.push(Split(['#js-panel', '#result-panel'], {
      sizes: [50, 50],
      minSize: 60,
      gutterSize: 6,
      onDragEnd: () => refreshEditors(),
    }));
  }

  // Delay editor refresh for DOM to settle
  requestAnimationFrame(() => refreshEditors());
}

// Mobile shows exactly one pane. Result and Log are two views of the same
// result panel, so selecting either shows that panel and then switches the view.
function switchMobileTab(key) {
  const editors = { html: 'html-panel', css: 'css-panel', js: 'js-panel' };
  const showResult = key === 'result' || key === 'log';

  Object.entries(editors).forEach(([k, id]) => {
    document.getElementById(id).classList.toggle('hidden', showResult || k !== key);
  });
  document.getElementById('result-panel').classList.toggle('hidden', !showResult);

  // Click the existing result tabs rather than importing ui.js: ui.js already
  // imports this module, and clicking keeps the desktop code path the single
  // definition of what preview/console switching does.
  if (showResult) {
    document.getElementById(key === 'log' ? 'tab-console' : 'tab-preview')?.click();
  }

  document.querySelectorAll('#mobile-tab-bar .tab-bar-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === key);
  });

  requestAnimationFrame(() => {
    refreshEditors();
    if (!showResult) focusEditor(key);
  });
}

function switchEditorTab(key, container) {
  const panels = { html: 'html-panel', css: 'css-panel', js: 'js-panel' };

  Object.entries(panels).forEach(([k, id]) => {
    const panel = document.getElementById(id);
    if (k === key) panel.classList.remove('hidden');
    else panel.classList.add('hidden');
  });

  container.querySelectorAll('.tab-bar-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === key);
  });

  requestAnimationFrame(() => {
    refreshEditors();
    focusEditor(key);
  });
}
