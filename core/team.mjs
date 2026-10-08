import fs from 'node:fs/promises';
import path from 'node:path';
import { ROOT, assert, atomicJSON, atomicWrite, contained, readJSON, sha } from './io.mjs';
import { ID } from './contract.mjs';
import { capable, privacyAllows, readProbes } from './executors.mjs';
import { executorFingerprint, fresh, readResources, resourcesFor, stableJSON } from './resources.mjs';
import { listRoles, loadRole, roleFingerprint } from './roles.mjs';
import { authorProviders, readyTask } from './accept.mjs';
import { proposeSettings } from './config.mjs';

// A qualified candidate is tied to an explicit model/configuration and a
// local assessment artifact. Imported assessments are declarations, not live
// benchmarks and never task acceptance evidence.
export async function qualification(space, id, roleId, now = new Date(), roleDigest = null) {
  const e = space.settings.executors[id], q = e.qualifications?.[roleId];
  if (!q) return { status: 'UNKNOWN', reason: 'нет записи оценки для роли' };
  if (!e.model || q.fingerprint !== executorFingerprint(e) || !fresh(q, now)) return { status: 'STALE', reason: 'оценка устарела или модель не закреплена' };
  if (q.roleDigest !== (roleDigest ?? await roleFingerprint(await loadRole(roleId)))) return { status: 'STALE', reason: 'инструкции, навыки или схема роли изменились' };
  try {
    const file = await contained(space.project, path.resolve(space.project, q.evidence));
    if (sha(await fs.readFile(file)) !== q.evidenceSha) return { status: 'STALE', reason: 'материал оценки изменился' };
  } catch { return { status: 'UNKNOWN', reason: 'материал оценки недоступен' }; }
  return { status: q.result, reason: q.result === 'PASS' ? 'по заявленной оценке роли' : 'оценка роли не пройдена', evidence: q.evidence };
}
export async function teamCatalog(space, { now = new Date() } = {}) {
  const [roles, probes, observations] = await Promise.all([listRoles(), readProbes(space), readResources(space)]);
  const executors = [];
  const roleDigests = Object.fromEntries(await Promise.all(roles.map(async r => [r.id, await roleFingerprint(r)])));
  for (const [id, e] of Object.entries(space.settings.executors ?? {})) {
    const p = probes[id];
    const currentProbe = p?.fingerprint === executorFingerprint(e) && fresh(p, now);
    const probe = currentProbe ? p.ok ? 'PASS' : 'FAIL' : p ? 'STALE' : 'UNKNOWN';
    const qualifications = {};
    for (const role of roles) qualifications[role.id] = await qualification(space, id, role.id, now, roleDigests[role.id]);
    executors.push({ id, provider: e.provider, service: e.service ?? null, kind: e.kind, model: e.model ?? null, fingerprint: executorFingerprint(e),
      assignments: Object.entries(space.settings.pools ?? {}).filter(([, p]) => p.members.includes(id)).map(([pool, p]) => ({ pool, role: p.role ?? null })),
      dataPolicy: e.dataPolicy, probe, qualifications,
      resources: resourcesFor(space, id, observations, { endpoint: e.kind === 'openai-compat' ? 'chat/completions' : null, now }),
      imageResources: resourcesFor(space, id, observations, { endpoint: e.kind === 'openai-compat' ? 'images/generations' : null, now }) });
  }
  const candidates = await readJSON(path.join(ROOT, 'library/provider-candidates.json'));
  const services = candidates.entries.map(c => ({ ...c, executors: executors.filter(e => e.service === c.id).map(e => e.id), status: executors.some(e => e.service === c.id && e.probe === 'PASS') ? 'CONNECTION_CHECKED' : executors.some(e => e.service === c.id) ? 'NEEDS_CHECK' : 'NOT_CONFIGURED' }));
  return { at: now.toISOString(), roles: roles.map(({ prompt, ...r }) => ({ ...r, digest: roleDigests[r.id] })), executors, services, notice: candidates.notice };
}
export async function planTeam(space, { taskId, roles = ['architect', 'implementer', 'reviewer'], now = new Date() } = {}) {
  assert(Array.isArray(roles) && roles.length > 0 && new Set(roles).size === roles.length, 'Укажи непустой список разных ролей');
  const task = await readyTask(space, taskId, { draft: true });
  const authors = await authorProviders(space, taskId);
  const catalog = await teamCatalog(space, { now });
  const specs = await Promise.all(roles.map(loadRole));
  const rows = specs.map(role => {
    const candidates = catalog.executors.map(entry => {
      const e = space.settings.executors[entry.id];
      const requirements = capable(role, e);
      const privacy = privacyAllows(space.settings.privacy, e);
      const assessment = entry.qualifications[role.id];
      const resources = role.output === 'image' ? entry.imageResources : entry.resources;
      const reasons = [...requirements.missing, ...(!privacy.ok ? [privacy.reason] : []),
        ...(entry.probe !== 'PASS' ? ['нужна актуальная проверка подключения'] : []),
        ...(assessment.status !== 'PASS' ? [assessment.reason] : []),
        ...(role.crossProvider && authors.includes(e.provider) ? ['семейство уже участвовало в авторстве'] : []),
        ...resources.metrics.filter(m => m.remaining === 0).map(m => `исчерпан ресурс ${m.name} (${m.window})`)];
      return { executor: entry.id, provider: e.provider, model: e.model ?? null, eligible: !reasons.length, reasons, resources,
        warnings: resources.status === 'CURRENT' ? [] : ['остаток ресурсов неизвестен или устарел'], assessment };
    });
    // No vendor ranking: prefer current observations, then preserve stable ID
    // order. Cost optimization needs comparable measured data, not guesses.
    candidates.sort((a, b) => Number(b.resources.status === 'CURRENT') - Number(a.resources.status === 'CURRENT') || a.executor.localeCompare(b.executor));
    return { role: role.id, title: role.title, writable: role.authority === 'workspace-write', independent: role.crossProvider, candidates, members: [] };
  });
  const writers = rows.filter(r => r.writable);
  const reserved = new Set();
  for (const row of rows.filter(r => r.independent)) {
    const reviewer = row.candidates.find(c => c.eligible && writers.every(w => w.candidates.some(x => x.eligible && x.provider !== c.provider && !reserved.has(x.provider))));
    if (reviewer) reserved.add(reviewer.provider);
    else row.blocked = 'Нет независимого ревьюера при таком составе авторов и доступных ресурсов';
  }
  for (const row of rows) {
    for (const c of row.candidates) if (c.eligible && row.writable && reserved.has(c.provider)) {
      c.eligible = false; c.reasons.push('семейство зарезервировано для независимого ревью');
    }
  }
  const writerFamilies = new Set(writers.flatMap(w => w.candidates.filter(c => c.eligible).map(c => c.provider)));
  for (const row of rows) {
    row.members = row.blocked ? [] : row.candidates.filter(c => c.eligible && (!row.independent || !writerFamilies.has(c.provider))).map(c => c.executor);
    if (!row.members.length) row.blocked ??= 'Нет исполнителя, прошедшего требования роли';
  }
  return { schemaVersion: 1, taskId, goal: task.contract.goal, at: now.toISOString(), status: rows.some(r => r.blocked) ? 'BLOCKED' : 'PROPOSED',
    reservedReviewerProviders: [...reserved], rows,
    note: 'Это предложение распределения. Настройки не применены, работы не запущены.' };
}
const optionalDigest = async file => fs.readFile(file).then(sha, e => { if (e.code === 'ENOENT') return null; throw e; });
export async function proposeTeam(space, options, { from = 'человек' } = {}) {
  // Capture dependencies before analysis. If one changes during the read,
  // refuse instead of binding a mixed snapshot to a proposal.
  const observed = ['settings/workspace.json', 'settings/probes.json', '.state/resources.json', `tasks/${options.taskId}/contract.json`, `tasks/${options.taskId}/authors.json`];
  assert(ID.test(options.taskId ?? ''), 'Недопустимое имя задачи');
  const before = await Promise.all(observed.map(p => optionalDigest(path.join(space.dir, p))));
  const plan = await planTeam(space, options);
  assert(plan.status === 'PROPOSED', 'Распределение заблокировано. Посмотри причины: borshkit команда план <задача>');
  const pools = {};
  for (const row of plan.rows) pools[`team-${row.role}`] = { members: row.members, maxSwitches: 3, waitSeconds: 0, qualificationRequired: true, role: row.role };
  const inputs = observed.map((p, i) => ({ root: 'space', path: p, digest: before[i] }));
  for (const row of plan.rows) for (const id of row.members) {
    const q = space.settings.executors[id].qualifications[row.role];
    inputs.push({ root: 'project', path: q.evidence, digest: q.evidenceSha });
  }
  // Instructions live in the package, outside project/space. Bind their
  // digest through a separate dependency checked by the settings layer.
  const roleInputs = plan.rows.map(r => ({ role: r.role, digest: space.settings.executors[r.members[0]].qualifications[r.role].roleDigest }));
  const after = await Promise.all(observed.map(p => optionalDigest(path.join(space.dir, p))));
  assert(stableJSON(before) === stableJSON(after), 'Данные изменились во время планирования — пересчитай распределение');
  const expirations = plan.rows.flatMap(r => r.members.flatMap(id => {
    const e = space.settings.executors[id], c = plan.rows.find(x => x.role === r.role).candidates.find(x => x.executor === id);
    return [e.qualifications[r.role].expiresAt, ...c.resources.metrics.filter(m => m.freshness === 'CURRENT').flatMap(m => [m.expiresAt, ...(m.resetAt ? [m.resetAt] : [])])];
  }));
  const probes = await readProbes(space);
  for (const row of plan.rows) for (const id of row.members) expirations.push(probes[id].expiresAt);
  const expiresAt = new Date(Math.min(...expirations.map(Date.parse))).toISOString();
  const proposal = await proposeSettings(space, { pools }, { from, reason: `распределение ролей для задачи ${options.taskId}`, inputs, roleInputs, expiresAt });
  return { plan, proposal };
}
export function formatTeam(catalog) {
  const words = { PASS: 'проверено', FAIL: 'проверка не пройдена', UNKNOWN: 'не проверено', STALE: 'данные устарели' };
  const executors = catalog.executors.length ? catalog.executors.map(e => `${e.id} · ${e.kind} · ${e.provider} · модель: ${e.model ?? 'не закреплена'}\n  подключение: ${words[e.probe]}\n  ресурсы: ${formatResources(e.resources)}\n  оценки ролей: ${Object.entries(e.qualifications).filter(([, q]) => q.status === 'PASS').map(([r]) => r).join(', ') || 'нет актуальных положительных оценок'}\n  назначено в пулы: ${e.assignments.map(a => `${a.pool}${a.role ? ` (${a.role})` : ''}`).join(', ') || 'нет'}`).join('\n\n') : 'Исполнители не подключены. Настройки не изменены, работы не запущены.';
  const services = (catalog.services ?? []).map(s => `${s.name}: ${s.status === 'CONNECTION_CHECKED' ? 'подключение проверено' : s.status === 'NEEDS_CHECK' ? 'нужна проверка' : 'не подключён'}; ${s.freeAccess === 'OWN_HARDWARE' ? 'нужны свои вычислительные ресурсы' : 'бесплатность и лимиты: проверить аккаунт'}\n  ${s.url}`).join('\n');
  return `${executors}\n\nКаталог кандидатов API\n${catalog.notice ?? ''}\n${services}`;
}
export function formatResources(resources) {
  return resources.metrics.length ? resources.metrics.map(m => `${m.name}/${m.window}: ${m.remaining ?? 'неизвестно'}${m.limit == null ? '' : ` из ${m.limit}`} (${m.source}, ${m.freshness}${m.resetAt ? `, сброс ${m.resetAt}` : ''})`).join('; ') : 'остаток неизвестен';
}
export function formatPlan(plan) {
  return [plan.note, ...plan.rows.map(r => `${r.title}: ${r.members.join(' → ') || r.blocked}\n${r.candidates.map(c => `  ${c.executor} (${c.model ?? 'модель не закреплена'}, ${c.provider}): ${c.eligible ? 'кандидат' : c.reasons.join('; ')}; ${formatResources(c.resources)}${c.warnings.length ? `; ${c.warnings.join('; ')}` : ''}`).join('\n')}`)].join('\n\n');
}
export async function writeTeamFiles(space, options = {}) {
  const catalog = await teamCatalog(space, options);
  await atomicJSON(path.join(space.state, 'team.json'), catalog);
  await atomicWrite(path.join(space.dir, 'TEAM.md'), `# Команда и ресурсы\n\nОбновлено: ${catalog.at}\n\n\`\`\`\n${formatTeam(catalog)}\n\`\`\`\n\nРаспределение: borshkit команда план <задача>. Предложения, применение настроек и запуск работ — разные действия.\n`, { mode: 0o644 });
  return catalog;
}
