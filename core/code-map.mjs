import path from 'node:path';

export const CODE_FILE = /\.(?:[cm]?[jt]sx?|py|go|swift)$/i;
export const TEST_FILE = /(^|\/)(test|tests|__tests__|Tests)\/|(?:\.(?:test|spec)\.[cm]?[jt]sx?|_test\.go|(?:^|\/)test_[^/]+\.py|Tests\.swift)$/i;
export const languageOf = file => /\.py$/i.test(file) ? 'python' : /\.go$/i.test(file) ? 'go' : /\.swift$/i.test(file) ? 'swift' : 'javascript-typescript';
const exists = (base, files, extensions) => [base, ...extensions.map(e => base + e)].filter(p => files.has(p));
/** Conservative lexical import map. No claim of semantic/compiler resolution. */
export function mapCode(file, text, files, { goModule = '' } = {}) {
  const language = languageOf(file), imports = [], exports = [], unresolved = [];
  const add = (spec, candidates) => {
    const targets = [...new Set(candidates)].filter(p => p !== file && files.has(p));
    if (targets.length) imports.push(...targets); else unresolved.push(spec);
  };
  if (language === 'python') {
    const clean = text.replace(/'''[\s\S]*?'''|"""[\s\S]*?"""/g, '').replace(/^\s*#.*$/gm, '');
    const resolve = (spec, names = []) => {
      const dots = spec.match(/^\.+/)?.[0].length ?? 0;
      const root = dots ? path.posix.normalize(path.posix.join(path.posix.dirname(file), ...Array(Math.max(0, dots - 1)).fill('..'))) : '';
      const module = spec.slice(dots).replaceAll('.', '/');
      const base = path.posix.join(root, module);
      return [...exists(base, files, ['.py', '/__init__.py']), ...names.flatMap(n => exists(path.posix.join(base, n), files, ['.py', '/__init__.py']))];
    };
    for (const m of clean.matchAll(/^\s*(?:from\s+([.\w]+)\s+import\s+([^\n#]+)|import\s+([^\n#]+))/gm)) {
      if (m[1]) add(m[1], resolve(m[1], m[2].replace(/[()]/g, '').split(',').map(n => n.trim().split(/\s+as\s+/)[0]).filter(n => /^[\w]+$/.test(n))));
      else for (const spec of m[3].split(',').map(n => n.trim().split(/\s+as\s+/)[0])) add(spec, resolve(spec));
    }
    exports.push(...[...clean.matchAll(/^(?:async\s+)?(?:def|class)\s+([\w]+)/gm)].map(m => m[1]));
  } else if (language === 'go') {
    const clean = text.replace(/`[^`]*`|"""[\s\S]*?"""/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    const specs = [...clean.matchAll(/\bimport\s+(?:\w+\s+)?"([^"\n]+)"/g)].map(m => m[1]);
    for (const group of clean.matchAll(/\bimport\s*\(([\s\S]*?)\)/g)) specs.push(...[...group[1].matchAll(/"([^"\n]+)"/g)].map(m => m[1]));
    for (const spec of specs) {
      const folder = goModule && (spec === goModule || spec.startsWith(goModule + '/')) ? spec.slice(goModule.length).replace(/^\//, '') : null;
      add(spec, folder === null ? [] : [...files].filter(p => path.posix.dirname(p) === (folder || '.') && p.endsWith('.go') && !p.endsWith('_test.go')));
    }
    exports.push(...[...clean.matchAll(/^(?:func\s+(?:\([^)]*\)\s*)?|type\s+|(?:const|var)\s+)([A-Z]\w*)/gm)].map(m => m[1]));
  } else if (language === 'swift') {
    const clean = text.replace(/`[^`]*`|"""[\s\S]*?"""/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    for (const m of clean.matchAll(/^\s*(?:@testable\s+)?import\s+([A-Za-z_]\w*)/gm)) {
      add(m[1], [...files].filter(p => p.startsWith(`Sources/${m[1]}/`) && p.endsWith('.swift')));
    }
    exports.push(...[...clean.matchAll(/^\s*(?:public|open)\s+(?:final\s+)?(?:class|struct|enum|protocol|func|actor)\s+(\w+)/gm)].map(m => m[1]));
  } else {
    const pattern = /(?:import\s[^'"`]*?from\s*|import\s*\(\s*|require\s*\(\s*|export\s[^'"`]*?from\s*|import\s+)['"]([^'"]+)['"]/g;
    for (const m of text.matchAll(pattern)) {
      if (!m[1].startsWith('.')) { unresolved.push(m[1]); continue; }
      const base = path.posix.normalize(path.posix.join(path.posix.dirname(file), m[1]));
      const targets = exists(base, files, ['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.mts', '/index.js', '/index.ts', '/index.mjs']);
      if (!targets.length && base.endsWith('.js') && files.has(base.slice(0, -3) + '.ts')) targets.push(base.slice(0, -3) + '.ts');
      add(m[1], targets.slice(0, 1));
    }
    exports.push(...[...text.matchAll(/export\s+(?:default\s+)?(?:async\s+)?(?:function\*?|class|const|let|var)\s+([A-Za-z0-9_$]+)/g)].map(m => m[1]));
  }
  return { language, parser: 'static-imports-v1', imports: [...new Set(imports)].sort(), exports: [...new Set(exports)].sort(), unresolved: [...new Set(unresolved)].sort() };
}
