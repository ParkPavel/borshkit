import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { assert, atomicJSON, atomicWrite, exists, readJSON } from './io.mjs';
import { journal, saveSpace } from './space.mjs';

// Questions to a person (decision D21). A routine question has a reversible
// default; in autopilot it is answered with that default after the silence
// threshold. A critical one is never answered automatically.
const dir = space => path.join(space.dir, 'questions');
const file = (space, id) => path.join(dir(space), `${id}.json`);

export async function ask(space, { kind = 'routine', text, options, defaultOption = null, jobId = null, taskId = null, now = new Date() }) {
  assert(['routine', 'critical'].includes(kind), 'Вопрос бывает рутинным или критическим');
  assert(Array.isArray(options) && options.length >= 2 && options.every(o => o.id && o.label), 'Нужны хотя бы два варианта ответа');
  assert(kind === 'critical' || options.some(o => o.id === defaultOption), 'У рутинного вопроса должен быть ответ по умолчанию');
  const q = { id: `q-${now.getTime().toString(36)}-${crypto.randomBytes(3).toString('hex')}`, kind, text, options, defaultOption: kind === 'critical' ? null : defaultOption,
    jobId, taskId, status: 'open', createdAt: now.toISOString() };
  await atomicJSON(file(space, q.id), q);
  await journal(space, `${kind === 'critical' ? 'Критический вопрос' : 'Вопрос'} ${q.id}: ${text}`, now);
  return q;
}
export async function getQuestion(space, id) {
  assert(/^q-[a-z0-9]+-[a-f0-9]{6}$/.test(id ?? ''), 'Недопустимый номер вопроса');
  assert(await exists(file(space, id)), `Вопроса ${id} нет`);
  return readJSON(file(space, id));
}
export async function listQuestions(space, { open = false } = {}) {
  if (!(await exists(dir(space)))) return [];
  const all = await Promise.all((await fs.readdir(dir(space))).filter(f => f.endsWith('.json')).map(f => readJSON(path.join(dir(space), f))));
  return all.filter(q => !open || q.status === 'open').sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
export async function answer(space, id, optionId, { by = 'человек', confirmedByPerson = false, now = new Date() } = {}) {
  const q = await getQuestion(space, id);
  assert(q.status === 'open', `На вопрос ${id} уже ответили`);
  assert(q.options.some(o => o.id === optionId), `Вариант — один из: ${q.options.map(o => o.id).join(', ')}`);
  assert(q.kind !== 'critical' || (by === 'человек' && confirmedByPerson), 'Критический вопрос решает только человек в терминале');
  Object.assign(q, { status: 'answered', answer: optionId, answeredBy: by, answeredAt: now.toISOString() });
  await atomicJSON(file(space, id), q);
  const label = q.options.find(o => o.id === optionId).label;
  await journal(space, by === 'автопилот' ? `Автопилот ответил на ${id} по умолчанию: ${label}.` : `Ты ответил на ${id}: ${label}.`, now);
  return q;
}
/** In autopilot, answer every routine question older than the threshold with its default. */
export async function resolveDue(space, { now = new Date(), thresholdMs = space.settings.silenceSeconds * 1000 } = {}) {
  if (!space.settings.autopilot) return [];
  const done = [];
  for (const q of await listQuestions(space, { open: true })) {
    if (q.kind !== 'routine' || now - new Date(q.createdAt) < thresholdMs) continue;
    done.push(await answer(space, q.id, q.defaultOption, { by: 'автопилот', now }));
  }
  return done;
}

/**
 * Critical stop: save progress, explain in plain words, hand the context over,
 * and wait for a person. Work resumes by the exact job ID, never from "the last
 * conversation".
 */
export async function criticalStop(space, { job, reason, options, checkpoint = null, done = [], next = [] }) {
  const taskDir = path.join(space.tasks, job.taskId);
  const handoff = {
    schemaVersion: 1, jobId: job.id, taskId: job.taskId, role: job.role, stoppedAt: new Date().toISOString(), reason,
    executors: job.attempts.map(a => ({ executor: a.executor, outcome: a.outcome, failure: a.failure ?? null })),
    checkpoint, worktree: job.worktree ?? null, done, next,
  };
  await atomicJSON(path.join(taskDir, 'handoff.json'), handoff);
  await atomicWrite(path.join(taskDir, 'handoff.md'), [`# Передача: ${job.taskId}`, '', `**Роль:** ${job.role}`, `**Почему остановлено:** ${reason}`,
    checkpoint ? `**Точка возврата:** \`${checkpoint.slice(0, 12)}\`` : '', '', '## Что уже сделано', ...(done.length ? done.map(d => `- ${d}`) : ['- ничего']),
    '', '## Что дальше', ...(next.length ? next.map(d => `- ${d}`) : ['- решает человек']), ''].filter(l => l !== null).join('\n'), { mode: 0o644 });
  const q = await ask(space, { kind: 'critical', text: reason, options, jobId: job.id, taskId: job.taskId });
  await atomicWrite(path.join(taskDir, 'stop-report.md'), [`# Остановка: ${job.taskId}`, '', `**Что произошло:** ${reason}`, '',
    '**Почему остановлено:** это решение нельзя принять автоматически — оно необратимо, ослабляет защиту или касается слепой зоны.', '',
    '## Варианты', ...options.map(o => `- \`${o.id}\` — ${o.label}`), '',
    `Ответить: \`borshkit вопрос ответить ${q.id} <вариант>\` (только в терминале)`,
    `Продолжить работу потом: \`borshkit работа продолжить ${job.id}\``, ''].join('\n'), { mode: 0o644 });
  await saveSpace(space, `Остановка задачи «${job.taskId}»: нужен человек`);
  return { question: q, handoff };
}
