import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { ROOT, assert, atomicJSON, atomicWrite, contained, exists, git, norm, readJSON, sha, withLock } from './io.mjs';
import { runCommand } from './process.mjs';
import { snapshot } from './snapshot.mjs';
import { assertIgnored, journal, saveSpace, settingsDigest, trusted } from './space.mjs';
import { checkTask, covered, loadTask, validateContract } from './contract.mjs';
import { BUILTINS } from './builtins.mjs';
import { assertSettingsIntact } from './config.mjs';

// Evidence binding, verification and convergence adapted from Claudex src/tasks.mjs (Apache-2.0, same author).
export const STATUS_WORDS = {
  accepted: ['🟢', 'принято'],
  waiting: ['🟡', 'автоматически ок, ждёт тебя'],
  'needs-fix': ['🔴', 'нужно исправить'],
  unknown: ['⚪', 'не проверено'],
  'not-ready': ['⚪', 'контракт не готов'],
};
const CRITERION_WORDS = { PASS: '✅ выполнено', FAIL: '❌ не выполнено', WAITING: '🟡 ждёт тебя', UNKNOWN: '⚪ не проверено' };
const LOG_TAIL = 12000;

/** Digest of Borshkit's own code: a changed verifier must not keep an old verdict. */
async function runtimeDigest() {
  const hash = crypto.createHash('sha256');
  for (const dir of ['core', 'bin']) {
    for (const name of (await fs.readdir(path.join(ROOT, dir))).sort()) {
      if (!name.endsWith('.mjs')) continue;
      hash.update(`${dir}/${name}\0`);
      hash.update(await fs.readFile(path.join(ROOT, dir, name)));
    }
  }
  return hash.digest('hex');
}
/** Digest of the stored copies a task cites: a replaced or damaged copy makes its evidence stale. */
async function materialsDigest(space, contract) {
  const parts = [];
  for (const id of [...(contract.materials ?? [])].sort()) {
    const record = await readJSON(path.join(space.dir, 'materials', 'records', `${id}.json`)).catch(() => null);
    const bytes = record && await fs.readFile(path.join(space.dir, 'materials', 'blobs', record.sha256.slice(0, 2), record.sha256)).catch(() => null);
    parts.push(`${id}:${bytes ? sha(bytes) : 'missing'}`);
  }
  return sha(parts.join('\n'));
}
/**
 * Where a task's work lives: its own worktree once a writer got one (the
 * project's history stays untouched until a person merges), otherwise the
 * project itself.
 */
export async function taskRepo(space, taskId) {
  const info = await readJSON(path.join(space.tasks, taskId, 'worktree.json')).catch(() => null);
  return info && await exists(info.path) ? info.path : space.project;
}
/** Model families that wrote this task's changes; a review from the same family is not independent. */
export async function authorProviders(space, taskId) {
  const authors = await readJSON(path.join(space.tasks, taskId, 'authors.json')).catch(() => []);
  return [...new Set(authors.map(a => a.provider))];
}
async function context(space, t) {
  return {
    source: await snapshot(t.repo, { exclude: [space.folder] }),
    materialsDigest: await materialsDigest(space, t.contract),
    settingsDigest: await settingsDigest(space),
    contractDigest: sha(await fs.readFile(t.file)),
    runtimeDigest: await runtimeDigest(),
  };
}
const sameState = (a, b) => a.source.digest === b.source.digest && a.materialsDigest === b.materialsDigest && a.settingsDigest === b.settingsDigest && a.contractDigest === b.contractDigest && a.runtimeDigest === b.runtimeDigest;

export async function readyTask(space, taskId, { draft = false } = {}) {
  await assertIgnored(space);
  await assertSettingsIntact(space);
  const t = await loadTask(space, taskId);
  if (!draft) validateContract(t.contract);
  t.repo = await taskRepo(space, taskId);
  return t;
}
/** Latest CURRENT check results with log tails — handed to executors as data. */
export async function currentChecks(space, t) {
  const now = await context(space, t), out = [];
  for (const check of t.contract.checks ?? []) {
    const e = (await records(t)).find(r => r.kind === 'check' && r.checkId === check.id);
    if (!e || await evidenceProblem(space, t, e, now)) continue;
    const log = await fs.readFile(path.join(space.dir, e.artifact), 'utf8').catch(() => '');
    out.push({ checkId: check.id, status: e.status, log: log.slice(-LOG_TAIL) });
  }
  return out;
}
async function records(t) {
  const dir = path.join(t.dir, 'evidence');
  if (!(await exists(dir))) return [];
  const list = await Promise.all((await fs.readdir(dir)).filter(f => f.endsWith('.json')).map(f => readJSON(path.join(dir, f))));
  return list.sort((a, b) => b.sequence - a.sequence);
}
async function saveEvidence(space, t, evidence) {
  return withLock(space.state, async () => {
    const sequence = Math.max(0, ...(await records(t)).map(e => Number(e.sequence) || 0)) + 1;
    const file = await contained(space.dir, path.join(t.dir, 'evidence', `${evidence.id}.json`));
    const result = { ...evidence, sequence };
    await atomicJSON(file, result);
    return result;
  });
}

