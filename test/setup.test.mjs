import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ROOT, atomicJSON, exists, readJSON } from '../core/io.mjs';
import { openSpace } from '../core/space.mjs';
import { applyProposal, checkProposal, proposeSettings } from '../core/config.mjs';
import { PRESETS } from '../core/executors.mjs';
import { executorFingerprint } from '../core/resources.mjs';
import { discoverSetupCommands, formatSetup, proposeSetup, readSetup, setupReport, updateSetup, writeSetupFiles } from '../core/setup.mjs';
import { project, space, tempDir } from './helpers.mjs';

const run = promisify(execFile);
const cli = (cwd, ...args) => run(process.execPath, [path.join(ROOT, 'bin/borshkit.mjs'), ...args], { cwd, windowsHide: true });
const codex = { ...PRESETS.codex, model: 'test-code-model', dataPolicy: 'no-train' };
const complete = async s => updateSetup(s, { host: 'codex-app', privacy: 'strict', executors: { codex }, roles: ['architect', 'implementer', 'reviewer'] });

test('setup is readable without a terminal and does not change settings or start executors', async t => {
  const s = await space(t), before = await fs.readFile(s.settingsFile, 'utf8');
  const report = await writeSetupFiles(s, { env: {} });
  assert.equal(report.selectionComplete, false);
  assert.equal(report.proposal, null);
  assert.equal(report.actual.autopilot, false);
  assert.deepEqual(report.launches, []);
  assert.equal(await fs.readFile(s.settingsFile, 'utf8'), before);
  assert.equal(await exists(path.join(s.dir, 'settings/setup.json')), false);
  assert.equal(await exists(path.join(s.dir, 'jobs')), false);
  assert.match(await fs.readFile(path.join(s.dir, 'SETUP.md'), 'utf8'), /1\. Среда[\s\S]*6\. Готовность/);
});

test('command discovery reads PATH files without running them and requires executable files on Unix', async t => {
  const dir = await tempDir(t), marker = path.join(dir, 'executed');
  await fs.writeFile(path.join(dir, 'codex'), `#!/bin/sh\ntouch '${marker}'\n`, { mode: 0o755 });
  const found = await discoverSetupCommands({ env: { PATH: dir }, platform: 'linux' });
  assert.equal(found.find(e => e.id === 'codex').status, 'FOUND_NOT_CHECKED');
  assert.equal(found.find(e => e.id === 'claude').status, 'NOT_FOUND');
  assert.equal(await exists(marker), false);
  if (process.platform !== 'win32') {
    await fs.chmod(path.join(dir, 'codex'), 0o644);
    assert.equal((await discoverSetupCommands({ env: { PATH: dir }, platform: 'linux' })).find(e => e.id === 'codex').status, 'NOT_FOUND');
  }
  await fs.writeFile(path.join(dir, 'claude.cmd'), '@echo off\n');
  assert.equal((await discoverSetupCommands({ env: { Path: dir, PATHEXT: '.EXE;.CMD' }, platform: 'win32' })).find(e => e.id === 'claude').status, 'FOUND_NOT_CHECKED');
});

test('saved choices resume and explain compatibility separately from quality and reviewer independence', async t => {
  const s = await space(t);
  await complete(s);
  const reopened = await openSpace(s.project);
  assert.equal((await readSetup(reopened)).host, 'codex-app');
  const report = await setupReport(reopened, { env: {} });
  assert.equal(report.selectionComplete, true);
  assert.equal(report.independentReviewPossible, false);
  assert.equal(report.host.remoteApproval, 'NOT_IMPLEMENTED');
  assert.ok(report.compatibility.every(r => r.candidates.includes('codex')));
  assert.ok(report.next.includes('codex: кандидат ещё не применён'));
  assert.match(formatSetup(report), /Совместимость требований не доказывает качество роли/);
  assert.equal(reopened.settings.privacy, 'moderate');
});

test('setup creates only a proposal; it binds choices and roles and preserves human confirmation', async t => {
  const s = await space(t);
  await complete(s);
  const p = await proposeSetup(s);
  assert.equal(p.status, 'open');
  assert.ok(p.weakens.some(w => w.includes('новый исполнитель')));
  assert.equal(p.after.autopilot, false);
  assert.deepEqual(p.after.pools, {});
  assert.equal(p.inputs[0].path, 'settings/setup.json');
  assert.equal(p.roleInputs.length, 3);
  assert.equal(s.settings.privacy, 'moderate');
  assert.equal((await setupReport(s, { env: {} })).proposal.status, 'PROPOSED');
  await assert.rejects(applyProposal(s, p.id), /подтверждение в терминале/);
  await applyProposal(s, p.id, { confirmedByPerson: true });
  const report = await setupReport(s, { env: {} });
  assert.equal(report.proposal.status, 'APPLIED');
  assert.equal(report.actual.privacy, 'strict');
  assert.equal(report.actual.executors[0].probe, 'UNKNOWN');
  assert.ok(report.next.some(n => n.includes('нужна актуальная оценка роли')));
  assert.equal(report.launches.length, 0);
  assert.equal(await exists(path.join(s.dir, 'settings/probes.json')), false);
});

