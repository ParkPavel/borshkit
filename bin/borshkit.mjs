#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { ROOT, assert, readJSON } from '../core/io.mjs';
import { DEFAULT_FOLDER, initSpace, openSpace, saveSpace, trusted } from '../core/space.mjs';
import { checkTask, newTask } from '../core/contract.mjs';
import { STATUS_WORDS, confirmItem, converge, recordReview, signOff, verifyAll, verifyCheck } from '../core/accept.mjs';
import { doctor, formatStatus, spaceStatus } from '../core/status.mjs';
import { addMaterial, listMaterials, refreshMaterial } from '../core/materials.mjs';
import { acceptManualEdit, applyProposal, proposeSettings, revertSettings } from '../core/config.mjs';
import { endExperiment, recordKey, startExperiment } from '../core/experiment.mjs';
import { PRIVACY_WORDS, STRICTNESS } from '../core/privacy.mjs';
import readline from 'node:readline/promises';

const COMMANDS = { начать: 'init', статус: 'status', задача: 'task', сохранить: 'save', доктор: 'doctor', помощь: 'help', материал: 'material', приватность: 'privacy', настройки: 'settings', эксперимент: 'experiment' };
const SUB = { добавить: 'add', список: 'list', обновить: 'refresh', показать: 'show', предложить: 'propose', применить: 'apply', принять: 'accept', вернуть: 'revert', начать: 'start', ключ: 'key', завершить: 'end' };
const MODES = { умеренный: 'moderate', строгий: 'strict', эксперимент: 'experiment' };
const TASK = { новая: 'new', анализ: 'check', проверить: 'verify', отзыв: 'review', подтвердить: 'confirm', итог: 'converge', принять: 'accept' };
const FLAGS = { цель: 'goal', вид: 'kind', папка: 'folder', проект: 'project', 'только-локально': 'local-only', исполнитель: 'executor', результат: 'result',
  текст: 'text', название: 'title', да: 'yes', 'ключи-отозваны': 'revoked', от: 'from', причина: 'reason' };
const LONE = ['json', 'local-only', 'yes', 'revoked', 'help'];
const YES = ['да', 'yes', 'ok', 'y'], NO = ['нет', 'no', 'n'];

export function parse(argv) {
  const positional = [], flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) { positional.push(arg); continue; }
    let [key, value] = arg.slice(2).split(/=(.*)/s, 2);
    key = FLAGS[key] ?? key;
    if (value === undefined) value = argv[i + 1] !== undefined && !argv[i + 1].startsWith('--') && !LONE.includes(key) ? argv[++i] : true;
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

  borshkit материал добавить <файл> | --url адрес [--да] | --текст "…"  [--название "…"]
  borshkit материал список | обновить <id>
  borshkit приватность [умеренный|строгий|эксперимент]   ослабление — только в терминале
  borshkit настройки показать | предложить <файл.json> --от <агент> --причина "…" | применить <p001>
  borshkit настройки принять | вернуть          ручная правка настроек: принять или откатить
  borshkit эксперимент начать | ключ <ИМЯ_ПЕРЕМЕННОЙ> | завершить [--ключи-отозваны]

