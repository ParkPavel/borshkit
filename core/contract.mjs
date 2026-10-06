import fs from 'node:fs/promises';
import path from 'node:path';
import { assert, atomicJSON, contained, exists, git, readJSON, sha, withLock } from './io.mjs';
import { snapshot } from './snapshot.mjs';
import { assertIgnored, journal, saveSpace } from './space.mjs';
import { MATERIAL_ID } from './materials.mjs';
import { assertSettingsIntact } from './config.mjs';

// Contract validation and analysis adapted from Claudex src/tasks.mjs (Apache-2.0, same author).
export const ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,70}$/;
export const KINDS = ['feature', 'bug', 'maintenance', 'research'];
export const CLASSES = ['auto', 'model', 'manual'];
export const POLICIES = ['auto', 'mixed', 'manual'];
const nonempty = v => typeof v === 'string' && Boolean(v.trim());
const strings = v => Array.isArray(v) && v.every(nonempty);
const id = (v, what = 'задачи') => assert(typeof v === 'string' && ID.test(v), `Недопустимый идентификатор ${what}: «${v}». Латиница, цифры, - и _`);
export const relative = v => v === '.' || (nonempty(v) && !path.posix.isAbsolute(v) && !path.win32.isAbsolute(v) && !/[\x00-\x1f:*?"<>|]/.test(v) && !v.split(/[\\/]/).some(p => !p || p === '.' || p === '..'));
const norm = v => v.replaceAll('\\', '/');
export const covered = (file, scope) => scope.some(p => p === '.' || norm(file) === norm(p) || norm(file).startsWith(`${norm(p)}/`));

export function validateContract(c) {
  assert(c && c.schemaVersion === 2, 'Неподдерживаемая версия контракта');
  id(c.taskId);
  assert(KINDS.includes(c.kind), `Вид задачи — один из: ${KINDS.join(', ')}`);
  assert(nonempty(c.goal), 'У задачи нет цели');
  assert(strings(c.nonGoals) && strings(c.decisions), 'nonGoals и decisions — списки строк');
  assert(c.base && ['git', 'files'].includes(c.base.kind) && /^[a-f0-9]{64}$/.test(c.base.digest), 'Нет исходного снимка задачи');
  assert(Array.isArray(c.paths) && c.paths.length && c.paths.every(relative), 'paths — относительные пути внутри проекта; «.» — весь проект');
  assert(c.acceptance && POLICIES.includes(c.acceptance.policy), `Политика приёмки — одна из: ${POLICIES.join(', ')}`);
  assert(c.materials === undefined || (Array.isArray(c.materials) && c.materials.every(m => MATERIAL_ID.test(m)) && new Set(c.materials).size === c.materials.length),
    'materials — список идентификаторов материалов вида m-0123456789ab без повторов');
  for (const key of ['goals', 'criteria', 'checks']) {
    assert(Array.isArray(c[key]), `${key} — список`);
    for (const entry of c[key]) { assert(entry && typeof entry === 'object', `Неверная запись в ${key}`); id(entry.id, `в ${key}`); }
    assert(new Set(c[key].map(e => e.id)).size === c[key].length, `Повторяющийся идентификатор в ${key}`);
  }
  assert(c.goals.length && c.criteria.length, 'Черновик: нужны хотя бы одна цель и один критерий');
  const criteria = new Map(c.criteria.map(e => [e.id, e]));
  for (const item of c.criteria) {
    assert(nonempty(item.text), `У критерия ${item.id} нет текста`);
    assert(CLASSES.includes(item.class), `Класс критерия ${item.id} — один из: ${CLASSES.join(', ')}`);
    assert(item.tag === undefined || /^[a-z0-9-]{1,40}$/.test(item.tag), `Недопустимая метка у критерия ${item.id}`);
    if (item.manual !== undefined) {
      const m = item.manual;
      assert(m && (m.steps === undefined || strings(m.steps)) && (m.expect === undefined || nonempty(m.expect)) && (m.where === undefined || nonempty(m.where)),
        `manual у критерия ${item.id}: steps — список строк, expect и where — строки`);
    }
  }
  for (const goal of c.goals) {
    assert(nonempty(goal.text), `У цели ${goal.id} нет текста`);
    assert(strings(goal.criteria) && goal.criteria.length && goal.criteria.every(k => criteria.has(k)), `Цель ${goal.id} должна ссылаться на существующие критерии`);
  }
  for (const check of c.checks) {
    if (check.builtin !== undefined) {
      assert(['citations', 'attribution', 'readme-assets'].includes(check.builtin), `Неизвестная встроенная проверка «${check.builtin}» в ${check.id}`);
      if (check.builtin === 'citations') {
        assert(relative(check.report) && check.report !== '.', `Проверке ${check.id} нужен report — путь к отчёту внутри проекта`);
        assert(check.minCitations === undefined || (Number.isInteger(check.minCitations) && check.minCitations >= 0), `minCitations в ${check.id} — целое число от 0`);
      }
      for (const key of ['manifest', 'readme']) assert(check[key] === undefined || (relative(check[key]) && check[key] !== '.'), `${key} в ${check.id} — путь внутри проекта`);
      assert(check.maxBytes === undefined || (Number.isInteger(check.maxBytes) && check.maxBytes > 0), `maxBytes в ${check.id} — положительное целое`);
    } else assert(nonempty(check.command) && Array.isArray(check.args) && check.args.every(a => typeof a === 'string'), `Проверке ${check.id} нужны command и args`);
    assert(check.timeoutMs === undefined || (Number.isInteger(check.timeoutMs) && check.timeoutMs > 0 && check.timeoutMs <= 900000), `Таймаут проверки ${check.id} — 1..900000 мс`);
    assert(strings(check.criteria) && check.criteria.length && check.criteria.every(k => criteria.get(k)?.class === 'auto'), `Проверка ${check.id} должна вести к критериям класса auto`);
  }
  return c;
}

const VAGUE = /\b(fast|quick(?:ly)?|robust|intuitive|user-friendly|properly|correctly|appropriate(?:ly)?|seamless(?:ly)?|clean|nice|as expected|works?)\b|(?:^|[\s,.(])(быстро|корректно|правильно|удобно|красиво|нормально|хорошо|как ожидается|работает)(?=$|[\s,.)])/i;
const PLACEHOLDER = /\b(TODO|TBD|FIXME|TKTK)\b|\?\?\?/;
/**
 * A valid contract can still promise what nothing will show. Warnings never
 * block; they make the blind zone visible before the work starts (decision D3).
 */
export function analyzeContract(c, { trusted = () => false } = {}) {
  const warnings = [];
  const warn = (category, severity, summary) => warnings.push({ category, severity, summary });
  for (const item of c.criteria) {
    if (VAGUE.test(item.text) && !/\d/.test(item.text)) warn('ambiguity', 'MEDIUM', `Критерий ${item.id} использует слово, которое ничем не измерить: «${item.text.match(VAGUE)[0].trim()}». Опиши, что именно должно быть видно.`);
  }
  for (const [where, text] of [['цели задачи', c.goal], ...c.goals.map(g => [`цели ${g.id}`, g.text]), ...c.criteria.map(e => [`критерии ${e.id}`, e.text]), ...c.decisions.map((d, i) => [`решении ${i + 1}`, d])]) {
    if (PLACEHOLDER.test(text)) warn('placeholder', 'HIGH', `В ${where} осталась заглушка «${text.match(PLACEHOLDER)[0]}».`);
  }
  const seen = new Map();
  for (const item of c.criteria) {
    const key = item.text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    if (seen.has(key)) warn('duplication', 'MEDIUM', `Критерии ${seen.get(key)} и ${item.id} говорят одно и то же.`);
    else seen.set(key, item.id);
  }
  for (const item of c.criteria) {
    if (!c.goals.some(g => g.criteria.includes(item.id))) warn('coverage', 'MEDIUM', `Критерий ${item.id} не относится ни к одной цели и на приёмку не влияет.`);
    if (item.class === 'auto' && !c.checks.some(k => k.criteria.includes(item.id))) warn('coverage', 'HIGH', `Критерий ${item.id} должен проверяться автоматически, но проверки для него нет — итог будет «не проверено».`);
    if (item.class === 'manual' && !item.manual?.steps?.length) warn('manual', 'MEDIUM', `У ручного критерия ${item.id} нет шагов проверки — человеку будет неясно, что делать.`);
  }
  if (c.kind === 'research' && !c.checks.some(k => k.builtin === 'citations')) warn('research', 'HIGH', 'Исследование без проверки citations: ссылки на источники и цитаты никто не сверит автоматически.');
  if (c.checks.some(k => k.builtin === 'citations') && !c.materials?.length) warn('research', 'HIGH', 'Проверка citations есть, а материалов в задаче нет — добавь их: borshkit материал добавить …');
  const manual = c.criteria.filter(e => e.class === 'manual' || (e.class === 'model' && !trusted(e.tag)));
  if (manual.length) warn('blind-zone', 'INFO', `Ручная приёмка понадобится для ${manual.length} из ${c.criteria.length} критериев: ${manual.map(e => e.id).join(', ')}.`);
  if (c.acceptance.policy === 'auto' && manual.length) warn('policy', 'INFO', 'Политика «auto», но часть критериев проверить автоматически нельзя — они останутся за тобой.');
  return warnings;
}

export async function taskDir(space, taskId) {
  id(taskId);
  return contained(space.dir, path.join(space.tasks, taskId));
}
export async function newTask(space, { taskId, goal, kind = 'feature' }) {
  assert(nonempty(goal), 'Опиши цель задачи: --цель "что должно получиться"');
  assert(KINDS.includes(kind), `Вид задачи — один из: ${KINDS.join(', ')}`);
  await assertIgnored(space);
  await assertSettingsIntact(space);
  const dir = await taskDir(space, taskId), file = path.join(dir, 'contract.json'), basisFile = path.join(dir, 'basis.json');
  const base = await snapshot(space.project, { exclude: [space.folder] });
  const before = await uncommitted(space);
  const contract = { schemaVersion: 2, taskId, kind, goal, nonGoals: [], decisions: [], base, paths: ['.'], goals: [], criteria: [], checks: [], acceptance: { policy: 'mixed' } };
  await withLock(space.state, async () => {
    assert(!(await exists(file)) && !(await exists(basisFile)), 'Такая задача уже есть; создание никогда не перезаписывает контракт');
    await atomicJSON(basisFile, { schemaVersion: 1, taskId, base, uncommitted: before });
    await atomicJSON(file, contract);
  });
  await journal(space, `Создана задача «${taskId}»: ${goal}`);
  await saveSpace(space, `Новая задача «${taskId}»`);
  return { taskId, file, contract };
}
/**
 * Files already changed when the task began, with their content digests. A scope
 * check must judge only what changed during the task, not edits that were
 * already lying in the checkout (the ignore rule `init` adds among them).
 */
export async function uncommitted(space) {
  if (!space.projectIsGit) return {};
  let changed = [];
  try { changed = (await git(space.project, ['diff', '--no-renames', '--name-only', '-z', 'HEAD'])).split('\0'); } catch { /* no commits yet */ }
  const untracked = (await git(space.project, ['ls-files', '--others', '--exclude-standard', '-z'])).split('\0');
  const out = {};
  for (const file of [...new Set([...changed, ...untracked])].filter(Boolean).sort()) {
    out[file] = await fs.readFile(path.join(space.project, file)).then(sha, () => null);
  }
  return out;
}
export async function loadTask(space, taskId) {
  const dir = await taskDir(space, taskId), file = path.join(dir, 'contract.json');
  assert(await exists(file), `Задача «${taskId}» не найдена`);
  const contract = await readJSON(file);
  assert(contract.taskId === taskId, 'Идентификатор в контракте не совпадает с папкой задачи');
  const basis = await readJSON(path.join(dir, 'basis.json'));
  assert(basis.taskId === taskId && ['kind', 'head', 'digest', 'fileCount'].every(k => basis.base?.[k] === contract.base?.[k]),
    'Исходный снимок задачи изменён; для нового исходного состояния создай новую задачу');
  return { dir, file, contract, basis, contractDigest: sha(await fs.readFile(file)) };
}
export async function checkTask(space, taskId, { trusted } = {}) {
  try {
    const t = await loadTask(space, taskId);
    validateContract(t.contract);
    return { taskId, ready: true, errors: [], warnings: analyzeContract(t.contract, { trusted }) };
  } catch (error) { return { taskId, ready: false, errors: [error.message], warnings: [] }; }
}
