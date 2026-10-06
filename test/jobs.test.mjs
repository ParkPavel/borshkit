import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { ROOT, git, readJSON } from '../core/io.mjs';
import { applyProposal, proposeSettings } from '../core/config.mjs';
import { probeExecutor } from '../core/executors.mjs';
import { runJob, resumeJob } from '../core/jobs.mjs';
import { converge, verifyAll } from '../core/accept.mjs';
import { answer, listQuestions } from '../core/questions.mjs';
import { cards, statusLine } from '../core/dispatch.mjs';
import { node, space, task } from './helpers.mjs';

const FIX = path.join(ROOT, 'test', 'fixtures');
const fake = (mode, extra = {}) => ({ kind: 'command', command: path.join(FIX, 'fake-executor.mjs'), args: ['--mode', mode], provider: 'local', dataPolicy: 'local', structuredOutput: 'json_schema', modalities: { output: ['text', 'code'] }, ...extra });
async function configure(s, executors, pools = {}) {
  const p = await proposeSettings(s, { executors, pools });
  await applyProposal(s, p.id, { confirmedByPerson: true });
}
const reviewTask = {
  goals: [{ id: 'G1', text: 'Код понятен', criteria: ['C1'] }],
  criteria: [{ id: 'C1', text: 'Функция названа по смыслу', class: 'model' }],
  checks: [],
};
const fast = { silenceMs: 300, tickMs: 50 };

test('a review job records the model answer as evidence and the dispatcher shows who did it', async t => {
  const s = await space(t);
  await configure(s, { local: fake('review-pass') });
  await task(s, 'r', reviewTask);
  const job = await runJob(s, { taskId: 'r', role: 'reviewer', executor: 'local', ...fast });
  assert.equal(job.status, 'COMPLETED');
  assert.equal(job.result.saved, 1);
  const r = await converge(s, 'r');
  assert.equal(r.criteria[0].status, 'WAITING');
  const [card] = await cards(s);
  assert.equal(card.executor, 'local');
  assert.equal(card.word, 'готово');
  assert.match(await fs.readFile(path.join(s.dir, 'STATUS.md'), 'utf8'), /кому ушло: local/);
  assert.match(await fs.readFile(path.join(s.dir, 'status.html'), 'utf8'), /http-equiv="refresh"/);
});

test('a limit hands the work to the next executor in the pool and the handover is visible', async t => {
  const s = await space(t);
  await configure(s, { first: fake('quota', { provider: 'groq' }), second: fake('review-pass') }, { review: { members: ['first', 'second'] } });
  await task(s, 'pool', reviewTask);
  const job = await runJob(s, { taskId: 'pool', role: 'reviewer', pool: 'review', ...fast });
  assert.equal(job.status, 'COMPLETED');
  assert.equal(job.executor, 'second');
  assert.deepEqual(job.attempts.map(a => [a.executor, a.outcome, a.failure]), [['first', 'failed', 'QUOTA'], ['second', 'ok', null]]);
  assert.deepEqual((await cards(s))[0].handovers, ['first: лимит исчерпан']);
  assert.match(await fs.readFile(path.join(s.dir, 'journal.md'), 'utf8'), /лимит исчерпан у first → работа/);
});

test('when every executor is limited the job stops for a person with a report and a handoff, and resumes by ID', async t => {
  const s = await space(t);
  await configure(s, { a: fake('quota'), b: fake('quota', { provider: 'groq' }), c: fake('review-pass', { provider: 'openai' }) }, { review: { members: ['a', 'b'] } });
  await task(s, 'stuck', reviewTask);
  const job = await runJob(s, { taskId: 'stuck', role: 'reviewer', pool: 'review', ...fast });
  assert.equal(job.status, 'WAITING_HUMAN');
  const dir = path.join(s.tasks, 'stuck');
  assert.match(await fs.readFile(path.join(dir, 'stop-report.md'), 'utf8'), /Пул исчерпан/);
  assert.equal((await readJSON(path.join(dir, 'handoff.json'))).jobId, job.id);
  const [q] = await listQuestions(s, { open: true });
  assert.equal(q.kind, 'critical');
  await assert.rejects(answer(s, q.id, 'wait'), /только человек/);
  await assert.rejects(resumeJob(s, job.id, { executor: 'c', ...fast }), /Сначала ответь/);
  await answer(s, q.id, 'wait', { confirmedByPerson: true });
  const resumed = await resumeJob(s, job.id, { executor: 'c', ...fast });
  assert.equal(resumed.status, 'COMPLETED');
  assert.equal(resumed.resumeOf, job.id);
});

