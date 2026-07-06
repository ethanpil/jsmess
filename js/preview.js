// JSMess Preview - iframe srcdoc + console capture

import { get } from './state.js';
import { escapeHtml, escapeScriptEnd } from './util.js';

let sassModule = null;
const consoleListeners = [];

export function onConsoleMessage(callback) {
  consoleListeners.push(callback);
}

function notifyConsole(entry) {
  for (const cb of consoleListeners) cb(entry);
}

// Listen for postMessage from iframe — only from the preview frame itself,
// so other windows (or nested frames inside user content) can't spoof entries.
window.addEventListener('message', (e) => {
  const frame = document.getElementById('preview-frame');
  if (!frame || e.source !== frame.contentWindow) return;
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

// Pinned to the exact version jspm.dev already serves for bare 'sass'.
// esm.sh builds of sass fail in the browser (dynamic require of node
// builtins), so jspm.dev stays the source — but now drift-proof.
const SASS_URL = 'https://jspm.dev/sass@1.69.5';

export async function compileSass(code) {
  if (!sassModule) {
    sassModule = await import(SASS_URL);
  }
  const sass = sassModule.default || sassModule;
  const result = sass.compileString(code);
  return result.css;
}

export async function run() {
  const iframe = document.getElementById('preview-frame');
  if (!iframe) return;

  const htmlCode = get('html');
  let cssCode = get('css');
  const jsCode = get('js');
  const wrapMode = get('wrapMode');
  const styleType = get('styleType');
  const libraries = get('libraries') || [];

  // Compile SASS if needed
  if (styleType === 'sass' && cssCode.trim()) {
    try {
      cssCode = await compileSass(cssCode);
    } catch (e) {
      notifyConsole({
        method: 'error',
        args: [`SASS compilation error: ${e.message}`],
        timestamp: Date.now(),
      });
      cssCode = '';
    }
  }

  // Build library tags — CSS as <link>, JS as <script>
  const libTags = libraries
    .map((lib) => {
      const safeUrl = escapeHtml(lib.url);
      return lib.type === 'css'
        ? `<link rel="stylesheet" href="${safeUrl}">`
        : `<script src="${safeUrl}"><\/script>`;
    })
    .join('\n');

  // Wrap JS based on mode
  let jsInHead = '';
  let jsInBody = '';
  const wrappedJs = wrapJsCode(jsCode, wrapMode);

  if (wrapMode === 'noWrapHead') {
    jsInHead = `<script>${escapeScriptEnd(jsCode)}<\/script>`;
  } else {
    jsInBody = `<script>${escapeScriptEnd(wrappedJs)}<\/script>`;
  }

  const doc = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${libTags}
  <style>${cssCode}</style>
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

export function wrapJsCode(code, mode) {
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

export function preloadSass() {
  if (!sassModule) {
    import(SASS_URL).then(m => {
      sassModule = m;
    }).catch(() => {
      // Silently fail — will retry on first use
    });
  }
}

