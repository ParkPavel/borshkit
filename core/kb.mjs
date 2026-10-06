import fs from 'node:fs/promises';
import path from 'node:path';
import { assert, atomicWrite, exists, git, isGitRoot, readJSON, sha } from './io.mjs';
import { covered } from './contract.mjs';
import { journal } from './space.mjs';

// Project knowledge (decisions D6, D9): Markdown notes with typed [[wikilinks]]
// are the source of truth and read in Obsidian; SQL is a derived, rebuildable
// index. Generated notes (EXTRACTED) live in knowledge/_generated and are
// rewritten whole; notes a person or an agent wrote (DECLARED) are never touched.
export const RELATIONS = ['imports', 'imported-by', 'tests', 'tested-by', 'documents', 'documented-by', 'references', 'decided-in', 'about', 'related'];
const CODE = /\.(?:[cm]?[jt]sx?)$/i, DOC = /\.(?:md|markdown)$/i;
const TEST = /(^|\/)(test|tests|__tests__)\/|\.(test|spec)\.[cm]?[jt]sx?$/i;
const MAX_PARSE = 1024 * 1024;
const GEN = 'knowledge/_generated';
const notePath = (kind, rel) => `${GEN}/${kind}/${rel}.md`;
const link = (target, label) => `[[${target}${label ? `|${label}` : ''}]]`;

// ── Frontmatter: the small YAML subset Borshkit writes and reads ─────────────
export function parseFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!m) return { data: {}, body: text };
  const data = {};
  let key = null;
  for (const raw of m[1].split(/\r?\n/)) {
    const item = /^\s+-\s+(.*)$/.exec(raw);
    if (item && key) { (data[key] = Array.isArray(data[key]) ? data[key] : []).push(scalar(item[1])); continue; }
    const kv = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(raw);
    if (!kv) continue;
    key = kv[1];
    const v = kv[2].trim();
    if (!v) data[key] = [];
    else if (v.startsWith('[')) { try { data[key] = JSON.parse(v); } catch { data[key] = v.slice(1, -1).split(',').map(s => scalar(s.trim())).filter(Boolean); } }
    else data[key] = scalar(v);
  }
  return { data, body: text.slice(m[0].length) };
}
const scalar = v => /^".*"$/.test(v) ? JSON.parse(v) : /^'.*'$/.test(v) ? v.slice(1, -1) : v;
function frontmatter(data) {
  return `---\n${Object.entries(data).filter(([, v]) => v !== undefined && !(Array.isArray(v) && !v.length)).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n')}\n---\n`;
}
/** Every [[target]] or [[target|label]] in a text, with the target normalised. */
export function wikilinks(text) {
  return [...String(text).matchAll(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g)].map(m => m[1].trim());
}

