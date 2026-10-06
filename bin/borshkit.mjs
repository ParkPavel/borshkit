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
import { probeExecutor, readProbes, FAILURE_WORDS } from '../core/executors.mjs';
import { runJob, resumeJob } from '../core/jobs.mjs';
import { answer, getQuestion, listQuestions, resolveDue } from '../core/questions.mjs';
import { cards, formatCards, listJobs, statusLine, writeStatusFiles } from '../core/dispatch.mjs';
import { listRoles } from '../core/roles.mjs';

const COMMANDS = { начать: 'init', статус: 'status', задача: 'task', сохранить: 'save', доктор: 'doctor', помощь: 'help', материал: 'material', приватность: 'privacy', настройки: 'settings', эксперимент: 'experiment',
  исполнители: 'executors', исполнитель: 'executor', работа: 'job', вопрос: 'question', вопросы: 'question', роли: 'roles' };
const SUB = { добавить: 'add', список: 'list', обновить: 'refresh', показать: 'show', предложить: 'propose', применить: 'apply', принять: 'accept', вернуть: 'revert', начать: 'start', ключ: 'key', завершить: 'end',
  проверить: 'probe', запустить: 'run', продолжить: 'resume', ответить: 'answer' };
const MODES = { умеренный: 'moderate', строгий: 'strict', эксперимент: 'experiment' };
const TASK = { новая: 'new', анализ: 'check', проверить: 'verify', отзыв: 'review', подтвердить: 'confirm', итог: 'converge', принять: 'accept' };
const FLAGS = { цель: 'goal', вид: 'kind', папка: 'folder', проект: 'project', 'только-локально': 'local-only', исполнитель: 'executor', результат: 'result',
  текст: 'text', название: 'title', да: 'yes', 'ключи-отозваны': 'revoked', от: 'from', причина: 'reason',
  роль: 'role', пул: 'pool', линза: 'lens', файл: 'file', следить: 'watch', строка: 'line', команда: 'command', семейство: 'provider', данные: 'data', модель: 'model' };
const LONE = ['json', 'local-only', 'yes', 'revoked', 'help', 'watch', 'line'];
// Ready-made manifests for the subscription CLIs; the data policy stays "unknown"
// until the person states it, so the strict mode will not use them by accident.
const PRESETS = {
  claude: { kind: 'claude-cli', command: 'claude', provider: 'anthropic', dataPolicy: 'unknown', structuredOutput: 'json_schema', modalities: { output: ['text', 'code'] } },
  codex: { kind: 'codex-cli', command: 'codex', provider: 'openai', dataPolicy: 'unknown', structuredOutput: 'json_schema', modalities: { output: ['text', 'code', 'image'] } },
};
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

  borshkit исполнители                  кто может работать и что показала проверка
  borshkit исполнитель добавить claude|codex [--данные no-train|trains|local] | <имя> --файл манифест.json
  borshkit исполнитель проверить <имя>  сверить установленную программу или API с тем, что нужно
  borshkit роли                         роли команды и что им нужно от исполнителя
  borshkit работа запустить <задача> --роль <роль> --исполнитель <имя> | --пул <пул> [--линза lite|full|ultra] [--файл путь]
  borshkit работа список | продолжить <работа> [--исполнитель <имя> | --пул <пул>]
  borshkit вопросы | вопрос ответить <номер> <вариант>   критические — только в терминале
  borshkit статус --следить | --строка  диспетчерская: кому ушло, кто работает

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

