// JSMess Preview - iframe srcdoc + console capture

import { get } from './state.js';

const consoleListeners = [];

export function onConsoleMessage(callback) {
  consoleListeners.push(callback);
}

function notifyConsole(entry) {
  for (const cb of consoleListeners) cb(entry);
}

// Listen for postMessage from iframe
window.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'console') {
    notifyConsole({
      method: e.data.method,
      args: e.data.args,
      timestamp: Date.now(),
    });
  }
});

const CONSOLE_CAPTURE_SCRIPT = `
<script>
(function() {
  var methods = ['log','warn','error','info','debug'];
  methods.forEach(function(m) {
    var orig = console[m];
    console[m] = function() {
      var args = [];
      for (var i = 0; i < arguments.length; i++) {
        var a = arguments[i];
        if (a === null) args.push('null');
        else if (a === undefined) args.push('undefined');
        else if (typeof a === 'object') {
          try { args.push(JSON.stringify(a, null, 2)); }
          catch(e) { args.push(String(a)); }
        }
        else args.push(String(a));
      }
      parent.postMessage({ type: 'console', method: m, args: args }, '*');
      orig.apply(console, arguments);
    };
  });
  window.onerror = function(msg, src, line, col, err) {
    parent.postMessage({ type: 'console', method: 'error', args: [msg + ' (line ' + line + ')'] }, '*');
  };
  window.addEventListener('unhandledrejection', function(e) {
    parent.postMessage({ type: 'console', method: 'error', args: ['Unhandled Promise Rejection: ' + (e.reason || '')] }, '*');
  });
})();
<\/script>
`;

export function run() {
  const iframe = document.getElementById('preview-frame');
  if (!iframe) return;

  const htmlCode = get('html');
  const cssCode = get('css');
  const jsCode = get('js');
  const wrapMode = get('wrapMode');
  const libraries = get('libraries') || [];

  // Build library script tags
  const libTags = libraries
    .map((lib) => `<script src="${escapeHtml(lib.url)}"><\/script>`)
    .join('\n');

  // Wrap JS based on mode
  let jsInHead = '';
  let jsInBody = '';
  const wrappedJs = wrapJsCode(jsCode, wrapMode);

  if (wrapMode === 'noWrapHead') {
    jsInHead = `<script>${jsCode}<\/script>`;
  } else {
    jsInBody = `<script>${wrappedJs}<\/script>`;
  }

  const doc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>${cssCode}</style>
  ${libTags}
  ${CONSOLE_CAPTURE_SCRIPT}
  ${jsInHead}
</head>
<body>
  ${htmlCode}
  ${jsInBody}
</body>
</html>`;

  iframe.srcdoc = doc;
}

function wrapJsCode(code, mode) {
  switch (mode) {
    case 'onLoad':
      return `window.addEventListener('load', function() {\n${code}\n});`;
    case 'onDomReady':
      return `document.addEventListener('DOMContentLoaded', function() {\n${code}\n});`;
    case 'noWrapHead':
      return code; // handled separately
    case 'noWrapBody':
    default:
      return code;
  }
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
