import fs from 'node:fs/promises';
import path from 'node:path';
import { assert, atomicJSON, atomicWrite, contained, exists, git, readJSON } from './io.mjs';
import { journal, saveSpace } from './space.mjs';
import { findSecrets } from './secrets.mjs';
import { converge } from './accept.mjs';

// The Git shell for a newcomer (decision D17): plain words over the installed
// git, safety first. It never runs reset --hard, a force push or a branch
// deletion; every "undo" saves a restore point first; merging and pushing are
// critical and wait for a person. Each result lists the git commands it ran,
// so "learn more" can show them.
const WHERE = { project: 'история проекта', space: 'история пространства' };
const repoOf = (space, which) => { assert(which in WHERE, 'Выбери: проект или пространство'); assert(which === 'space' || space.projectIsGit, 'У проекта нет истории Git. Заведи её: git init (или borshkit сохранить-проект после этого)'); return which === 'project' ? space.project : space.dir; };
const STATUS_WORDS = { M: 'изменён', A: 'новый', D: 'удалён', R: 'переименован', '??': 'новый (ещё не в истории)', U: 'конфликт' };

export async function history(space, { which = 'project', limit = 10 } = {}) {
  const repo = repoOf(space, which), cmd = ['log', `-${limit}`, '--format=%H%x1f%an%x1f%ad%x1f%s', '--date=format:%Y-%m-%d %H:%M'];
  let out = '';
  try { out = await git(repo, cmd); } catch { /* no commits yet */ }
  return { which, entries: out.split('\n').filter(Boolean).map(l => { const [commit, author, when, message] = l.split('\x1f'); return { commit, author, when, message }; }), git: [`git ${cmd.join(' ')}`] };
}
export async function whatChanged(space, { which = 'project' } = {}) {
  const repo = repoOf(space, which);
  const status = (await git(repo, ['status', '--porcelain=v1', '-z'])).split('\0').filter(Boolean);
  const counts = new Map();
  for (const line of (await git(repo, ['diff', 'HEAD', '--numstat']).catch(() => '')).split('\n').filter(Boolean)) {
    const [add, del, file] = line.split('\t');
    counts.set(file, { added: Number(add) || 0, removed: Number(del) || 0 });
  }
  const files = status.map(entry => {
    const code = entry.slice(0, 2).trim(), file = entry.slice(3);
    return { file, change: STATUS_WORDS[code] ?? STATUS_WORDS[code[0]] ?? code, ...(counts.get(file) ?? {}) };
  }).sort((a, b) => a.file.localeCompare(b.file));
  return { which, files, git: ['git status --porcelain', 'git diff HEAD --numstat'] };
}
export async function whoDid(space, file, { which = 'project' } = {}) {
  const repo = repoOf(space, which);
  await contained(repo, path.resolve(repo, file));
  const authors = new Map();
  const out = await git(repo, ['blame', '--line-porcelain', '--', file]);
  for (const m of out.matchAll(/^author (.+)$/gm)) authors.set(m[1], (authors.get(m[1]) ?? 0) + 1);
  const lines = [...authors.values()].reduce((a, b) => a + b, 0);
  return { which, file, lines, authors: [...authors.entries()].sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ name, lines: n, share: Math.round(n / lines * 100) })), git: [`git blame --line-porcelain -- ${file}`] };
}
/**
 * Put a file back as it was in a saved point (HEAD by default). The current
 * content is copied into the space's backups and saved there first, so the
 * undo can itself be undone.
 */