test('silence raises a routine question; autopilot switches after the threshold, but waits while a tool runs', async t => {
  const s = await space(t);
  await configure(s, { quiet: fake('silent'), busy: fake('tool-silent', { provider: 'groq' }), good: fake('review-pass', { provider: 'openai' }) }, { review: { members: ['quiet', 'good'] } });
  const p = await proposeSettings(s, { autopilot: true });
  await applyProposal(s, p.id, { confirmedByPerson: true });
  await task(s, 'quiet', reviewTask);
  const job = await runJob(s, { taskId: 'quiet', role: 'reviewer', pool: 'review', ...fast });
  assert.equal(job.status, 'COMPLETED');
  assert.deepEqual(job.attempts.map(a => [a.executor, a.failure]), [['quiet', 'SILENT'], ['good', null]]);
  const answered = (await listQuestions(s)).find(q => q.jobId === job.id);
  assert.equal(answered.answeredBy, 'автопилот');
  assert.equal(answered.answer, 'switch');
  // While a tool runs, the default is to wait; a person stops it.
  const running = runJob(s, { taskId: 'quiet', role: 'reviewer', executor: 'busy', silenceMs: 300, tickMs: 50 });
  let q;
  for (let i = 0; i < 100 && !q; i++) { await new Promise(r => setTimeout(r, 50)); q = (await listQuestions(s, { open: true })).find(x => x.defaultOption === 'wait'); }
  assert.ok(q, 'вопрос о молчании должен появиться');
  await answer(s, q.id, 'stop');
  const stopped = await running;
  assert.equal(stopped.status, 'STOPPED');
});

test('a writer works in its own worktree; the project stays untouched; checks run in the worktree', async t => {
  const s = await space(t);
  await configure(s, { dev: fake('write') });
  await task(s, 'feat', {
    goals: [{ id: 'G1', text: 'Файл функции есть', criteria: ['C1'] }],
    criteria: [{ id: 'C1', text: 'feature.txt создан', class: 'auto' }],
    checks: [{ id: 'exists', ...node("process.exit(require('fs').existsSync('feature.txt') ? 0 : 1)"), criteria: ['C1'] }],
  });
  const job = await runJob(s, { taskId: 'feat', role: 'implementer', executor: 'dev', ...fast });
  assert.equal(job.status, 'COMPLETED');
  assert.deepEqual(job.result.files, ['feature.txt']);
  await assert.rejects(fs.access(path.join(s.project, 'feature.txt')));
  const wt = (await readJSON(path.join(s.tasks, 'feat', 'worktree.json'))).path;
  assert.equal((await git(wt, ['log', '-1', '--format=%an'])).trim(), 'dev');
  assert.equal((await git(wt, ['branch', '--show-current'])).trim(), 'borshkit/feat');
  const [e] = await verifyAll(s, 'feat');
  assert.equal(e.status, 'PASS');
  assert.equal((await converge(s, 'feat')).status, 'accepted');
});

