import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { git, readJSON, atomicJSON } from '../core/io.mjs';
import { analyzeContract, checkTask, validateContract } from '../core/contract.mjs';
import { confirmItem, converge, recordReview, signOff, verifyAll } from '../core/accept.mjs';
import { node, space, task, write } from './helpers.mjs';

const PASSING = node('process.exit(0)'), FAILING = node('console.error("сломано"); process.exit(1)');
const contract = (extra = {}) => ({
  goals: [{ id: 'G1', text: 'Функция работает и выглядит понятно', criteria: ['C1', 'C2'] }],
  criteria: [
    { id: 'C1', text: 'Тесты проходят', class: 'auto' },
    { id: 'C2', text: 'Кнопка видна на экране настроек', class: 'manual', manual: { steps: ['Открой настройки'], expect: 'Кнопка «Сохранить» видна', where: 'Экран настроек' } },
  ],
  checks: [{ id: 'tests', ...PASSING, criteria: ['C1'] }],
  ...extra,
});

test('a draft is not ready, and checks may only serve automatic criteria', async t => {
  const s = await space(t);
  await task(s, 'draft', {});
  const r = await checkTask(s, 'draft');
  assert.equal(r.ready, false);
  assert.match(r.errors[0], /Черновик/);
  const file = await task(s, 'bad', contract({ checks: [{ id: 'x', ...PASSING, criteria: ['C2'] }] }));
  assert.throws(() => validateContract(null), /версия контракта/);
  const bad = await readJSON(file);
  assert.throws(() => validateContract(bad), /класса auto/);
  bad.checks = [];
  bad.goals = [{ id: 'G1', text: 'Цель', criteria: ['C9'] }];
  assert.throws(() => validateContract(bad), /существующие критерии/);
});

test('analysis shows the blind zone and what no check will ever show before work starts', async t => {
  const s = await space(t);
  const file = await task(s, 'a', contract({
    criteria: [
      { id: 'C1', text: 'Тесты проходят', class: 'auto' },
      { id: 'C2', text: 'Работает быстро', class: 'auto' },
      { id: 'C3', text: 'Текст понятен', class: 'model', tag: 'docs' },
    ],
    goals: [{ id: 'G1', text: 'Готово', criteria: ['C1', 'C2', 'C3'] }],
    acceptance: { policy: 'auto' },
  }));
  const warnings = analyzeContract(await readJSON(file));
  const text = warnings.map(w => `${w.severity} ${w.summary}`).join('\n');
  assert.match(text, /HIGH Критерий C2 должен проверяться автоматически, но проверки для него нет/);
  assert.match(text, /Критерий C2 использует слово, которое ничем не измерить/);
  assert.match(text, /Ручная приёмка понадобится для 1 из 3 критериев: C3/);
  assert.match(text, /Политика «auto»/);
});

test('automatic checks decide, the blind zone waits for a person, and a confirmation completes the goal', async t => {
  const s = await space(t);
  await task(s, 'flow', contract());
  await verifyAll(s, 'flow');
  let r = await converge(s, 'flow');
  assert.equal(r.status, 'waiting');
  assert.deepEqual(r.criteria.map(c => [c.id, c.status]), [['C1', 'PASS'], ['C2', 'WAITING']]);
  assert.equal(r.items.length, 1);
  const sheet = await fs.readFile(path.join(s.tasks, 'flow', 'acceptance.md'), 'utf8');
  assert.match(sheet, /Открой настройки/);
  assert.match(sheet, /Кнопка «Сохранить» видна/);
  assert.match(sheet, /borshkit задача подтвердить flow C2 да/);
  await confirmItem(s, 'flow', 'C2', { verdict: 'PASS', note: 'видел кнопку' });
  r = await converge(s, 'flow');
  assert.equal(r.status, 'accepted');
  assert.equal(r.goals[0].achieved, true);
  const decision = await readJSON(path.join(s.tasks, 'flow', 'decision.json'));
  assert.deepEqual(decision.criteria, [{ id: 'C1', decidedBy: 'check' }, { id: 'C2', decidedBy: 'human' }]);
  assert.match(await git(s.dir, ['log', '-1', '--format=%s']), /Принята задача «flow»/);
});

test('a failing check sends the task back and a person cannot overrule it', async t => {
  const s = await space(t);
  await task(s, 'red', contract({ checks: [{ id: 'tests', ...FAILING, criteria: ['C1'] }] }));
  const [e] = await verifyAll(s, 'red');
  assert.equal(e.status, 'FAIL');
  assert.match(await fs.readFile(path.join(s.dir, e.artifact), 'utf8'), /сломано/);
  assert.equal((await converge(s, 'red')).status, 'needs-fix');
  await assert.rejects(confirmItem(s, 'red', 'C1', { verdict: 'PASS' }), /сейчас падает/);
});

