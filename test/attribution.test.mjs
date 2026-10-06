import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { ROOT } from '../core/io.mjs';
import { attributionCheck, contributorsFromGit, contributorsMarkdown, contributorsReport, readmeAssetsCheck } from '../core/attribution.mjs';
import { git } from '../core/io.mjs';
import { tempDir } from './helpers.mjs';
import { addMaterial } from '../core/materials.mjs';
import { converge, verifyAll } from '../core/accept.mjs';
import { space, task, write } from './helpers.mjs';

test('Borshkit credits every source it uses: the attribution check passes on its own repository', async () => {
  const r = await attributionCheck({ project: ROOT }, null, { readme: 'docs/ingredients.md' });
  assert.equal(r.status, 'PASS', r.log);
  assert.match(r.log, /Ponytail — MIT, файлов: 2/);
});

test('Borshkit\'s own README passes its images-and-links check', async () => {
  const r = await readmeAssetsCheck({ project: ROOT }, null, {});
  assert.equal(r.status, 'PASS', r.log);
  assert.match(r.log, /banner\.ru\.svg/);
});

test('attribution fails on a missing credit, a copy without license, copying an unlicensed source and a missing support link', async t => {
  const s = await space(t);
  await write(s.project, {
    'third-party.json': JSON.stringify([
      { name: 'Good', url: 'https://example.org/good', license: 'MIT', files: ['vendor/good/a.js'] },
      { name: 'Forgotten', url: 'https://example.org/forgotten', license: 'MIT' },
      { name: 'Bare', url: 'https://example.org/bare', license: 'MIT', files: ['vendor/bare.js'] },
      { name: 'NoLicense', url: 'https://example.org/none', license: 'none', files: ['vendor/none.md'] },
      { name: 'Sponsored', url: 'https://example.org/sp', license: 'MIT', support: 'https://github.com/sponsors/someone' },
    ]),
    'vendor/good/a.js': 'export {}\n', 'vendor/good/LICENSE': 'MIT License\n', 'vendor/bare.js': 'export {}\n', 'vendor/none.md': 'текст\n',
    'README.md': '# Проект\n\nСпасибо: https://example.org/good, https://example.org/bare, https://example.org/none, https://example.org/sp\n',
  });
  const r = await attributionCheck(s, null, {});
  assert.equal(r.status, 'FAIL');
  assert.match(r.log, /✓ Good — MIT, файлов: 1/);
  assert.match(r.log, /Forgotten: нет в благодарностях/);
  assert.match(r.log, /Bare: в копии vendor\/bare\.js нет текста лицензии/);
  assert.match(r.log, /NoLicense: лицензии нет — копировать нельзя/);
  assert.match(r.log, /Sponsored: не указана ссылка на поддержку/);
});

test('README assets: images need alt text, must exist and fit the limit; local links must lead somewhere', async t => {
  const s = await space(t);
  await write(s.project, { 'assets/logo.png': 'x'.repeat(10), 'assets/big.png': 'x'.repeat(5000), 'docs/a.md': '#\n',
    'README.md': '![Логотип](assets/logo.png)\n<img src="assets/big.png">\n![нет](assets/missing.png)\n![бейдж](https://img.shields.io/x)\n[док](docs/a.md) [битая](docs/b.md)\n' });
  const r = await readmeAssetsCheck(s, null, { maxBytes: 1000 });
  assert.equal(r.status, 'FAIL');
  assert.match(r.log, /✓ assets\/logo\.png/);
  assert.match(r.log, /у изображения assets\/big\.png нет alt-текста/);
  assert.match(r.log, /assets\/big\.png: 5000 байт, больше лимита 1000/);
  assert.match(r.log, /изображения assets\/missing\.png нет/);
  assert.match(r.log, /внешнее изображение не проверялось/);
  assert.match(r.log, /ссылка на docs\/b\.md ведёт в никуда/);
});

test('builtin attribution and readme-assets work as task checks', async t => {
  const s = await space(t);
  await write(s.project, { 'third-party.json': '[]', 'README.md': '# ok\n' });
  await task(s, 'docs', { goals: [{ id: 'G1', text: 'Этика', criteria: ['C1'] }], criteria: [{ id: 'C1', text: 'Благодарности и картинки в порядке', class: 'auto' }],
    checks: [{ id: 'att', builtin: 'attribution', criteria: ['C1'] }, { id: 'img', builtin: 'readme-assets', criteria: ['C1'] }] });
  assert.deepEqual((await verifyAll(s, 'docs')).map(e => e.status), ['PASS', 'PASS']);
  assert.equal((await converge(s, 'docs')).status, 'accepted');
});

