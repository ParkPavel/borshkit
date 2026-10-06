import fs from 'node:fs/promises';
import path from 'node:path';
import { exec, exists, git, readJSON } from './io.mjs';
import { STATUS_WORDS } from './accept.mjs';
import { validateSettings } from './space.mjs';

const PRIVACY_WORDS = { moderate: 'умеренный', strict: 'строгий', experiment: 'эксперимент' };

/** What the person needs to see first: mode, tasks, and what waits for them. */
export async function spaceStatus(space) {
  const tasks = [];
  if (await exists(space.tasks)) {
    for (const name of (await fs.readdir(space.tasks)).sort()) {
      const dir = path.join(space.tasks, name);
      if (!(await exists(path.join(dir, 'contract.json')))) continue;
      const report = await readJSON(path.join(dir, 'convergence.json')).catch(() => null);
      const contract = await readJSON(path.join(dir, 'contract.json'));
      tasks.push({ taskId: name, goal: contract.goal, status: report?.status ?? 'unknown', waiting: report?.items?.length ?? null, checkedAt: report?.createdAt ?? null });
    }
  }
  let lastSave = null;
  try { lastSave = (await git(space.dir, ['log', '-1', '--format=%cI %s'])).trim() || null; } catch { /* no history yet */ }
  return { project: space.project, folder: space.folder, privacy: space.settings.privacy, autopilot: space.settings.autopilot, tasks, lastSave };
}
export function formatStatus(s) {
  const lines = [`Проект: ${s.project}`, `Пространство: ${s.folder}/ · приватность: ${PRIVACY_WORDS[s.privacy]} · автопилот: ${s.autopilot ? 'вкл' : 'выкл'}`];
  lines.push(s.lastSave ? `Последняя точка возврата: ${s.lastSave}` : 'Точек возврата пока нет');
  if (!s.tasks.length) lines.push('', 'Задач пока нет. Создай: borshkit задача новая <имя> --цель "что должно получиться"');
  else {
    lines.push('', 'Задачи:');
    for (const t of s.tasks) {
      const [dot, word] = STATUS_WORDS[t.status] ?? ['⚪', t.status];
      lines.push(`  ${dot} ${t.taskId} — ${word}${t.waiting ? ` · ждёт тебя: ${t.waiting}` : ''}${t.checkedAt ? '' : ' · сверки ещё не было'}`);
      lines.push(`     ${t.goal}`);
    }
  }
  return lines.join('\n');
}

/** Environment and space health in plain words; every line is ok or says what to do. */
export async function doctor(space) {
  const checks = [];
  const add = (ok, text, fix = null) => checks.push({ ok, text, fix });
  const major = Number(process.versions.node.split('.')[0]);
  add(major >= 22, `Node.js ${process.versions.node}`, major >= 22 ? null : 'нужен Node.js 22 или новее');
  try { add(true, (await exec('git', ['--version'], { windowsHide: true })).stdout.trim()); }
  catch { add(false, 'Git не найден', 'установи Git: он нужен для точек возврата'); }
  if (space) {
    try { validateSettings(await readJSON(space.settingsFile)); add(true, 'Настройки в порядке, ключей в них нет'); }
    catch (e) { add(false, 'Настройки не прошли проверку', e.message); }
    if (space.projectIsGit) {
      let ignoredOk = false;
      try { await git(space.project, ['check-ignore', '-q', '--', `${space.folder}/`]); ignoredOk = true; } catch { /* not ignored */ }
      add(ignoredOk, ignoredOk ? `Папка ${space.folder}/ не попадёт в историю проекта` : `Папка ${space.folder}/ не в gitignore`, ignoredOk ? null : 'запусти «borshkit начать»');
    } else add(true, 'Проект без Git: история проекта не ведётся, история пространства — ведётся');
    const hasHistory = await exists(path.join(space.dir, '.git'));
    add(hasHistory, hasHistory ? 'История пространства есть' : 'У пространства нет своей истории', hasHistory ? null : 'запусти «borshkit начать»');
    if (hasHistory) {
      const dirty = (await git(space.dir, ['status', '--porcelain'])).trim().split('\n').filter(Boolean).length;
      add(true, dirty ? `Несохранённых изменений в пространстве: ${dirty} (сохрани: borshkit сохранить "что изменилось")` : 'Все изменения пространства сохранены');
    }
  }
  return checks;
}
