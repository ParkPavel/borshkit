import fs from 'node:fs/promises';
import path from 'node:path';
import { assert, atomicJSON, atomicWrite, exists, git, isGitRoot, readJSON, sha } from './io.mjs';
import { secretsInValue } from './secrets.mjs';
import { validateExecutor, validatePool } from './executors.mjs';

export const DEFAULT_FOLDER = 'borshkit';
export const PRIVACY = ['moderate', 'strict', 'experiment'];
const PRIVACY_WORDS = { moderate: 'умеренный', strict: 'строгий', experiment: 'эксперимент' };
const FOLDER = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/;
const IGNORE_MARK = '# Borshkit local workspace (auto)';
const SPACE_AUTHOR = ['Borshkit', 'space@borshkit'];

export function defaultSettings(folder) {
  return { schemaVersion: 1, product: 'borshkit', folder, privacy: 'moderate', autopilot: false, silenceSeconds: 60,
    trustedAgent: null, executors: {}, pools: {}, acceptance: { modelTrust: {} } };
}
export function validateSettings(s) {
  assert(s && s.schemaVersion === 1 && s.product === 'borshkit', 'Неизвестный формат настроек');
  assert(FOLDER.test(s.folder ?? ''), 'Недопустимое имя папки пространства');
  assert(PRIVACY.includes(s.privacy), `Режим приватности должен быть одним из: ${PRIVACY.join(', ')}`);
  assert(typeof s.autopilot === 'boolean', 'autopilot — да или нет (true/false)');
  assert(Number.isInteger(s.silenceSeconds) && s.silenceSeconds >= 10 && s.silenceSeconds <= 3600, 'silenceSeconds — от 10 до 3600');
  assert(s.trustedAgent == null || /^[a-zA-Z0-9._@/-]{1,80}$/.test(s.trustedAgent), 'trustedAgent — имя исполнителя или null');
  const executors = s.executors ?? {}, pools = s.pools ?? {};
  assert(typeof executors === 'object' && !Array.isArray(executors) && typeof pools === 'object' && !Array.isArray(pools), 'executors и pools — объекты');
  for (const [id, e] of Object.entries(executors)) validateExecutor(id, e);
  for (const [name, pool] of Object.entries(pools)) validatePool(name, pool, executors);
  const trust = s.acceptance?.modelTrust;
  assert(trust && typeof trust === 'object' && !Array.isArray(trust), 'acceptance.modelTrust — объект');
  for (const [tag, goal] of Object.entries(trust)) {
    assert(/^[a-z0-9-]{1,40}$/.test(tag), `Недопустимая метка доверия «${tag}»`);
    assert(goal && typeof goal.maxFalsePassRate === 'number' && goal.maxFalsePassRate >= 0 && goal.maxFalsePassRate <= 1, `Цель доверия «${tag}» требует maxFalsePassRate от 0 до 1`);
    if (goal.measured != null) {
      const m = goal.measured;
      assert(Number.isInteger(m.runs) && m.runs > 0 && Number.isInteger(m.falsePass) && m.falsePass >= 0 && m.falsePass <= m.runs && typeof m.source === 'string' && m.source,
        `Измерение для «${tag}» требует runs, falsePass и source`);
    }
  }
  const secrets = secretsInValue(s);
  assert(!secrets.length, `В настройках похоже на ключ (${secrets.join(', ')}). Ключи хранятся в переменных окружения, в настройках — только их имена.`);
  return s;
}
/** Whether a model PASS for this tag closes a criterion on its own (decision D10). */
export function trusted(settings, tag) {
  const goal = tag && settings.acceptance.modelTrust[tag];
  if (!goal?.measured) return false;
  return goal.measured.falsePass / goal.measured.runs <= goal.maxFalsePassRate;
}

