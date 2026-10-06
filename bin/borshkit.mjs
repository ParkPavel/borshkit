#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { ROOT, assert, readJSON } from '../core/io.mjs';
import { DEFAULT_FOLDER, initSpace, openSpace, saveSpace, trusted } from '../core/space.mjs';
import { checkTask, newTask } from '../core/contract.mjs';
import { STATUS_WORDS, confirmItem, converge, recordReview, signOff, verifyAll, verifyCheck } from '../core/accept.mjs';
import { doctor, formatStatus, spaceStatus } from '../core/status.mjs';

const COMMANDS = { начать: 'init', статус: 'status', задача: 'task', сохранить: 'save', доктор: 'doctor', помощь: 'help' };
const TASK = { новая: 'new', анализ: 'check', проверить: 'verify', отзыв: 'review', подтвердить: 'confirm', итог: 'converge', принять: 'accept' };
const FLAGS = { цель: 'goal', вид: 'kind', папка: 'folder', проект: 'project', 'только-локально': 'local-only', исполнитель: 'executor', результат: 'result' };
const YES = ['да', 'yes', 'ok', 'y'], NO = ['нет', 'no', 'n'];

export function parse(argv) {
  const positional = [], flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) { positional.push(arg); continue; }
    let [key, value] = arg.slice(2).split(/=(.*)/s, 2);
    key = FLAGS[key] ?? key;
    if (value === undefined) value = argv[i + 1] !== undefined && !argv[i + 1].startsWith('--') && !['json', 'local-only'].includes(key) ? argv[++i] : true;
    flags[key] = value;
  }
  return { positional, flags };
}

const HELP = `Borshkit — Modular AI Workspace

  borshkit начать [--проект путь] [--папка имя] [--только-локально]
      создать пространство в корне проекта и спрятать его от истории проекта
  borshkit статус                       что происходит и что ждёт тебя
  borshkit доктор                       проверить окружение и пространство
  borshkit сохранить "что изменилось"   точка возврата в истории пространства

  borshkit задача новая <имя> --цель "что должно получиться" [--вид feature|bug|maintenance|research]
  borshkit задача анализ <имя>          понятно ли описаны цели и критерии
  borshkit задача проверить <имя> [проверка …]   запустить автоматические проверки
  borshkit задача отзыв <имя> --результат файл.json --исполнитель codex
  borshkit задача итог <имя>            сверить и написать лист приёмки
  borshkit задача подтвердить <имя> <критерий> да|нет "что видел"
  borshkit задача принять <имя> ["заметка"]   общая приёмка (политика manual)

Английские имена тоже работают: init, status, doctor, save, task new|check|verify|review|converge|confirm|accept.
Добавь --json, чтобы получить ответ для программ.`;

function print(flags, value, text) { console.log(flags.json ? JSON.stringify(value, null, 2) : text); }
const open = flags => openSpace(process.cwd(), { folder: flags.folder ?? DEFAULT_FOLDER });