test('a review from the same model family as the author is not independent', async t => {
  const s = await space(t);
  await configure(s, { dev: fake('write', { provider: 'anthropic' }), sibling: fake('review-pass', { provider: 'anthropic' }), other: fake('review-pass', { provider: 'openai' }) }, { review: { members: ['sibling'] } });
  await task(s, 'x', { ...reviewTask, paths: ['.'] });
  await runJob(s, { taskId: 'x', role: 'implementer', executor: 'dev', ...fast });
  const job = await runJob(s, { taskId: 'x', role: 'reviewer', pool: 'review', ...fast });
  assert.equal(job.status, 'WAITING_HUMAN');
  assert.equal(job.attempts[0].failure, 'SAME_PROVIDER');
  assert.equal((await runJob(s, { taskId: 'x', role: 'reviewer', executor: 'other', ...fast })).status, 'COMPLETED');
});

test('the strict mode refuses executors that may train on data, and an answer out of schema fails', async t => {
  const s = await space(t);
  await configure(s, { cloud: fake('review-pass', { provider: 'groq', dataPolicy: 'trains' }), broken: fake('invalid') }, { review: { members: ['cloud'] } });
  const p = await proposeSettings(s, { privacy: 'strict' });
  await applyProposal(s, p.id);
  await task(s, 'strict', reviewTask);
  const job = await runJob(s, { taskId: 'strict', role: 'reviewer', pool: 'review', ...fast });
  assert.equal(job.status, 'WAITING_HUMAN');
  assert.match(job.attempts[0].reason, /строгий режим/);
  const bad = await runJob(s, { taskId: 'strict', role: 'reviewer', executor: 'broken', ...fast });
  assert.equal(bad.status, 'FAILED');
  assert.equal(bad.attempts[0].failure, 'INVALID');
});

test('secrets in the packet stop the job before anything leaves the machine', async t => {
  const s = await space(t);
  await configure(s, { local: fake('review-pass') });
  await task(s, 'leak', { ...reviewTask, goal: `Почини вход, ключ ${'sk-ant-' + 'z'.repeat(40)}` });
  const job = await runJob(s, { taskId: 'leak', role: 'reviewer', executor: 'local', ...fast });
  assert.equal(job.status, 'FAILED');
  assert.match(job.attempts[0].reason, /provider-credential/);
});

test('the Claude and Codex adapters pass read-only tools or sandboxes and parse their event streams', async t => {
  const s = await space(t);
  await configure(s, {
    claude: { kind: 'claude-cli', command: path.join(FIX, 'fake-claude.mjs'), provider: 'anthropic', dataPolicy: 'no-train', structuredOutput: 'json_schema', modalities: { output: ['text', 'code'] } },
    codex: { kind: 'codex-cli', command: path.join(FIX, 'fake-codex.mjs'), provider: 'openai', dataPolicy: 'no-train', structuredOutput: 'json_schema', modalities: { output: ['text', 'code'] } },
  });
  assert.deepEqual(await probeExecutor(s, 'claude').then(p => [p.ok, p.version]), [true, '2.1.289 (Claude Code)']);
  assert.equal((await probeExecutor(s, 'codex')).ok, true);
  await task(s, 'cli', reviewTask);
  await runJob(s, { taskId: 'cli', role: 'reviewer', executor: 'claude', ...fast });
  let r = await converge(s, 'cli');
  assert.match(r.items[0].evidence[0].evidence[0], /инструменты: Read,Glob,Grep$/);
  await runJob(s, { taskId: 'cli', role: 'reviewer', executor: 'codex', ...fast });
  r = await converge(s, 'cli');
  assert.match(r.items[0].evidence[0].evidence[0], /sandbox: read-only/);
});

