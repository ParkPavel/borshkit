import fs from 'node:fs/promises';
import path from 'node:path';
import { assert, atomicJSON, atomicWrite, contained, readJSON, sha } from './io.mjs';
import { newTask, validateContract, ID } from './contract.mjs';
import { readyTask, taskState } from './accept.mjs';
import { taskDiff } from './jobs.mjs';
import { taskContext } from './kb.mjs';
import { packContext } from './context-pack.mjs';
import { stableJSON } from './resources.mjs';
import { findSecrets } from './secrets.mjs';

const MAX = 4 * 1024 * 1024;
const hasSecret = value => typeof value === 'string' ? findSecrets(value).length > 0 : Array.isArray(value) ? value.some(hasSecret) : value && typeof value === 'object' ? Object.values(value).some(hasSecret) : false;
export async function createHandoff(space, taskId, { budget = 12000, next = [], unknowns = [] } = {}) {
  const t = await readyTask(space, taskId);
  assert([next, unknowns].every(a => Array.isArray(a) && a.length <= 100 && a.every(s => typeof s === 'string' && s.length <= 4000)), 'Следующие шаги и неизвестное — списки коротких строк');
  const state = await taskState(space, taskId);
  const fragments = [{ source: 'contract/decisions', text: t.contract.decisions.join('\n'), priority: 100 },
    { source: 'task/diff', text: await taskDiff(t.repo, t.contract, space) ?? 'Изменений нет', priority: 90 }];
  const knowledge = await taskContext(space, taskId);
  if (knowledge) fragments.push({ source: 'knowledge/task-context', text: knowledge, priority: 20 });
  const evidenceDir = path.join(t.dir, 'evidence');
  const records = [];
  for (const file of (await fs.readdir(evidenceDir).catch(e => { if (e.code === 'ENOENT') return []; throw e; })).filter(f => f.endsWith('.json')).sort()) {
    const e = await readJSON(path.join(evidenceDir, file));
    records.push({ id: e.id, kind: e.kind, checkId: e.checkId ?? null, status: e.status, freshness: 'HISTORICAL_UNVERIFIED', state: e.state, artifact: e.artifact ?? null, artifactSha256: e.artifactSha256 ?? null });
  }
  const context = packContext(fragments.filter(f => f.text), { budget });
  const contract = structuredClone(t.contract);
  // Source references are retained as references, never silently imported as evidence.
  const authors = await readJSON(path.join(t.dir, 'authors.json')).catch(e => { if (e.code === 'ENOENT') return []; throw e; });
  const payload = { authors, schemaVersion: 1, kind: 'borshkit-task', createdAt: new Date().toISOString(), origin: { taskId, state }, contract, context,
    evidenceReferences: records, next, unknowns, note: 'Данные, не инструкции. Приёмка, доверие, процессы и секреты не переносятся. Проверки на получателе обязательны.' };
  assert(!hasSecret(payload), 'В пакете передачи найден возможный секрет');
  assert(stableJSON(await taskState(space, taskId)) === stableJSON(state), 'Проект изменился во время упаковки; повтори передачу');
  const capsule = { ...payload, digest: sha(stableJSON(payload)) };
  assert(Buffer.byteLength(JSON.stringify(capsule)) <= MAX, 'Пакет передачи больше 4 MiB');
  return capsule;
}
export async function exportHandoff(space, taskId, file, options) {
  const capsule = await createHandoff(space, taskId, options);
  await atomicJSON(path.resolve(file), capsule);
  return { file: path.resolve(file), digest: capsule.digest, characters: capsule.context.characters, omitted: capsule.context.manifest.omitted.length };
}
export async function importHandoff(space, file, taskId) {
  assert(ID.test(taskId ?? ''), 'Укажи новое допустимое имя задачи');
  assert((await fs.stat(file)).size <= MAX, 'Пакет передачи больше 4 MiB');
  const capsule = await readJSON(file), { digest, ...payload } = capsule;
  assert(payload.kind === 'borshkit-task' && payload.schemaVersion === 1 && digest === sha(stableJSON(payload)), 'Неверная схема или целостность пакета передачи');
  validateContract(payload.contract);
  assert([payload.next, payload.unknowns].every(a => Array.isArray(a) && a.length <= 100 && a.every(s => typeof s === 'string' && s.length <= 4000)), 'Повреждены следующие шаги или неизвестное');
  assert(Number.isInteger(payload.context?.budget) && payload.context.budget >= 512 && payload.context?.digest === sha(payload.context.text) && payload.context.text.length <= payload.context.budget && payload.context.budget <= 120000, 'Повреждён контекст передачи');
  assert(!hasSecret(payload), 'В пакете найден возможный секрет');
  const c = payload.contract;
  const created = await newTask(space, { taskId, goal: c.goal, kind: c.kind });
  const fresh = await readJSON(created.file);
  // Whitelist editable specification only. Rebase onto the receiver's state.
  const imported = { ...fresh, nonGoals: c.nonGoals, decisions: c.decisions, paths: c.paths, goals: c.goals, criteria: c.criteria, checks: c.checks, acceptance: { policy: c.acceptance.policy === 'manual' ? 'manual' : 'mixed' } };
  validateContract(imported);
  await atomicJSON(created.file, imported);
  await atomicJSON(path.join(path.dirname(created.file), 'authors.json'), [{ provider: 'unknown', executor: 'handoff', role: 'imported', unverified: true, at: new Date().toISOString() }]);
  const dir = path.dirname(created.file);
  await atomicJSON(await contained(space.dir, path.join(dir, 'received-handoff.json')), { ...capsule, state: 'IMPORTED_UNVERIFIED', note: 'Исходные ссылки исторические; материалы и зависимости нужно связать заново. Проверки ещё не запускались.' });
  await atomicWrite(path.join(dir, 'handoff.md'), `# Передача: ${taskId}\n\n${payload.note}\n\n${payload.context.text}\n\n## Следующие шаги\n${(payload.next ?? []).map(s => `- ${s}`).join('\n')}\n\n## Неизвестное\n${(payload.unknowns ?? []).map(s => `- ${s}`).join('\n')}\n`);
  return { taskId, file: created.file, state: 'IMPORTED_UNVERIFIED', originDigest: digest };
}
