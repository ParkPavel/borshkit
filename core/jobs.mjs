import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { acquireLock, assert, atomicJSON, atomicWrite, contained, exists, git, readJSON } from './io.mjs';
import { journal, saveSpace } from './space.mjs';
import { capable, FAILURE_WORDS, privacyAllows, readProbes } from './executors.mjs';
import { startExecutor } from './adapters.mjs';
import { buildPrompt, loadRole, loadSkill, SCHEMAS, validateOutput } from './roles.mjs';
import { outboundFindings } from './privacy.mjs';
import { authorProviders, taskState, currentChecks, readyTask, recordReview } from './accept.mjs';
import { loadMaterial, materialText } from './materials.mjs';
import { proposeSettings } from './config.mjs';
import { ID, covered } from './contract.mjs';
import { answer, ask, criticalStop, getQuestion, resolveDue } from './questions.mjs';
import { writeStatusFiles } from './dispatch.mjs';
import { qualification } from './team.mjs';
import { executorFingerprint, fresh, readResources, recordResources, resourcesFor } from './resources.mjs';

// Jobs (spec §4.3, §10.3, §10.4): one role, one task, executors tried in order.
// A limit hands the work to the next allowed executor in the pool; silence
// raises a routine question; an exhausted pool stops for a person.
const jobsDir = space => path.join(space.dir, 'jobs');
const jobFile = (space, id) => path.join(jobsDir(space), `${id}.json`);
const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function readJob(space, id) {
  assert(/^j-[a-z0-9]+-[a-f0-9]{6}$/.test(id ?? ''), 'Недопустимый номер работы');
  assert(await exists(jobFile(space, id)), `Работы ${id} нет`);
  return readJSON(jobFile(space, id));
}

/**
 * The task's own copy of the project for writers: a Git worktree on its own
 * branch beside the project, so the project's history changes only when a
 * person merges. Ignored files (the space, .env) never reach it.
 */
export async function ensureWorktree(space, taskId) {
  const infoFile = path.join(space.tasks, taskId, 'worktree.json');
  const info = await readJSON(infoFile).catch(() => null);
  if (info && await exists(info.path)) return info;
  if (!space.projectIsGit) return { path: space.project, branch: null, isolated: false };
  const head = (await git(space.project, ['rev-parse', '--verify', '-q', 'HEAD']).catch(() => '')).trim();
  assert(head, 'У проекта ещё нет ни одного сохранения в истории — отдельную копию сделать не из чего');
  const root = path.join(path.dirname(space.project), `${path.basename(space.project)}.borshkit-worktrees`);
  const target = path.join(root, taskId), branch = `borshkit/${taskId}`;
  await fs.mkdir(root, { recursive: true });
  const branches = (await git(space.project, ['branch', '--list', branch])).trim();
  await git(space.project, branches ? ['worktree', 'add', target, branch] : ['worktree', 'add', '-b', branch, target, head]);
  const dirty = (await git(space.project, ['status', '--porcelain'])).trim();
  const created = { path: target, branch, base: head, isolated: true, createdAt: new Date().toISOString() };
  await atomicJSON(infoFile, created);
  await journal(space, `Для задачи «${taskId}» создана отдельная копия проекта: ${target}${dirty ? ' (несохранённые изменения проекта в неё не попали)' : ''}.`);
  return created;
}
async function commitWork(space, repo, executorId, message) {
  await git(repo, ['add', '-A']);
  if (!(await git(repo, ['status', '--porcelain'])).trim()) return null;
  await git(repo, ['-c', `user.name=${executorId}`, '-c', `user.email=${executorId}@borshkit`, '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', message]);
  return (await git(repo, ['rev-parse', 'HEAD'])).trim();
}
/**
 * Whether a path an executor asks Borshkit to write is inside the task: a
 * relative path covered by the contract's `paths`, never into Git's metadata
 * or the space folder.
 */
