// JSMess Format - Prettier standalone (lazy-loaded)

import { getContent, setContent } from './editors.js';
import { get } from './state.js';

let prettier = null;
let parserHtml = null;
let parserCss = null;
let parserBabel = null;

async function loadPrettier() {
  if (prettier) return;

  const [prettierMod, htmlMod, cssMod, babelMod] = await Promise.all([
    import('https://esm.sh/prettier@3/standalone'),
    import('https://esm.sh/prettier@3/plugins/html'),
    import('https://esm.sh/prettier@3/plugins/postcss'),
    import('https://esm.sh/prettier@3/plugins/babel'),
  ]);

  prettier = prettierMod.default || prettierMod;
  parserHtml = htmlMod.default || htmlMod;
  parserCss = cssMod.default || cssMod;
  parserBabel = babelMod.default || babelMod;
}

export async function formatAll() {
  await loadPrettier();

  const jobs = [
    formatOne('html', 'html'),
    get('styleType') !== 'sass' ? formatOne('css', 'css') : Promise.resolve(),
    formatOne('js', 'babel'),
  ];
  await Promise.all(jobs);
}

export async function formatEditor(key) {
  await loadPrettier();

  if (key === 'css' && get('styleType') === 'sass') return;
  const parser = key === 'html' ? 'html' : key === 'css' ? 'css' : 'babel';
  await formatOne(key, parser);
}

async function formatOne(editorKey, parser) {
  const code = getContent(editorKey);
  if (!code.trim()) return;

  try {
    const plugins = [];
    if (parser === 'html') plugins.push(parserHtml);
    else if (parser === 'css') plugins.push(parserCss);
    else if (parser === 'babel') plugins.push(parserBabel);

    const formatted = await prettier.format(code, {
      parser,
      plugins,
      tabWidth: 2,
      singleQuote: true,
      semi: true,
      printWidth: 80,
    });

    setContent(editorKey, formatted);
  } catch (e) {
    console.warn(`Format failed for ${editorKey}:`, e.message);
  }
}
