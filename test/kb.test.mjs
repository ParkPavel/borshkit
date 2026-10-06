import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { buildKnowledge, exportForGithub, knowledgeSQL, lessonFromTask, parseFrontmatter, queryKnowledge, searchKnowledge, taskContext, wikilinks } from '../core/kb.mjs';
import { confirmItem, converge, verifyAll } from '../core/accept.mjs';
import { commit, node, project, space, task, write } from './helpers.mjs';

const files = {
  'src/a.js': "import { b } from './b.js';\nexport function a() { return b() + 1; }\n",
  'src/b.js': 'export const b = () => 41;\n',
  'test/a.test.js': "import { a } from '../src/a.js';\n",
  'docs/guide.md': '# Руководство\n\n## Как считать\n\nГлавная функция — в `src/a.js`. См. [вспомогательное](../src/b.js).\n',
  'package.json': '{"name":"demo","scripts":{"test":"node --test"}}\n',
};

test('generated notes carry typed wikilinks both ways and an index map', async t => {
  const s = await space(t, { project: await project(t, files) });
  const r = await buildKnowledge(s);
  assert.ok(r.generated >= 5);
  const a = parseFrontmatter(await fs.readFile(path.join(s.dir, 'knowledge/_generated/code/src/a.js.md'), 'utf8'));
  assert.equal(a.data['bk-type'], 'module');
  assert.equal(a.data['bk-provenance'], 'EXTRACTED');
  assert.deepEqual(a.data.imports.flatMap(wikilinks), ['knowledge/_generated/code/src/b.js.md']);
  assert.deepEqual(a.data['tested-by'].flatMap(wikilinks), ['knowledge/_generated/code/test/a.test.js.md']);
  assert.deepEqual(a.data['documented-by'].flatMap(wikilinks), ['knowledge/_generated/docs/docs/guide.md.md']);
  assert.match(a.body, /\*\*Экспортирует:\*\* `a`/);
  const index = await fs.readFile(path.join(s.dir, 'knowledge/_generated/index.md'), 'utf8');
  assert.match(index, /Модулей: 2 · тестов: 1 · документов: 1/);
});

test('person-written notes are read, linked and never rewritten; the build is deterministic', async t => {
  const s = await space(t, { project: await project(t, files) });
  const note = '---\nbk-type: concept\nrelated: ["[[knowledge/_generated/code/src/b.js.md|b]]"]\n---\n# Кэш\n\nСм. [[knowledge/decisions/why]].\n';
  await write(s.dir, { 'knowledge/concepts/cache.md': note });
  await buildKnowledge(s);
  const rows = async () => JSON.stringify([await queryKnowledge(s, 'SELECT * FROM notes ORDER BY id'), await queryKnowledge(s, 'SELECT * FROM links ORDER BY src, rel, dst')]);
  const first = await rows();
  await buildKnowledge(s);
  assert.equal(await rows(), first);
  assert.equal(await fs.readFile(path.join(s.dir, 'knowledge/concepts/cache.md'), 'utf8'), note);
  const links = await queryKnowledge(s, "SELECT rel, dst, provenance FROM links WHERE src = 'knowledge/concepts/cache.md' ORDER BY rel");
  assert.deepEqual(links, [
    { rel: 'references', dst: 'knowledge/decisions/why.md', provenance: 'DECLARED' },
    { rel: 'related', dst: 'knowledge/_generated/code/src/b.js.md', provenance: 'DECLARED' },
  ]);
  assert.deepEqual(await queryKnowledge(s, 'SELECT dst FROM broken_links'), [{ dst: 'knowledge/decisions/why.md' }]);
});

test('SQL is read-only and full-text search finds notes', async t => {
  const s = await space(t, { project: await project(t, files) });
  await buildKnowledge(s);
  await assert.rejects(queryKnowledge(s, "DELETE FROM notes"), /только запросы SELECT/);
  await assert.rejects(queryKnowledge(s, "WITH x AS (SELECT 1) DELETE FROM notes"), /readonly|read-only|only/i);
  assert.deepEqual((await queryKnowledge(s, 'SELECT path FROM undocumented_modules')), []);
  assert.equal((await searchKnowledge(s, 'Руководство'))[0].id, 'knowledge/_generated/docs/docs/guide.md.md');
});

