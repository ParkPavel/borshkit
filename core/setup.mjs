import fs from 'node:fs/promises';
import path from 'node:path';
import { acquireLock, assert, atomicJSON, atomicWrite, exists, readJSON, sha } from './io.mjs';
import { assertSettingsIntact, checkProposal, proposeSettings } from './config.mjs';
import { capable, PRESETS, privacyAllows, validateExecutor } from './executors.mjs';
import { executorFingerprint, stableJSON } from './resources.mjs';
import { listRoles, loadRole, roleFingerprint } from './roles.mjs';
import { teamCatalog } from './team.mjs';
import { listJobs } from './dispatch.mjs';
import { PRIVACY_WORDS } from './privacy.mjs';
import { validateSettings } from './space.mjs';

export const SETUP_HOSTS = {
  'codex-app': 'Приложение Codex', 'codex-cli': 'Терминал Codex',
  'claude-app': 'Приложение Claude', 'claude-cli': 'Терминал Claude Code',
  'vscode': 'VS Code и его расширения', 'gemini-cli': 'Терминал Gemini',
  'other': 'Другая среда',
};
export const DEFAULT_SETUP_ROLES = ['architect', 'implementer', 'tester', 'reviewer'];
const draftPath = space => path.join(space.dir, 'settings', 'setup.json');
const linkPath = space => path.join(space.dir, 'settings', 'setup-proposal.json');
const settingsHash = space => sha(stableJSON(space.settings));
const emptyDraft = space => ({ schemaVersion: 1, baseDigest: settingsHash(space), host: null, privacy: null, executors: {}, roles: [] });

async function validateDraft(draft) {
  assert(draft && draft.schemaVersion === 1 && /^[a-f0-9]{64}$/.test(draft.baseDigest), 'Неизвестный формат мастера');
  assert(Object.keys(draft).every(k => ['schemaVersion', 'baseDigest', 'host', 'privacy', 'executors', 'roles'].includes(k)), 'В мастере есть неизвестные поля');
  assert(draft.host === null || Object.hasOwn(SETUP_HOSTS, draft.host), 'Выбери среду из списка мастера');
  assert(draft.privacy === null || ['strict', 'moderate'].includes(draft.privacy), 'Мастер предлагает строгий или умеренный режим');
  assert(draft.executors && typeof draft.executors === 'object' && !Array.isArray(draft.executors), 'Исполнители мастера — объект');
  for (const [id, e] of Object.entries(draft.executors)) {
    validateExecutor(id, e);
    assert(e.model, `Для ${id} закрепи модель через --модель`);
  }
  const roles = (await listRoles()).map(r => r.id);
  assert(Array.isArray(draft.roles) && new Set(draft.roles).size === draft.roles.length && draft.roles.every(r => roles.includes(r)), 'Нужны разные существующие роли');
  // Validate secret-bearing values through the same settings gate; never
  // store an API key, even in a draft which will not yet be applied.
  validateSettings({ schemaVersion: 1, product: 'borshkit', folder: 'borshkit', privacy: draft.privacy ?? 'strict', autopilot: false,
    silenceSeconds: 60, trustedAgent: null, executors: draft.executors, pools: {}, acceptance: { modelTrust: {} } });
  return draft;
}

export async function readSetup(space) {
  return await exists(draftPath(space)) ? validateDraft(await readJSON(draftPath(space))) : emptyDraft(space);
}

/** Draft editing never applies settings, probes executors or launches jobs. */
export async function updateSetup(space, patch, { reset = false, replaceExecutors = false } = {}) {
  const release = await acquireLock(path.join(space.state, 'setup.lock'), { waitMs: 30000 });
  try {
    await assertSettingsIntact(space);
    assert(settingsHash(space) === sha(stableJSON(await readJSON(space.settingsFile))), 'Настройки изменились — открой пространство заново');
    const draft = reset ? emptyDraft(space) : await readSetup(space);
    assert(draft.baseDigest === settingsHash(space), 'Настройки изменились после начала мастера. Начни новый подбор: borshkit мастер заново');
    const next = await validateDraft({ ...draft, ...patch, executors: replaceExecutors ? patch.executors : { ...draft.executors, ...patch.executors } });
    await atomicJSON(draftPath(space), next);
    return next;
  } finally { await release(); }
}

/** Inspect known command files on PATH. No shell, --version or API request. */
export async function discoverSetupCommands({ env = process.env, platform = process.platform } = {}) {
  const value = key => Object.entries(env).find(([k]) => k.toUpperCase() === key)?.[1] ?? '';
  const win = platform === 'win32', separator = win ? ';' : ':';
  const dirs = value('PATH').split(separator).filter(d => d && path.isAbsolute(d));
  const extensions = win ? [...new Set(['', ...value('PATHEXT').split(';'), '.EXE', '.CMD', '.BAT'])] : [''];
  const result = [];
  for (const [id, e] of Object.entries(PRESETS)) {
    let found = false;
    for (const dir of dirs) {
      for (const extension of extensions) {
        const file = path.join(dir, e.command + extension.toLowerCase());
        try {
          const stat = await fs.stat(file);
          if (!stat.isFile()) continue;
          await fs.access(file, win ? fs.constants.F_OK : fs.constants.X_OK);
          found = true; break;
        } catch { /* absence or inaccessible directory is not availability */ }
      }
      if (found) break;
    }
    result.push({ id, command: e.command, status: found ? 'FOUND_NOT_CHECKED' : 'NOT_FOUND' });
  }
  return result;
}

