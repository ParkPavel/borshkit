// Regressions from the independent audit of 0.10.1 (docs/discussions/audit-2026-10-07.md):
// each test fails on ed89f16 and passes once the finding is fixed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { git } from '../core/io.mjs';
import { snapshot } from '../core/snapshot.mjs';
import { pushProject } from '../core/gitshell.mjs';
import { startExecutor } from '../core/adapters.mjs';
import { commit, project, space, tempDir, write } from './helpers.mjs';

const KEY = 'AKIA' + 'ABCDEFGHIJKLMNOP';

test('F12: pushing to another remote scans every commit that remote has not seen', async t => {
  const s = await space(t);
  const a = await tempDir(t), b = await tempDir(t);
  await git(a, ['init', '-q', '--bare']); await git(b, ['init', '-q', '--bare']);
  await write(s.project, { 'old.txt': `${KEY}\n` }); await commit(s.project, 'old with a key');
  await git(s.project, ['remote', 'add', 'origin', a]); await git(s.project, ['remote', 'add', 'b', b]);
  await git(s.project, ['push', '-q', '-u', 'origin', 'main']);
  await write(s.project, { 'src/new.js': 'export {};\n' }); await commit(s.project, 'new');
  await assert.rejects(pushProject(s, { remote: 'b', confirmedByPerson: true }), /похоже на ключ/);
  assert.equal((await git(b, ['for-each-ref'])).trim(), '', 'на пустой remote ничего не ушло');
  // To the remote that already has the old commit, only the new one leaves.
  const r = await pushProject(s, { remote: 'origin', confirmedByPerson: true });
  assert.equal(r.commits, 1);
});

test('F14: an answer followed by a non-zero exit is a failure, and the answer is kept', async t => {
  const dir = await tempDir(t), script = path.join(dir, 'x.mjs');
  await fs.writeFile(script, "console.log(JSON.stringify({ type: 'result', result: { ok: 1 } })); process.exit(1);");
  const h = await startExecutor({ executor: { kind: 'command', command: process.execPath, args: [script], modalities: { output: ['text'] } },
    prompt: 'x', schema: {}, cwd: dir, writable: false, timeoutMs: 10000, onEvent() {}, scratch: dir });
  const r = await h.done;
  assert.equal(r.ok, false);
  assert.match(r.error, /завершилась с кодом 1/);
  assert.deepEqual(r.unconfirmedResult, { ok: 1 });
});

test('F6: the snapshot changes with the executable bit and with a submodule\'s checkout', async t => {
  const dir = await project(t);
  const before = await snapshot(dir);
  if (process.platform !== 'win32') {
    await fs.chmod(path.join(dir, 'src/app.js'), 0o755);
    assert.notEqual((await snapshot(dir)).digest, before.digest, 'chmod +x');
    await fs.chmod(path.join(dir, 'src/app.js'), 0o644);
  }
  const sub = await project(t, { 'lib.js': 'export const v = 1;\n' });
  await git(dir, ['-c', 'protocol.file.allow=always', 'submodule', 'add', '-q', sub, 'vendor/lib']);
  await commit(dir, 'add submodule');
  const withSub = await snapshot(dir);
  await write(path.join(dir, 'vendor/lib'), { 'lib.js': 'export const v = 2;\n' });
  const dirty = await snapshot(dir);
  assert.notEqual(dirty.digest, withSub.digest, 'правка внутри подмодуля');
  await commit(path.join(dir, 'vendor/lib'), 'v2');
  assert.notEqual((await snapshot(dir)).digest, dirty.digest, 'новый коммит подмодуля');
});

// ── Reviews are bound to what the reviewer saw (F2, F4) and every writer counts (F9) ──
import { ROOT, readJSON } from '../core/io.mjs';
import { converge, recordReview } from '../core/accept.mjs';
import { proposeSettings, applyProposal } from '../core/config.mjs';
import { runJob } from '../core/jobs.mjs';
import { task } from './helpers.mjs';