test('an OpenAI-compatible API: structured review, 429 handover, image generation with provenance', async t => {
  const s = await space(t);
  let limited = true;
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]).toString('base64');
  const srv = http.createServer(async (req, res) => {
    let body = ''; for await (const c of req) body += c;
    const json = (code, value, headers = {}) => { res.writeHead(code, { 'content-type': 'application/json', ...headers }); res.end(JSON.stringify(value)); };
    if (req.url.endsWith('/models')) return json(200, { data: [{ id: 'm1' }, { id: 'limited' }] });
    if (req.url.endsWith('/images/generations')) return json(200, { data: [{ b64_json: png }] });
    const { model, messages } = JSON.parse(body);
    if (model === 'limited' && limited) return json(429, { error: 'rate limit' }, { 'retry-after': '120' });
    const taskPart = JSON.parse(messages[0].content.match(/## Задача \(данные\)\s*```json\n([\s\S]*?)\n```/)[1]);
    json(200, { choices: [{ message: { content: JSON.stringify({ taskId: taskPart.taskId, criteria: taskPart.criteria.map(c => ({ id: c.id, status: 'FAIL', evidence: ['README.md:3 нет шагов'] })), findings: ['нет шагов'], unknowns: [] }) } }] });
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  t.after(() => new Promise(r => srv.close(r)));
  const base = `http://127.0.0.1:${srv.address().port}/v1`;
  const api = (model, extra = {}) => ({ kind: 'openai-compat', baseUrl: base, model, provider: 'free-x', dataPolicy: 'trains', structuredOutput: 'json_schema', modalities: { output: ['text'] }, ...extra });
  await configure(s, { slow: api('limited'), fast: api('m1', { provider: 'free-y' }), ghost: api('ghost'), painter: api('img', { modalities: { output: ['image'] } }) }, { review: { members: ['slow', 'fast'] } });
  assert.equal((await probeExecutor(s, 'fast')).ok, true);
  assert.match((await probeExecutor(s, 'ghost')).missing[0], /модели ghost нет/);
  await task(s, 'api', reviewTask);
  const refused = await runJob(s, { taskId: 'api', role: 'reviewer', executor: 'ghost', ...fast });
  assert.equal(refused.attempts[0].failure, 'CAPABILITY');
  const job = await runJob(s, { taskId: 'api', role: 'reviewer', pool: 'review', ...fast });
  assert.equal(job.executor, 'fast');
  assert.equal(job.attempts[0].failure, 'QUOTA');
  assert.equal((await converge(s, 'api')).status, 'needs-fix');
  await task(s, 'img', { goals: [{ id: 'G1', text: 'Есть баннер', criteria: ['C1'] }], criteria: [{ id: 'C1', text: 'Баннер на месте', class: 'manual' }], checks: [] });
  const image = await runJob(s, { taskId: 'img', role: 'readme-designer', executor: 'painter', imagePath: 'assets/banner.png', ...fast });
  assert.equal(image.status, 'COMPLETED', image.activity);
  const meta = await readJSON(path.join(s.tasks, 'img', 'images', 'banner.png.json'));
  assert.equal(meta.executor, 'painter');
  assert.equal(meta.model, 'img');
  const wt = (await readJSON(path.join(s.tasks, 'img', 'worktree.json'))).path;
  assert.equal((await fs.readFile(path.join(wt, 'assets', 'banner.png')))[1], 0x50);
});

test('the one-line status names the mode, running work and what waits for you', async t => {
  const s = await space(t);
  assert.equal(await statusLine(s), 'Borshkit · умеренный · работ: 0');
});

test('the CLI runs a job, lists it and shows the one-line status', async t => {
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const run = promisify(execFile);
  const cli = (...args) => run(process.execPath, [path.join(ROOT, 'bin', 'borshkit.mjs'), ...args], { cwd: s.project, windowsHide: true });
  const s = await space(t);
  await configure(s, { local: fake('review-pass') });
  await task(s, 'cli', reviewTask);
  assert.match((await cli('работа', 'запустить', 'cli', '--роль', 'reviewer', '--исполнитель', 'local')).stdout, /🟢 готово · работа j-/);
  assert.match((await cli('работа', 'список')).stdout, /cli · reviewer · готово/);
  assert.match((await cli('статус', '--строка')).stdout, /^Borshkit · умеренный · работ: 0/);
  assert.match((await cli('исполнители')).stdout, /local · command · local · данные: local/);
  assert.match((await cli('вопросы')).stdout, /Открытых вопросов нет/);
});