export async function restoreFile(space, file, { which = 'project', to = 'HEAD' } = {}) {
  const repo = repoOf(space, which);
  const target = await contained(repo, path.resolve(repo, file));
  const rel = path.relative(repo, target).replaceAll('\\', '/');
  assert(/^[A-Za-z0-9._/~^-]{1,80}$/.test(to), 'Точка возврата — номер сохранения');
  const commit = (await git(repo, ['rev-parse', '--verify', `${to}^{commit}`])).trim();
  const existed = await git(repo, ['cat-file', '-e', `${commit}:${rel}`]).then(() => true, () => false);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const current = await fs.readFile(target).catch(() => null);
  if (current) await atomicWrite(path.join(space.dir, 'backups', stamp, which, rel), current, { mode: 0o644 });
  await saveSpace(space, `Точка возврата перед «вернуть ${rel}»`);
  const ran = [];
  if (existed) { await git(repo, ['restore', `--source=${commit}`, '--staged', '--worktree', '--', rel]); ran.push(`git restore --source=${commit.slice(0, 8)} --staged --worktree -- ${rel}`); }
  else { await fs.rm(target, { force: true }); ran.push(`(файла не было в ${commit.slice(0, 8)} — удалён, копия сохранена)`); }
  await journal(space, `Ты вернул ${rel} (${WHERE[which]}) к состоянию ${commit.slice(0, 8)}. Прежняя версия — в backups/${stamp}.`);
  if (which === 'space') await saveSpace(space, `Вернул ${rel} к ${commit.slice(0, 8)}`);
  return { which, file: rel, to: commit, backup: current ? `backups/${stamp}/${which}/${rel}` : null, git: ran };
}
/** A restore point in the project's own history, made by the person who asked for it. */
export async function saveProject(space, message) {
  assert(typeof message === 'string' && message.trim(), 'Напиши, что изменилось');
  repoOf(space, 'project');
  await git(space.project, ['add', '-A']);
  if (!(await git(space.project, ['status', '--porcelain'])).trim()) return { commit: null, git: ['git add -A'] };
  const staged = await git(space.project, ['diff', '--cached']);
  const leaks = findSecrets(staged);
  if (leaks.length) { await git(space.project, ['reset', '-q']); throw new Error(`В изменениях похоже на ключ (${[...new Set(leaks.map(l => l.kind))].join(', ')}). Ничего не сохранено: убери ключ и повтори.`); }
  try { await git(space.project, ['commit', '-q', '-m', message.trim()]); }
  catch (e) { await git(space.project, ['reset', '-q']); throw new Error(/user\.(name|email)|identity/i.test(e.stderr ?? e.message) ? 'Git не знает твоё имя. Один раз выполни: git config --global user.name "Имя" и git config --global user.email "почта"' : e.message); }
  const commit = (await git(space.project, ['rev-parse', 'HEAD'])).trim();
  await journal(space, `Сохранена точка в истории проекта: ${commit.slice(0, 8)} — ${message.trim()}.`);
  return { commit, git: ['git add -A', `git commit -m "${message.trim()}"`] };
}
/**
 * Bring an accepted task's work from its worktree into the project. Critical:
 * only after acceptance on the current state, and only with a person's yes.
 */
export async function mergeTask(space, taskId, { confirmedByPerson = false } = {}) {
  const info = await readJSON(path.join(space.tasks, taskId, 'worktree.json')).catch(() => null);
  assert(info?.branch, `У задачи «${taskId}» нет отдельной копии — собирать нечего`);
  assert(!info.mergedAt, `Задача «${taskId}» уже собрана`);
  const report = await converge(space, taskId);
  assert(report.status === 'accepted', `Задача «${taskId}» не принята (${report.status}) — собирать рано. Смотри лист приёмки.`);
  assert(confirmedByPerson, 'Собрать изменения в основную версию может только человек в терминале');
  const dirty = (await git(space.project, ['status', '--porcelain', '--untracked-files=no'])).trim();
  assert(!dirty, 'В проекте есть несохранённые изменения. Сохрани их (borshkit сохранить-проект "…") или верни, потом собирай.');
  const before = (await git(space.project, ['rev-parse', 'HEAD'])).trim();
  try { await git(space.project, ['-c', 'user.name=Borshkit', '-c', 'user.email=space@borshkit', '-c', 'commit.gpgsign=false', 'merge', '--no-ff', '-m', `Borshkit: собрана задача «${taskId}»`, info.branch]); }
  catch (e) {
    await git(space.project, ['merge', '--abort']).catch(() => {});
    throw new Error(`Изменения задачи конфликтуют с проектом — ничего не собрано, проект как был. Подробности: ${(e.stderr ?? e.message).split('\n')[0]}`);
  }
  const after = (await git(space.project, ['rev-parse', 'HEAD'])).trim();
  await atomicJSON(path.join(space.tasks, taskId, 'worktree.json'), { ...info, mergedAt: new Date().toISOString(), mergedInto: after });
  await journal(space, `Задача «${taskId}» собрана в основную версию проекта: ${before.slice(0, 8)} → ${after.slice(0, 8)}.`);
  await saveSpace(space, `Собрана задача «${taskId}»`);
  return { taskId, before, after, git: [`git merge --no-ff ${info.branch}`] };
}
/**
 * Send the project's history to its remote. Critical: secret scan of what
 * leaves, fast-forward only (never force), and a person's yes.
 */
