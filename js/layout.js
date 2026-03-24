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
    { id: 'classic', label: 'Classic (2×2)' },
    { id: 'columns', label: 'Columns' },
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