Английские имена тоже работают: init, status, doctor, save, task new|check|verify|review|converge|confirm|accept.
Добавь --json, чтобы получить ответ для программ.`;

function print(flags, value, text) { console.log(flags.json ? JSON.stringify(value, null, 2) : text); }
/**
 * A person's confirmation: a typed phrase in a real terminal. An agent running
 * the command through a tool has no terminal, so it cannot confirm for you.
 * This is a speed bump, not a security boundary.
 */
async function confirmPerson(question, phrase) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) return false;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try { return (await rl.question(`${question}\nЧтобы подтвердить, напиши: ${phrase}\n> `)).trim().toLowerCase() === phrase; }
  finally { rl.close(); }
}
const PERSON_ONLY = 'Это может подтвердить только человек в терминале. Запусти команду сам.';
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

async function material([rawSub, ...rest], flags) {
  const sub = SUB[rawSub] ?? rawSub ?? 'list';
  const space = await open(flags);
  if (sub === 'list') {
    const list = await listMaterials(space);
    return print(flags, list, list.length ? list.map(m => `${m.id}${m.superseded ? ' (есть новая версия)' : ''} · ${m.title ?? m.origin.value} · ${m.mediaType} · ${m.capturedAt.slice(0, 10)}`).join('\n') : 'Материалов пока нет.');
  }
  if (sub === 'add') {
    const r = await addMaterial(space, { file: rest[0] ?? undefined, url: typeof flags.url === 'string' ? flags.url : undefined, text: typeof flags.text === 'string' ? flags.text : undefined,
      title: typeof flags.title === 'string' ? flags.title : null, confirm: flags.yes === true });
    return print(flags, r, `${r.added ? 'Сохранён' : 'Уже был'} материал ${r.record.id} (${r.record.mediaType}, ${r.record.size} байт). Добавь его в поле materials задачи и цитируй так: (источник: ${r.record.id}, «точная цитата»)`);
  }
  if (sub === 'refresh') {
    assert(rest[0], 'Укажи идентификатор материала');
    const r = await refreshMaterial(space, rest[0], { confirm: flags.yes === true });
    return print(flags, r, r.changed ? `Источник изменился: новая версия ${r.record.id}. Задачи по-прежнему ссылаются на старую — обнови поле materials, если нужна новая.` : 'Источник не изменился.');
  }
  throw new Error(`Неизвестное действие с материалом: ${rawSub}`);
}
async function privacy(rawMode, flags) {
  const space = await open(flags);
  if (!rawMode) return print(flags, { privacy: space.settings.privacy }, `Режим приватности: ${PRIVACY_WORDS[space.settings.privacy]}`);
  const mode = MODES[rawMode] ?? rawMode;
  assert(mode in STRICTNESS, 'Режим — умеренный, строгий или эксперимент');
  if (mode === space.settings.privacy) return print(flags, { privacy: mode }, `Режим приватности уже ${PRIVACY_WORDS[mode]}.`);
  const proposal = await proposeSettings(space, { privacy: mode }, { reason: 'смена режима приватности' });
  const weaker = proposal.weakens.length > 0;
  const confirmed = weaker && await confirmPerson(`Ослабить защиту: ${proposal.weakens.join('; ')}?`, 'да, ослабить');
  assert(!weaker || confirmed, PERSON_ONLY);
  await applyProposal(space, proposal.id, { confirmedByPerson: confirmed });
  return print(flags, { privacy: mode }, `Режим приватности: ${PRIVACY_WORDS[mode]}${mode === 'experiment' ? '\nДальше: borshkit эксперимент начать' : ''}`);
}
async function settings([rawSub, ...rest], flags) {
  const sub = SUB[rawSub] ?? rawSub ?? 'show';
  if (sub === 'revert') {
    const space = await openSpace(process.cwd(), { folder: flags.folder ?? DEFAULT_FOLDER, allowBrokenSettings: true });
    await revertSettings(space);
    return print(flags, { reverted: true }, 'Настройки возвращены к последней сохранённой версии.');
  }
  const space = await open(flags);
  if (sub === 'show') return print(flags, space.settings, await fs.readFile(path.join(space.dir, 'settings', 'settings.md'), 'utf8'));
  if (sub === 'propose') {
    assert(rest[0], 'Укажи файл с изменениями: borshkit настройки предложить изменения.json --от <агент>');
    const p = await proposeSettings(space, await readJSON(path.resolve(rest[0])), { from: typeof flags.from === 'string' ? flags.from : 'человек', reason: typeof flags.reason === 'string' ? flags.reason : '' });
    return print(flags, p, [`Предложение ${p.id}: ${p.changes.map(c => `${c.key}: ${JSON.stringify(c.from)} → ${JSON.stringify(c.to)}`).join('; ')}`,
      p.weakens.length ? `Ослабляет защиту — применить сможет только человек в терминале:\n  ${p.weakens.join('\n  ')}` : 'Защиту не ослабляет — можно применять.',
      `Применить: borshkit настройки применить ${p.id}`].join('\n'));
  }
  if (sub === 'apply') {
    const proposal = await readJSON(path.join(space.dir, 'settings', 'proposals', `${rest[0]}.json`)).catch(() => null);
    assert(proposal, `Предложения ${rest[0]} нет`);
    const weak = proposal.weakens?.length > 0;
    const confirmed = weak && await confirmPerson(`Предложение ${proposal.id} от ${proposal.from} ослабляет защиту:\n  ${proposal.weakens.join('\n  ')}`, 'да, ослабить');
    assert(!weak || confirmed, PERSON_ONLY);
    const r = await applyProposal(space, proposal.id, { confirmedByPerson: confirmed });
    return print(flags, r, `Настройки применены (${r.id}).`);
  }
  if (sub === 'accept') {
    const confirmed = await confirmPerson('Принять ручную правку настроек как свою?', 'да');
    assert(confirmed, PERSON_ONLY);
    const r = await acceptManualEdit(space, { confirmedByPerson: true });
    return print(flags, r, r.changed ? 'Правка настроек принята и сохранена.' : 'Ручных правок нет.');
  }
  throw new Error(`Неизвестное действие с настройками: ${rawSub}`);
}
async function experiment([rawSub, ...rest], flags) {
  const sub = SUB[rawSub] ?? rawSub;
  const space = await open(flags);
  if (sub === 'start') { const r = await startExperiment(space); return print(flags, r, `${r.banner}\nКлючей в окружении: ${r.session.keys.map(k => k.name).join(', ') || 'нет'}.`); }
  if (sub === 'key') { const r = await recordKey(space, rest[0]); return print(flags, r, `Записано имя ключа ${rest[0]}. Не забудь отозвать его после сессии.`); }
  if (sub === 'end') {
    const revoked = flags.revoked === true;
    const confirmed = await confirmPerson(revoked ? 'Ты отозвал все ключи этой сессии?' : 'Закончить сессию, не отзывая ключи? Она останется «грязной».', 'да');
    assert(confirmed, PERSON_ONLY);
    const r = await endExperiment(space, { revoked, confirmedByPerson: true });
    return print(flags, r, r.status === 'clean' ? 'Сессия эксперимента закрыта.' : 'Сессия остаётся «грязной», пока ты не отзовёшь ключи: borshkit эксперимент завершить --ключи-отозваны');
  }
  throw new Error('Действие — начать, ключ или завершить');
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
    const space = await openSpace(process.cwd(), { folder: flags.folder ?? DEFAULT_FOLDER, allowBrokenSettings: true }).catch(() => null);
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
  if (command === 'material') return material(positional.slice(1), flags);
  if (command === 'privacy') return privacy(positional[1], flags);
  if (command === 'settings') return settings(positional.slice(1), flags);
  if (command === 'experiment') return experiment(positional.slice(1), flags);
  if (command === 'task') return task(positional.slice(1), flags);
  throw new Error(`Неизвестная команда «${positional[0]}». Подсказка: borshkit помощь`);
}

const invoked = process.argv[1] && (await fs.realpath(process.argv[1]).catch(() => process.argv[1]));
if (invoked && path.resolve(invoked) === path.resolve(ROOT, 'bin', 'borshkit.mjs')) {
  main().catch(error => { console.error(`Ошибка: ${error.message}`); process.exitCode = 1; });
}
