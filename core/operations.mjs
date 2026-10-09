import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { acquireLock, assert, atomicJSON, atomicWrite, exists, readJSON, git } from './io.mjs';
import { executorFingerprint, fresh } from './resources.mjs';
import { loadTask } from './contract.mjs';

const ledgerFile = space => path.join(space.state, 'execution-ledger.json');
const finite = v => typeof v === 'number' && Number.isFinite(v) && v >= 0;
export function validateExecutionPolicy(p) {
  assert(p && typeof p === 'object' && !Array.isArray(p), 'execution — правила запуска');
  for (const key of ['maxActiveRuns', 'maxActiveTasks']) assert(p[key] === undefined || Number.isInteger(p[key]) && p[key] >= 1 && p[key] <= 32, `${key} — 1..32`);
  for (const key of ['tokenBudget', 'usdBudget']) assert(p[key] == null || finite(p[key]), `${key} — положительное число или null`);
  assert(p.rates === undefined || p.rates && typeof p.rates === 'object' && !Array.isArray(p.rates), 'rates — цены исполнителей');
  for (const [id, r] of Object.entries(p.rates ?? {})) {
    assert(/^[a-z0-9][a-z0-9._-]{0,40}$/.test(id) && r && finite(r.inputUsdPerMillion) && finite(r.outputUsdPerMillion)
      && /^[a-f0-9]{64}$/.test(r.fingerprint) && typeof r.source === 'string' && r.source.trim()
      && Number.isFinite(Date.parse(r.at)) && Date.parse(r.expiresAt) > Date.parse(r.at), 'Цена требует модель/конфигурацию, источник, время, срок и тарифы input/output');
  }
  return p;
}
export function usageTokens(usage) {
  if (!usage) return null;
  const input = usage.input_tokens ?? usage.prompt_tokens, output = usage.output_tokens ?? usage.completion_tokens;
  return finite(input) && finite(output) ? { input, output, total: input + output } : null;
}
export function estimateCost(space, id, estimate, now = new Date()) {
  const rate = space.settings.execution?.rates?.[id], executor = space.settings.executors[id];
  if (!rate || !executor || rate.fingerprint !== executorFingerprint(executor) || !fresh(rate, now) || !estimate || !finite(estimate.inputTokens) || !finite(estimate.outputTokens)) return null;
  return (estimate.inputTokens * rate.inputUsdPerMillion + estimate.outputTokens * rate.outputUsdPerMillion) / 1000000;
}
export async function executionLedger(space) {
  return await exists(ledgerFile(space)) ? readJSON(ledgerFile(space)) : { schemaVersion: 1, entries: [] };
}
export async function executionStatus(space) {
  const ledger = await executionLedger(space), active = ledger.entries.filter(e => e.status === 'RUNNING');
  return { policy: space.settings.execution ?? {}, activeRuns: active.length, activeTasks: [...new Set(active.map(e => e.taskId))],
    tokens: ledger.entries.reduce((n, e) => n + (e.tokens ?? e.reservedTokens ?? 0), 0),
    usd: ledger.entries.reduce((n, e) => n + (e.usd ?? e.reservedUsd ?? 0), 0),
    unknown: ledger.entries.filter(e => e.status === 'UNKNOWN').map(e => e.id), entries: ledger.entries };
}
/** Limits use one ledger lock across all jobs and assessment runs. Unknown
 * billing holds the reservation and blocks a finite budget until reconciled. */