export async function proposeSetup(space) {
  const release = await acquireLock(path.join(space.state, 'setup.lock'), { waitMs: 30000 });
  try {
    const draft = await readSetup(space);
    assert(draft.host && draft.privacy && Object.keys(draft.executors).length && draft.roles.length,
      'Заверши выбор среды, безопасности, моделей и ролей: borshkit мастер');
    assert(draft.baseDigest === settingsHash(space), 'Настройки изменились — начни новый подбор: borshkit мастер заново');
    const report = await setupReport(space);
    assert(report.compatibility.every(r => r.candidates.length), 'Выбранные модели не покрывают требования ролей или режим приватности. Посмотри причины: borshkit мастер');
    if (report.settingsMatch) return null;
    const digest = sha(await fs.readFile(draftPath(space)));
    const inputs = [{ root: 'space', path: 'settings/setup.json', digest }];
    const roleInputs = await Promise.all(draft.roles.map(async role => ({ role, digest: await roleFingerprint(await loadRole(role)) })));
    // This registers candidates only. Routing requires current role assessments,
    // connection probes and the task's author history through proposeTeam.
    const proposal = await proposeSettings(space, { privacy: draft.privacy, executors: draft.executors }, {
      reason: 'мастер: безопасность и кандидаты команды; назначения и запуск отдельно', inputs, roleInputs,
      expiresAt: new Date(Date.now() + 24 * 3600000).toISOString(),
    });
    await atomicJSON(linkPath(space), { id: proposal.id, draftDigest: digest });
    return proposal;
  } finally { await release(); }
}

export async function setupReport(space, options = {}) {
  const draft = await readSetup(space), catalog = await teamCatalog(space);
  const compatibility = [];
  for (const roleId of draft.roles) {
    const role = await loadRole(roleId);
    const entries = Object.entries(draft.executors).map(([id, e]) => {
      const capability = capable(role, e), privacy = privacyAllows(draft.privacy ?? space.settings.privacy, e);
      return { id, provider: e.provider, reasons: [...capability.missing, ...(!privacy.ok ? [privacy.reason] : [])] };
    });
    compatibility.push({ role: roleId, title: role.title, independent: Boolean(role.crossProvider), writable: role.authority === 'workspace-write',
      candidates: entries.filter(e => !e.reasons.length).map(e => e.id), refused: entries.filter(e => e.reasons.length) });
  }
  // Explain the structural need for a separate family; this is not a complete
  // routing plan or a substitute for the task-specific author check.
  const writers = compatibility.filter(r => r.writable);
  const reviewPossible = compatibility.filter(r => r.independent).every(r => r.candidates.some(id =>
    writers.every(w => w.candidates.some(writer => draft.executors[writer].provider !== draft.executors[id].provider))));
  const complete = Boolean(draft.host && draft.privacy && Object.keys(draft.executors).length && draft.roles.length);
  const settingsMatch = complete && draft.privacy === space.settings.privacy && Object.entries(draft.executors).every(([id, e]) =>
    space.settings.executors[id] && executorFingerprint(e) === executorFingerprint(space.settings.executors[id]));
  let proposal = null;
  if (await exists(linkPath(space))) {
    const link = await readJSON(linkPath(space));
    assert(/^p\d{3,}$/.test(link.id ?? ''), 'Недопустимый номер предложения мастера');
    const saved = await readJSON(path.join(space.dir, 'settings', 'proposals', `${link.id}.json`));
    const currentDigest = await exists(draftPath(space)) ? sha(await fs.readFile(draftPath(space))) : null;
    if (currentDigest !== link.draftDigest) proposal = { id: link.id, status: 'STALE', reason: 'выбор в мастере изменился' };
    else if (saved.status === 'applied') proposal = { id: link.id, status: 'APPLIED', appliedAt: saved.appliedAt };
    else {
      try { await checkProposal(space, link.id); proposal = { id: link.id, status: 'PROPOSED', weakens: saved.weakens }; }
      catch (e) { proposal = { id: link.id, status: 'STALE', reason: e.message }; }
    }
  }
  const next = [];
  for (const [id, e] of Object.entries(draft.executors)) {
    const active = catalog.executors.find(c => c.id === id && c.fingerprint === executorFingerprint(e));
    if (!active) { next.push(`${id}: кандидат ещё не применён`); continue; }
    if (active.probe !== 'PASS') next.push(`${id}: borshkit исполнитель проверить ${id}`);
    for (const r of compatibility.filter(r => r.candidates.includes(id))) {
      if (active.qualifications[r.role].status !== 'PASS') next.push(`${id}/${r.role}: нужна актуальная оценка роли`);
    }
    if (active.resources.status !== 'CURRENT') next.push(`${id}: остаток ресурсов неизвестен или устарел`);
  }
  const launches = (await listJobs(space)).flatMap(job => (job.attempts ?? []).filter(a => a.launchedAt
    && draft.executors[a.executor] && executorFingerprint(draft.executors[a.executor]) === a.fingerprint)
    .map(a => ({ jobId: job.id, taskId: job.taskId, role: job.role, executor: a.executor, model: a.model, launchedAt: a.launchedAt })));
  return { schemaVersion: 1, draft, selectionComplete: complete, settingsMatch, staleBase: draft.baseDigest !== settingsHash(space),
    host: draft.host ? { id: draft.host, title: SETUP_HOSTS[draft.host], remoteApproval: 'NOT_IMPLEMENTED' } : null,
    detected: await discoverSetupCommands(options), compatibility, independentReviewPossible: reviewPossible,
    proposal, actual: { privacy: space.settings.privacy, autopilot: space.settings.autopilot, executors: catalog.executors }, next, launches,
    note: 'Мастер сохраняет выбор и предлагает настройки. Проверка подключения, применение, распределение и запуск — отдельные действия.' };
}