test('editing choices invalidates the old proposal before applying', async t => {
  const s = await space(t);
  await complete(s);
  const p = await proposeSetup(s);
  await updateSetup(s, { roles: ['implementer'] });
  await assert.rejects(checkProposal(s, p.id), /изменилось settings\/setup.json/);
  assert.equal((await setupReport(s, { env: {} })).proposal.status, 'STALE');
  await assert.rejects(applyProposal(s, p.id, { confirmedByPerson: true }), /изменилось/);
  assert.deepEqual(s.settings.executors, {});
});

test('setup in an already configured project distinguishes saved choices from missing assessments', async t => {
  const s = await space(t);
  await complete(s);
  await applyProposal(s, (await proposeSetup(s)).id, { confirmedByPerson: true });
  await updateSetup(s, {}, { reset: true });
  await complete(s);
  const report = await setupReport(s, { env: {} });
  assert.equal(report.settingsMatch, true);
  assert.equal(report.selectionComplete, true);
  assert.ok(report.next.some(n => n.includes('оценка роли')));
  assert.equal(await proposeSetup(s), null);
  assert.equal((await fs.readdir(path.join(s.dir, 'settings/proposals'))).length, 1);
});

test('concurrent steps preserve each other and settings changes require an explicit new draft', async t => {
  const s = await space(t);
  await Promise.all([updateSetup(s, { host: 'codex-app' }), updateSetup(s, { privacy: 'strict' })]);
  const d = await readSetup(s);
  assert.equal(d.host, 'codex-app');
  assert.equal(d.privacy, 'strict');
  const p = await proposeSettings(s, { silenceSeconds: 90 });
  await applyProposal(s, p.id);
  await assert.rejects(updateSetup(s, { roles: ['tester'] }), /мастер заново/);
  await updateSetup(s, {}, { reset: true });
  assert.equal((await readSetup(s)).privacy, null);
  assert.equal(s.settings.silenceSeconds, 90);
});

test('strict privacy, missing model, duplicate roles and secret values fail before saving a usable draft', async t => {
  const s = await space(t);
  await assert.rejects(updateSetup(s, { executors: { codex: PRESETS.codex } }), /закрепи модель/);
  await assert.rejects(updateSetup(s, { roles: ['tester', 'tester'] }), /разные существующие роли/);
  await assert.rejects(updateSetup(s, { autopilot: true }), /неизвестные поля/);
  await assert.rejects(updateSetup(s, { executors: { api: { kind: 'openai-compat', baseUrl: 'https://example.invalid/v1', model: 'test',
    provider: 'test', dataPolicy: 'no-train', structuredOutput: 'json_schema', modalities: { output: ['text'] }, apiKeyEnv: 'a value with spaces' } } }), /ИМЯ переменной/);
  await complete(s);
  await updateSetup(s, { executors: { codex: { ...codex, dataPolicy: 'unknown' } } });
  const report = await setupReport(s, { env: {} });
  assert.ok(report.compatibility.every(r => !r.candidates.length));
  await assert.rejects(proposeSetup(s), /не покрывают требования/);
  assert.equal(await exists(path.join(s.dir, 'settings/proposals')), false);
});

test('launch facts require the selected configuration and an actual launch witness', async t => {
  const s = await space(t);
  await complete(s);
  await atomicJSON(path.join(s.dir, 'jobs/j001.json'), { id: 'j001', createdAt: new Date().toISOString(), taskId: 'demo', role: 'implementer',
    attempts: [ { executor: 'codex', fingerprint: executorFingerprint(codex), model: codex.model, launchedAt: null },
      { executor: 'codex', fingerprint: '0'.repeat(64), model: 'old', launchedAt: new Date().toISOString() },
      { executor: 'codex', fingerprint: executorFingerprint(codex), model: codex.model, launchedAt: new Date().toISOString() } ] });
  const report = await setupReport(s, { env: {} });
  assert.equal(report.launches.length, 1);
  assert.equal(report.launches[0].model, codex.model);
  assert.equal(report.proposal, null);
});

test('CLI setup steps work through an app without TTY and --yes never applies the proposal', async t => {
  const dir = await project(t);
  const initialized = await cli(dir, 'начать', '--мастер');
  assert.match(initialized.stdout, /Мастер настройки команды/);
  await cli(dir, 'мастер', 'вход', 'codex-app');
  await cli(dir, 'setup', 'privacy', 'strict');
  await cli(dir, 'мастер', 'среда', 'codex', '--модель', codex.model, '--данные', 'no-train');
  await cli(dir, 'мастер', 'роли', 'architect,implementer,reviewer');
  const report = JSON.parse((await cli(dir, 'мастер', 'предложить', '--json', '--да')).stdout);
  assert.equal(report.proposal.status, 'PROPOSED');
  assert.equal(report.actual.executors.length, 0);
  const s = await openSpace(dir);
  assert.equal(s.settings.autopilot, false);
  await assert.rejects(cli(dir, 'настройки', 'применить', report.proposal.id, '--да'), e => /только человек в терминале/.test(e.stderr));
  await assert.rejects(cli(dir, 'мастер', '--диалог'), e => /пошаговые команды/.test(e.stderr));
  assert.equal((await readJSON(s.settingsFile)).privacy, 'moderate');
});