/** Run one automated check in the project and keep its log bound to the state it ran on. */
export async function verifyCheck(space, taskId, checkId) {
  const t = await readyTask(space, taskId), check = t.contract.checks.find(c => c.id === checkId);
  assert(check, `В задаче нет проверки «${checkId}»`);
  const before = await context(space, t), evidenceId = crypto.randomUUID();
  let status = 'PASS', log = '', error = null;
  if (check.builtin) ({ status, log, error = null } = await BUILTINS[check.builtin](space, t.contract, check, t.repo));
  else try {
    const result = await runCommand(check.command, check.args, { cwd: t.repo, timeout: check.timeoutMs ?? 120000, maxBuffer: 8 * 1024 * 1024 });
    log = result.stdout + result.stderr;
  } catch (e) { status = 'FAIL'; error = e.message; log = `${e.stdout ?? ''}${e.stderr ?? ''}\n${e.message}\n`; }
  const after = await context(space, t);
  const logFile = await contained(space.dir, path.join(t.dir, 'logs', `${evidenceId}.log`));
  await fs.mkdir(path.dirname(logFile), { recursive: true });
  await fs.writeFile(logFile, log, { flag: 'wx', mode: 0o600 });
  const evidence = await saveEvidence(space, t, {
    id: evidenceId, taskId, kind: 'check', checkId, criteria: check.criteria, status, error,
    freshness: sameState(before, after) ? 'CURRENT' : 'STALE', state: before,
    artifact: norm(path.relative(space.dir, logFile)), artifactSha256: sha(await fs.readFile(logFile)), createdAt: new Date().toISOString(),
  });
  await journal(space, `Проверка «${checkId}» задачи «${taskId}»: ${{ PASS: 'прошла', FAIL: 'не прошла', UNKNOWN: 'не смогла решить' }[status]}.`);
  return evidence;
}
export async function verifyAll(space, taskId) {
  const t = await readyTask(space, taskId);
  const out = [];
  for (const check of t.contract.checks) out.push(await verifyCheck(space, taskId, check.id));
  return out;
}

/**
 * A reviewer model's structured result (the Claudex result schema). Only
 * `model` criteria are recorded; PASS without evidence is refused; silence on
 * a criterion records nothing, so it stays "not checked".
 */
export async function recordReview(space, taskId, { executor, provider = null, result }) {
  const t = await readyTask(space, taskId);
  assert(typeof executor === 'string' && /^[a-zA-Z0-9._@/-]{1,80}$/.test(executor), 'Укажи исполнителя-ревьюера: --исполнитель codex');
  assert(result && result.taskId === taskId && Array.isArray(result.criteria), 'Результат ревью не относится к этой задаче');
  const model = new Map(t.contract.criteria.filter(c => c.class === 'model').map(c => [c.id, c]));
  const current = await context(space, t), saved = [], ignored = [];
  for (const answer of result.criteria) {
    if (!model.has(answer.id)) { ignored.push(String(answer.id)); continue; }
    assert(['PASS', 'FAIL', 'UNKNOWN'].includes(answer.status), `Неверный статус у ${answer.id}`);
    assert(Array.isArray(answer.evidence) && answer.evidence.every(e => typeof e === 'string' && e.trim()) && (answer.status !== 'PASS' || answer.evidence.length), `PASS по ${answer.id} без доказательств не принимается`);
    saved.push(await saveEvidence(space, t, { id: crypto.randomUUID(), taskId, kind: 'review', executor, provider, criteria: [answer.id], status: answer.status,
      evidence: answer.evidence, findings: Array.isArray(result.findings) ? result.findings : [], state: current, createdAt: new Date().toISOString() }));
  }
  await journal(space, `Ревью задачи «${taskId}» от ${executor}: записано ${saved.length} ответ(ов).`);
  return { saved, ignored };
}