export function formatSetup(report) {
  const { draft, proposal } = report;
  const statuses = { PROPOSED: 'предложено', APPLIED: 'применено', STALE: 'устарело' };
  return ['Мастер настройки команды', '',
    `1. Среда: ${report.host?.title ?? 'не выбрана'} — borshkit мастер вход <среда>`,
    `   ${Object.keys(SETUP_HOSTS).join(', ')}`,
    '   Голос обрабатывает выбранная среда. Удалённое подтверждение защиты пока не реализовано.',
    `2. Безопасность: ${draft.privacy ? PRIVACY_WORDS[draft.privacy] : 'не выбрана; рекомендуется строгий режим'} — borshkit мастер безопасность строгий|умеренный`,
    `   Сейчас: ${PRIVACY_WORDS[report.actual.privacy]}; автопилот ${report.actual.autopilot ? 'включён' : 'выключен'}.`,
    '3. Модели — borshkit мастер среда codex --модель <id> --данные no-train',
    ...report.detected.map(d => `   ${d.command}: ${d.status === 'FOUND_NOT_CHECKED' ? 'файл программы найден; подключение и вход не проверены' : 'не найден в PATH этой машины'}`),
    ...Object.entries(draft.executors).map(([id, e]) => `   Выбрано: ${id} → ${e.kind} → ${e.provider}/${e.model}; данные: ${e.dataPolicy}`),
    '   Для API: borshkit мастер среда <имя> --файл <манифест.json>. Ключи — только в переменных окружения.',
    `4. Обязанности: ${draft.roles.join(', ') || 'не выбраны'} — borshkit мастер роли ${DEFAULT_SETUP_ROLES.join(',')}`,
    ...report.compatibility.map(r => `   ${r.title}: ${r.candidates.join(', ') || 'нет совместимого кандидата'}${r.refused.length ? `; ${r.refused.map(e => `${e.id}: ${e.reasons.join('; ')}`).join(' · ')}` : ''}`),
    ...(!report.independentReviewPossible ? ['   Независимое ревью требует другого семейства: текущий состав не подходит для полного цикла.'] : []),
    '   Совместимость требований не доказывает качество роли. Оценки и пулы назначаются после проверки.',
    `5. Настройки: ${proposal ? `${proposal.id} — ${statuses[proposal.status]}${proposal.reason ? ` (${proposal.reason})` : ''}` : 'предложение не создано'}`,
    ...(report.settingsMatch ? ['   Выбранные безопасность и исполнители уже совпадают с действующими настройками.'] : []),
    ...(proposal?.status === 'PROPOSED' ? [`   Применить: borshkit настройки применить ${proposal.id}; ${proposal.weakens.length ? 'ослабление требует твоего подтверждения в терминале' : 'защита не ослабляется'}.`] : ['   Когда выбор завершён: borshkit мастер предложить.']),
    ...(report.staleBase && proposal?.status !== 'APPLIED' ? ['   Настройки изменились: borshkit мастер заново.'] : []),
    '6. Готовность к работе', ...report.next.map(n => `   ${n}`),
    `   Подтверждённых запусков выбранных конфигураций: ${report.launches.length}. История работ: borshkit работа список.`,
    '   Следующий шаг: создать задачу и критерии → команда план → команда предложить → применение → отдельный запуск роли.',
    '', report.note, 'Диалог в терминале: borshkit мастер --диалог. Из приложения доступны те же шаги командами.'].join('\n');
}

export async function writeSetupFiles(space, options = {}) {
  const report = await setupReport(space, options);
  await atomicWrite(path.join(space.dir, 'SETUP.md'), `# Настройка команды\n\n\`\`\`text\n${formatSetup(report)}\n\`\`\`\n`, { mode: 0o644 });
  return report;
}