async function job([rawSub, ...rest], flags) {
  const sub = SUB[rawSub] ?? rawSub ?? 'list';
  const space = await open(flags);
  if (sub === 'list') return print(flags, await listJobs(space), formatCards(await cards(space, { recent: 20 })));
  const opts = { executor: typeof flags.executor === 'string' ? flags.executor : null, pool: typeof flags.pool === 'string' ? flags.pool : null };
  let j;
  if (sub === 'run') {
    assert(rest[0] && typeof flags.role === 'string', 'Формат: borshkit работа запустить <задача> --роль <роль> --исполнитель <имя> | --пул <пул>');
    j = await runJob(space, { taskId: rest[0], role: flags.role, ...opts, lens: typeof flags.lens === 'string' ? flags.lens : null, imagePath: typeof flags.file === 'string' ? flags.file : null });
  } else if (sub === 'resume') j = await resumeJob(space, rest[0], opts);
  else throw new Error('Действие — запустить, список или продолжить');
  const words = { COMPLETED: '🟢 готово', FAILED: '🔴 ошибка', STOPPED: '⏹ остановлено', WAITING_HUMAN: '⛔ ждёт тебя' };
  print(flags, j, `${words[j.status] ?? j.status} · работа ${j.id} · исполнитель: ${j.executor ?? '—'}${j.attempts.some(a => a.outcome !== 'ok') ? `\nПопытки: ${j.attempts.map(a => `${a.executor} — ${a.outcome === 'ok' ? 'ок' : FAILURE_WORDS[a.failure] ?? a.outcome}`).join(' → ')}` : ''}${j.status === 'WAITING_HUMAN' ? `\nОтчёт: ${path.join(space.tasks, j.taskId, 'stop-report.md')}` : ''}${j.status === 'COMPLETED' ? `\nДальше: borshkit задача итог ${j.taskId}` : ''}`);
  if (j.status !== 'COMPLETED') process.exitCode = 1;
}
async function question([rawSub, id, option], flags) {
  const sub = SUB[rawSub] ?? rawSub ?? 'list';
  const space = await open(flags);
  if (sub === 'list') {
    const open_ = await listQuestions(space, { open: true });
    return print(flags, open_, open_.length ? open_.map(q => `${q.kind === 'critical' ? '⛔' : '❓'} ${q.id}: ${q.text}\n   варианты: ${q.options.map(o => `${o.id} — ${o.label}`).join('; ')}${q.defaultOption ? ` (по умолчанию: ${q.defaultOption})` : ''}`).join('\n') : 'Открытых вопросов нет.');
  }
  if (sub === 'answer') {
    const q = await getQuestion(space, id);
    const confirmed = q.kind === 'critical' ? await confirmPerson(`Критический вопрос: ${q.text}\nТвой ответ: ${option}`, 'да') : false;
    assert(q.kind !== 'critical' || confirmed, PERSON_ONLY);
    const r = await answer(space, id, option, { confirmedByPerson: confirmed });
    return print(flags, r, `Ответ записан.${q.jobId && q.kind === 'critical' && option !== 'stop' ? ` Продолжить работу: borshkit работа продолжить ${q.jobId}` : ''}`);
  }
  throw new Error('Действие — список или ответить');
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
  if (command === 'status') {
    const space = await open(flags);
    if (flags.line) return console.log(await statusLine(space));
    if (flags.watch) {
      for (;;) {
        await resolveDue(space);
        await writeStatusFiles(space);
        process.stdout.write('\x1b[2J\x1b[H' + `${await statusLine(space)}\n\n${formatCards(await cards(space))}\n\n(Ctrl+C — выйти)\n`);
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    const s = await spaceStatus(space);
    const work = await cards(space, { recent: 3 });
    return print(flags, { ...s, jobs: work }, `${formatStatus(s)}${work.length ? `\n\nРаботы:\n${formatCards(work)}` : ''}`);
  }
  if (command === 'executors') {
    const space = await open(flags), probes = await readProbes(space);
    const list = Object.entries(space.settings.executors ?? {}).map(([id, e]) => ({ id, ...e, probe: probes[id] ?? null }));
    return print(flags, list, list.length ? list.map(e => `${e.probe ? (e.probe.ok ? '✅' : '❌') : '⚪'} ${e.id} · ${e.kind} · ${e.provider} · данные: ${e.dataPolicy} · выход: ${e.modalities.output.join(', ')}${e.probe && !e.probe.ok ? ` · ${e.probe.missing.join('; ')}` : ''}`).join('\n')
      + `${Object.keys(space.settings.pools ?? {}).length ? `\nПулы: ${Object.entries(space.settings.pools).map(([n, p]) => `${n} = ${p.members.join(' → ')}`).join('; ')}` : ''}` : 'Исполнителей пока нет. Добавь: borshkit исполнитель добавить claude');
  }
  if (command === 'executor') {
    const [rawSub, id] = positional.slice(1), sub = SUB[rawSub] ?? rawSub;
    const space = await open(flags);
    assert(id, 'Укажи имя исполнителя');
    if (sub === 'probe') { const p = await probeExecutor(space, id); return print(flags, p, p.ok ? `✅ ${id} готов${p.version ? ` (${p.version})` : ''}` : `❌ ${id}: ${p.missing.join('; ')}`); }
    if (sub === 'add') {
      const manifest = typeof flags.file === 'string' ? await readJSON(path.resolve(flags.file)) : { ...PRESETS[id] };
      assert(manifest && manifest.kind, `Готовые исполнители: ${Object.keys(PRESETS).join(', ')}; для остальных — --файл манифест.json`);
      for (const [flag, key] of [['command', 'command'], ['provider', 'provider'], ['data', 'dataPolicy'], ['model', 'model']]) if (typeof flags[flag] === 'string') manifest[key] = flags[flag];
      const proposal = await proposeSettings(space, { executors: { ...(space.settings.executors ?? {}), [id]: manifest } }, { reason: `добавить исполнителя ${id}` });
      const confirmed = await confirmPerson(`Добавить исполнителя ${id}: ${proposal.weakens.join('; ')}`, 'да, ослабить');
      assert(confirmed, `${PERSON_ONLY} Предложение сохранено: ${proposal.id}`);
      await applyProposal(space, proposal.id, { confirmedByPerson: true });
      const p = await probeExecutor(space, id);
      return print(flags, p, `Исполнитель ${id} добавлен. Проверка: ${p.ok ? 'пройдена' : p.missing.join('; ')}`);
    }
    throw new Error('Действие — добавить или проверить');
  }
  if (command === 'roles') {
    const roles = await listRoles();
    return print(flags, roles.map(({ prompt, ...r }) => r), roles.map(r => `${r.id} — ${r.title} · ${r.authority === 'workspace-write' ? 'пишет в копию проекта' : 'только читает'} · ответ: ${r.output}${r.crossProvider ? ' · нужна другая семья моделей, чем у автора' : ''}`).join('\n'));
  }
  if (command === 'job') return job(positional.slice(1), flags);
  if (command === 'question') return question(positional.slice(1), flags);
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