/** A person's verdict on one item of the acceptance sheet, bound to the current state. */
export async function confirmItem(space, taskId, criterionId, { verdict, note = '' }) {
  const t = await readyTask(space, taskId);
  const criterion = t.contract.criteria.find(c => c.id === criterionId);
  assert(criterion, `В задаче нет критерия «${criterionId}»`);
  assert(['PASS', 'FAIL'].includes(verdict), 'Ответ — да или нет');
  const current = await context(space, t);
  if (criterion.class === 'auto') {
    // A person may stand in for a check that could not run, never overrule one that ran and failed.
    const latest = (await records(t)).filter(e => e.kind === 'check' && e.criteria.includes(criterionId));
    const failing = latest.find(e => e.status === 'FAIL' && e.freshness === 'CURRENT' && sameState(e.state, current));
    assert(!failing || verdict === 'FAIL', `Проверка «${failing?.checkId}» для ${criterionId} сейчас падает — сначала исправь, подтверждение её не отменяет`);
  }
  const evidence = await saveEvidence(space, t, { id: crypto.randomUUID(), taskId, kind: 'human', criteria: [criterionId], status: verdict, note, state: current, createdAt: new Date().toISOString() });
  await journal(space, `Ты ${verdict === 'PASS' ? 'подтвердил' : 'отклонил'} пункт ${criterionId} задачи «${taskId}».`);
  return evidence;
}
/** Overall sign-off required by the `manual` policy. */
export async function signOff(space, taskId, { note = '' } = {}) {
  const t = await readyTask(space, taskId);
  return saveEvidence(space, t, { id: crypto.randomUUID(), taskId, kind: 'signoff', criteria: [], status: 'PASS', note, state: await context(space, t), createdAt: new Date().toISOString() });
}

async function evidenceProblem(space, t, e, current) {
  if (!sameState(e.state, current)) return 'с тех пор изменились файлы, настройки, контракт или сам Borshkit';
  if (e.kind === 'check') {
    if (e.freshness !== 'CURRENT') return 'файлы менялись во время проверки';
    try {
      const file = await contained(path.join(t.dir, 'logs'), path.resolve(space.dir, e.artifact));
      if (sha(await fs.readFile(file)) !== e.artifactSha256) return 'лог проверки изменён';
    } catch { return 'лог проверки не найден'; }
  }
  return null;
}
async function scopeViolations(space, t) {
  if (!space.projectIsGit || t.contract.paths.includes('.') || !t.contract.base.head) return [];
  const changed = (await git(t.repo, ['diff', '--no-renames', '--name-only', '-z', t.contract.base.head])).split('\0').filter(Boolean);
  const untracked = (await git(t.repo, ['ls-files', '--others', '--exclude-standard', '-z'])).split('\0').filter(Boolean);
  const before = t.repo === space.project ? t.basis.uncommitted ?? {} : {};
  const unchanged = async f => f in before && before[f] === await fs.readFile(path.join(t.repo, f)).then(sha, () => null);
  const out = [];
  for (const f of [...new Set([...changed, ...untracked])].filter(f => !covered(f, t.contract.paths))) if (!(await unchanged(f))) out.push(f);
  return out;
}

/**
 * The verdict per criterion, per goal and for the task (decisions D3, D10):
 * automated checks decide automatically; a model's FAIL sends the task back,
 * its PASS decides only where the user's trust goal is met by measurement;
 * everything else — manual criteria, untrusted PASS, anything not checked —
 * becomes an item on the acceptance sheet for a person.
 */