test('all contributors come from every page of the GitHub API, bots apart, avatars linked not copied', async t => {
  const s = await space(t);
  const people = Array.from({ length: 130 }, (_, i) => ({ login: `user${i}`, html_url: `https://github.com/user${i}`, avatar_url: `https://avatars.example/u/${i}?v=4`, contributions: 1, type: 'User' }));
  people.push({ login: 'github-actions[bot]', html_url: 'x', avatar_url: 'x', type: 'Bot' });
  const srv = http.createServer((req, res) => {
    const page = Number(new URL(req.url, 'http://x').searchParams.get('page'));
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(people.slice((page - 1) * 100, page * 100)));
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  t.after(() => new Promise(r => srv.close(r)));
  const result = await contributorsReport(s, ['owner/repo'], { apiBase: `http://127.0.0.1:${srv.address().port}` });
  assert.equal(result[0].people.length, 130);
  assert.deepEqual(result[0].bots, ['github-actions[bot]']);
  const md = contributorsMarkdown(result, { at: '2026-10-06' });
  assert.match(md, /Людей: 130 · боты: github-actions\[bot\]/);
  assert.match(md, /<img src="https:\/\/avatars\.example\/u\/0\?v=4&s=40"/);
  assert.match(md, /\[@user129\]\(https:\/\/github\.com\/user129\)/);
  s.settings.privacy = 'strict';
  await assert.rejects(contributorsReport(s, ['owner/repo']), /Подтверди явно/);
});

test('sources from a tool command and through the Jina proxy are stored with their origin; strict refuses the proxy', async t => {
  const s = await space(t);
  const tool = await addMaterial(s, { command: [process.execPath, '-e', 'console.log("субтитры видео: кошки спят")'], url: 'https://video.example/v1', title: 'видео' });
  assert.equal(tool.record.origin.kind, 'tool');
  assert.equal(tool.record.url, 'https://video.example/v1');
  const calls = [];
  const fetchImpl = async url => { calls.push(url); return new Response('Текст страницы из Jina', { status: 200 }); };
  const jina = await addMaterial(s, { url: 'https://site.example/page', via: 'jina', fetchImpl });
  assert.deepEqual(calls, ['https://r.jina.ai/https://site.example/page']);
  assert.equal(jina.record.origin.value, 'https://site.example/page');
  assert.equal(jina.record.via, 'jina');
  await task(s, 'cite', { kind: 'research', materials: [tool.record.id], paths: ['report.md'], goals: [{ id: 'G1', text: 'Отчёт', criteria: ['C1'] }],
    criteria: [{ id: 'C1', text: 'Цитаты верны', class: 'auto' }], checks: [{ id: 'c', builtin: 'citations', report: 'report.md', criteria: ['C1'] }] });
  await write(s.project, { 'report.md': `Кошки спят (источник: ${tool.record.id}, «кошки спят»), видео: https://video.example/v1\n` });
  assert.equal((await verifyAll(s, 'cite'))[0].status, 'PASS');
  s.settings.privacy = 'strict';
  await assert.rejects(addMaterial(s, { url: 'https://site.example/other', via: 'jina', fetchImpl }), /посредники/);
});

test('without the API, contributors come from a clone\'s history: names and no-reply logins, never e-mail addresses', async t => {
  const dir = await tempDir(t);
  await git(dir, ['init', '-q']);
  const commitAs = async (name, email, n) => { for (let i = 0; i < n; i++) await git(dir, ['-c', `user.name=${name}`, '-c', `user.email=${email}`, 'commit', '-q', '--allow-empty', '-m', `${name} ${i}`]); };
  await commitAs('Анна', '123+anna-dev@users.noreply.github.com', 3);
  await commitAs('Анна', 'anna@private.example', 1);
  await commitAs('Боб', 'bob@private.example', 2);
  await commitAs('github-actions[bot]', '41898282+github-actions[bot]@users.noreply.github.com', 5);
  const r = await contributorsFromGit(dir, 'owner/repo');
  assert.deepEqual(r.people.map(p => [p.login, p.name, p.contributions]), [['anna-dev', 'Анна', 4], [null, 'Боб', 2]]);
  assert.deepEqual(r.bots, ['github-actions[bot]']);
  const md = contributorsMarkdown([r], { at: '2026-10-06' });
  assert.match(md, /\[@anna-dev\]\(https:\/\/github\.com\/anna-dev\) · Боб/);
  assert.match(md, /src="https:\/\/github\.com\/anna-dev\.png\?size=40"/);
  assert.doesNotMatch(md, /private\.example|noreply/);
});