async function task(positional, flags) {
  const [rawSub, taskId, ...rest] = positional;
  const sub = TASK[rawSub] ?? rawSub;
  assert(sub, 'Укажи действие с задачей. Подсказка: borshkit помощь');
  assert(taskId, 'Укажи имя задачи');
  const space = await open(flags);
  if (sub === 'new') {
    const r = await newTask(space, { taskId, goal: flags.goal, kind: flags.kind });
    return print(flags, r, `Задача «${taskId}» создана: ${path.relative(process.cwd(), r.file)}\nОпиши в ней цели, критерии и проверки, затем: borshkit задача анализ ${taskId}`);
  }
  if (sub === 'check') {
    const r = await checkTask(space, taskId, { trusted: tag => trusted(space.settings, tag) });
    const text = r.ready
      ? [`Контракт «${taskId}» готов.`, ...(r.warnings.length ? ['Замечания:', ...r.warnings.map(w => `  [${w.severity}] ${w.summary}`)] : ['Замечаний нет.'])].join('\n')
      : [`Контракт «${taskId}» ещё не готов:`, ...r.errors.map(e => `  ${e}`)].join('\n');
    print(flags, r, text);
    if (!r.ready) process.exitCode = 1;
    return;
  }
  if (sub === 'verify') {
    const results = rest.length ? await Promise.all(rest.map(id => verifyCheck(space, taskId, id))) : await verifyAll(space, taskId);
    print(flags, results, results.length ? results.map(e => `${e.status === 'PASS' ? '✅' : '❌'} ${e.checkId}${e.freshness === 'STALE' ? ' (файлы менялись во время проверки — результат устарел)' : ''} · лог: ${e.artifact}`).join('\n') : 'В задаче нет автоматических проверок.');
    if (results.some(e => e.status !== 'PASS')) process.exitCode = 1;
    return;
  }
  if (sub === 'review') {
    assert(typeof flags.result === 'string', 'Укажи файл результата: --результат review.json');
    const r = await recordReview(space, taskId, { executor: flags.executor, result: await readJSON(path.resolve(flags.result)) });
    return print(flags, r, `Записано ответов ревью: ${r.saved.length}${r.ignored.length ? `; пропущены (не критерии класса model): ${r.ignored.join(', ')}` : ''}`);
  }
  if (sub === 'confirm') {
    const [criterionId, answer, ...note] = rest;
    assert(criterionId && answer, 'Формат: borshkit задача подтвердить <имя> <критерий> да|нет "что видел"');
    const lowered = answer.toLowerCase();
    assert(YES.includes(lowered) || NO.includes(lowered), 'Ответ — да или нет');
    const r = await confirmItem(space, taskId, criterionId, { verdict: YES.includes(lowered) ? 'PASS' : 'FAIL', note: note.join(' ') });
    return print(flags, r, `Записано. Сверь итог: borshkit задача итог ${taskId}`);
  }
  if (sub === 'accept') {
    const r = await signOff(space, taskId, { note: rest.join(' ') });
    return print(flags, r, `Общая приёмка записана. Сверь итог: borshkit задача итог ${taskId}`);
  }
  if (sub === 'converge') {
    const r = await converge(space, taskId);
    const [dot, word] = STATUS_WORDS[r.status];
    const text = r.status === 'not-ready'
      ? [`${dot} Контракт «${taskId}» не готов:`, ...r.errors.map(e => `  ${e}`)].join('\n')
      : `${dot} ${taskId}: ${word}${r.items.length ? ` · ждёт тебя: ${r.items.length}` : ''}\nЛист приёмки: ${path.relative(process.cwd(), path.join(space.tasks, taskId, 'acceptance.md'))}`;
    print(flags, r, text);
    if (r.status === 'needs-fix') process.exitCode = 1;
    return;
  }
  throw new Error(`Неизвестное действие с задачей: ${rawSub}`);
}

export async function main(argv = process.argv.slice(2)) {
  const { positional, flags } = parse(argv);
  const command = COMMANDS[positional[0]] ?? positional[0] ?? 'help';
  if (command === 'help' || flags.help) return console.log(HELP);
  if (command === 'version') return console.log((await readJSON(path.join(ROOT, 'package.json'))).version);
  if (command === 'init') {
    const r = await initSpace({ project: flags.project ? path.resolve(flags.project) : process.cwd(), folder: flags.folder ?? DEFAULT_FOLDER, localOnly: flags['local-only'] === true });
    const lines = [r.created ? `Пространство создано: ${r.dir}` : `Пространство уже есть: ${r.dir}`];
    if (r.ignore?.changed) lines.push(`В ${r.ignore.file} добавлено правило: папка ${r.space.folder}/ не попадёт в историю проекта.${r.ignore.file === '.gitignore' ? ' Сохрани это изменение в истории проекта, когда будешь готов.' : ''}`);
    else if (r.git) lines.push(`Папка ${r.space.folder}/ уже скрыта от истории проекта.`);
    else lines.push('Проект без Git: история проекта не ведётся. История пространства — ведётся.');
    lines.push(`Начни отсюда: ${path.join(r.dir, 'START-HERE.md')}`);
    const { space, ...report } = r;
    return print(flags, report, lines.join('\n'));
  }
  if (command === 'status') { const s = await spaceStatus(await open(flags)); return print(flags, s, formatStatus(s)); }
  if (command === 'doctor') {
    const space = await open(flags).catch(() => null);
    const checks = await doctor(space);
    if (!space) checks.push({ ok: false, text: 'Пространство не найдено', fix: 'запусти «borshkit начать» в корне проекта' });
    print(flags, checks, checks.map(c => `${c.ok ? '✅' : '❌'} ${c.text}${c.fix ? ` — ${c.fix}` : ''}`).join('\n'));
    if (checks.some(c => !c.ok)) process.exitCode = 1;
    return;
  }
  if (command === 'save') {
    const space = await open(flags);
    const message = positional.slice(1).join(' ').trim();
    assert(message, 'Напиши, что изменилось: borshkit сохранить "что изменилось"');
    const commit = await saveSpace(space, message);
    return print(flags, { commit }, commit ? `Точка возврата сохранена: ${commit.slice(0, 8)} — ${message}` : 'Нечего сохранять: изменений нет.');
  }
  if (command === 'task') return task(positional.slice(1), flags);
  throw new Error(`Неизвестная команда «${positional[0]}». Подсказка: borshkit помощь`);
}

const invoked = process.argv[1] && (await fs.realpath(process.argv[1]).catch(() => process.argv[1]));
if (invoked && path.resolve(invoked) === path.resolve(ROOT, 'bin', 'borshkit.mjs')) {
  main().catch(error => { console.error(`Ошибка: ${error.message}`); process.exitCode = 1; });
}
