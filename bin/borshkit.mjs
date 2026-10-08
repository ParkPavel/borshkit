#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { ROOT, assert, contained, readJSON, sha } from '../core/io.mjs';
import { DEFAULT_FOLDER, initSpace, openSpace, saveSpace, trusted } from '../core/space.mjs';
import { checkTask, newTask } from '../core/contract.mjs';
import { STATUS_WORDS, confirmItem, converge, recordReview, signOff, verifyAll, verifyCheck } from '../core/accept.mjs';
import { doctor, formatStatus, spaceStatus } from '../core/status.mjs';
import { addMaterial, listMaterials, refreshMaterial } from '../core/materials.mjs';
import { acceptManualEdit, applyProposal, checkProposal, proposeSettings, revertSettings } from '../core/config.mjs';
import { endExperiment, recordKey, startExperiment } from '../core/experiment.mjs';
import { PRIVACY_WORDS, STRICTNESS } from '../core/privacy.mjs';
import readline from 'node:readline/promises';
import { probeExecutor, readProbes, validateExecutor, FAILURE_WORDS } from '../core/executors.mjs';
import { formatPlan, formatTeam, planTeam, proposeTeam, writeTeamFiles } from '../core/team.mjs';
import { executorFingerprint, recordResources } from '../core/resources.mjs';
import { runJob, resumeJob } from '../core/jobs.mjs';
import { answer, getQuestion, listQuestions, resolveDue } from '../core/questions.mjs';
import { cards, formatCards, listJobs, statusLine, writeStatusFiles } from '../core/dispatch.mjs';
import { listPacks, listRoles, loadPack, loadRole, roleFingerprint } from '../core/roles.mjs';
import { buildKnowledge, exportForGithub, knowledgeSQL, lessonFromTask, queryKnowledge, searchKnowledge, taskContext } from '../core/kb.mjs';
import { attributionCheck, contributorsFromGit, contributorsReport, readmeAssetsCheck, writeContributors } from '../core/attribution.mjs';
import { runCommand } from '../core/process.mjs';
import { explainGit, history, mergeTask, updateTask, pushProject, restoreFile, saveProject, whatChanged, whoDid } from '../core/gitshell.mjs';
import { runHook } from '../core/hooks.mjs';
import { evaluate, measureTrust, proposeTrust } from '../core/eval.mjs';

const COMMANDS = { начать: 'init', статус: 'status', задача: 'task', сохранить: 'save', доктор: 'doctor', помощь: 'help', материал: 'material', приватность: 'privacy', настройки: 'settings', эксперимент: 'experiment',
  исполнители: 'executors', исполнитель: 'executor', работа: 'job', вопрос: 'question', вопросы: 'question', роли: 'roles', знания: 'knowledge', атрибуция: 'attribution',
  оценка: 'eval', hook: 'hook', история: 'history', 'что-изменилось': 'changes', 'кто-что': 'who', вернуть: 'restore', 'сохранить-проект': 'save-project', собрать: 'merge', отправить: 'push',
  навыки: 'skills', библиотека: 'library', команда: 'team', ресурсы: 'resources' };
const WHICH = { проект: 'project', пространство: 'space', project: 'project', space: 'space' };
const SUB = { добавить: 'add', список: 'list', обновить: 'refresh', показать: 'show', предложить: 'propose', применить: 'apply', принять: 'accept', вернуть: 'revert', начать: 'start', ключ: 'key', завершить: 'end',
  проверить: 'probe', запустить: 'run', продолжить: 'resume', ответить: 'answer', собрать: 'build', найти: 'search', контекст: 'context', урок: 'lesson', экспорт: 'export', контрибьюторы: 'contributors', картинки: 'assets', план: 'plan', записать: 'record', оценить: 'qualify', отпечаток: 'fingerprint' };
