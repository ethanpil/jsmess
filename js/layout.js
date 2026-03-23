// JSMess Layout - Split.js resizable panes

import Split from 'split.js';
import { get, setState } from './state.js';
import { refreshEditors } from './editors.js';

let splits = [];

const LAYOUT_KEY = 'jsmess_layout';

export function initLayout() {
  const saved = localStorage.getItem(LAYOUT_KEY);
  if (saved) setState('layout', saved);

  applyLayout(get('layout'));
}

export function setLayout(layout) {
  setState('layout', layout);
  localStorage.setItem(LAYOUT_KEY, layout);
  applyLayout(layout);
}

export function getLayoutOptions() {
  return [
    { id: 'classic', label: 'Classic (2x2)' },
    { id: 'columns', label: 'Columns' },
  ];
}

function destroySplits() {
  splits.forEach(s => { try { s.destroy(); } catch(e) {} });
  splits = [];
}

function applyLayout(layout) {
  destroySplits();

  // Reset inline styles Split.js may have set
  const allPanels = document.querySelectorAll('.editor-panel, .result-panel, .split-row');
  allPanels.forEach(p => {
    p.style.width = '';
    p.style.height = '';
    p.style.flex = '';
  });

  const area = document.querySelector('.editor-area');
  const topRow = document.getElementById('top-row');
  const bottomRow = document.getElementById('bottom-row');
  if (!area) return;

  if (layout === 'columns') {
    // Single row with all 4 panels
    area.style.flexDirection = 'row';
    topRow.style.display = 'contents';
    bottomRow.style.display = 'contents';

    splits.push(Split(['#html-panel', '#css-panel', '#js-panel', '#result-panel'], {
      sizes: [25, 25, 25, 25],
      minSize: 80,
      gutterSize: 6,
      onDragEnd: () => refreshEditors(),
    }));
  } else {
    // Classic 2x2
    area.style.flexDirection = 'column';
    topRow.style.display = '';
    bottomRow.style.display = '';

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