const FIX = path.join(ROOT, 'test', 'fixtures');
const fake = (mode, extra = {}) => ({ kind: 'command', command: path.join(FIX, 'fake-executor.mjs'), args: ['--mode', mode], provider: 'local', dataPolicy: 'local', structuredOutput: 'json_schema', modalities: { output: ['text', 'code'] }, ...extra });
const fast = { silenceMs: 2000, tickMs: 50 };
const modelTask = { goals: [{ id: 'G1', text: 'g', criteria: ['C1'] }], criteria: [{ id: 'C1', text: 'Кнопка подписана', class: 'model', tag: 'ui' }], checks: [], paths: ['src'] };
async function settle(s, patch) { const p = await proposeSettings(s, patch); await applyProposal(s, p.id, { confirmedByPerson: true }); }
const trust = { acceptance: { modelTrust: { ui: { maxFalsePassRate: 0.1, measured: { runs: 60, falsePass: 0, source: 'test', provider: 'openai' } } } } };

test('F2: files changed while the reviewer worked make its PASS stale at once', async t => {
  const s = await space(t);
  await settle(s, { executors: { rev: fake('review-while-edited', { provider: 'openai' }) }, ...trust });
  await task(s, 'seen', modelTask);
  const job = await runJob(s, { taskId: 'seen', role: 'reviewer', executor: 'rev', ...fast });
  assert.equal(job.status, 'COMPLETED');
  assert.equal(job.result.freshness, 'STALE');
  const r = await converge(s, 'seen');
  assert.notEqual(r.criteria[0].status, 'PASS');
  assert.match(r.criteria[0].reason, /устарело/);
});

test('F4: an imported PASS, or one from an unknown family, never closes a criterion by itself', async t => {
  const s = await space(t);
  await settle(s, trust);
  await task(s, 'imp', modelTask);
  const answer = { taskId: 'imp', criteria: [{ id: 'C1', status: 'PASS', evidence: ['src/app.js:1'] }], findings: [], unknowns: [] };
  await recordReview(s, 'imp', { executor: 'gpt', provider: 'openai', result: answer });
  let r = await converge(s, 'imp');
  assert.equal(r.criteria[0].status, 'WAITING');
  assert.match(r.criteria[0].reason, /импортировано/);
  const { taskState } = await import('../core/accept.mjs');
  await recordReview(s, 'imp', { executor: 'gpt', provider: null, result: answer, seenState: await taskState(s, 'imp') });
  r = await converge(s, 'imp');
  assert.equal(r.criteria[0].status, 'WAITING');
  assert.match(r.criteria[0].reason, /семейство моделей ревьюера gpt неизвестно/);
  // An imported FAIL still sends the task back.
  await recordReview(s, 'imp', { executor: 'gpt', provider: 'openai', result: { ...answer, criteria: [{ id: 'C1', status: 'FAIL', evidence: ['src/app.js:1 нет подписи'] }] } });
  assert.equal((await converge(s, 'imp')).status, 'needs-fix');
});

test('F9: a writer that hit a limit keeps its own commit and its family among the authors', async t => {
  const s = await space(t);
  await settle(s, { executors: { first: fake('write-then-quota', { provider: 'openai' }), second: fake('write', { provider: 'anthropic' }), rev: fake('review-pass', { provider: 'openai' }) },
    pools: { build: { members: ['first', 'second'] } } });
  await task(s, 'half', { ...modelTask, paths: ['.'] });
  const job = await runJob(s, { taskId: 'half', role: 'implementer', pool: 'build', ...fast });
  assert.equal(job.status, 'COMPLETED');
  const authors = await readJSON(path.join(s.tasks, 'half', 'authors.json'));
  assert.deepEqual(authors.map(a => [a.executor, a.provider, Boolean(a.partial)]), [['first', 'openai', true], ['second', 'anthropic', false]]);
  const worktree = (await readJSON(path.join(s.tasks, 'half', 'worktree.json'))).path;
  assert.match(await git(worktree, ['log', '--format=%an|%s', '-2']), /second\|[\s\S]*first\|Незавершённая работа first/);
  // The openai reviewer is no longer "independent": openai wrote part of the change.
  const review = await runJob(s, { taskId: 'half', role: 'reviewer', executor: 'rev', ...fast });
  assert.equal(review.status, 'WAITING_HUMAN');
  assert.equal(review.attempts[0].failure, 'SAME_PROVIDER');
});