const MODES = { умеренный: 'moderate', строгий: 'strict', эксперимент: 'experiment' };
const TASK = { новая: 'new', анализ: 'check', проверить: 'verify', отзыв: 'review', подтвердить: 'confirm', итог: 'converge', принять: 'accept', обновить: 'update' };
const FLAGS = { цель: 'goal', вид: 'kind', папка: 'folder', проект: 'project', 'только-локально': 'local-only', исполнитель: 'executor', результат: 'result',
  текст: 'text', название: 'title', да: 'yes', 'ключи-отозваны': 'revoked', от: 'from', причина: 'reason', через: 'via', манифест: 'manifest', readme: 'readme',
  роль: 'role', роли: 'roles', срок: 'until', пул: 'pool', клоны: 'clones', к: 'to', скрытые: 'hidden', порог: 'threshold', сколько: 'limit', удалённый: 'remote', линза: 'lens', файл: 'file', следить: 'watch', строка: 'line', команда: 'command', семейство: 'provider', данные: 'data', модель: 'model', навыки: 'skills', 'в-папке': 'in-place' };
const LONE = ['json', 'local-only', 'yes', 'revoked', 'help', 'watch', 'line', 'in-place'];
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
  borshkit задача отзыв <имя> --результат файл.json --исполнитель codex [--семейство openai]   импорт: PASS остаётся за тобой
  borshkit задача итог <имя>            сверить и написать лист приёмки
  borshkit задача подтвердить <имя> <критерий> да|нет "что видел"
  borshkit задача принять <имя> ["заметка"]   общая приёмка (политика manual)
  borshkit задача обновить <имя>       влить основную версию в копию задачи (перед сборкой, если она ушла вперёд)

  borshkit материал добавить <файл> | --url адрес [--через jina] [--да] | --текст "…" | --команда "yt-dlp …" [--url адрес]  [--название "…"]
  borshkit материал список | обновить <id>
  borshkit приватность [умеренный|строгий|эксперимент]   ослабление — только в терминале
  borshkit настройки показать | предложить <файл.json> --от <агент> --причина "…" | применить <p001>
  borshkit настройки принять | вернуть          ручная правка настроек: принять или откатить
  borshkit эксперимент начать | ключ <ИМЯ_ПЕРЕМЕННОЙ> | завершить [--ключи-отозваны]

  borshkit исполнители                  кто может работать и что показала проверка
  borshkit исполнитель добавить claude|codex [--данные no-train|trains|local] | <имя> --файл манифест.json
  borshkit исполнитель проверить <имя>  сверить установленную программу или API с тем, что нужно
  borshkit исполнитель отпечаток <имя>
  borshkit исполнитель оценить <имя> --роль <роль> --файл assessments/role.md --результат PASS|FAIL --срок <ISO-дата>
      предложить запись оценки роли; модель должна быть явно закреплена
  borshkit команда [показать]           модели, подключение, оценки ролей и ресурсы; TEAM.md
  borshkit команда план|предложить <задача> [--роли architect,implementer,reviewer]
      объяснимое распределение; предложение настроек не запускает работы
  borshkit ресурсы записать <исполнитель> --файл ресурсы.json
      актуальное наблюдение остатка; секреты не сохраняются
  borshkit роли                         роли команды, их навыки и что им нужно от исполнителя
  borshkit навыки [пакет]               пакеты навыков (Ponytail, Emil Kowalski, ECC) и что в них
  borshkit библиотека [категория]       проверенные ссылки: компоненты, анимация, дизайн-системы, доступность …
  borshkit работа запустить <задача> --роль <роль> --исполнитель <имя> | --пул <пул> [--линза lite|full|ultra] [--навыки emil/animate,ecc/react-patterns] [--файл путь] [--в-папке]
  borshkit работа список | продолжить <работа> [--исполнитель <имя> | --пул <пул>]
  borshkit вопросы | вопрос ответить <номер> <вариант>   критические — только в терминале
  borshkit статус --следить | --строка  диспетчерская: кому ушло, кто работает

  borshkit знания собрать               карта проекта: заметки с [[связями]] для Obsidian и SQL-индекс
  borshkit знания sql "SELECT …"        запрос только на чтение (таблицы notes, links, fts; виды stale, orphans, …)
  borshkit знания найти <слова> | контекст <задача> | урок <задача> "что поняли" | экспорт [папка] | экспорт --sql граф.sql

  borshkit атрибуция проверить [--манифест third-party.json] [--readme README.md]   благодарности и лицензии
  borshkit атрибуция картинки [--readme README.md]          изображения README: есть, с alt-текстом, не тяжёлые
  borshkit атрибуция контрибьюторы [владелец/репо …] [--файл CONTRIBUTORS-REFERENCES.md] [--да] | --клоны путь1,путь2 (без API)

  Git простыми словами (проект — по умолчанию; добавь «пространство» для истории пространства):
  borshkit история [пространство] [--сколько 10] | история объяснить
  borshkit что-изменилось [пространство]      borshkit кто-что <файл> [пространство]
  borshkit вернуть <файл> [пространство] [--к <сохранение>]   сначала копия в backups/, потом возврат
  borshkit сохранить-проект "что изменилось"   точка в истории проекта (с проверкой на ключи)
  borshkit собрать <задача>                   принятую работу агента — в основную версию (только в терминале)
  borshkit отправить [--удалённый origin]     на GitHub, без перезаписи чужого (только в терминале)

  borshkit оценка запустить --скрытые скрытые.json   ложные PASS, вмешательства, время, расход
  borshkit оценка доверие <метка> [--семейство openai] [--порог 0.05]   насколько можно верить «готово» модели этого семейства

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
  if (sub === 'update') {
    const r = await updateTask(space, taskId);
    return print(flags, r, r.updated ? `В копию задачи «${taskId}» влита основная версия ${r.head.slice(0, 8)}.\nДальше: borshkit задача проверить ${taskId}, затем borshkit задача итог ${taskId}` : `Копия задачи уже содержит основную версию — обновлять нечего.`);
  }
  if (sub === 'review') {
    assert(typeof flags.result === 'string', 'Укажи файл результата: --результат review.json');
    const r = await recordReview(space, taskId, { executor: flags.executor, provider: typeof flags.provider === 'string' ? flags.provider : null, result: await readJSON(path.resolve(flags.result)) });
    return print(flags, r, `Записано ответов ревью: ${r.saved.length}${r.ignored.length ? `; пропущены (не критерии класса model): ${r.ignored.join(', ')}` : ''}\nЭто импорт из файла: «не выполнено» вернёт задачу на исправление, а «выполнено» останется пунктом для тебя — Borshkit не видел, на каком состоянии делалось ревью. Ревью, которое считается само: borshkit работа запустить ${taskId} --роль reviewer --исполнитель <имя>`);
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
    const command = typeof flags.command === 'string' ? flags.command.match(/"[^"]*"|'[^']*'|\S+/g).map(a => a.replace(/^["']|["']$/g, '')) : null;
    const r = await addMaterial(space, { file: rest[0] ?? undefined, url: typeof flags.url === 'string' ? flags.url : undefined, text: typeof flags.text === 'string' ? flags.text : undefined,
      command, via: typeof flags.via === 'string' ? flags.via : null, title: typeof flags.title === 'string' ? flags.title : null, confirm: flags.yes === true });
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
    const proposal = await checkProposal(space, rest[0]);
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

