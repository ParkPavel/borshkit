import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { addMaterial, listMaterials, loadMaterial, refreshMaterial } from '../core/materials.mjs';
import { converge, confirmItem, verifyAll } from '../core/accept.mjs';
import { initSpace } from '../core/space.mjs';
import { space, task, tempDir, write } from './helpers.mjs';

/** A local web server whose page the test can change. */
async function server(t, initial) {
  let body = initial;
  const srv = http.createServer((req, res) => { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', etag: `"${body.length}"` }); res.end(body); });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  t.after(() => new Promise(r => srv.close(r)));
  return { url: `http://127.0.0.1:${srv.address().port}/article`, set: text => { body = text; } };
}
const research = (materials, extra = {}) => ({
  kind: 'research',
  materials,
  paths: ['report.md'],
  goals: [{ id: 'G1', text: 'Отчёт опирается на источники', criteria: ['C1', 'C2'] }],
  criteria: [
    { id: 'C1', text: 'Каждая цитата есть в сохранённом источнике', class: 'auto' },
    { id: 'C2', text: 'Выводы следуют из источников', class: 'manual', manual: { steps: ['Прочитай выводы и источники'], expect: 'Каждый вывод подтверждён' } },
  ],
  checks: [{ id: 'cite', builtin: 'citations', report: 'report.md', criteria: ['C1'] }],
  ...extra,
});

test('materials are stored by content, refetching a changed page creates a superseding version', async t => {
  const s = await space(t), web = await server(t, '<html><body><p>Первая версия статьи</p></body></html>');
  const first = await addMaterial(s, { url: web.url, title: 'Статья' });
  assert.equal(first.added, true);
  assert.match(first.record.id, /^m-[a-f0-9]{12}$/);
  assert.equal(first.record.http.etag, `"${'<html><body><p>Первая версия статьи</p></body></html>'.length}"`);
  assert.equal((await addMaterial(s, { url: web.url, title: 'Статья' })).added, false);
  assert.equal((await refreshMaterial(s, first.record.id)).changed, false);
  web.set('<html><body><p>Вторая версия статьи</p></body></html>');
  const second = await refreshMaterial(s, first.record.id);
  assert.equal(second.changed, true);
  assert.equal(second.record.supersedes, first.record.id);
  const list = await listMaterials(s);
  assert.deepEqual(list.map(m => [m.id, m.superseded]), [[first.record.id, true], [second.record.id, false]]);
});

test('a damaged stored copy is refused', async t => {
  const s = await space(t);
  const { record } = await addMaterial(s, { text: 'исходный текст', title: 'заметка' });
  await fs.writeFile(path.join(s.dir, 'materials', 'blobs', record.sha256.slice(0, 2), record.sha256), 'подмена');
  await assert.rejects(loadMaterial(s, record.id), /изменена после сохранения/);
});

test('the strict privacy mode asks for an explicit yes before going to the network', async t => {
  const s = await space(t), web = await server(t, 'страница');
  s.settings.privacy = 'strict';
  await assert.rejects(addMaterial(s, { url: web.url }), /Подтверди явно/);
  assert.equal((await addMaterial(s, { url: web.url, confirm: true })).added, true);
});

test('citations: quotes found in the stored copy pass; a wrong quote, an undeclared source or a URL read around Borshkit fail', async t => {
  const s = await space(t), web = await server(t, '<p>Кошки спят до шестнадцати часов в сутки.</p>');
  const { record } = await addMaterial(s, { url: web.url, title: 'Про кошек' });
  await task(s, 'cats', research([record.id]));
  await write(s.project, { 'report.md': `Кошки много спят (источник: ${record.id}, «спят до   шестнадцати часов»). Подробнее: ${web.url}\n` });
  let [e] = await verifyAll(s, 'cats');
  assert.equal(e.status, 'PASS', await fs.readFile(path.join(s.dir, e.artifact), 'utf8'));
  let r = await converge(s, 'cats');
  assert.equal(r.status, 'waiting');
  await confirmItem(s, 'cats', 'C2', { verdict: 'PASS' });
  assert.equal((await converge(s, 'cats')).status, 'accepted');

  await write(s.project, { 'report.md': `(источник: ${record.id}, «спят круглые сутки») и https://example.org/other (источник: m-000000000000)\n` });
  [e] = await verifyAll(s, 'cats');
  const log = await fs.readFile(path.join(s.dir, e.artifact), 'utf8');
  assert.equal(e.status, 'FAIL');
  assert.match(log, /цитаты «спят круглые сутки» в источнике нет/);
  assert.match(log, /m-000000000000: источник не объявлен/);
  assert.match(log, /https:\/\/example\.org\/other упомянут, но не сохранён/);
  r = await converge(s, 'cats');
  assert.equal(r.status, 'needs-fix');
});

test('a quote in a format Borshkit cannot read becomes an item for a person, not a pass', async t => {
  const s = await space(t);
  const pdf = path.join(await tempDir(t), 'paper.pdf');
  await fs.writeFile(pdf, '%PDF-1.4 binary');
  const { record } = await addMaterial(s, { file: pdf });
  await task(s, 'pdf', research([record.id], { criteria: [{ id: 'C1', text: 'Каждая цитата есть в сохранённом источнике', class: 'auto' }, { id: 'C2', text: 'Выводы следуют из источников', class: 'manual' }] }));
  await write(s.project, { 'report.md': `(источник: ${record.id}, «важная фраза»)\n` });
  const [e] = await verifyAll(s, 'pdf');
  assert.equal(e.status, 'UNKNOWN');
  const r = await converge(s, 'pdf');
  assert.equal(r.status, 'unknown');
  assert.match(r.items.find(i => i.criterionId === 'C1').reason, /не умею читать application\/pdf/);
});

test('replacing a cited copy makes the citation evidence stale', async t => {
  const s = await space(t);
  const { record } = await addMaterial(s, { text: 'Факт: вода кипит при 100 градусах.', title: 'учебник' });
  await task(s, 'water', research([record.id]));
  await write(s.project, { 'report.md': `(источник: ${record.id}, «вода кипит при 100 градусах»)\n` });
  await verifyAll(s, 'water');
  assert.equal((await converge(s, 'water')).criteria[0].status, 'PASS');
  await fs.writeFile(path.join(s.dir, 'materials', 'blobs', record.sha256.slice(0, 2), record.sha256), 'другой текст');
  const r = await converge(s, 'water');
  assert.equal(r.criteria[0].status, 'UNKNOWN');
});

test('a research task works in a folder without Git', async t => {
  const dir = await tempDir(t);
  await write(dir, { 'notes.md': 'черновик\n' });
  const { space: s } = await initSpace({ project: dir });
  const { record } = await addMaterial(s, { text: 'Луна — спутник Земли.', title: 'справка' });
  await task(s, 'moon', research([record.id], { paths: ['.'] }));
  await write(dir, { 'report.md': `(источник: ${record.id}, «Луна — спутник Земли»)\n` });
  const [e] = await verifyAll(s, 'moon');
  assert.equal(e.status, 'PASS');
  assert.equal(e.state.source.kind, 'files');
});