test('the context slice covers the task scope, and a lesson goes stale when its code changes', async t => {
  const s = await space(t, { project: await project(t, files) });
  await task(s, 'calc', {
    paths: ['src'],
    goals: [{ id: 'G1', text: 'Считает', criteria: ['C1'] }],
    criteria: [{ id: 'C1', text: 'Тесты проходят', class: 'auto' }],
    checks: [{ id: 't', ...node('process.exit(0)'), criteria: ['C1'] }],
  });
  await buildKnowledge(s);
  const ctx = await taskContext(s, 'calc');
  assert.match(ctx, /- src\/a\.js/);
  assert.match(ctx, /code\/src\/a\.js\.md —imports→ code\/src\/b\.js\.md/);
  assert.match(ctx, /docs\/docs\/guide\.md\.md —documents→ code\/src\/a\.js\.md/);
  await assert.rejects(lessonFromTask(s, 'calc', 'Урок'), /ещё не принята/);
  await verifyAll(s, 'calc');
  assert.equal((await converge(s, 'calc')).status, 'accepted');
  const lesson = await lessonFromTask(s, 'calc', 'Сложение держим в одном месте.');
  let r = await buildKnowledge(s);
  assert.deepEqual(r.stale, []);
  assert.deepEqual(await queryKnowledge(s, "SELECT rel FROM links WHERE dst = 'knowledge/_generated/tasks/calc.md' AND src = 'knowledge/_generated/code/src/a.js.md'"), [{ rel: 'decided-in' }]);
  await write(s.project, { 'src/b.js': 'export const b = () => 0;\n' });
  await commit(s.project);
  r = await buildKnowledge(s);
  assert.deepEqual(r.stale, [lesson]);
  assert.deepEqual(await queryKnowledge(s, 'SELECT id FROM stale'), [{ id: lesson }]);
  assert.doesNotMatch(await taskContext(s, 'calc'), /lessons\/calc/);
});

test('the GitHub export turns wikilinks into relative Markdown links', async t => {
  const s = await space(t, { project: await project(t, files) });
  await write(s.dir, { 'knowledge/concepts/cache.md': '# Кэш\n\nКод: [[knowledge/_generated/code/src/b.js.md|b.js]], идея: [[knowledge/ideas/fast|быстро]].\n' });
  const out = path.join(s.project, 'docs', 'knowledge');
  assert.deepEqual(await exportForGithub(s, out), ['concepts/cache.md']);
  const text = await fs.readFile(path.join(out, 'concepts', 'cache.md'), 'utf8');
  assert.equal(text, '# Кэш\n\nКод: [b.js](../../../src/b.js), идея: [быстро](../ideas/fast.md).\n');
});

test('project docs with Borshkit frontmatter give typed links, and the graph exports as stable SQL', async t => {
  const s = await space(t, { project: await project(t, { ...files,
    'docs/concepts/evidence.md': '---\nbk-type: concept\nrelated: ["../guide.md"]\ndocuments: ["../../src/b.js"]\n---\n# Доказательства\n\nСм. [руководство](../guide.md#как-считать).\n' }) });
  await buildKnowledge(s);
  const rows = await queryKnowledge(s, "SELECT l.rel, l.dst, l.provenance FROM links l WHERE l.src = 'knowledge/_generated/docs/docs/concepts/evidence.md.md' ORDER BY rel, dst");
  assert.deepEqual(rows, [
    { rel: 'documents', dst: 'knowledge/_generated/code/src/b.js.md', provenance: 'DECLARED' },
    { rel: 'references', dst: 'knowledge/_generated/docs/docs/guide.md.md', provenance: 'EXTRACTED' },
    { rel: 'related', dst: 'knowledge/_generated/docs/docs/guide.md.md', provenance: 'DECLARED' },
  ]);
  assert.deepEqual(await queryKnowledge(s, "SELECT kind, title FROM notes WHERE path = 'docs/concepts/evidence.md'"), [{ kind: 'concept', title: 'Доказательства' }]);
  const sql = await knowledgeSQL(s);
  assert.match(sql, /^-- Borshkit knowledge graph/);
  assert.match(sql, /INSERT INTO notes VALUES \('knowledge\/_generated\/docs\/docs\/concepts\/evidence\.md\.md', 'doc', 'concept', /);
  await buildKnowledge(s);
  assert.equal(await knowledgeSQL(s), sql);
});