async function projectFiles(space) {
  if (await isGitRoot(space.project)) return (await git(space.project, ['ls-files', '-z', '--cached', '--others', '--exclude-standard'])).split('\0').filter(Boolean).sort();
  const out = [];
  async function walk(dir, prefix) {
    for (const item of await fs.readdir(dir, { withFileTypes: true })) {
      if (!prefix && (item.name === '.git' || item.name === space.folder)) continue;
      const rel = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.isDirectory()) await walk(path.join(dir, item.name), rel); else out.push(rel);
    }
  }
  await walk(space.project, '');
  return out.sort();
}
const IMPORT = /(?:import\s[^'"`]*?from\s*|import\s*\(\s*|require\s*\(\s*|export\s[^'"`]*?from\s*|import\s+)['"]([^'"]+)['"]/g;
const EXPORT = /export\s+(?:default\s+)?(?:async\s+)?(?:function\*?|class|const|let|var)\s+([A-Za-z0-9_$]+)/g;
function resolveImport(from, spec, files) {
  if (!spec.startsWith('.')) return null;
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));
  for (const c of [base, ...['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.mts'].map(e => base + e), ...['index.js', 'index.ts', 'index.mjs'].map(i => `${base}/${i}`)]) if (files.has(c)) return c;
  if (/\.js$/.test(base) && files.has(base.replace(/\.js$/, '.ts'))) return base.replace(/\.js$/, '.ts');
  return null;
}

/**
 * Rebuild the generated notes and the SQL index from the project, the space's
 * own notes and the accepted tasks. Deterministic: the same state gives the
 * same notes and the same rows.
 */
export async function buildKnowledge(space) {
  const files = await projectFiles(space), set = new Set(files);
  const nodes = new Map(), edges = [];
  const node = (id, props) => nodes.set(id, { ...(nodes.get(id) ?? {}), ...props });
  const edge = (src, dst, rel, provenance = 'EXTRACTED') => { if (src !== dst) edges.push({ src, dst, rel, provenance }); };
  const texts = new Map();
  for (const rel of files) {
    if (!CODE.test(rel) && !DOC.test(rel) && !['package.json', 'manifest.json'].includes(path.posix.basename(rel))) continue;
    const bytes = await fs.readFile(path.join(space.project, rel)).catch(() => null);
    if (!bytes || bytes.length > MAX_PARSE || bytes.includes(0)) continue;
    const text = bytes.toString('utf8'); texts.set(rel, text);
    const kind = CODE.test(rel) ? 'code' : DOC.test(rel) ? 'docs' : 'manifest';
    const id = notePath(kind, rel);
    node(id, { type: kind === 'code' ? (TEST.test(rel) ? 'test' : 'module') : kind === 'docs' ? 'doc' : 'manifest', path: rel, title: rel, provenance: 'EXTRACTED', source: 'borshkit-kb@1', digest: sha(bytes) });
    if (kind === 'code') {
      const exportsList = [...text.matchAll(EXPORT)].map(m => m[1]);
      node(id, { exports: [...new Set(exportsList)] });
      for (const m of text.matchAll(IMPORT)) {
        const target = resolveImport(rel, m[1], set);
        if (!target) continue;
        edge(id, notePath('code', target), TEST.test(rel) ? 'tests' : 'imports');
      }
    } else if (kind === 'docs') {
      node(id, { headings: [...text.matchAll(/^#{1,3}\s+(.+)$/gm)].map(m => m[1].trim()).slice(0, 40) });
      const mentioned = new Set([...text.matchAll(/`([^`\n]+)`/g)].map(m => m[1]).filter(p => set.has(p)));
      for (const m of text.matchAll(/\]\(([^)#\s]+)\)/g)) { const target = path.posix.normalize(path.posix.join(path.posix.dirname(rel), m[1])); if (set.has(target)) mentioned.add(target); }
      for (const target of mentioned) edge(id, notePath(CODE.test(target) ? 'code' : DOC.test(target) ? 'docs' : 'manifest', target), 'documents');
    } else {
      try { const pkg = JSON.parse(text); node(id, { title: pkg.name ? `${rel} (${pkg.name})` : rel, scripts: Object.keys(pkg.scripts ?? {}) }); } catch { /* not JSON */ }
    }
  }
  // Notes written by people and agents: read, never rewritten.
  const human = [];
  async function walkNotes(dir, prefix) {
    if (!(await exists(dir))) return;
    for (const item of await fs.readdir(dir, { withFileTypes: true })) {
      const rel = `${prefix}/${item.name}`;
      if (item.isDirectory()) { if (rel !== GEN) await walkNotes(path.join(dir, item.name), rel); }
      else if (item.name.endsWith('.md')) human.push(rel);
    }
  }
  await walkNotes(path.join(space.dir, 'knowledge'), 'knowledge');
  for (const rel of human.sort()) {
    const text = await fs.readFile(path.join(space.dir, rel), 'utf8');
    const { data, body } = parseFrontmatter(text);
    node(rel, { type: data['bk-type'] ?? 'note', path: rel, title: body.match(/^#\s+(.+)$/m)?.[1] ?? path.basename(rel, '.md'), provenance: data['bk-provenance'] ?? 'DECLARED', source: data['bk-source'] ?? 'человек', digest: sha(text), human: true, data });
    texts.set(rel, body);
    for (const rel2 of RELATIONS) for (const target of (Array.isArray(data[rel2]) ? data[rel2] : data[rel2] ? [data[rel2]] : []).flatMap(wikilinks)) edge(rel, normaliseTarget(target), rel2, 'DECLARED');
    for (const target of wikilinks(body)) edge(rel, normaliseTarget(target), 'references', 'DECLARED');
  }
  // Accepted tasks become decision notes linked to the code they touched.
  if (await exists(space.tasks)) {
    for (const taskId of (await fs.readdir(space.tasks)).sort()) {
      const decision = await readJSON(path.join(space.tasks, taskId, 'decision.json')).catch(() => null);
      if (!decision) continue;
      const contract = await readJSON(path.join(space.tasks, taskId, 'contract.json'));
      const id = `${GEN}/tasks/${taskId}.md`;
      node(id, { type: 'decision', path: id, title: `Задача: ${contract.goal}`, provenance: 'EXTRACTED', source: 'borshkit-decision@1', digest: sha(JSON.stringify(decision)), task: { contract, decision } });
      for (const rel of files.filter(f => CODE.test(f) && !contract.paths.includes('.') && covered(f, contract.paths))) edge(notePath('code', rel), id, 'decided-in');
    }
  }
  // Inverse relations, so each generated note shows both directions.
  const inverse = { imports: 'imported-by', tests: 'tested-by', documents: 'documented-by' };
  for (const e of [...edges]) if (inverse[e.rel] && nodes.has(e.dst) && !nodes.get(e.dst).human) edges.push({ src: e.dst, dst: e.src, rel: inverse[e.rel], provenance: e.provenance });
  const unique = [...new Map(edges.filter(e => nodes.has(e.src)).map(e => [`${e.src}\0${e.dst}\0${e.rel}`, e])).values()].sort((a, b) => `${a.src}${a.rel}${a.dst}`.localeCompare(`${b.src}${b.rel}${b.dst}`));

  // Lessons: stale when the code they are about changed since they were confirmed.
  for (const [id, n] of nodes) {
    if (n.type !== 'lesson') continue;
    const about = unique.filter(e => e.src === id && e.rel === 'about').map(e => nodes.get(e.dst)?.digest ?? 'missing');
    n.status = n.data?.['bk-sources-digest'] && n.data['bk-sources-digest'] !== sha(about.join('\n')) ? 'stale' : 'current';
  }

  // Write the generated notes.
  const genDir = path.join(space.dir, GEN);
  await fs.rm(genDir, { recursive: true, force: true });
  for (const [id, n] of nodes) {
    if (n.human) continue;
    const out = unique.filter(e => e.src === id);
    const fm = { 'bk-type': n.type, 'bk-id': n.path, 'bk-provenance': n.provenance, 'bk-source': n.source, 'bk-digest': n.digest };
    for (const rel of RELATIONS) fm[rel] = out.filter(e => e.rel === rel).map(e => link(e.dst, nodes.get(e.dst)?.path ?? e.dst));
    const body = [`# ${n.title}`, ''];
    if (n.type === 'decision') {
      body.push(`**Цель:** ${n.task.contract.goal}`, '', `**Принято:** ${n.task.decision.decidedAt}`, '', '| Критерий | Чем решено |', '|---|---|', ...n.task.decision.criteria.map(c => `| ${c.id} | ${c.decidedBy} |`), '');
    } else {
      if (n.path && !n.path.startsWith('knowledge/')) body.push(`Файл проекта: \`${n.path}\``, '');
      if (n.exports?.length) body.push('**Экспортирует:** ' + n.exports.map(x => `\`${x}\``).join(', '), '');
      if (n.headings?.length) body.push('**Разделы:**', ...n.headings.map(h => `- ${h}`), '');
      if (n.scripts?.length) body.push('**Скрипты:** ' + n.scripts.map(x => `\`${x}\``).join(', '), '');
    }
    body.push('> Заметка создана автоматически. Правь заметки вне `_generated/` — эти перезаписываются.', '');
    await atomicWrite(path.join(space.dir, id), frontmatter(fm) + body.join('\n'), { mode: 0o644 });
  }
  const modules = [...nodes.values()].filter(n => n.type === 'module');
  const docs = [...nodes.values()].filter(n => n.type === 'doc');
  const linkedCount = id => unique.filter(e => e.dst === id || e.src === id).length;
  await atomicWrite(path.join(space.dir, GEN, 'index.md'), frontmatter({ 'bk-type': 'index', 'bk-provenance': 'EXTRACTED' }) + [
    '# Карта проекта', '', `Модулей: ${modules.length} · тестов: ${[...nodes.values()].filter(n => n.type === 'test').length} · документов: ${docs.length} · твоих заметок: ${human.length} · связей: ${unique.length}`, '',
    '## Самые связанные модули', ...modules.map(n => [n, linkedCount(notePath('code', n.path))]).sort((a, b) => b[1] - a[1] || a[0].path.localeCompare(b[0].path)).slice(0, 15).map(([n, c]) => `- ${link(notePath('code', n.path), n.path)} — связей: ${c}`), '',
    '## Документы', ...docs.map(n => `- ${link(notePath('docs', n.path), n.path)}`), '',
    '## Модули без документации', ...modules.filter(n => !unique.some(e => e.dst === notePath('code', n.path) && e.rel === 'documents')).map(n => `- ${link(notePath('code', n.path), n.path)}`), '',
  ].join('\n'), { mode: 0o644 });

  await writeIndex(space, nodes, unique, texts);
  await journal(space, `База знаний собрана: заметок ${nodes.size}, связей ${unique.length}.`);
  return { notes: nodes.size, links: unique.length, generated: [...nodes.values()].filter(n => !n.human).length, human: human.length,
    stale: [...nodes.entries()].filter(([, n]) => n.status === 'stale').map(([id]) => id) };
}
function normaliseTarget(target) {
  let t = target.replace(/\\/g, '/');
  if (!t.endsWith('.md')) t += '.md';
  return t;
}

// ── SQL ─────────────────────────────────────────────────────────────────────
const dbFile = space => path.join(space.state, 'kb.sqlite');
async function sqlite() {
  // node:sqlite prints an ExperimentalWarning on load; it is noise for a person reading Russian output.
  const emit = process.emitWarning;
  process.emitWarning = (w, ...rest) => (String(w).includes('SQLite') ? undefined : emit.call(process, w, ...rest));
  try { return await import('node:sqlite'); } finally { process.emitWarning = emit; }
}
async function writeIndex(space, nodes, edges, texts) {
  const { DatabaseSync } = await sqlite();
  await fs.mkdir(space.state, { recursive: true });
  const tmp = `${dbFile(space)}.tmp`;
  await fs.rm(tmp, { force: true });
  const db = new DatabaseSync(tmp);
  db.exec(`CREATE TABLE notes(id TEXT PRIMARY KEY, type TEXT, path TEXT, title TEXT, provenance TEXT, source TEXT, digest TEXT, status TEXT);
    CREATE TABLE links(src TEXT, dst TEXT, rel TEXT, provenance TEXT);
    CREATE VIRTUAL TABLE fts USING fts5(id UNINDEXED, title, body);
    CREATE VIEW orphans AS SELECT id, title FROM notes WHERE id NOT IN (SELECT src FROM links) AND id NOT IN (SELECT dst FROM links);
    CREATE VIEW undocumented_modules AS SELECT id, path FROM notes WHERE type='module' AND id NOT IN (SELECT dst FROM links WHERE rel='documents');
    CREATE VIEW stale AS SELECT id, title FROM notes WHERE status='stale';
    CREATE VIEW broken_links AS SELECT src, dst, rel FROM links WHERE dst NOT IN (SELECT id FROM notes);`);
  const insNote = db.prepare('INSERT INTO notes VALUES (?,?,?,?,?,?,?,?)'), insLink = db.prepare('INSERT INTO links VALUES (?,?,?,?)'), insFts = db.prepare('INSERT INTO fts VALUES (?,?,?)');
  db.exec('BEGIN');
  for (const [id, n] of [...nodes].sort(([a], [b]) => a.localeCompare(b))) {
    insNote.run(id, n.type, n.path ?? null, n.title, n.provenance, n.source, n.digest, n.status ?? 'current');
    insFts.run(id, n.title, (texts.get(n.path) ?? '').slice(0, 200000));
  }
  for (const e of edges) insLink.run(e.src, e.dst, e.rel, e.provenance);
  db.exec('COMMIT');
  db.close();
  await fs.rename(tmp, dbFile(space));
}
/** Read-only SQL over the index: SELECT or WITH only, on a database opened read-only. */
export async function queryKnowledge(space, query) {
  assert(/^\s*(select|with)\b/i.test(query ?? ''), 'Разрешены только запросы SELECT или WITH');
  assert(await exists(dbFile(space)), 'База знаний ещё не собрана: borshkit знания собрать');
  const { DatabaseSync } = await sqlite();
  const db = new DatabaseSync(dbFile(space), { readOnly: true });
  try { return db.prepare(query).all().map(row => ({ ...row })); } finally { db.close(); }
}
export async function searchKnowledge(space, words) {
  const terms = String(words).split(/\s+/).filter(Boolean).map(w => `"${w.replace(/"/g, '')}"`).join(' ');
  assert(terms, 'Что искать?');
  return queryKnowledge(space, `SELECT id, title FROM fts WHERE fts MATCH '${terms.replace(/'/g, "''")}' ORDER BY rank LIMIT 20`);
}

/**
 * The slice of knowledge a job gets: the modules in the task's scope, the
 * documents about them, decisions and lessons that mention them. Current,
 * extracted facts come first; stale lessons are left out.
 */
export async function taskContext(space, taskId, { budget = 8000 } = {}) {
  if (!(await exists(dbFile(space)))) return null;
  const contract = await readJSON(path.join(space.tasks, taskId, 'contract.json'));
  const modules = (await queryKnowledge(space, "SELECT id, path FROM notes WHERE type IN ('module','test','manifest')"))
    .filter(n => contract.paths.includes('.') ? true : covered(n.path, contract.paths)).slice(0, 40);
  if (!modules.length) return null;
  const ids = modules.map(m => `'${m.id.replace(/'/g, "''")}'`).join(',');
  const related = await queryKnowledge(space, `SELECT l.src, l.dst, l.rel, n.title, n.type, n.status, l.provenance FROM links l JOIN notes n ON n.id = CASE WHEN l.src IN (${ids}) THEN l.dst ELSE l.src END
    WHERE (l.src IN (${ids}) OR l.dst IN (${ids})) AND n.status != 'stale' ORDER BY CASE l.provenance WHEN 'EXTRACTED' THEN 0 WHEN 'DECLARED' THEN 1 WHEN 'IMPORTED' THEN 2 ELSE 3 END, l.rel, n.title`);
  const lines = ['Модули в границах задачи:', ...modules.map(m => `- ${m.path}`), '', 'Связи:', ...related.map(r => `- ${r.src.replace(`${GEN}/`, '')} —${r.rel}→ ${r.dst.replace(`${GEN}/`, '')} (${r.type}: ${r.title})`)];
  let text = '';
  for (const l of lines) { if (text.length + l.length > budget) { text += '…\n'; break; } text += `${l}\n`; }
  return text;
}

/** A lesson from an accepted task, bound to the digest of the code it is about. */
export async function lessonFromTask(space, taskId, text) {
  assert(typeof text === 'string' && text.trim(), 'Напиши, какой урок вынесен из задачи');
  const decision = await readJSON(path.join(space.tasks, taskId, 'decision.json')).catch(() => null);
  assert(decision, `Задача «${taskId}» ещё не принята — уроки записываются только из принятых задач`);
  const contract = await readJSON(path.join(space.tasks, taskId, 'contract.json'));
  const files = (await projectFiles(space)).filter(f => CODE.test(f) && !contract.paths.includes('.') && covered(f, contract.paths));
  const about = files.map(f => notePath('code', f));
  const digests = await Promise.all(files.map(f => fs.readFile(path.join(space.project, f)).then(sha, () => 'missing')));
  const rel = `knowledge/lessons/${taskId}.md`;
  await atomicWrite(path.join(space.dir, rel), frontmatter({ 'bk-type': 'lesson', 'bk-provenance': 'DECLARED', 'bk-source': `задача ${taskId}`, 'bk-sources-digest': sha(digests.join('\n')),
    about: about.map(a => link(a, a.slice(GEN.length + 6, -3))), 'decided-in': [link(`${GEN}/tasks/${taskId}.md`, taskId)] }) + `# Урок: ${contract.goal}\n\n${text.trim()}\n`, { mode: 0o644 });
  return rel;
}

/** A copy of the person-written notes with [[wikilinks]] turned into Markdown links GitHub can follow. */
export async function exportForGithub(space, outDir) {
  const out = path.resolve(outDir), written = [];
  async function walk(dir, prefix) {
    if (!(await exists(dir))) return;
    for (const item of await fs.readdir(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.isDirectory()) { if (rel !== '_generated') await walk(path.join(dir, item.name), rel); continue; }
      if (!item.name.endsWith('.md')) continue;
      const text = await fs.readFile(path.join(dir, item.name), 'utf8');
      const converted = text.replace(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]/g, (_, target, label) => {
        const t = normaliseTarget(target.trim()), name = label ?? path.posix.basename(t, '.md');
        const from = path.dirname(path.join(out, rel));
        if (t.startsWith(`${GEN}/code/`) || t.startsWith(`${GEN}/docs/`)) return `[${name}](${path.relative(from, path.join(space.project, t.slice(GEN.length + 6, -3))).replaceAll('\\', '/')})`;
        if (t.startsWith(GEN)) return name;
        return `[${name}](${path.relative(from, path.join(out, t.replace(/^knowledge\//, ''))).replaceAll('\\', '/')})`;
      });
      await atomicWrite(path.join(out, rel), converted, { mode: 0o644 });
      written.push(rel);
    }
  }
  await walk(path.join(space.dir, 'knowledge'), '');
  return written;
}