export async function pushProject(space, { remote = 'origin', confirmedByPerson = false } = {}) {
  repoOf(space, 'project');
  assert(/^[A-Za-z0-9._-]{1,60}$/.test(remote), 'Недопустимое имя удалённого репозитория');
  const branch = (await git(space.project, ['branch', '--show-current'])).trim();
  assert(branch, 'Сейчас не выбрана ветка — отправлять нечего');
  await git(space.project, ['remote', 'get-url', remote]).catch(() => { throw new Error(`Удалённого репозитория «${remote}» нет`); });
  let upstream = null;
  try { upstream = (await git(space.project, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'])).trim(); } catch { /* first push */ }
  if (upstream) {
    const ff = await git(space.project, ['merge-base', '--is-ancestor', upstream, 'HEAD']).then(() => true, () => false);
    assert(ff, 'На сервере есть изменения, которых нет у тебя. Borshkit не перезаписывает чужое: сначала забери их (git pull), потом отправляй.');
  }
  const range = upstream ? [`${upstream}..HEAD`] : ['HEAD'];
  const patch = await git(space.project, ['log', '-p', '--format=', ...range]);
  const leaks = findSecrets(patch);
  assert(!leaks.length, `В отправляемых изменениях похоже на ключ (${[...new Set(leaks.map(l => l.kind))].join(', ')}). Ничего не отправлено.`);
  const count = (await git(space.project, ['rev-list', '--count', ...range])).trim();
  assert(confirmedByPerson, `Отправить ${count} сохранений ветки ${branch} в ${remote}? Это может подтвердить только человек в терминале.`);
  await git(space.project, ['push', remote, `HEAD:refs/heads/${branch}`, ...(upstream ? [] : ['--set-upstream'])]);
  await journal(space, `Отправлено на ${remote}: ветка ${branch}, сохранений ${count}.`);
  return { remote, branch, commits: Number(count), git: [`git push ${remote} HEAD:${branch}`] };
}

/** A note that explains Git with examples from this very project. */
export async function explainGit(space) {
  const project = space.projectIsGit ? await history(space, { which: 'project', limit: 5 }) : { entries: [] };
  const own = await history(space, { which: 'space', limit: 5 });
  const list = h => h.entries.length ? h.entries.map(e => `- \`${e.commit.slice(0, 8)}\` ${e.when} — ${e.author}: ${e.message}`).join('\n') : '- пока нет';
  const rel = 'knowledge/learn/git.md';
  await atomicWrite(path.join(space.dir, rel), `---\nbk-type: "guide"\nbk-provenance: "EXTRACTED"\n---\n# Что такое Git — на примере этого проекта

Git — это **машина времени для файлов**. Каждое сохранение («коммит») — точка, к которой можно вернуться. У каждой точки есть автор, время и короткое описание.

## Твои последние точки

**История проекта** (код и документы):
${list(project)}

**История пространства** (настройки, знания, проверки — не покидает компьютер):
${list(own)}

## Как пользоваться через Borshkit

| Хочу | Команда | Что делает Git |
|---|---|---|
| сохранить точку | \`borshkit сохранить-проект "что изменилось"\` | \`git add -A\` + \`git commit\` |
| посмотреть изменения | \`borshkit что-изменилось\` | \`git status\`, \`git diff\` |
| узнать, кто писал файл | \`borshkit кто-что <файл>\` | \`git blame\` |
| вернуть файл как было | \`borshkit вернуть <файл>\` | \`git restore\` — сначала копия в backups/ |
| взять принятую работу агента | \`borshkit собрать <задача>\` | \`git merge --no-ff\` из отдельной копии |
| отправить на GitHub | \`borshkit отправить\` | \`git push\`, без перезаписи чужого |

Чего Borshkit никогда не делает: \`git reset --hard\`, принудительную отправку (\`--force\`) и удаление веток с несобранной работой.
`, { mode: 0o644 });
  return rel;
}
