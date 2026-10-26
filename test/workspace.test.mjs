import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import { ROOT, atomicJSON, readJSON } from '../core/io.mjs';
import { workspaceSnapshot, settingsReview, applyHostSettings } from '../core/workspace.mjs';
import { requestJobStop, jobStopRequested, sampleProcesses } from '../core/runtime-control.mjs';
import { proposeSettings, applyProposal } from '../core/config.mjs';
import { runJob } from '../core/jobs.mjs';
import { listJobs } from '../core/dispatch.mjs';
import { executionStatus, reserveExecution } from '../core/operations.mjs';
import { space, task } from './helpers.mjs';

test('workspace opens without executors or background processes and never fabricates progress', async t => {
  const s = await space(t), view = await workspaceSnapshot(s);
  assert.equal(view.mode, 'current-host'); assert.deepEqual(view.jobs, []);
  assert.equal(view.resources.state, 'NOT_SAMPLED'); assert.deepEqual(view.settings.executors, []);
  assert.equal(await fs.access(path.join(s.state, 'monitor.json')).then(()=>true,()=>false), false);
});

test('host settings consent binds the displayed proposal and does not accept silence or a changed digest', async t => {
  const s = await space(t), p = await proposeSettings(s, { autopilot: true });
  const review = await settingsReview(s, p.id);
  await assert.rejects(applyHostSettings(s, p.id, { host: 'claude', digest: review.digest }), /Пользователь/);
  await assert.rejects(applyHostSettings(s, p.id, { host: 'codex', digest: '0'.repeat(64), decision: 'apply' }), /изменилось/);
  assert.equal((await readJSON(s.settingsFile)).autopilot, false);
  await applyHostSettings(s, p.id, { host: 'claude', digest: review.digest, decision: 'apply' });
  assert.equal((await readJSON(s.settingsFile)).autopilot, true);
  const saved = await readJSON(path.join(s.dir, 'settings', 'proposals', p.id + '.json'));
  assert.equal(saved.confirmationSource, 'host:claude');
  await assert.rejects(applyHostSettings(s, p.id, { host: 'claude', digest: review.digest, decision: 'apply' }), /уже закрыто/);
});

test('controlled stop is acknowledged by the job and releases its active slot', async t => {
  const s = await space(t);
  const p = await proposeSettings(s, { executors: { fixture: { kind: 'command', command: path.join(ROOT, 'test', 'fixtures', 'fake-executor.mjs'), args: ['--mode', 'silent'],
    provider: 'local', dataPolicy: 'local', structuredOutput: 'json_schema', modalities: { output: ['text', 'code'] } } } });
  await applyProposal(s, p.id, { confirmedByPerson: true });
  await task(s, 'controlled', { goals: [{ id: 'G1', text: 'goal', criteria: ['C1'] }], criteria: [{ id: 'C1', text: 'clear', class: 'model' }], checks: [] });
  const running = runJob(s, { taskId: 'controlled', role: 'reviewer', executor: 'fixture', tickMs: 30, silenceMs: 30000 });
  let job;
  try {
    const until = Date.now() + 15000;
    while (Date.now() < until) { job = (await listJobs(s))[0]; if (job?.status === 'RUNNING' && job.processId) break; await new Promise(r => setTimeout(r, 40)); }
    assert.ok(job?.runToken); assert.ok(job?.processId);
    const view = await workspaceSnapshot(s); assert.equal(view.jobs[0].canStop, true); assert.equal(view.jobs[0].progress, null);
    const requested = await requestJobStop(s, job.id); assert.equal(requested.state, 'STOP_REQUESTED');
    assert.equal(await jobStopRequested(s, { ...job, runToken: 'other-run' }), false);
    assert.equal((await running).status, 'STOPPED');
    const status = await executionStatus(s); assert.equal(status.activeRuns, 0); assert.equal(status.unknown.length, 1);
    assert.equal((await workspaceSnapshot(s)).jobs[0].canStop, false);
  } finally { if (job?.runToken) await requestJobStop(s, job.id); await running; }
});

test('resource observations are bounded and report CPU time and memory without fake quota claims', async () => {
  const unix = await sampleProcesses([12, -1, 'bad'], { platform: 'linux', run: async (_cmd, args, opts) => {
    assert.deepEqual(args.slice(0, 2), ['-p', '12']); assert.equal(opts.timeout, 5000);
    return { stdout: '12 1 1024 2048 00:01:02\n' };
  } });
  assert.equal(unix.processes[0].rssBytes, 1048576); assert.equal(unix.processes[0].cpuSeconds, 62);
  const win = await sampleProcesses([12], { platform: 'win32', run: async () => ({ stdout: '{"Id":12,"WorkingSet64":1024,"PrivateMemorySize64":2048,"CPU":2.5}' }) });
  assert.equal(win.processes[0].privateBytes, 2048);
  const blocked = await sampleProcesses([12], { run: async () => { throw Error('unavailable'); } });
  assert.equal(blocked.state, 'UNKNOWN'); assert.deepEqual(blocked.processes, []);
});

test('a dead owner no longer holds a compute slot; unknown provider billing is retained', async t => {
  const s = await space(t);
  await atomicJSON(path.join(s.state, 'execution-ledger.json'), { schemaVersion: 1, entries: [{ id: 'old', pid: 2147483647, taskId: 'old', status: 'RUNNING', reservedTokens: 10 }] });
  const p = await proposeSettings(s, { execution: { maxActiveRuns: 1 } }); await applyProposal(s, p.id, { confirmedByPerson: true });
  await reserveExecution(s, { taskId: 'new', executorId: 'fixture', executor: { kind: 'command', command: process.execPath } });
  const status = await executionStatus(s); assert.equal(status.activeRuns, 1); assert.deepEqual(status.unknown, ['old']);
});

test('stale heartbeats do not expose a process as observed and a lost owner is interrupted', async t => {
  const s = await space(t), id = 'j-fixture-abcdef';
  const job = { id, status: 'RUNNING', ownerPid: process.pid, processId: process.pid, runToken: 'test', heartbeatAt: '2000-01-01T00:00:00Z' };
  const file = path.join(s.dir, 'jobs', id + '.json');
  await atomicJSON(file, job);
  let view = await workspaceSnapshot(s, { resources: true });
  assert.equal(view.jobs[0].state, 'UNKNOWN'); assert.equal(view.jobs[0].processId, null); assert.equal(view.resources.state, 'EMPTY');
  await atomicJSON(file, { ...job, ownerPid: 2147483647 });
  view = await workspaceSnapshot(s);
  assert.equal(view.jobs[0].state, 'INTERRUPTED'); assert.equal(view.jobs[0].canStop, false);
});

test('cancelling a terminal check records UNKNOWN instead of claiming a code defect', async t => {
  const { verifyCheck } = await import('../core/accept.mjs');
  const s = await space(t);
  await task(s, 'cancel', { goals: [{ id: 'G1', text: 'goal', criteria: ['C1'] }], criteria: [{ id: 'C1', text: 'passes', class: 'auto' }],
    checks: [{ id: 'slow', command: process.execPath, args: ['-e', 'setInterval(()=>{},100)'], criteria: ['C1'] }] });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 150);
  try { assert.equal((await verifyCheck(s, 'cancel', 'slow', { signal: controller.signal })).status, 'UNKNOWN'); }
  finally { clearTimeout(timer); }
});