export async function reserveExecution(space, { taskId, executorId, executor = space.settings.executors[executorId], estimate = null, now = new Date() }) {
  const release = await acquireLock(path.join(space.state, 'execution.lock'), { waitMs: 30000 });
  try {
    const current = await readJSON(space.settingsFile), p = current.execution ?? {}, status = await executionStatus(space);
    const activeTasks = new Set([...status.activeTasks, taskId]);
    assert(!p.maxActiveRuns || status.activeRuns < p.maxActiveRuns, 'Достигнут предел параллельных вызовов; дождись завершения');
    assert(!p.maxActiveTasks || activeTasks.size <= p.maxActiveTasks, 'Достигнут предел одновременно выполняемых задач');
    const input = estimate?.inputTokens, output = estimate?.outputTokens;
    assert(estimate === null || Number.isInteger(input) && input >= 0 && Number.isInteger(output) && output >= 1, 'Оценка расхода требует целые inputTokens >= 0 и outputTokens >= 1');
    const reservedTokens = estimate ? input + output : null,
      reservedUsd = estimateCost({ settings: { ...current, executors: { [executorId]: executor } } }, executorId, estimate, now);
    if (p.tokenBudget != null || p.usdBudget != null) assert(!status.unknown.length, 'Есть неопределённый расход прошлой попытки: сверка расхода нужна до следующего бюджетного вызова');
    if (p.tokenBudget != null) assert(reservedTokens !== null && status.tokens + reservedTokens <= p.tokenBudget, 'Не хватает бюджета токенов или оценки расхода');
    if (p.usdBudget != null) assert(reservedUsd !== null && status.usd + reservedUsd <= p.usdBudget, 'Не хватает денежного бюджета или актуального тарифа выбранной модели');
    const entry = { id: crypto.randomUUID(), taskId, executorId, pid: process.pid, fingerprint: executorFingerprint(executor),
      status: 'RUNNING', at: now.toISOString(), reservedTokens, reservedUsd, rate: p.rates?.[executorId] ?? null, tokens: null, usd: null };
    const ledger = await executionLedger(space);
    ledger.entries.push(entry); await atomicJSON(ledgerFile(space), ledger);
    return entry;
  } finally { await release(); }
}
export async function settleExecution(space, id, { usage = null, launched = true, now = new Date() } = {}) {
  const release = await acquireLock(path.join(space.state, 'execution.lock'), { waitMs: 30000 });
  try {
    const ledger = await executionLedger(space), entry = ledger.entries.find(e => e.id === id);
    assert(entry?.status === 'RUNNING', 'Резерв уже закрыт или не найден');
    const tokens = usageTokens(usage), cost = usage?.costUsd ?? usage?.cost_usd;
    entry.tokens = launched ? tokens?.total ?? null : 0;
    entry.usd = !launched ? 0 : finite(cost) ? cost : tokens && entry.rate ?
      (tokens.input * entry.rate.inputUsdPerMillion + tokens.output * entry.rate.outputUsdPerMillion) / 1000000 : null;
    entry.status = !launched || entry.tokens !== null && entry.usd !== null ? 'SETTLED' : 'UNKNOWN';
    entry.endedAt = now.toISOString();
    await atomicJSON(ledgerFile(space), ledger); return entry;
  } finally { await release(); }
}
/** Reconciliation is a declared observation, not evidence of a provider bill. */
export async function reconcileExecution(space, id, { tokens, usd, source }, { confirmedByPerson = false } = {}) {
  assert(confirmedByPerson, 'Снятие неопределённого расхода подтверждает владелец');
  assert(finite(tokens) && finite(usd) && typeof source === 'string' && source.trim(), 'Сверка требует tokens, usd и источник');
  const release = await acquireLock(path.join(space.state, 'execution.lock'), { waitMs: 30000 });
  try {
    const ledger = await executionLedger(space), entry = ledger.entries.find(e => e.id === id);
    assert(entry?.status === 'UNKNOWN', 'Сверяется только неопределённый расход');
    Object.assign(entry, { tokens, usd, source, status: 'DECLARED', reconciledAt: new Date().toISOString() });
    await atomicJSON(ledgerFile(space), ledger); return entry;
  } finally { await release(); }
}
export async function recoverExecution(space) {
  const release = await acquireLock(path.join(space.state, 'execution.lock'), { waitMs: 30000 });
  try {
    const ledger = await executionLedger(space), recovered = [];
    for (const entry of ledger.entries.filter(e => e.status === 'RUNNING')) {
      let alive = true;
      try { process.kill(entry.pid, 0); } catch (e) { if (e.code !== 'EPERM') alive = false; }
      if (!alive) { entry.status = 'UNKNOWN'; entry.recoveredAt = new Date().toISOString(); recovered.push(entry.id); }
    }
    if (recovered.length) await atomicJSON(ledgerFile(space), ledger);
    return recovered;
  } finally { await release(); }
}
export async function taskDependencies(space, taskId) {
  const t = await loadTask(space, taskId), rows = [];
  const visit = async (id, ancestors) => {
    assert(!ancestors.includes(id), `Цикл зависимостей: ${[...ancestors,id].join(' → ')}`);
    const task=await loadTask(space,id);
    for(const next of task.contract.dependencies??[])await visit(next,[...ancestors,id]);
  };
  await visit(taskId,[]);
  for (const id of t.contract.dependencies ?? []) {
    const { converge } = await import('./accept.mjs');
    const verdict = await converge(space, id);
    const worktree = await readJSON(path.join(space.tasks, id, 'worktree.json')).catch(() => null);
    const target = await readJSON(path.join(space.tasks,taskId,'worktree.json')).catch(()=>null);
    const integrated = !worktree || Boolean(worktree.mergedAt) && await git(worktree.path,['rev-parse','HEAD'])
      .then(head=>git(target?.path??space.project,['merge-base','--is-ancestor',head.trim(),'HEAD']).then(()=>true,()=>false),()=>false);
    rows.push({ taskId:id,status:verdict.status,integrated,ready:verdict.status==='accepted' && integrated });
  }
  return rows;
}
export async function assertDependencies(space, taskId) {
  const blocked = (await taskDependencies(space, taskId)).filter(r => !r.ready);
  assert(!blocked.length, `Задача ждёт проверенные зависимости: ${blocked.map(r => `${r.taskId} (${r.status})`).join(', ')}`);
}
export async function consolidate(space, taskIds) {
  assert(Array.isArray(taskIds) && taskIds.length && new Set(taskIds).size === taskIds.length, 'Укажи разные задачи для консолидации');
  const { converge, taskState } = await import('./accept.mjs');
  const rows = [];
  for (const taskId of taskIds) {
    const verdict = await converge(space, taskId), state = await taskState(space, taskId);
    rows.push({ taskId, status: verdict.status, state, dependencies: await taskDependencies(space, taskId) });
  }
  const report = { schemaVersion: 1, at: new Date().toISOString(), status: rows.every(r => r.status === 'accepted' && r.dependencies.every(d => d.ready)) ? 'READY_FOR_INTEGRATION' : 'BLOCKED', rows,
    note: 'Консолидация не сливает ветки и не принимает задачи; итог действует только для зафиксированных состояний.' };
  const file = path.join(space.dir, 'coordination', `checkpoint-${crypto.randomUUID()}.json`);
  await atomicJSON(file, report);
  await atomicWrite(file.replace(/\.json$/, '.md'), `# Консолидация\n\n${report.status}\n\n${rows.map(r => `- ${r.taskId}: ${r.status} · зависимости: ${r.dependencies.map(d => `${d.taskId}/${d.status}`).join(', ') || 'нет'}`).join('\n')}\n\n${report.note}\n`, { mode: 0o644 });
  return { ...report, file };
}
