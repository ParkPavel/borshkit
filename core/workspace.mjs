import fs from 'node:fs/promises';
import path from 'node:path';
import { assert, exists, readJSON, sha } from './io.mjs';
import { stableJSON } from './resources.mjs';
import { listJobs, JOB_WORDS } from './dispatch.mjs';
import { listQuestions } from './questions.mjs';
import { executionStatus } from './operations.mjs';
import { checkProposal, applyProposal } from './config.mjs';
import { processAlive, sampleProcesses } from './runtime-control.mjs';

/** One snapshot for chat, terminal and editor. This never starts a daemon,
 * executor or MCP server, and never invents progress or OS resource readings. */
export async function workspaceSnapshot(space, { resources = false } = {}) {
  const jobs = await listJobs(space), tasks = [];
  for (const id of (await fs.readdir(space.tasks)).sort()) {
    const dir = path.join(space.tasks, id);
    if (!await exists(path.join(dir, 'contract.json'))) continue;
    const contract = await readJSON(path.join(dir, 'contract.json'));
    const report = await readJSON(path.join(dir, 'convergence.json')).catch(e => { if (e.code === 'ENOENT') return null; throw e; });
    tasks.push({ id, goal: contract.goal, criteria: contract.criteria.length, lastResult: report?.status ?? 'not_checked', checkedAt: report?.createdAt ?? null,
      actions: ['inspect', 'verify'], note: 'Последний записанный результат; актуальность проверяется при итоговой сверке' });
  }
  const rows = jobs.map(j => {
    const active = ['RUNNING', 'QUEUED', 'WAITING_LIMIT'].includes(j.status), ownerAlive = active ? processAlive(j.ownerPid) : null;
    const heartbeatFresh = Number.isFinite(Date.parse(j.heartbeatAt)) && Date.now() - Date.parse(j.heartbeatAt) < 15000;
    const state = active && ownerAlive === false ? 'INTERRUPTED' : active && (ownerAlive === null || !heartbeatFresh && j.status === 'RUNNING') ? 'UNKNOWN' : j.status;
    return { id: j.id, taskId: j.taskId, executor: j.executor, role: j.role, state, activity: j.activity,
      ownerPid: j.ownerPid ?? null, processId: active && ownerAlive && heartbeatFresh ? j.processId ?? null : null,
      lastEventAt: j.lastEventAt, heartbeatAt: j.heartbeatAt ?? null, canStop: active && ownerAlive === true && Boolean(j.runToken), progress: null };
  });
  const budget = await executionStatus(space);
  return { schemaVersion: 1, project: space.project, mode: 'current-host', tasks, jobs: rows,
    questions: await listQuestions(space, { open: true }),
    settings: { privacy: space.settings.privacy, executors: Object.keys(space.settings.executors ?? {}), execution: space.settings.execution ?? {},
      note: 'Текущий Claude/Codex не требует добавления отдельного исполнителя; каталог дополнительных исполнителей не ограничен количеством' },
    accounting: { tokens: budget.tokens, usd: budget.usd, unknownBilling: budget.unknown, note: 'Это учёт провайдера, не резерв RAM' },
    resources: resources ? await sampleProcesses(rows.map(j => j.processId)) : { state: 'NOT_SAMPLED', processes: [] },
    observedAt: new Date().toISOString(), externalProcesses: 'Процессы Claude/Codex и их MCP управляются основной средой; Borshkit не завершает их по имени',
    actions: ['new-task', 'tasks', 'jobs', 'settings', 'resources', 'refresh'] };
}
export function formatWorkspace(view) {
  const lines = [`Borshkit · ${view.project}`, 'Работа в текущем Claude/Codex · дополнительные агенты запускаются отдельно', '', 'Задачи'];
  for (const t of view.tasks) lines.push(`  ${t.id} — ${t.goal} · ${t.checkedAt ? `последняя сверка ${t.lastResult}, ${t.checkedAt}` : 'ещё не проверена'}`);
  if (!view.tasks.length) lines.push('  Пока пусто. Опиши, что хочешь сделать.');
  lines.push('', 'Работы');
  for (const j of view.jobs.slice(0, 20)) lines.push(`  ${j.id}: ${JOB_WORDS[j.state] ?? { INTERRUPTED: 'владелец завершился', UNKNOWN: 'состояние процесса неизвестно' }[j.state] ?? j.state} · ${j.activity ?? ''}${j.canStop ? ' · можно остановить' : ''}`);
  if (!view.jobs.length) lines.push('  Дополнительные процессы не запускались.');
  if (view.resources.state === 'OBSERVED') for (const p of view.resources.processes) lines.push(`  PID ${p.pid}: RAM ${(p.rssBytes / 1048576).toFixed(1)} MiB · время CPU ${p.cpuSeconds ?? 'неизвестно'} с`);
  else lines.push(`Ресурсы: ${view.resources.state === 'NOT_SAMPLED' ? 'измеряются по запросу' : view.resources.state === 'EMPTY' ? 'нет зарегистрированных активных процессов' : 'не удалось измерить'}`);
  if (view.questions.length) lines.push('', `Ждут ответа: ${view.questions.length}`, ...view.questions.map(q => `  ${q.text}`));
  lines.push('', `Настройки: ${{ moderate: 'умеренная приватность', strict: 'строгая приватность', experiment: 'экспериментальный режим' }[view.settings.privacy] ?? view.settings.privacy} · дополнительных исполнителей ${view.settings.executors.length}`,
    `Учтено и зарезервировано у провайдера: ${view.accounting.tokens} токенов, $${view.accounting.usd} · неизвестных счетов ${view.accounting.unknownBilling.length}`);
  return lines.join('\n');
}
export async function settingsReview(space, id) {
  const proposal = await checkProposal(space, id);
  return { id: proposal.id, digest: sha(stableJSON(proposal)), changes: proposal.changes, implications: proposal.weakens,
    question: 'Применить эти изменения?', actions: ['apply', 'cancel'] };
}
/** The host owns user interaction and permissions. This is an explicitly
 * declared approval, not a cryptographic proof of a human clicking a button.
 * Digest binds the displayed proposal; stale/changed proposals are refused. */
export async function applyHostSettings(space, id, { host, digest, decision } = {}) {
  assert(['claude', 'codex', 'vscode'].includes(host), 'Укажи среду подтверждения: claude, codex или vscode');
  assert(decision === 'apply', 'Пользователь должен выбрать «Применить эти изменения»');
  assert(/^[a-f0-9]{64}$/.test(digest ?? ''), 'Сначала покажи пользователю точное предложение настроек');
  return applyProposal(space, id, { confirmedByPerson: true, approvalDigest: digest, confirmationSource: `host:${host}` });
}

export function formatSettingsReview(review) {
  const labels = { privacy: 'Приватность', autopilot: 'Автопилот', silenceSeconds: 'Ожидание ответа, секунд', trustedAgent: 'Помощник настройки',
    'execution.maxActiveRuns': 'Одновременные дополнительные вызовы', 'execution.maxActiveTasks': 'Одновременные задачи',
    'execution.tokenBudget': 'Бюджет токенов', 'execution.usdBudget': 'Бюджет, USD' };
  const value = v => v === null ? 'не задано' : v === true ? 'включено' : v === false ? 'выключено' : typeof v === 'object' ? JSON.stringify(v) : ({ moderate: 'умеренная', strict: 'строгая', experiment: 'экспериментальная' }[v] ?? String(v));
  return review.changes.map(c => `${labels[c.key] ?? c.key}: ${value(c.from)} → ${value(c.to)}`).join('\n');
}