test('editing the project after a check makes its evidence and a person\'s confirmation stale', async t => {
  const s = await space(t);
  await task(s, 'stale', contract());
  await verifyAll(s, 'stale');
  await confirmItem(s, 'stale', 'C2', { verdict: 'PASS' });
  assert.equal((await converge(s, 'stale')).status, 'accepted');
  await write(s.project, { 'src/app.js': 'export const answer = 0;\n' });
  const r = await converge(s, 'stale');
  assert.equal(r.status, 'unknown');
  assert.deepEqual(r.criteria.map(c => c.status), ['UNKNOWN', 'WAITING']);
  assert.match(r.criteria[0].reason, /изменились файлы/);
});

test('a criterion with no check run yet becomes an item, which a person may close instead of the check', async t => {
  const s = await space(t);
  await task(s, 'norun', contract());
  let r = await converge(s, 'norun');
  assert.equal(r.status, 'unknown');
  assert.match(r.items.find(i => i.criterionId === 'C1').reason, /не запускалась/);
  await confirmItem(s, 'norun', 'C1', { verdict: 'PASS', note: 'прогнал вручную' });
  await confirmItem(s, 'norun', 'C2', { verdict: 'PASS' });
  r = await converge(s, 'norun');
  assert.equal(r.status, 'accepted');
  assert.equal(r.criteria[0].decidedBy, 'human-instead-of-check');
});

test('a model FAIL sends back, its PASS waits for a person unless the trust goal is met', async t => {
  const s = await space(t);
  const reviewContract = contract({
    goals: [{ id: 'G1', text: 'Документация понятна', criteria: ['C3'] }],
    criteria: [{ id: 'C3', text: 'README объясняет установку', class: 'model', tag: 'docs' }],
    checks: [],
  });
  await task(s, 'review', reviewContract);
  const result = status => ({ taskId: 'review', criteria: [{ id: 'C3', status, evidence: ['README.md:10 шаги установки'] }], findings: [], unknowns: [] });
  await assert.rejects(recordReview(s, 'review', { executor: 'codex', result: { taskId: 'review', criteria: [{ id: 'C3', status: 'PASS', evidence: [] }] } }), /без доказательств/);
  await recordReview(s, 'review', { executor: 'codex', result: result('FAIL') });
  assert.equal((await converge(s, 'review')).status, 'needs-fix');
  await recordReview(s, 'review', { executor: 'codex', result: result('PASS') });
  let r = await converge(s, 'review');
  assert.equal(r.status, 'waiting');
  assert.match(r.items[0].reason, /цель доверия/);
  const settings = await readJSON(s.settingsFile);
  settings.acceptance.modelTrust.docs = { maxFalsePassRate: 0.1, measured: { runs: 30, falsePass: 1, source: 'eval/docs' } };
  await atomicJSON(s.settingsFile, settings);
  s.settings = settings;
  await recordReview(s, 'review', { executor: 'codex', result: result('PASS') });
  r = await converge(s, 'review');
  assert.equal(r.status, 'accepted');
  assert.equal(r.criteria[0].decidedBy, 'trusted-model:codex');
});

test('the manual policy waits for an overall sign-off even when every goal is reached', async t => {
  const s = await space(t);
  await task(s, 'signed', contract({
    goals: [{ id: 'G1', text: 'Тесты зелёные', criteria: ['C1'] }],
    criteria: [{ id: 'C1', text: 'Тесты проходят', class: 'auto' }],
    acceptance: { policy: 'manual' },
  }));
  await verifyAll(s, 'signed');
  let r = await converge(s, 'signed');
  assert.equal(r.status, 'waiting');
  assert.equal(r.items[0].text, 'Общая приёмка задачи');
  await signOff(s, 'signed', { note: 'посмотрел' });
  r = await converge(s, 'signed');
  assert.equal(r.status, 'accepted');
});

test('a change outside the task scope fails convergence; edits that predate the task do not', async t => {
  const s = await space(t);
  await write(s.project, { 'notes.txt': 'было до задачи\n' });
  await task(s, 'scope', contract({
    paths: ['src'],
    goals: [{ id: 'G1', text: 'Тесты зелёные', criteria: ['C1'] }],
    criteria: [{ id: 'C1', text: 'Тесты проходят', class: 'auto' }],
  }));
  await write(s.project, { 'README.md': 'изменение вне границ\n' });
  await verifyAll(s, 'scope');
  const r = await converge(s, 'scope');
  assert.equal(r.status, 'needs-fix');
  assert.deepEqual(r.scopeViolations, ['README.md']);
  await write(s.project, { 'README.md': 'изменение вне границ\n', 'notes.txt': 'изменено во время задачи\n' });
  await verifyAll(s, 'scope');
  assert.deepEqual((await converge(s, 'scope')).scopeViolations, ['README.md', 'notes.txt']);
});