export async function converge(space, taskId) {
  const readiness = await checkTask(space, taskId, { trusted: tag => trusted(space.settings, tag) });
  if (!readiness.ready) return { taskId, status: 'not-ready', errors: readiness.errors, criteria: [], goals: [], items: [] };
  const t = await readyTask(space, taskId), current = await context(space, t), all = await records(t);
  const authors = await authorProviders(space, taskId);
  const latest = (kind, criterionId, extra = () => true) => all.find(e => e.kind === kind && e.criteria.includes(criterionId) && extra(e));
  const usable = async e => e && !(await evidenceProblem(space, t, e, current)) ? e : null;
  const criteria = [], items = [];
  for (const c of t.contract.criteria) {
    const human = await usable(latest('human', c.id));
    let status, decidedBy, reason = null, evidence = [];
    if (c.class === 'auto') {
      const results = [];
      for (const check of t.contract.checks.filter(k => k.criteria.includes(c.id))) {
        const e = latest('check', c.id, r => r.checkId === check.id);
        const problem = e ? await evidenceProblem(space, t, e, current) ?? (e.status === 'UNKNOWN' ? `проверка не смогла решить: ${e.error}` : null) : 'проверка ещё не запускалась';
        results.push({ checkId: check.id, status: problem ? 'UNKNOWN' : e.status, problem, artifact: e?.artifact ?? null, command: check.builtin ? `встроенная проверка ${check.builtin}${check.report ?? check.readme ? ` (${check.report ?? check.readme})` : ""}` : [check.command, ...check.args].join(' ') });
      }
      evidence = results;
      if (results.some(r => r.status === 'FAIL')) { status = 'FAIL'; decidedBy = 'check'; }
      else if (results.length && results.every(r => r.status === 'PASS')) { status = 'PASS'; decidedBy = 'check'; }
      else if (human) { status = human.status; decidedBy = 'human-instead-of-check'; }
      else { status = 'UNKNOWN'; reason = results.length ? results.filter(r => r.problem).map(r => `${r.checkId}: ${r.problem}`).join('; ') : 'для критерия нет автоматической проверки'; }
    } else if (c.class === 'model') {
      const review = await usable(latest('review', c.id));
      evidence = review ? [{ executor: review.executor, status: review.status, evidence: review.evidence }] : [];
      if (human) { status = human.status; decidedBy = 'human'; }
      else if (review?.status === 'FAIL') { status = 'FAIL'; decidedBy = `model:${review.executor}`; }
      else if (review?.status === 'PASS' && review.provider && authors.includes(review.provider)) { status = 'WAITING'; reason = `ревьюер ${review.executor} из того же семейства моделей (${review.provider}), что и автор, — независимой проверки нет`; }
      else if (review?.status === 'PASS' && trusted(space.settings, c.tag)) { status = 'PASS'; decidedBy = `trusted-model:${review.executor}`; }
      else if (review?.status === 'PASS') { status = 'WAITING'; reason = `модель ${review.executor} считает критерий выполненным, но цель доверия для этого типа не подтверждена измерением`; }
      else { status = 'UNKNOWN'; reason = review ? `модель ${review.executor} не смогла решить` : 'ревью ещё не было или устарело'; }
    } else {
      if (human) { status = human.status; decidedBy = 'human'; }
      else { status = 'WAITING'; reason = 'это слепая зона: автоматически не проверить'; }
    }
    criteria.push({ id: c.id, text: c.text, class: c.class, status, decidedBy: decidedBy ?? null, reason, evidence });
    if (status === 'WAITING' || status === 'UNKNOWN') items.push({ criterionId: c.id, text: c.text, status, reason, manual: c.manual ?? null, evidence });
  }
  const goals = t.contract.goals.map(g => ({ id: g.id, text: g.text, achieved: g.criteria.every(k => criteria.find(c => c.id === k).status === 'PASS'), criteria: g.criteria }));
  const violations = await scopeViolations(space, t);
  const end = await context(space, t), stable = sameState(current, end);
  let status;
  if (violations.length || criteria.some(c => c.status === 'FAIL')) status = 'needs-fix';
  else if (!stable) status = 'unknown';
  else if (goals.every(g => g.achieved)) {
    const signed = t.contract.acceptance.policy !== 'manual' || await usable(all.find(e => e.kind === 'signoff'));
    if (signed) status = 'accepted';
    else { status = 'waiting'; items.push({ criterionId: null, text: 'Общая приёмка задачи', status: 'WAITING', reason: 'политика приёмки «manual»: итог подтверждает человек', manual: null, evidence: [] }); }
  } else status = criteria.some(c => c.status === 'UNKNOWN') ? 'unknown' : 'waiting';
  const report = { taskId, status, goal: t.contract.goal, policy: t.contract.acceptance.policy, goals, criteria, items, scopeViolations: violations, stable,
    state: current, createdAt: new Date().toISOString() };
  const previous = await readJSON(path.join(t.dir, 'convergence.json')).catch(() => null);
  await atomicJSON(path.join(t.dir, 'convergence.json'), report);
  await atomicWrite(path.join(t.dir, 'acceptance.md'), acceptanceSheet(space, report), { mode: 0o644 });
  if (status === 'accepted') await atomicJSON(path.join(t.dir, 'decision.json'), decision(report));
  if (previous?.status !== status) {
    const [, word] = STATUS_WORDS[status];
    await journal(space, `Задача «${taskId}»: ${word}.`);
    await saveSpace(space, status === 'accepted' ? `Принята задача «${taskId}»` : `Задача «${taskId}»: ${word}`, { author: 'Borshkit', email: 'space@borshkit' });
  }
  return report;
}
function decision(report) {
  return { taskId: report.taskId, status: 'accepted', policy: report.policy, goals: report.goals.map(g => g.id),
    criteria: report.criteria.map(c => ({ id: c.id, decidedBy: c.decidedBy })), state: report.state, decidedAt: report.createdAt };
}