function paths(project, folder) {
  const dir = path.join(project, folder);
  return { dir, settingsFile: path.join(dir, 'settings', 'workspace.json'), state: path.join(dir, '.state'), tasks: path.join(dir, 'tasks') };
}
async function ignoreTarget(project, localOnly) {
  if (!localOnly) return path.join(project, '.gitignore');
  return path.resolve(project, (await git(project, ['rev-parse', '--git-path', 'info/exclude'])).trim());
}
async function ignored(project, folder) {
  try { await git(project, ['check-ignore', '-q', '--', `${folder}/`]); return true; }
  catch (e) { if (e.code === 1) return false; throw e; }
}
/** Add `/<folder>/` to .gitignore (or .git/info/exclude) once. Returns what changed. */
async function ensureIgnored(project, folder, localOnly) {
  if (await ignored(project, folder)) return { changed: false, file: null };
  const file = await ignoreTarget(project, localOnly);
  const current = (await exists(file)) ? await fs.readFile(file, 'utf8') : '';
  const lead = current && !current.endsWith('\n') ? '\n' : '';
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${current}${lead}${IGNORE_MARK}\n/${folder}/\n`);
  assert(await ignored(project, folder), `Git всё ещё не игнорирует ${folder}/ — проверь правила в ${path.basename(file)}`);
  return { changed: true, file: path.relative(project, file).replaceAll('\\', '/') };
}
async function spaceGit(dir, args) { return git(dir, ['-c', `user.name=${SPACE_AUTHOR[0]}`, '-c', `user.email=${SPACE_AUTHOR[1]}`, '-c', 'commit.gpgsign=false', ...args]); }

/**
 * Save a restore point in the space's own local history. The author names who
 * made the change (a person or an executor), so "who did this" stays answerable.
 */
export async function saveSpace(space, message, { author = 'Человек', email = 'you@borshkit' } = {}) {
  await git(space.dir, ['add', '-A']);
  if (!(await git(space.dir, ['status', '--porcelain'])).trim()) return null;
  await spaceGit(space.dir, ['commit', '-q', `--author=${author} <${email}>`, '-m', message]);
  return (await git(space.dir, ['rev-parse', 'HEAD'])).trim();
}
export async function journal(space, line, now = new Date()) {
  const file = path.join(space.dir, 'journal.md');
  const stamp = now.toISOString().slice(0, 16).replace('T', ' ');
  await fs.appendFile(file, `- ${stamp} — ${line}\n`);
}
export function settingsMirror(s) {
  return [
    '# Настройки пространства',
    '',
    '> Этот файл создаётся автоматически из `settings/workspace.json`. Меняй настройки командой `borshkit`, а не здесь.',
    '',
    `- **Режим приватности:** ${PRIVACY_WORDS[s.privacy]}`,
    `- **Автопилот:** ${s.autopilot ? 'включён — рутинные вопросы закрываются ответом по умолчанию' : 'выключен — каждый вопрос ждёт тебя'}`,
    `- **Через сколько секунд молчания исполнителя спрашивать тебя:** ${s.silenceSeconds}`,
    `- **Доверенный агент настройки:** ${s.trustedAgent ?? 'не выбран — настройки меняешь только ты'}`,
    `- **Цели доверия к проверкам моделей:** ${Object.keys(s.acceptance.modelTrust).length ? Object.entries(s.acceptance.modelTrust).map(([t, g]) => `${t} (не больше ${Math.round(g.maxFalsePassRate * 100)}% ложных «готово»)`).join(', ') : 'не заданы — «готово» от модели всегда проверяешь ты'}`,
    '',
  ].join('\n');
}
function startHere(folder) {
  return `# С чего начать

Это **пространство Borshkit** — рабочий стол твоего проекта. Здесь лежит всё, что Borshkit знает о проекте и о твоих задачах. Папку можно открыть в Obsidian как хранилище.

| Где | Что там |
|---|---|
| \`settings/\` | настройки; понятная версия — [[settings]] |
| \`tasks/\` | задачи: что нужно сделать, как проверяется, что уже проверено |
| \`knowledge/\` | знания о проекте: понятия, решения, уроки |
| \`journal.md\` | что происходило, простыми словами |

## Две истории

- **История проекта** — твой код и документы. Её можно отправить на GitHub, но только после твоего «да».
- **История пространства** — эта папка: настройки, знания, проверки. Она **никогда не покидает компьютер**. Git проекта её не видит: папка \`${folder}/\` добавлена в список игнорируемых.

Git — это «машина времени» для файлов: каждое сохранение — точка, к которой можно вернуться. Borshkit делает такие точки сам, когда происходит что-то важное, например принята задача.

## Что дальше

1. \`borshkit задача новая <имя> --цель "что должно получиться"\` — создать задачу.
2. \`borshkit задача анализ <имя>\` — проверить, понятно ли описаны критерии.
3. \`borshkit задача итог <имя>\` — узнать, что проверено и что ждёт тебя.
`;
}

