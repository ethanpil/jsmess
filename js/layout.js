// JSMess Layout - Split.js resizable panes

import Split from 'split.js';
import { get, setState } from './state.js';
import { refreshEditors, focusEditor } from './editors.js';
import { getPref, setPref } from './prefs.js';

let splits = [];

export function initLayout() {
  const saved = getPref('layout');
  if (saved) setState('layout', saved);

  applyLayout(get('layout'));
}

export function setLayout(layout) {
  setState('layout', layout);
  setPref('layout', layout);
  applyLayout(layout);
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

  // Ensure all editor panels are visible (tabs layout hides some)
  [htmlPanel, cssPanel, jsPanel].forEach(el => el.classList.remove('hidden'));

  if (layout === 'columns') {
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
