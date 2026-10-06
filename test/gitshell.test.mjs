import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ROOT, git, readJSON } from '../core/io.mjs';
import { explainGit, history, mergeTask, pushProject, restoreFile, saveProject, whatChanged, whoDid } from '../core/gitshell.mjs';
import { applyProposal, proposeSettings } from '../core/config.mjs';
import { runJob } from '../core/jobs.mjs';
import { verifyAll } from '../core/accept.mjs';
import { commit, node, space, task, tempDir, write } from './helpers.mjs';

const ID = ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid'];
// Git on Windows may check files out with CRLF (core.autocrlf); compare text, not line endings.
const read = async file => (await fs.readFile(file, 'utf8')).replace(/\r\n/g, '\n');
async function identity(dir) { await git(dir, ['config', 'user.name', 'Ты']); await git(dir, ['config', 'user.email', 'you@example.invalid']); }

test('history, what changed and who did it, in plain words with the git commands behind them', async t => {
  const s = await space(t);
  await identity(s.project);
  await write(s.project, { 'src/app.js': 'export const answer = 42;\nexport const more = 1;\n' });
  const changed = await whatChanged(s);
  assert.deepEqual(changed.files.map(f => [f.file, f.change, f.added]), [['.gitignore', 'новый (ещё не в истории)', undefined], ['src/app.js', 'изменён', 1]]);
  const saved = await saveProject(s, 'Добавил more');
  assert.ok(saved.commit);
  const h = await history(s, { limit: 2 });
  assert.deepEqual(h.entries.map(e => [e.author, e.message]), [['Ты', 'Добавил more'], ['Test', 'start']]);
  const who = await whoDid(s, 'src/app.js');
  assert.deepEqual(who.authors.map(a => [a.name, a.lines, a.share]), [['Test', 1, 50], ['Ты', 1, 50]]);
  assert.match(who.git[0], /git blame/);
  assert.equal((await history(s, { which: 'space', limit: 1 })).entries[0].author, 'Borshkit');
  assert.match(await fs.readFile(path.join(s.dir, await explainGit(s)), 'utf8'), /Добавил more/);
});

test('restore keeps a copy of what it replaces, and the space history records the restore point', async t => {
  const s = await space(t);
  await write(s.project, { 'src/app.js': 'сломано\n', 'src/new.js': 'новый файл\n' });
  const r = await restoreFile(s, 'src/app.js');
  assert.equal(await read(path.join(s.project, 'src/app.js')), 'export const answer = 42;\n');
  assert.equal(await fs.readFile(path.join(s.dir, r.backup), 'utf8'), 'сломано\n');
  const fresh = await restoreFile(s, 'src/new.js');
  await assert.rejects(fs.access(path.join(s.project, 'src/new.js')));
  assert.equal(await fs.readFile(path.join(s.dir, fresh.backup), 'utf8'), 'новый файл\n');
  assert.match((await history(s, { which: 'space', limit: 1 })).entries[0].message, /Точка возврата перед «вернуть src\/new\.js»/);
  await assert.rejects(restoreFile(s, '../outside.txt'), /выходит за пределы/);
});

test('saving the project refuses changes that contain a key', async t => {
  const s = await space(t);
  await identity(s.project);
  await write(s.project, { 'config.js': `export const key = "${'sk-ant-' + 'k'.repeat(40)}";\n` });
  await assert.rejects(saveProject(s, 'конфиг'), /похоже на ключ/);
  assert.equal((await git(s.project, ['diff', '--cached', '--name-only'])).trim(), '');
});

test('merging needs an accepted task and a person; then the worktree branch lands in the project', async t => {
  const s = await space(t);
  await commit(s.project, 'ignore rule');
  const p = await proposeSettings(s, { executors: { dev: { kind: 'command', command: path.join(ROOT, 'test', 'fixtures', 'fake-executor.mjs'), args: ['--mode', 'write'], provider: 'local', dataPolicy: 'local', structuredOutput: 'json_schema', modalities: { output: ['code'] } } } });
  await applyProposal(s, p.id, { confirmedByPerson: true });
  await task(s, 'feat', { goals: [{ id: 'G1', text: 'Есть файл', criteria: ['C1'] }], criteria: [{ id: 'C1', text: 'feature.txt есть', class: 'auto' }],
    checks: [{ id: 'f', ...node("process.exit(require('fs').existsSync('feature.txt') ? 0 : 1)"), criteria: ['C1'] }] });
  await runJob(s, { taskId: 'feat', role: 'implementer', executor: 'dev', silenceMs: 300, tickMs: 50 });
  await assert.rejects(mergeTask(s, 'feat', { confirmedByPerson: true }), /не принята/);
  await verifyAll(s, 'feat');
  await assert.rejects(mergeTask(s, 'feat'), /только человек/);
  const r = await mergeTask(s, 'feat', { confirmedByPerson: true });
  assert.notEqual(r.before, r.after);
  assert.equal(await read(path.join(s.project, 'feature.txt')), 'сделано для feat\n');
  assert.ok((await readJSON(path.join(s.tasks, 'feat', 'worktree.json'))).mergedAt);
  await assert.rejects(mergeTask(s, 'feat', { confirmedByPerson: true }), /уже собрана/);
});

test('push: only with a person, never over someone else\'s changes, never with a key', async t => {
  const s = await space(t);
  await identity(s.project);
  const bare = await tempDir(t);
  await git(bare, ['init', '-q', '--bare', '--initial-branch=main']);
  await git(s.project, ['remote', 'add', 'origin', bare]);
  await saveProject(s, 'правило игнора');
  await assert.rejects(pushProject(s), /только человек/);
  const first = await pushProject(s, { confirmedByPerson: true });
  assert.equal(first.branch, 'main');
  // Someone else pushes: we must not overwrite them.
  const other = await tempDir(t);
  await git(other, ['clone', '-q', bare, '.']);
  await write(other, { 'theirs.txt': 'чужое\n' });
  await git(other, ['add', '-A']); await git(other, [...ID, 'commit', '-q', '-m', 'чужое']); await git(other, ['push', '-q', 'origin', 'main']);
  await git(s.project, ['fetch', '-q', 'origin']);
  await write(s.project, { 'mine.txt': 'моё\n' });
  await saveProject(s, 'моё');
  await assert.rejects(pushProject(s, { confirmedByPerson: true }), /не перезаписывает чужое/);
  // A key that slipped into a commit blocks the push.
  const fresh = await space(t);
  await identity(fresh.project);
  const bare2 = await tempDir(t);
  await git(bare2, ['init', '-q', '--bare']);
  await git(fresh.project, ['remote', 'add', 'origin', bare2]);
  await write(fresh.project, { 'k.txt': `${'ghp_' + 'a'.repeat(36)}\n` });
  await git(fresh.project, ['add', '-A']); await git(fresh.project, [...ID, 'commit', '-q', '-m', 'oops']);
  await assert.rejects(pushProject(fresh, { confirmedByPerson: true }), /похоже на ключ/);
});