async function knowledge([rawSub, ...rest], flags) {
  const sub = SUB[rawSub] ?? rawSub ?? 'build';
  const space = await open(flags);
  if (sub === 'build') {
    const r = await buildKnowledge(space);
    return print(flags, r, `Карта собрана: заметок ${r.notes} (твоих ${r.human}), связей ${r.links}.${r.stale.length ? `\nУстарели уроки: ${r.stale.join(', ')}` : ''}\nОткрой в Obsidian: ${path.join(space.dir, 'knowledge', '_generated', 'index.md')}`);
  }
  if (sub === 'sql') { const rows = await queryKnowledge(space, rest.join(' ')); return print(flags, rows, rows.length ? rows.map(r => Object.values(r).join(' | ')).join('\n') : 'Пусто.'); }
  if (sub === 'search') { const rows = await searchKnowledge(space, rest.join(' ')); return print(flags, rows, rows.length ? rows.map(r => `${r.title} — ${r.id}`).join('\n') : 'Ничего не найдено.'); }
  if (sub === 'context') { const text = await taskContext(space, rest[0]); return print(flags, { context: text }, text ?? 'Контекста нет: собери знания (borshkit знания собрать) или проверь границы задачи.'); }
  if (sub === 'lesson') { const rel = await lessonFromTask(space, rest[0], rest.slice(1).join(' ')); return print(flags, { note: rel }, `Урок записан: ${rel}. Он устареет сам, если изменится код, о котором он.`); }
  if (sub === 'export' && typeof flags.sql === 'string') {
    const out = path.resolve(flags.sql);
    await fs.writeFile(out, await knowledgeSQL(space));
    return print(flags, { file: out }, `Граф знаний записан как SQL: ${out}\nЗагрузить: sqlite3 graph.db < ${path.basename(out)}`);
  }
  if (sub === 'export') {
    const out = path.resolve(rest[0] ?? path.join(space.project, 'docs', 'knowledge'));
    const files = await exportForGithub(space, out);
    return print(flags, files, `Скопировано заметок: ${files.length} → ${out}\nЭто папка проекта: сохрани её в истории проекта, если хочешь опубликовать.`);
  }
  throw new Error('Действие — собрать, sql, найти, контекст, урок или экспорт');
}
async function attribution([rawSub, ...rest], flags) {
  const sub = SUB[rawSub] ?? rawSub ?? 'probe';
  // These checks are useful in any repository, with or without a space.
  const space = await open(flags).catch(() => ({ project: process.cwd(), settings: { privacy: 'moderate' } }));
  const check = { manifest: typeof flags.manifest === 'string' ? flags.manifest : undefined, readme: typeof flags.readme === 'string' ? flags.readme : undefined };
  if (sub === 'probe' || sub === 'assets') {
    const r = await (sub === 'probe' ? attributionCheck : readmeAssetsCheck)(space, null, check);
    print(flags, r, r.log.trim() || 'Проверять нечего.');
    if (r.status !== 'PASS') process.exitCode = 1;
    return;
  }
  if (sub === 'contributors') {
    let repos = rest;
    if (!repos.length) {
      const manifest = await readJSON(path.resolve(space.project, check.manifest ?? 'third-party.json')).catch(() => []);
      repos = manifest.map(e => /github\.com\/([\w.-]+\/[\w.-]+?)(?:\.git)?\/?$/.exec(e.url ?? '')?.[1]).filter(Boolean);
    }
    // --клоны путь1,путь2 — без доступа к API: из истории локальных клонов.
    const result = typeof flags.clones === 'string'
      ? await Promise.all(flags.clones.split(',').map(async dir => contributorsFromGit(path.resolve(dir), (/github\.com[/:]([\w.-]+\/[\w.-]+?)(?:\.git)?$/.exec((await runCommand('git', ['-C', path.resolve(dir), 'remote', 'get-url', 'origin'])).stdout.trim())?.[1]) ?? path.basename(dir))))
      : await contributorsReport(space, repos, { confirm: flags.yes === true });
    const file = await writeContributors(space, result, typeof flags.file === 'string' ? flags.file : 'CONTRIBUTORS-REFERENCES.md');
    return print(flags, result, `Контрибьюторов: ${result.reduce((n, r) => n + r.people.length, 0)} в ${result.length} проектах → ${file}`);
  }
  throw new Error('Действие — проверить, картинки или контрибьюторы');
}
async function gitShell(command, args, flags) {
  const space = await open(flags);
  const which = WHICH[args.find(a => a in WHICH)] ?? 'project';
  const rest = args.filter(a => !(a in WHICH));
  const learn = r => r.git?.length ? `\n\nПодробнее (что сделал Git): ${r.git.join('; ')}` : '';
  if (command === 'history') {
    if (rest[0] === 'объяснить' || rest[0] === 'explain') { const rel = await explainGit(space); return print(flags, { note: rel }, `Объяснение с примерами из твоего проекта: ${path.join(space.dir, rel)}`); }
    const r = await history(space, { which, limit: Number(flags.limit) || 10 });
    return print(flags, r, r.entries.length ? `${which === 'space' ? 'История пространства' : 'История проекта'}:\n${r.entries.map(e => `  ${e.commit.slice(0, 8)}  ${e.when}  ${e.author}: ${e.message}`).join('\n')}${learn(r)}` : 'Сохранений пока нет.');
  }
  if (command === 'changes') {
    const r = await whatChanged(space, { which });
    return print(flags, r, r.files.length ? `Изменено после последнего сохранения:\n${r.files.map(f => `  ${f.change}: ${f.file}${f.added !== undefined ? ` (+${f.added} −${f.removed})` : ''}`).join('\n')}${learn(r)}` : 'Всё сохранено, изменений нет.');
  }
  if (command === 'who') {
    assert(rest[0], 'Укажи файл: borshkit кто-что src/app.js');
    const r = await whoDid(space, rest[0], { which });
    return print(flags, r, `${r.file}, строк: ${r.lines}\n${r.authors.map(a => `  ${a.name} — ${a.lines} (${a.share}%)`).join('\n')}${learn(r)}`);
  }
  if (command === 'restore') {
    assert(rest[0], 'Укажи файл: borshkit вернуть src/app.js');
    const r = await restoreFile(space, rest[0], { which, to: typeof flags.to === 'string' ? flags.to : 'HEAD' });
    return print(flags, r, `Файл ${r.file} возвращён к ${r.to.slice(0, 8)}.${r.backup ? ` Прежняя версия сохранена: ${r.backup}` : ''}${learn(r)}`);
  }
  if (command === 'save-project') {
    const r = await saveProject(space, rest.join(' '));
    return print(flags, r, r.commit ? `Точка сохранена: ${r.commit.slice(0, 8)}${learn(r)}` : 'Нечего сохранять: изменений нет.');
  }
  if (command === 'merge') {
    assert(rest[0], 'Укажи задачу: borshkit собрать <задача>');
    const confirmed = await confirmPerson(`Собрать изменения задачи «${rest[0]}» в основную версию проекта?`, 'да');
    assert(confirmed, PERSON_ONLY);
    const r = await mergeTask(space, rest[0], { confirmedByPerson: true });
    return print(flags, r, `Собрано: ${r.before.slice(0, 8)} → ${r.after.slice(0, 8)}${learn(r)}`);
  }
  if (command === 'push') {
    const remote = typeof flags.remote === 'string' ? flags.remote : 'origin';
    const confirmed = await confirmPerson(`Отправить текущую ветку в ${remote}?`, 'да');
    assert(confirmed, PERSON_ONLY);
    const r = await pushProject(space, { remote, confirmedByPerson: true });
    return print(flags, r, `Отправлено: ветка ${r.branch}, сохранений ${r.commits}${learn(r)}`);
  }
}
async function job([rawSub, ...rest], flags) {
  const sub = SUB[rawSub] ?? rawSub ?? 'list';
  const space = await open(flags);
  if (sub === 'list') return print(flags, await listJobs(space), formatCards(await cards(space, { recent: 20 })));
  const opts = { executor: typeof flags.executor === 'string' ? flags.executor : null, pool: typeof flags.pool === 'string' ? flags.pool : null };
  let j;
  if (sub === 'run') {
    assert(rest[0] && typeof flags.role === 'string', 'Формат: borshkit работа запустить <задача> --роль <роль> --исполнитель <имя> | --пул <пул>');
    const inPlace = flags['in-place'] === true && await confirmPerson('Проект без Git: агент будет менять файлы прямо в папке проекта, без отдельной копии и без отката через Git. Продолжить?', 'да, в папке');
    assert(flags['in-place'] !== true || inPlace, PERSON_ONLY);
    j = await runJob(space, { taskId: rest[0], role: flags.role, ...opts, inPlace, lens: typeof flags.lens === 'string' ? flags.lens : null,
      skills: typeof flags.skills === 'string' ? flags.skills.split(',').map(x => x.trim()).filter(Boolean) : [], imagePath: typeof flags.file === 'string' ? flags.file : null });
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
    await writeTeamFiles(space);
    return print(flags, report, lines.join('\n'));
  }
  if (command === 'status') {
    const space = await open(flags);
    if (flags.line) return console.log(await statusLine(space));
    if (flags.watch) {
      for (;;) {
        space.settings = (await open(flags)).settings;
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
  if (command === 'team' || command === 'resources') {
    const space = await open(flags), sub = SUB[positional[1]] ?? positional[1] ?? 'show';
    if (command === 'resources' && sub === 'record') {
      assert(typeof flags.file === 'string', 'Укажи --файл с наблюдением ресурсов');
      const r = await recordResources(space, positional[2], await readJSON(path.resolve(flags.file)));
      await writeTeamFiles(space);
      return print(flags, r, 'Наблюдение записано. Настройки не изменены, работы не запущены.');
    }
    if (sub === 'show' || sub === 'list') {
      const catalog = await writeTeamFiles(space);
      return print(flags, catalog, formatTeam(catalog));
    }
    assert(command === 'team' && ['plan', 'propose'].includes(sub), 'Действие — показать, план, предложить или ресурсы записать');
    assert(positional[2], 'Укажи задачу');
    const options = { taskId: positional[2], ...(typeof flags.roles === 'string' ? { roles: flags.roles.split(',').map(s => s.trim()) } : {}) };
    if (sub === 'plan') { const p = await planTeam(space, options); return print(flags, p, formatPlan(p)); }
    const r = await proposeTeam(space, options, { from: typeof flags.from === 'string' ? flags.from : 'человек' });
    return print(flags, r, `${formatPlan(r.plan)}\n\nПредложение ${r.proposal.id} до ${r.proposal.expiresAt}. Применить: borshkit настройки применить ${r.proposal.id}\nПосле применения запуск каждой роли выполняется отдельно через --пул team-<роль>.`);
  }
  if (command === 'executor') {
    const [rawSub, id] = positional.slice(1), sub = SUB[rawSub] ?? rawSub;
    const space = await open(flags);
    assert(id, 'Укажи имя исполнителя');
    if (sub === 'probe') { const p = await probeExecutor(space, id); return print(flags, p, p.ok ? `✅ ${id}: подключение проверено до ${p.expiresAt}${p.version ? ` (${p.version})` : ''}; качество роли не оценивалось` : `❌ ${id}: ${p.missing.join('; ')}`); }
    if (sub === 'fingerprint') { assert(space.settings.executors[id], 'Исполнитель не объявлен'); return console.log(executorFingerprint(space.settings.executors[id])); }
    if (sub === 'qualify') {
      const e = space.settings.executors[id];
      assert(e && typeof flags.role === 'string' && typeof flags.file === 'string' && typeof flags.until === 'string', 'Нужны исполнитель, --роль, --файл и --срок');
      assert((await listRoles()).some(r => r.id === flags.role), 'Неизвестная роль');
      const evidence = path.relative(space.project, path.resolve(flags.file)).replaceAll('\\', '/');
      const q = { result: flags.result, at: new Date().toISOString(), expiresAt: flags.until, evidence, evidenceSha: '0'.repeat(64), fingerprint: executorFingerprint(e), roleDigest: await roleFingerprint(await loadRole(flags.role)) };
      validateExecutor(id, { ...e, qualifications: { ...e.qualifications, [flags.role]: q } });
      q.evidenceSha = sha(await fs.readFile(await contained(space.project, path.resolve(flags.file))));
      const p = await proposeSettings(space, { executors: { [id]: { qualifications: { [flags.role]: q } } } }, { reason: `заявленная оценка ${id}/${flags.role}` });
      return print(flags, p, `Оценка предложена (${p.id}); живой benchmark не запускался. Применить: borshkit настройки применить ${p.id}`);
    }
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
    return print(flags, roles.map(({ prompt, ...r }) => r), roles.map(r => `${r.id} — ${r.title} · ${r.authority === 'workspace-write' ? 'пишет в копию проекта' : 'только читает'} · ответ: ${r.output}${r.crossProvider ? ' · нужна другая семья моделей, чем у автора' : ''}${r.packs.length ? `\n    навыки: ${r.packs.join(', ')}` : ''}`).join('\n'));
  }
  if (command === 'skills') {
    const packs = positional[1] ? [await loadPack(positional[1])] : await listPacks();
    return print(flags, packs, packs.map(p => [`${p.id} — ${p.title} · ${p.license} · ${p.source} @ ${p.commit.slice(0, 7)}`,
      ...Object.entries(p.skills).map(([id, s]) => `  ${p.id}/${id} — ${s.when}`)].join('\n')).join('\n\n') + '\n\nДобавить навык к работе: borshkit работа запустить <задача> --роль <роль> … --навыки пакет/навык');
  }
  if (command === 'library') {
    const catalog = await readJSON(path.join(ROOT, 'library', 'catalog.json'));
    const want = positional[1];
    const entries = catalog.entries.filter(e => !want || e.category === want || e.id === want);
    assert(entries.length, `Нет такой категории. Есть: ${[...new Set(catalog.entries.map(e => e.category))].join(', ')}`);
    const groups = Map.groupBy(entries, e => e.category);
    return print(flags, entries, [...groups].map(([cat, list]) => [`## ${catalog.categories?.[cat] ?? cat}`, ...list.map(e => `  ${e.title} — ${e.url}\n    ${e.what}${e.license && e.license !== 'see-site' ? ` (${e.license})` : ''}`)].join('\n')).join('\n\n') + `\n\nПроверено ${catalog.checkedAt}. Полный список с пояснениями: library/README.md`);
  }
  if (command === 'knowledge') return knowledge(positional.slice(1), flags);
  if (command === 'attribution') return attribution(positional.slice(1), flags);
  if (command === 'hook') {
    let raw = '';
    for await (const chunk of process.stdin) raw += chunk;
    const out = await runHook(positional[1], raw.trim() ? JSON.parse(raw) : {});
    if (out) console.log(JSON.stringify(out));
    return;
  }
  if (command === 'eval') {
    const space = await open(flags), sub = positional[1];
    if (sub === 'запустить' || sub === 'run') {
      assert(typeof flags.hidden === 'string', 'Укажи файл скрытых проверок: --скрытые eval/hidden.json');
      const r = await evaluate(space, await readJSON(path.resolve(flags.hidden)));
      return print(flags, r, `Задач: ${r.summary.tasks} · принято: ${r.summary.accepted} · ложных PASS: ${r.summary.falsePass} · вмешательств: ${r.summary.interventions}\nОтчёт: ${path.join(space.dir, 'eval')}`);
    }
    if (sub === 'доверие' || sub === 'trust') {
      const tag = positional[2];
      const family = typeof flags.provider === 'string' ? flags.provider : undefined;
      if (flags.threshold === undefined) {
        const m = await measureTrust(space, tag, { provider: family });
        const lines = Object.entries(m.byProvider).map(([p, x]) => `  ${p}: ложных «готово» ${x.falsePass} из ${x.runs}`);
        return print(flags, m, m.runs ? [`«${tag}»: ложных «готово» ${m.falsePass} из ${m.runs} (${Math.round(m.rate * 100)}%), с учётом случайности — до ${Math.round(m.upperBound * 1000) / 10}%`, ...lines,
          ...(m.skipped ? [`Не засчитано: ${m.skipped} (импортированные ревью или ответ человека на изменённые файлы)`] : [])].join('\n') : `Для «${tag}» сравнений с человеком пока нет.`);
      }
      const p = await proposeTrust(space, tag, { maxFalsePassRate: Number(flags.threshold), provider: family });
      return print(flags, p, `Предложение ${p.id}: ${p.changes.map(c => c.key).join(', ')}. Применить (только в терминале): borshkit настройки применить ${p.id}`);
    }
    throw new Error('Действие — запустить или доверие');
  }
  if (['history', 'changes', 'who', 'restore', 'save-project', 'merge', 'push'].includes(command)) return gitShell(command, positional.slice(1), flags);
  if (command === 'job') return job(positional.slice(1), flags);
  if (command === 'question') return question(positional.slice(1), flags);
  if (command === 'doctor') {
    const space = await openSpace(process.cwd(), { folder: flags.folder ?? DEFAULT_FOLDER, allowBrokenSettings: true }).catch(() => null);
    const checks = await doctor(space);
    if (!space) checks.push({ ok: false, text: 'Пространство не найдено', fix: 'запусти «borshkit начать» в корне проекта' });
    try {
      const report = JSON.parse((await runCommand('agent-reach', ['doctor', '--json'], { timeout: 60000 })).stdout);
      const channels = Object.values(report.channels ?? report);
      checks.push({ ok: true, text: `Agent Reach: каналов работает ${channels.filter(c => c?.status === 'ok').length} из ${channels.length}` });
    } catch { checks.push({ ok: true, text: 'Agent Reach не установлен — исследования только по добавленным материалам', fix: null }); }
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
