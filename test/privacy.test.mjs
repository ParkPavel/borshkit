import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ROOT, git, readJSON, atomicJSON } from '../core/io.mjs';
import { childEnv, keyLikeNames, outboundFindings, weakenings } from '../core/privacy.mjs';
import { acceptManualEdit, applyProposal, proposeSettings, revertSettings, settingsIntegrity } from '../core/config.mjs';
import { endExperiment, experimentState, recordKey, startExperiment } from '../core/experiment.mjs';
import { defaultSettings, openSpace } from '../core/space.mjs';
import { newTask } from '../core/contract.mjs';
import { space } from './helpers.mjs';

const run = promisify(execFile);
const cli = (cwd, ...args) => run(process.execPath, [path.join(ROOT, 'bin', 'borshkit.mjs'), ...args], { cwd, windowsHide: true });

test('a child process gets the allowlist and the names it asks for, never the rest', () => {
  const env = { PATH: '/bin', HOME: '/home/u', LANG: 'ru_RU.UTF-8', OPENAI_API_KEY: 'x', DATABASE_URL: 'postgres://u:p@h/db', CODEX_HOME: '/c' };
  assert.deepEqual(Object.keys(childEnv(env)).sort(), ['HOME', 'LANG', 'PATH']);
  assert.deepEqual(Object.keys(childEnv(env, ['CODEX_HOME'])).sort(), ['CODEX_HOME', 'HOME', 'LANG', 'PATH']);
  assert.deepEqual(keyLikeNames(env), ['OPENAI_API_KEY']);
});

test('outbound text: secrets block except in the experiment, personal data blocks in moderate and strict', () => {
  const key = `token = "${'sk-ant-' + 'b'.repeat(40)}"`;
  const pii = 'Пиши на ivan@example.com или +7 912 345-67-89, карта 4111 1111 1111 1111';
  assert.deepEqual(outboundFindings(key, 'moderate').map(f => [f.kind, f.action]), [['provider-credential', 'block']]);
  assert.deepEqual(outboundFindings(key, 'experiment').map(f => f.action), ['record']);
  assert.deepEqual(outboundFindings(pii, 'strict').map(f => f.kind).sort(), ['card-number', 'email', 'phone']);
  assert.deepEqual(outboundFindings(pii, 'experiment'), []);
  assert.deepEqual(outboundFindings('Сборка 2026-10-06, версия 1.2.3, коммит 4ec132902ddc', 'strict'), []);
});

test('what counts as weakening protection', () => {
  const base = defaultSettings('borshkit');
  assert.deepEqual(weakenings(base, { ...base, privacy: 'strict' }), []);
  assert.match(weakenings(base, { ...base, privacy: 'experiment' })[0], /умеренный → эксперимент/);
  assert.match(weakenings(base, { ...base, autopilot: true })[0], /автопилот/);
  assert.match(weakenings(base, { ...base, trustedAgent: 'codex' })[0], /доверенный агент/);
  assert.match(weakenings(base, { ...base, acceptance: { modelTrust: { ui: { maxFalsePassRate: 0.1 } } } })[0], /новая цель доверия/);
});

test('only the trusted agent or a person proposes; tightening applies at once, weakening waits for a person', async t => {
  const s = await space(t);
  await assert.rejects(proposeSettings(s, { privacy: 'strict' }, { from: 'codex' }), /Доверенный агент не выбран/);
  const trust = await proposeSettings(s, { trustedAgent: 'claude' });
  await assert.rejects(applyProposal(s, trust.id), /ослабляет защиту/);
  await applyProposal(s, trust.id, { confirmedByPerson: true });
  await assert.rejects(proposeSettings(s, { privacy: 'strict' }, { from: 'codex' }), /только доверенный агент \(claude\)/);
  const strict = await proposeSettings(s, { privacy: 'strict' }, { from: 'claude', reason: 'приватный код' });
  assert.deepEqual(strict.weakens, []);
  await applyProposal(s, strict.id);
  assert.equal((await readJSON(s.settingsFile)).privacy, 'strict');
  assert.match(await git(s.dir, ['log', '-1', '--format=%an|%s']), /^claude\|Настройки: предложение p002/);
  const back = await proposeSettings(s, { privacy: 'moderate' }, { from: 'claude' });
  await assert.rejects(applyProposal(s, back.id), /нужно твоё подтверждение/);
  assert.match(await fs.readFile(path.join(s.dir, 'settings', 'settings.md'), 'utf8'), /строгий/);
});

test('a settings edit made around Borshkit stops writes until a person accepts or reverts it', async t => {
  const s = await space(t);
  const edited = { ...(await readJSON(s.settingsFile)), autopilot: true };
  await atomicJSON(s.settingsFile, edited);
  const state = await settingsIntegrity(s);
  assert.equal(state.ok, false);
  assert.deepEqual(state.changes.map(c => c.key), ['autopilot']);
  const reopened = await openSpace(s.project);
  await assert.rejects(newTask(reopened, { taskId: 'x', goal: 'цель' }), /изменены в обход Borshkit/);
  await assert.rejects(acceptManualEdit(reopened), /только человек/);
  await revertSettings(reopened);
  assert.equal((await settingsIntegrity(reopened)).ok, true);
  await atomicJSON(s.settingsFile, edited);
  const accepted = await acceptManualEdit(reopened, { confirmedByPerson: true });
  assert.match(accepted.weakens[0], /автопилот/);
  assert.equal((await settingsIntegrity(reopened)).ok, true);
  await newTask(reopened, { taskId: 'x', goal: 'цель' });
});

test('an experiment session records key names and stays dirty until a person confirms revocation', async t => {
  const s = await space(t);
  await assert.rejects(startExperiment(s), /только в режиме приватности «эксперимент»/);
  s.settings.privacy = 'experiment';
  const { session, banner } = await startExperiment(s, { env: { GROQ_API_KEY: 'v', PATH: '/bin' } });
  assert.match(banner, /одноразовые ключи/);
  assert.deepEqual(session.keys.map(k => k.name), ['GROQ_API_KEY']);
  await assert.rejects(recordKey(s, 'sk-live-value with spaces'), /имя переменной/);
  await recordKey(s, 'HF_TOKEN');
  await assert.rejects(endExperiment(s, { revoked: true }), /только человек/);
  await endExperiment(s, { revoked: false, confirmedByPerson: true });
  assert.equal((await experimentState(s)).status, 'dirty');
  await assert.rejects(startExperiment(s), /не закрыта/);
  await endExperiment(s, { revoked: true, confirmedByPerson: true });
  const final = await experimentState(s);
  assert.equal(final.status, 'clean');
  assert.deepEqual(final.keys.map(k => k.name), ['GROQ_API_KEY', 'HF_TOKEN']);
  assert.ok(!JSON.stringify(final).includes('"v"'));
});

test('from a tool (no terminal) the CLI tightens privacy but refuses to weaken it', async t => {
  const s = await space(t);
  assert.match((await cli(s.project, 'приватность', 'строгий')).stdout, /строгий/);
  const refused = await cli(s.project, 'приватность', 'умеренный').catch(e => e);
  assert.equal(refused.code, 1);
  assert.match(refused.stderr, /только человек в терминале/);
  assert.equal((await readJSON(s.settingsFile)).privacy, 'strict');
});