// ── What is accepted is what lands (F3), and evaluation compares like with like (F11) ──
import { verifyAll } from '../core/accept.mjs';
import { mergeTask, updateTask } from '../core/gitshell.mjs';
import { evaluate } from '../core/eval.mjs';
import { node } from './helpers.mjs';

test('F3: when the project moved on, the task is accepted again on the combined state before it can land', async t => {
  const s = await space(t);
  await commit(s.project, 'ignore rule');
  await settle(s, { executors: { dev: fake('write') } });
  // The feature is correct only while config.txt does not switch it off.
  await task(s, 'feat', { paths: ['.'], goals: [{ id: 'G1', text: 'Фича работает', criteria: ['C1'] }], criteria: [{ id: 'C1', text: 'feature.txt есть и не выключен', class: 'auto' }],
    checks: [{ id: 'f', ...node("const fs=require('fs');process.exit(fs.existsSync('feature.txt')&&!(fs.existsSync('config.txt')&&fs.readFileSync('config.txt','utf8').includes('off'))?0:1)"), criteria: ['C1'] }] });
  await runJob(s, { taskId: 'feat', role: 'implementer', executor: 'dev', ...fast });
  await verifyAll(s, 'feat');
  assert.equal((await converge(s, 'feat')).status, 'accepted');
  // Meanwhile the project gets a change that merges cleanly but breaks the feature.
  await write(s.project, { 'config.txt': 'feature: off\n' }); await commit(s.project, 'switch it off');
  await assert.rejects(mergeTask(s, 'feat', { confirmedByPerson: true }), /Основная версия проекта изменилась/);
  assert.equal((await updateTask(s, 'feat')).updated, true);
  assert.equal((await converge(s, 'feat')).status, 'unknown', 'старые доказательства устарели');
  await verifyAll(s, 'feat');
  assert.equal((await converge(s, 'feat')).status, 'needs-fix', 'объединённое состояние сломано — и это видно');
  await assert.rejects(mergeTask(s, 'feat', { confirmedByPerson: true }), /не принята \(needs-fix\)/);
  // Unsaved edits in the task's copy are not what was committed, so they block landing too.
  const copy = (await readJSON(path.join(s.tasks, 'feat', 'worktree.json'))).path;
  await write(copy, { 'config.txt': 'feature: on\n' });
  await assert.rejects(mergeTask(s, 'feat', { confirmedByPerson: true }), /изменения, которых нет в её истории/);
});

test('F11: evaluation does not compare a verdict with files that changed after it', async t => {
  const s = await space(t);
  await task(s, 'ev', { goals: [{ id: 'G1', text: 'g', criteria: ['C1'] }], criteria: [{ id: 'C1', text: 'тесты', class: 'auto' }], checks: [{ id: 'ok', ...node('process.exit(0)'), criteria: ['C1'] }] });
  await verifyAll(s, 'ev');
  assert.equal((await converge(s, 'ev')).status, 'accepted');
  await write(s.project, { 'src/app.js': 'export const answer = 0;\n' });
  const r = await evaluate(s, { ev: node('process.exit(1)') });
  assert.equal(r.rows[0].comparable, false);
  assert.equal(r.rows[0].falsePass, null);
  assert.equal(r.summary.falsePass, 0);
  assert.deepEqual(r.summary.incomparable, ['ev']);
});