export function allowedWrite(space, contract, file) {
  if (typeof file !== 'string' || !file || path.isAbsolute(file) || path.win32.isAbsolute(file)) return false;
  const rel = path.posix.normalize(file.replaceAll('\\', '/'));
  const parts = rel.split('/');
  if (rel.startsWith('../') || rel === '..' || parts.some(p => p.toLowerCase() === '.git') || parts[0] === space.folder) return false;
  return covered(rel, contract.paths);
}
async function addAuthor(space, taskId, entry) {
  const file = path.join(space.tasks, taskId, 'authors.json');
  await atomicJSON(file, [...await readJSON(file).catch(() => []), entry]);
}
async function changedFiles(repo, base) {
  try { return (await git(repo, ['diff', '--name-only', base, 'HEAD'])).split('\n').filter(Boolean); } catch { return []; }
}
async function knowledgeContext(space, taskId) {
  try { return (await import('./kb.mjs')).taskContext(space, taskId); } catch { return null; }
}
const IMAGE = [[0x89, 0x50, 0x4e, 0x47], [0xff, 0xd8, 0xff], [0x52, 0x49, 0x46, 0x46], [0x47, 0x49, 0x46]];
const isImage = (bytes, file) => file.endsWith('.svg') ? /<svg[\s>]/i.test(bytes.toString('utf8', 0, 2000)) : IMAGE.some(sig => sig.every((b, i) => bytes[i] === b));

/**
 * Run one job to its end. `executor` names one executor; `pool` names an
 * ordered list from the settings. Options for tests: `silenceMs`, `tickMs`.
 */