export function acceptanceSheet(space, report) {
  const [dot, word] = STATUS_WORDS[report.status];
  const cmd = space.folder === 'borshkit' ? 'borshkit' : `borshkit --папка ${space.folder}`;
  const lines = [`# Приёмка: ${report.taskId}`, '', `**Статус:** ${dot} ${word}`, '', `**Цель задачи:** ${report.goal}`, ''];
  lines.push('## Цели', '');
  for (const g of report.goals) lines.push(`- [${g.achieved ? 'x' : ' '}] **${g.id}** ${g.text} — ${g.achieved ? 'достигнута' : 'пока не достигнута'} (критерии: ${g.criteria.join(', ')})`);
  lines.push('');
  const section = (title, list) => { if (list.length) lines.push(`## ${title}`, '', ...list, ''); };
  section('Проверено', report.criteria.filter(c => c.status === 'PASS').map(c => `- ✅ **${c.id}** ${c.text} — ${explain(c)}`));
  section('Нужно исправить', [
    ...report.criteria.filter(c => c.status === 'FAIL').map(c => `- ❌ **${c.id}** ${c.text} — ${explain(c)}`),
    ...report.scopeViolations.map(f => `- ❌ изменён файл вне границ задачи: \`${f}\``),
  ]);
  const items = report.items.map(item => {
    const out = [`### ${item.criterionId ?? 'Итог'} — ${item.text}`, '', `- **Почему это ждёт тебя:** ${item.reason}`];
    if (item.manual?.steps?.length) out.push('- **Что сделать:**', ...item.manual.steps.map((s, i) => `  ${i + 1}. ${s}`));
    if (item.manual?.expect) out.push(`- **Что должно быть видно:** ${item.manual.expect}`);
    if (item.manual?.where) out.push(`- **Где смотреть:** ${item.manual.where}`);
    for (const e of item.evidence) out.push(`- **Уже собрано:** ${e.executor ? `модель ${e.executor} — ${e.status}: ${(e.evidence ?? []).join('; ')}` : `проверка ${e.checkId} (\`${e.command}\`) — ${e.problem ?? e.status}`}`);
    out.push(item.criterionId
      ? `- **Подтвердить:** \`${cmd} задача подтвердить ${report.taskId} ${item.criterionId} да "что видел"\` (или \`нет\`)`
      : `- **Подтвердить:** \`${cmd} задача принять ${report.taskId}\``, '');
    return out.join('\n');
  });
  section('Ждёт тебя', items);
  if (!report.stable) lines.push('> Файлы менялись, пока шла сверка, — итог отложен. Запусти сверку ещё раз.', '');
  lines.push('---', `Сверено: ${report.createdAt}. Состояние проекта: \`${report.state.source.digest.slice(0, 12)}\`. Любое изменение файлов делает отметки устаревшими.`, '');
  return lines.join('\n');
}
function explain(c) {
  if (c.decidedBy === 'check') return c.evidence.map(e => `проверка \`${e.command}\` ${e.status === 'PASS' ? 'прошла' : 'не прошла'}${e.artifact ? ` (лог: \`${e.artifact}\`)` : ''}`).join('; ');
  if (c.decidedBy === 'human-instead-of-check') return 'подтверждено тобой вместо проверки';
  if (c.decidedBy === 'human') return 'решено тобой';
  if (c.decidedBy?.startsWith('trusted-model:')) return `решено моделью ${c.decidedBy.slice(14)} по подтверждённой цели доверия`;
  if (c.decidedBy?.startsWith('model:')) return `модель ${c.decidedBy.slice(6)} нашла проблему: ${c.evidence.flatMap(e => e.evidence ?? []).join('; ')}`;
  return CRITERION_WORDS[c.status];
}
