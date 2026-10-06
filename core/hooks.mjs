import path from 'node:path';
import { inside } from './io.mjs';
import { openSpace, journal } from './space.mjs';
import { statusLine } from './dispatch.mjs';
import { listQuestions } from './questions.mjs';

// Claude Code hooks (spec §10.4): a second, advisory layer over the structural
// rules. PreToolUse refuses destructive Git, pushing around the critical
// question, and edits of the space's settings and evidence; SessionStart tells
// the session where things stand. A native session can still do anything its
// own permissions allow — this is guidance with teeth, not a sandbox.
const DESTRUCTIVE = [
  [/\bgit\s+push\b[^\n;&|]*\s(--force\b|-f\b|--force-with-lease\b|--mirror\b|--delete\b|:\S)/, 'принудительная отправка или удаление на сервере перезаписывает чужую работу'],
  [/\bgit\s+push\b/, 'отправка на GitHub — критическое действие: её делает человек командой «borshkit отправить» в терминале'],
  [/\bgit\s+reset\b[^\n;&|]*--hard\b/, '«git reset --hard» стирает несохранённую работу без возврата; используй «borshkit вернуть <файл>»'],
  [/\bgit\s+clean\b[^\n;&|]*-[a-zA-Z]*f/, '«git clean -f» удаляет файлы без копии'],
  [/\bgit\s+branch\b[^\n;&|]*\s-D\b/, 'удаление ветки может потерять несобранную работу'],
  [/\bgit\s+(checkout|restore)\b[^\n;&|]*\s(--\s+)?\.(\s|$)/, 'возврат всех файлов разом стирает работу; возвращай файлы по одному через «borshkit вернуть»'],
];
export function judgeCommand(command, folder = 'borshkit') {
  const text = String(command ?? '');
  for (const [pattern, reason] of DESTRUCTIVE) if (pattern.test(text)) return reason;
  if (new RegExp(`(^|[\\s/"'])${folder}/(settings|tasks/[^\\s/]+/evidence)\\b`).test(text) && /(>|\btee\b|\bsed\s+-i|\brm\b|\bmv\b|\bcp\b|\bdel\b|Remove-Item|Set-Content|Out-File)/.test(text)) {
    return 'настройки и доказательства Borshkit меняются только командами borshkit';
  }
  return null;
}
export function judgeFile(space, file) {
  if (!file) return null;
  const full = path.resolve(space.project, file);
  if (inside(path.join(space.dir, 'settings'), full)) return 'настройки меняются через предложения: «borshkit настройки предложить …»';
  if (/[\\/]tasks[\\/][^\\/]+[\\/](evidence|logs)[\\/]/.test(full) && inside(space.dir, full)) return 'доказательства пишет только Borshkit';
  if (inside(path.join(space.dir, '.git'), full)) return 'историю пространства ведёт Borshkit';
  return null;
}

/** Handle one hook call: input is Claude Code's JSON, the answer is JSON or nothing. */
export async function runHook(name, input) {
  const cwd = input?.cwd ?? process.cwd();
  const space = await openSpace(cwd).catch(() => null);
  if (name === 'session-start') {
    if (!space) return null;
    const questions = await listQuestions(space, { open: true });
    const lines = [await statusLine(space),
      ...questions.map(q => `${q.kind === 'critical' ? 'Критический вопрос' : 'Вопрос'} ${q.id}: ${q.text}`),
      'Это проект с пространством Borshkit (папка borshkit/). Начни с borshkit/START-HERE.md и borshkit/STATUS.md.',
      'Не правь borshkit/settings и доказательства задач — пользуйся командами borshkit. «Готово» — не приёмка: принимает Borshkit по доказательствам и человек.'];
    return { hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: lines.join('\n') } };
  }
  if (name === 'pre-tool') {
    // Outside a Borshkit project the plugin stays out of the way.
    if (!space) return null;
    const tool = input?.tool_name ?? '', args = input?.tool_input ?? {};
    let reason = null;
    if (/^(Bash|PowerShell)$/.test(tool)) reason = judgeCommand(args.command, space.folder);
    else if (/^(Write|Edit|MultiEdit|NotebookEdit)$/.test(tool)) reason = judgeFile(space, args.file_path ?? args.notebook_path);
    if (!reason) return null;
    await journal(space, `Остановлено действие агента (${tool}): ${reason}.`).catch(() => {});
    return { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: `Borshkit: ${reason}.` } };
  }
  throw new Error(`Неизвестный hook: ${name}`);
}