export async function runJob(space, options = {}) {
  const role = await loadRole(options.role);
  if (role.authority !== 'workspace-write') return runJobUnlocked(space, options);
  // Two writers in one task's copy would mix their changes and commits.
  assert(ID.test(options.taskId ?? ''), `Недопустимое имя задачи «${options.taskId}»`);
  const release = await acquireLock(path.join(space.state, 'locks', `writer-${options.taskId}.lock`), { busy: `В копии задачи «${options.taskId}» уже работает другая пишущая работа — дождись её или останови` });
  try { return await runJobUnlocked(space, options); } finally { await release(); }
}
async function runJobUnlocked(space, { taskId, role: roleId, executor = null, pool = null, lens = null, skills = [], imagePath = null, resumeOf = null, inPlace = false,
  fetchImpl = globalThis.fetch, silenceMs = space.settings.silenceSeconds * 1000, tickMs = 500, env = process.env } = {}) {
  const role = await loadRole(roleId);
  for (const ref of skills) await loadSkill(ref);
  const t = await readyTask(space, taskId, { draft: role.output === 'contract' });
  const executors = space.settings.executors ?? {}, pools = space.settings.pools ?? {};
  assert(executor || pool, 'Укажи исполнителя (--исполнитель) или пул (--пул)');
  assert(!executor || executors[executor], `Исполнитель «${executor}» не объявлен. Список: borshkit исполнители`);
  assert(!pool || pools[pool], `Пула «${pool}» нет`);
  assert(!pool || !pools[pool].role || pools[pool].role === roleId, 'Пул предназначен для другой роли');
  assert(!pool || !pools[pool].qualificationRequired || !lens && !skills.length, 'Оценка пула относится к базовой роли; дополнительные навыки и линза требуют отдельной оценки');
  if (role.output === 'image') assert(typeof imagePath === 'string' && imagePath, 'Укажи файл изображения: --файл assets/banner.png');
  assert(role.authority !== 'workspace-write' || space.projectIsGit || inPlace,
    'Проект без Git: отдельной копии для агента нет, он будет менять файлы прямо в папке проекта. Если согласен, запусти с --в-папке (подтверждаешь в терминале); правки вне границ задачи покажет сверка.');
  if (role.output === 'image') assert(allowedWrite(space, t.contract, imagePath), `Файл изображения ${imagePath} — вне границ задачи (paths) или в служебной папке`);
  const candidates = executor ? [executor] : pools[pool].members;
  const maxSwitches = executor ? 0 : pools[pool].maxSwitches ?? 3, waitSeconds = executor ? 0 : pools[pool].waitSeconds ?? 0;
  const probes = await readProbes(space);
  const now = new Date();
  const job = { id: `j-${now.getTime().toString(36)}-${crypto.randomBytes(3).toString('hex')}`, taskId, role: roleId, status: 'QUEUED', pool, lens, skills, resumeOf, imagePath,
    createdAt: now.toISOString(), attempts: [], executor: null, lastEventAt: null, toolRunning: false, activity: 'ждёт исполнителя' };
  let lastWrite = 0;
  const save = async (force = false) => {
    job.updatedAt = new Date().toISOString();
    if (!force && Date.now() - lastWrite < 1000) return;
    lastWrite = Date.now();
    await atomicJSON(jobFile(space, job.id), job);
    await writeStatusFiles(space).catch(() => {});
  };
  await save(true);
  await journal(space, `Работа ${job.id}: роль ${roleId} для задачи «${taskId}».`);

  const authors = role.crossProvider ? await authorProviders(space, taskId) : [];
  const handoff = resumeOf ? await fs.readFile(path.join(space.tasks, taskId, 'handoff.md'), 'utf8').catch(() => null) : null;
  const materials = [];
  for (const id of t.contract.materials ?? []) {
    const { record, bytes } = await loadMaterial(space, id);
    materials.push({ id, title: record.title, origin: record.origin.value, text: materialText(record, bytes) });
  }
  let outcome = null, switches = 0;
  const retried = new Set();
  for (let i = 0; i < candidates.length; i++) {
    const id = candidates[i], e = executors[id];
    const attempt = { executor: id, provider: e.provider, model: e.model ?? null, kind: e.kind, fingerprint: executorFingerprint(e), endpoint: e.kind === 'openai-compat' ? role.output === 'image' ? 'images/generations' : 'chat/completions' : null, startedAt: new Date().toISOString(), launchedAt: null, outcome: 'running' };
    const skip = async (failure, reason) => { Object.assign(attempt, { outcome: 'skipped', failure, reason, endedAt: new Date().toISOString() }); job.attempts.push(attempt); await save(true); };
    const allowed = privacyAllows(space.settings.privacy, e);
    if (!allowed.ok) { await skip('PRIVACY', allowed.reason); continue; }
    const can = capable(role, e, probes[id]);
    if (!can.ok) { await skip('CAPABILITY', can.missing.join('; ')); continue; }
    if (pool && pools[pool].qualificationRequired) {
      const probe = (await readProbes(space))[id], q = await qualification(space, id, roleId);
      const resources = resourcesFor(space, id, await readResources(space), { endpoint: attempt.endpoint });
      if (!probe?.ok || probe.fingerprint !== executorFingerprint(e) || !fresh(probe) || q.status !== 'PASS' || resources.metrics.some(m => m.remaining === 0)) {
        await skip('CAPABILITY', 'Данные пригодности, подключения или ресурсов изменились — пересчитай команду'); continue;
      }
    }
    if (authors.includes(e.provider)) { await skip('SAME_PROVIDER', `то же семейство моделей (${e.provider}), что у автора`); continue; }
    if (switches > maxSwitches) { await skip('MAX_SWITCHES', 'превышено число переключений пула'); continue; }

    const writable = role.authority === 'workspace-write';
    const work = writable ? await ensureWorktree(space, taskId) : { path: t.repo };
    job.worktree = writable ? work.path : null;
    const prompt = await buildPrompt({ role, contract: t.contract, lens, skills, checks: await currentChecks(space, t), context: await knowledgeContext(space, taskId),
      materials, handoff, imagePath: role.output === 'image' && e.kind !== 'openai-compat' ? imagePath : null });
    const leaks = outboundFindings(prompt, space.settings.privacy).filter(f => f.action === 'block');
    if (leaks.length) { await skip('PRIVACY', `в пакете для отправки найдено: ${[...new Set(leaks.map(l => l.kind))].join(', ')}`); outcome = { ok: false, failure: 'PRIVACY' }; break; }

    // What the reviewer is about to see; its answer is bound to this, not to the state at the end.
    const seen = role.output === 'review' ? await taskState(space, taskId) : null;
    job.attempts.push(attempt);
    Object.assign(job, { status: 'RUNNING', executor: id, startedAt: job.startedAt ?? attempt.startedAt, lastEventAt: new Date().toISOString(), activity: 'начал работу' });
    await save(true);
    const handle = await startExecutor({ executor: e, prompt: role.output === 'image' && e.kind === 'openai-compat' ? `${role.prompt}\n\n${t.contract.goal}` : prompt,
      schema: SCHEMAS[role.output], cwd: work.path, writable, timeoutMs: role.timeoutMs ?? 1800000, fetchImpl, env,
      image: role.output === 'image' && e.kind === 'openai-compat', scratch: path.join(space.state, 'jobs', job.id),
      onEvent: ({ kind, toolRunning }) => { if (['spawn', 'response'].includes(kind)) attempt.launchedAt ??= new Date().toISOString(); job.lastEventAt = new Date().toISOString(); job.toolRunning = toolRunning; job.activity = toolRunning ? 'выполняет инструмент' : kind === 'result' ? 'отвечает' : 'думает'; void save(); } });

    // Silence watch: a routine question, answered by a person or, in autopilot, by its default.
    let question = null, stoppedFor = null;
    const watch = setInterval(async () => {
      try {
        if (!question && Date.now() - new Date(job.lastEventAt) > silenceMs) {
          const def = job.toolRunning ? 'wait' : 'switch';
          question = await ask(space, { kind: 'routine', jobId: job.id, taskId, defaultOption: def,
            text: `Исполнитель ${id} молчит больше ${Math.round(silenceMs / 1000)} с${job.toolRunning ? ' (идёт запущенный инструмент)' : ''}. Что делаем?`,
            options: [{ id: 'wait', label: 'подождать' }, { id: 'switch', label: 'передать следующему' }, { id: 'stop', label: 'остановить' }] });
          job.activity = `молчит; вопрос ${question.id}`; await save(true);
        }
        if (question) {
          await resolveDue(space, { thresholdMs: silenceMs });
          const q = await getQuestion(space, question.id);
          if (q.status === 'answered') {
            if (q.answer === 'wait') { job.lastEventAt = new Date().toISOString(); question = null; }
            else { stoppedFor = q.answer; handle.stop(q.answer === 'switch' ? 'SILENT' : 'STOPPED'); }
          }
        }
      } catch { /* the watch must never take the job down */ }
    }, tickMs);
    let result = await handle.done;
    if (result.resources) await recordResources(space, id, result.resources, { source: 'HTTP_HEADERS', executor: e });
    clearInterval(watch);
    if (question && (await getQuestion(space, question.id)).status === 'open') await answer(space, question.id, 'wait', { by: 'Borshkit' }).catch(() => {});
    if (stoppedFor === 'stop') result = { ok: false, failure: 'STOPPED', error: 'остановлено по твоему ответу' };
    if (result.ok && !(role.output === 'image' && e.kind === 'openai-compat')) {
      try { validateOutput(role, result.result, t.contract); } catch (err) { result = { ok: false, failure: 'INVALID', error: err.message }; }
    }
    Object.assign(attempt, { outcome: result.ok ? 'ok' : 'failed', failure: result.ok ? null : result.failure, reason: result.ok ? null : result.error, usage: result.usage ?? null, endedAt: new Date().toISOString() });
    if (result.unconfirmedResult) {
      const kept = path.join(space.tasks, taskId, 'unconfirmed', `${job.id}-${id}.json`);
      await atomicJSON(kept, result.unconfirmedResult);
      attempt.unconfirmedResult = path.relative(space.dir, kept).replaceAll('\\', '/');
    }
    await save(true);
    if (result.ok) { outcome = { ...result, executorId: id, executor: e, work, seen }; break; }
    // A writer that failed may have changed files already. Keep its work as its
    // own commit and count its model family among the authors, so the next
    // executor's commit and a later "independent" review cannot hide it.
    if (writable) {
      const partial = work.isolated !== false ? await commitWork(space, work.path, id, `Незавершённая работа ${id} (${FAILURE_WORDS[result.failure] ?? 'сбой'}): ${t.contract.goal}`.slice(0, 200)) : null;
      await addAuthor(space, taskId, { jobId: job.id, executor: id, provider: e.provider, role: roleId, commit: partial, partial: true, at: new Date().toISOString() });
      attempt.partialCommit = partial;
    }
    if (result.failure === 'QUOTA' && result.retryAfter && result.retryAfter <= waitSeconds && !retried.has(id)) {
      retried.add(id);
      job.status = 'WAITING_LIMIT'; job.activity = `ждёт лимит ${result.retryAfter} с`; await save(true);
      await sleep(result.retryAfter * 1000);
      i--; switches++; job.attempts.at(-1).retried = true; continue;
    }
    if (['QUOTA', 'SILENT'].includes(result.failure) && i < candidates.length - 1) {
      switches++;
      await journal(space, `${FAILURE_WORDS[result.failure]} у ${id} → работа ${job.id} передаётся следующему в пуле.`);
      continue;
    }
    outcome = result;
    break;
  }

  if (!outcome?.ok) {
    // Nobody could take the work — every candidate skipped, limited or silent: a person decides.
    if (!outcome || ['QUOTA', 'SILENT'].includes(outcome.failure)) {
      Object.assign(job, { status: 'WAITING_HUMAN', activity: 'ни один исполнитель не смог взять работу' }); await save(true);
      const reasons = job.attempts.map(a => `${a.executor}: ${FAILURE_WORDS[a.failure] ?? a.reason ?? a.outcome}${a.reason && a.failure !== 'QUOTA' ? ` (${a.reason})` : ''}`);
      const stop = await criticalStop(space, { job, reason: `Пул исчерпан для работы ${job.id}: ${reasons.join('; ')}.`,
        options: [{ id: 'wait', label: 'подождать и продолжить позже' }, { id: 'add', label: 'добавить исполнителя в пул (ослабление — подтверждаешь ты)' }, { id: 'stop', label: 'остановить работу' }],
        next: ['Дождаться сброса лимитов или добавить исполнителя', `Продолжить: borshkit работа продолжить ${job.id}`] });
      job.questionId = stop.question.id; await save(true);
      return job;
    }
    Object.assign(job, { status: outcome?.failure === 'STOPPED' ? 'STOPPED' : 'FAILED', activity: `${FAILURE_WORDS[outcome?.failure] ?? 'ошибка'}${outcome?.error ? `: ${String(outcome.error).slice(0, 200)}` : ''}` });
    await save(true);
    await journal(space, `Работа ${job.id} не выполнена: ${job.activity}.`);
    return job;
  }

  // Apply the answer by the kind of output.
  const { executorId, executor: e, work } = outcome, r = outcome.result;
  job.result = { kind: role.output };
  if (role.output === 'review') {
    const saved = await recordReview(space, taskId, { executor: executorId, provider: e.provider, result: r, seenState: outcome.seen, origin: 'job', jobId: job.id });
    job.result.saved = saved.saved.length;
    job.result.freshness = saved.freshness;
  } else if (role.output === 'findings') {
    await atomicJSON(path.join(space.tasks, taskId, 'findings', `${job.id}.json`), { executor: executorId, ...r });
    job.result.findings = r.findings.length;
  } else if (role.output === 'contract') {
    await atomicJSON(path.join(space.tasks, taskId, 'architect-proposal.json'), { executor: executorId, goals: JSON.parse(r.goalsJson), criteria: JSON.parse(r.criteriaJson), checks: JSON.parse(r.checksJson), notes: r.notes });
  } else if (role.output === 'settings') {
    const proposal = await proposeSettings(space, JSON.parse(r.patchJson), { from: executorId, reason: r.reason });
    job.result.proposal = proposal.id;
  } else {
    if (role.output === 'image' && e.kind === 'openai-compat') {
      const target = await contained(work.path, path.resolve(work.path, imagePath));
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, Buffer.from(r.imageBase64, 'base64'));
    }
    // Files an API executor returns are written by Borshkit, so the task's
    // scope is enforced before anything touches the disk: all or nothing.
    const outside = (r.writes ?? []).map(w => w.path).filter(p => !allowedWrite(space, t.contract, p));
    if (outside.length) {
      Object.assign(job, { status: 'FAILED', activity: `исполнитель хотел записать вне границ задачи: ${outside.slice(0, 5).join(', ')} — ничего не записано` });
      await save(true);
      await journal(space, `Работа ${job.id}: ${job.activity}.`);
      return job;
    }
    for (const w of r.writes ?? []) {
      const target = await contained(work.path, path.resolve(work.path, w.path));
      await atomicWrite(target, w.content, { mode: 0o644 });
    }
    if (role.output === 'image') {
      const target = path.resolve(work.path, imagePath);
      const bytes = await fs.readFile(target).catch(() => null);
      if (!bytes || !isImage(bytes, target)) {
        Object.assign(job, { status: 'FAILED', activity: `изображение не появилось по пути ${imagePath}` }); await save(true);
        return job;
      }
      await atomicJSON(path.join(space.tasks, taskId, 'images', `${path.basename(imagePath)}.json`), { path: imagePath, executor: executorId, provider: e.provider, model: e.model ?? null, prompt: t.contract.goal, createdAt: new Date().toISOString() });
    }
    const commit = work.isolated !== false ? await commitWork(space, work.path, executorId, `${role.title}: ${t.contract.goal}`.slice(0, 200)) : null;
    await addAuthor(space, taskId, { jobId: job.id, executor: executorId, provider: e.provider, role: roleId, commit, at: new Date().toISOString() });
    job.result.commit = commit;
    job.result.files = work.isolated !== false && commit ? await changedFiles(work.path, `${commit}~1`) : r.files;
  }
  Object.assign(job, { status: 'COMPLETED', activity: 'готово', endedAt: new Date().toISOString() });
  await save(true);
  await journal(space, `Работа ${job.id} выполнена исполнителем ${executorId}.`);
  await saveSpace(space, `Работа ${job.id}: ${roleId} для «${taskId}»`, { author: executorId, email: `${executorId}@borshkit` });
  return job;
}

/** Continue a stopped job by its exact ID with the handoff, optionally with another executor or pool. */
export async function resumeJob(space, jobId, { executor = null, pool = null, ...options } = {}) {
  const old = await readJob(space, jobId);
  assert(['WAITING_HUMAN', 'FAILED', 'STOPPED'].includes(old.status), `Работа ${jobId} в состоянии «${old.status}» — продолжать нечего`);
  if (old.questionId) {
    const q = await getQuestion(space, old.questionId);
    assert(q.status === 'answered' && q.answer !== 'stop', `Сначала ответь на вопрос ${q.id} (только в терминале)`);
  }
  const choice = executor || pool ? { executor, pool } : { executor: old.pool ? null : old.executor, pool: old.pool };
  return runJob(space, { ...options, taskId: old.taskId, role: old.role, ...choice, lens: old.lens, skills: old.skills ?? [], imagePath: old.imagePath ?? null, resumeOf: jobId });
}