/**
 * Create the space in the project root: folders, settings, START-HERE, its own
 * local Git history, and — in a Git project — the ignore rule, verified with
 * `git check-ignore` so the space can never land in the project's commits or
 * in the source digest. Running it again changes nothing that already exists.
 */
export async function initSpace({ project = process.cwd(), folder = DEFAULT_FOLDER, localOnly = false } = {}) {
  assert(FOLDER.test(folder), 'Недопустимое имя папки пространства');
  project = await fs.realpath(project);
  const p = paths(project, folder), report = { project, dir: p.dir, created: false, ignore: null, git: false };
  report.git = await isGitRoot(project);
  if (report.git) report.ignore = await ensureIgnored(project, folder, localOnly);
  report.created = !(await exists(p.settingsFile));
  for (const sub of ['settings', 'tasks', 'knowledge/_generated', 'materials', '.state']) await fs.mkdir(path.join(p.dir, sub), { recursive: true });
  if (report.created) await atomicJSON(p.settingsFile, defaultSettings(folder));
  const settings = validateSettings(await readJSON(p.settingsFile));
  const write = async (rel, text) => { const f = path.join(p.dir, rel); if (!(await exists(f))) await atomicWrite(f, text, { mode: 0o644 }); };
  await write('START-HERE.md', startHere(folder));
  await write('journal.md', '# Журнал\n\n');
  await write('.gitignore', '# Пересобираемое состояние и блокировки не входят в историю пространства\n.state/\n');
  await atomicWrite(path.join(p.dir, 'settings', 'settings.md'), settingsMirror(settings), { mode: 0o644 });
  const space = { project, folder, ...p, settings, projectIsGit: report.git };
  if (!(await exists(path.join(p.dir, '.git')))) await git(p.dir, ['init', '-q', '--initial-branch=main']);
  if (report.created) {
    await journal(space, 'Пространство создано.');
    report.saved = await saveSpace(space, 'Пространство Borshkit создано', { author: 'Borshkit', email: 'space@borshkit' });
  }
  return { ...report, space };
}

/** Find the space from any directory inside the project. */
export async function openSpace(start = process.cwd(), { folder = DEFAULT_FOLDER, allowBrokenSettings = false } = {}) {
  let cursor = path.resolve(start);
  while (true) {
    const p = paths(cursor, folder);
    if (await exists(p.settingsFile)) {
      const project = await fs.realpath(cursor);
      let settings;
      try { settings = validateSettings(await readJSON(p.settingsFile)); }
      catch (e) { if (!allowBrokenSettings) throw new Error(`${e.message}. Верни прошлые настройки: borshkit настройки вернуть`); settings = null; }
      return { project, folder, ...paths(project, folder), settings, projectIsGit: await isGitRoot(project) };
    }
    const next = path.dirname(cursor);
    assert(next !== cursor, `Пространство не найдено. Запусти «borshkit начать» в корне проекта.`);
    cursor = next;
  }
}
/** Writing evidence into a folder Git does not ignore would put it into commits and into the source digest. */
export async function assertIgnored(space) {
  if (!space.projectIsGit) return;
  assert(await ignored(space.project, space.folder), `Папка ${space.folder}/ больше не в gitignore. Запусти «borshkit начать», чтобы вернуть правило; до этого записи запрещены.`);
}
export const settingsDigest = async space => sha(await fs.readFile(space.settingsFile));
