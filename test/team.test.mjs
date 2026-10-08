import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { atomicJSON, readJSON, ROOT, sha } from '../core/io.mjs';
import { applyProposal, checkProposal, proposeSettings } from '../core/config.mjs';
import { probeExecutor, validateExecutor } from '../core/executors.mjs';
import { executorFingerprint, recordResources, resetTime, resourcesFor, resourcesFromHeaders } from '../core/resources.mjs';
import { planTeam, proposeTeam, qualification, teamCatalog } from '../core/team.mjs';
import { runJob } from '../core/jobs.mjs';
import { loadRole, roleFingerprint } from '../core/roles.mjs';
import { space, task } from './helpers.mjs';

const dates = () => ({ at: new Date().toISOString(), expiresAt: new Date(Date.now() + 3600000).toISOString() });
const fake = provider => ({ kind: 'command', command: path.join(ROOT, 'test/fixtures/fake-executor.mjs'), args: ['--mode', 'review-pass'], provider, model: 'explicit-test-model', dataPolicy: 'local', structuredOutput: 'json_schema', modalities: { output: ['text', 'code'] } });
async function setup(t, families = ['anthropic', 'openai', 'google']) {
  const s = await space(t);
  await fs.mkdir(path.join(s.project, 'assessments'));
  await fs.writeFile(path.join(s.project, 'assessments/team.md'), 'Fixture assessment: fake executors, not real model quality.');
  const evidenceSha = sha(await fs.readFile(path.join(s.project, 'assessments/team.md')));
  const roleDigests = Object.fromEntries(await Promise.all(['architect', 'implementer', 'reviewer'].map(async r => [r, await roleFingerprint(await loadRole(r))])));
  const executors = Object.fromEntries(families.map((provider, i) => {
    const e = fake(provider);
    e.qualifications = Object.fromEntries(['architect', 'implementer', 'reviewer'].map(role => [role, { ...dates(), result: 'PASS', fingerprint: executorFingerprint(e), roleDigest: roleDigests[role], evidence: 'assessments/team.md', evidenceSha }]));
    return [`e${i}`, e];
  }));
  const p = await proposeSettings(s, { executors });
  await applyProposal(s, p.id, { confirmedByPerson: true });
  await atomicJSON(path.join(s.dir, 'settings/probes.json'), Object.fromEntries(Object.entries(executors).map(([id, e]) => [id, { ...dates(), ok: true, missing: [], fingerprint: executorFingerprint(e) }])));
  await task(s, 'work', { goals: [{ id: 'G1', text: 'Readable code', criteria: ['C1'] }], criteria: [{ id: 'C1', text: 'Readable code', class: 'model' }], checks: [] });
  return s;
}
test('team plans preserve independent review across every writer fallback and role order', async t => {
  const s = await setup(t);
  for (const roles of [['architect', 'implementer', 'reviewer'], ['reviewer', 'implementer']]) {
    const p = await planTeam(s, { taskId: 'work', roles });
    assert.equal(p.status, 'PROPOSED');
    const writer = p.rows.find(r => r.role === 'implementer'), reviewer = p.rows.find(r => r.role === 'reviewer');
    assert.equal(writer.members.length, 2);
    assert.ok(reviewer.members.every(id => writer.members.every(w => s.settings.executors[w].provider !== s.settings.executors[id].provider)));
    assert.ok(writer.candidates.some(c => c.reasons.includes('семейство зарезервировано для независимого ревью')));
  }
  assert.deepEqual(s.settings.pools, {});
});
test('same-family reviewers and partial authors fail closed', async t => {
  const s = await setup(t, ['anthropic', 'anthropic']);
  assert.equal((await planTeam(s, { taskId: 'work', roles: ['implementer', 'reviewer'] })).status, 'BLOCKED');
  await atomicJSON(path.join(s.tasks, 'work/authors.json'), [{ provider: 'anthropic', partial: true }]);
  const p = await planTeam(s, { taskId: 'work', roles: ['reviewer'] });
  assert.equal(p.status, 'BLOCKED');
  assert.ok(p.rows[0].candidates.every(c => c.reasons.includes('семейство уже участвовало в авторстве')));
});
test('missing assessment, changed artifact or model, and expired probes cannot qualify a candidate', async t => {
  const s = await setup(t);
  delete s.settings.executors.e0.qualifications.reviewer;
  assert.equal((await qualification(s, 'e0', 'reviewer')).status, 'UNKNOWN');
  s.settings.executors.e1.model = 'changed-model';
  assert.equal((await qualification(s, 'e1', 'reviewer')).status, 'STALE');
  await fs.writeFile(path.join(s.project, 'assessments/team.md'), 'changed');
  assert.equal((await qualification(s, 'e2', 'reviewer')).status, 'STALE');
  assert.equal((await planTeam(s, { taskId: 'work', roles: ['reviewer'] })).status, 'BLOCKED');
  const probes = await readJSON(path.join(s.dir, 'settings/probes.json'));
  probes.e2.expiresAt = new Date(Date.now() - 1).toISOString();
  await atomicJSON(path.join(s.dir, 'settings/probes.json'), probes);
  assert.equal((await teamCatalog(s)).executors.find(e => e.id === 'e2').probe, 'STALE');
});
test('resources keep units, shared groups, endpoint scope and stale unknowns separate', async t => {
  const s = await setup(t);
  s.settings.executors.e0.quotaGroup = 'shared'; s.settings.executors.e1.quotaGroup = 'shared';
  const r = await recordResources(s, 'e0', { ...dates(), scope: 'endpoint', endpoint: 'models', metrics: [{ name: 'requests', window: 'rate', remaining: 0 }] });
  assert.equal(resourcesFor(s, 'e1', { r }, { endpoint: 'chat/completions' }).status, 'UNKNOWN');
  const account = await recordResources(s, 'e0', { ...dates(), scope: 'account', metrics: [{ name: 'tokens', window: 'subscription', remaining: 20 }, { name: 'usd', window: 'balance', remaining: 0 }] });
  const shared = resourcesFor(s, 'e1', { account });
  assert.deepEqual(shared.metrics.map(m => m.remaining), [20, 0]);
  const stale = resourcesFor(s, 'e1', { account }, { now: new Date(Date.now() + 7200000) });
  assert.ok(stale.metrics.every(m => m.remaining === null));
  s.settings.executors.e0.model = 'new';
  assert.equal(resourcesFor(s, 'e1', { account }).status, 'UNKNOWN');
});
test('zero quota blocks only its scope; unknown quota is an explicit warning', async t => {
  const s = await setup(t);
  let p = await planTeam(s, { taskId: 'work', roles: ['implementer'] });
  assert.ok(p.rows[0].candidates.every(c => c.warnings.length));
  await recordResources(s, 'e0', { ...dates(), scope: 'endpoint', endpoint: 'models', metrics: [{ name: 'requests', window: 'rate', remaining: 0 }] });
  p = await planTeam(s, { taskId: 'work', roles: ['implementer'] });
  assert.ok(p.rows[0].members.includes('e0'));
  await recordResources(s, 'e0', { ...dates(), scope: 'account', metrics: [{ name: 'tokens', window: 'subscription', remaining: 0 }] });
  p = await planTeam(s, { taskId: 'work', roles: ['implementer'] });
  assert.ok(!p.rows[0].members.includes('e0'));
});
test('resource imports discard arbitrary credential fields and validate values', async t => {
  const s = await setup(t);
  const r = await recordResources(s, 'e0', { ...dates(), scope: 'account', credential: 'ignored', metrics: [{ name: 'tokens', window: 'rate', remaining: 2, secret: 'ignored' }] });
  assert.ok(!JSON.stringify(r).includes('ignored'));
  await assert.rejects(recordResources(s, 'e0', { ...dates(), scope: 'account', metrics: [{ name: 'tokens', window: 'rate', remaining: -1 }] }), /неотрицательное/);
  const old = { ...dates(), at: new Date(Date.now() - 1000).toISOString(), scope: 'account', metrics: [{ name: 'tokens', window: 'rate', remaining: 99 }] };
  await recordResources(s, 'e0', old);
  const all = await readJSON(path.join(s.state, 'resources.json'));
  assert.equal(Object.values(all)[0].metrics[0].remaining, 2);
});
test('HTTP quotas and Retry-After parse seconds, durations, dates and malformed values', () => {
  const now = new Date('2026-10-08T12:00:00Z');
  assert.equal(resetTime('1m2s', now), '2026-10-08T12:01:02.000Z');
  assert.equal(resetTime('30', now), '2026-10-08T12:00:30.000Z');
  assert.equal(resetTime('Thu, 08 Oct 2026 12:02:00 GMT', now), '2026-10-08T12:02:00.000Z');
  assert.equal(resetTime('9'.repeat(400), now), null);
  assert.equal(resourcesFromHeaders(new Headers({ 'x-ratelimit-remaining-tokens': '-2' }), 'models', now), null);
  const r = resourcesFromHeaders(new Headers({ 'x-ratelimit-remaining-tokens': '0', 'x-ratelimit-limit-tokens': '100', 'x-ratelimit-reset-tokens': '30s' }), 'chat/completions', now);
  assert.equal(r.metrics[0].remaining, 0); assert.equal(r.endpoint, 'chat/completions');
});
test('team proposals are concrete but do not apply settings or start work', async t => {
  const s = await setup(t);
  const r = await proposeTeam(s, { taskId: 'work', roles: ['implementer', 'reviewer'] });
  assert.deepEqual(s.settings.pools, {});
  await assert.rejects(fs.access(path.join(s.dir, 'jobs')));
  await applyProposal(s, r.proposal.id, { confirmedByPerson: true });
  assert.equal(s.settings.pools['team-reviewer'].qualificationRequired, true);
  assert.equal(s.settings.pools['team-reviewer'].role, 'reviewer');
});
test('a changed contract, observation or assessment invalidates the proposal before confirmation', async t => {
  const s = await setup(t);
  const r = await proposeTeam(s, { taskId: 'work', roles: ['implementer', 'reviewer'] });
  await recordResources(s, 'e0', { ...dates(), scope: 'account', metrics: [{ name: 'tokens', window: 'subscription', remaining: 0 }] });
  await assert.rejects(checkProposal(s, r.proposal.id), /Предложение устарело/);
  await assert.rejects(applyProposal(s, r.proposal.id, { confirmedByPerson: true }), /Предложение устарело/);
  assert.deepEqual(s.settings.pools, {});
});
test('a concurrent settings proposal cannot silently roll back a newer change', async t => {
  const s = await space(t);
  const first = await proposeSettings(s, { privacy: 'strict' });
  const second = await proposeSettings(s, { silenceSeconds: 120 });
  await applyProposal(s, first.id);
  await assert.rejects(applyProposal(s, second.id), /Предложение устарело/);
  assert.equal(s.settings.privacy, 'strict');
});
test('qualification validation refuses unpinned models and unsafe evidence paths', () => {
  const e = fake('openai'), q = { ...dates(), result: 'PASS', fingerprint: executorFingerprint(e), evidence: '.env', evidenceSha: '0'.repeat(64) };
  assert.throws(() => validateExecutor('e', { ...e, qualifications: { reviewer: q } }), /материал/);
  assert.throws(() => validateExecutor('e', { ...e, model: undefined, qualifications: { reviewer: { ...q, evidence: 'review.md' } } }), /явная модель/);
});
test('a missing executable is not a successful probe', async t => {
  const s = await setup(t);
  s.settings.executors.e0.command = path.join(s.project, 'does-not-exist');
  const p = await probeExecutor(s, 'e0');
  assert.equal(p.ok, false); assert.equal(p.fingerprint, executorFingerprint(s.settings.executors.e0));
});
test('managed pools recheck qualifications before each launch and bind their role', async t => {
  const s = await setup(t);
  const r = await proposeTeam(s, { taskId: 'work', roles: ['reviewer'] });
  await applyProposal(s, r.proposal.id, { confirmedByPerson: true });
  await assert.rejects(runJob(s, { taskId: 'work', role: 'architect', pool: 'team-reviewer' }), /другой роли/);
  await assert.rejects(runJob(s, { taskId: 'work', role: 'reviewer', pool: 'team-reviewer', lens: 'lite' }), /базовой роли/);
  await fs.writeFile(path.join(s.project, 'assessments/team.md'), 'changed');
  const job = await runJob(s, { taskId: 'work', role: 'reviewer', pool: 'team-reviewer' });
  assert.equal(job.status, 'WAITING_HUMAN');
  assert.ok(job.attempts.every(a => a.outcome === 'skipped' && !a.launchedAt));
});
test('CLI team, resource import and qualification create reviewable artifacts without starting jobs', async t => {
  const s = await setup(t);
  const run = promisify(execFile);
  const cli = (...args) => run(process.execPath, [path.join(ROOT, 'bin/borshkit.mjs'), ...args], { cwd: s.project, windowsHide: true });
  const catalog = JSON.parse((await cli('team', '--json')).stdout);
  assert.equal(catalog.executors.length, 3);
  assert.ok(catalog.services.every(c => c.status === 'NOT_CONFIGURED'));
  const p = JSON.parse((await cli('team', 'plan', 'work', '--roles', 'reviewer,implementer', '--json')).stdout);
  assert.equal(p.status, 'PROPOSED');
  const q = JSON.parse((await cli('executor', 'qualify', 'e0', '--role', 'reviewer', '--file', 'assessments/team.md', '--result', 'FAIL', '--until', new Date(Date.now() + 7200000).toISOString(), '--json')).stdout);
  assert.equal(q.status, 'open');
  assert.equal(q.after.executors.e0.qualifications.reviewer.result, 'FAIL');
  assert.equal((await readJSON(s.settingsFile)).executors.e0.qualifications.reviewer.result, 'PASS');
  await fs.writeFile(path.join(s.project, 'resources.json'), JSON.stringify({ ...dates(), scope: 'account', metrics: [{ name: 'images', window: 'rate', remaining: 10 }] }));
  const r = JSON.parse((await cli('resources', 'record', 'e0', '--file', 'resources.json', '--json')).stdout);
  assert.equal(r.source, 'DECLARED');
  await assert.rejects(fs.access(path.join(s.dir, 'jobs')));
});
test('API response quotas are recorded for generation, independently of the model-list probe', async t => {
  const s = await setup(t);
  const e = { kind: 'openai-compat', baseUrl: 'https://fixture.example.invalid/v1/', model: 'fixture-model', provider: 'meta', service: 'groq', dataPolicy: 'local', structuredOutput: 'json_schema', modalities: { output: ['text'] } };
  const p = await proposeSettings(s, { executors: { api: e } });
  await applyProposal(s, p.id, { confirmedByPerson: true });
  const answer = { taskId: 'work', criteria: [{ id: 'C1', status: 'PASS', evidence: ['fixture'] }], findings: [], unknowns: [] };
  const fetchImpl = async url => url.endsWith('/models')
    ? new Response(JSON.stringify({ data: [{ id: 'fixture-model' }] }), { headers: { 'x-ratelimit-remaining-requests': '0' } })
    : new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(answer) } }], usage: { total_tokens: 12 } }), { headers: { 'x-ratelimit-remaining-tokens': '5' } });
  assert.equal((await probeExecutor(s, 'api', { fetchImpl })).ok, true);
  const job = await runJob(s, { taskId: 'work', role: 'reviewer', executor: 'api', fetchImpl });
  assert.equal(job.status, 'COMPLETED');
  assert.equal(job.attempts[0].model, 'fixture-model');
  assert.equal(job.attempts[0].endpoint, 'chat/completions');
  assert.ok(job.attempts[0].launchedAt);
  const observations = await readJSON(path.join(s.state, 'resources.json'));
  const quota = resourcesFor(s, 'api', observations, { endpoint: 'chat/completions' });
  assert.equal(quota.metrics.length, 1); assert.equal(quota.metrics[0].remaining, 5);
  assert.equal(quota.metrics[0].source, 'HTTP_HEADERS');
  assert.equal((await teamCatalog(s)).services.find(c => c.id === 'groq').status, 'CONNECTION_CHECKED');
});
test('role digest and proposal deadline changes invalidate assessment and application', async t => {
  const s = await setup(t);
  const saved = s.settings.executors.e0.qualifications.reviewer.roleDigest;
  s.settings.executors.e0.qualifications.reviewer.roleDigest = '0'.repeat(64);
  assert.equal((await qualification(s, 'e0', 'reviewer')).status, 'STALE');
  s.settings.executors.e0.qualifications.reviewer.roleDigest = saved;
  const r = await proposeTeam(s, { taskId: 'work', roles: ['reviewer'] });
  const file = path.join(s.dir, `settings/proposals/${r.proposal.id}.json`);
  await atomicJSON(file, { ...r.proposal, expiresAt: new Date(Date.now() - 1).toISOString() });
  await assert.rejects(applyProposal(s, r.proposal.id, { confirmedByPerson: true }), /срок данных истёк/);
  assert.deepEqual(s.settings.pools, {});
});
