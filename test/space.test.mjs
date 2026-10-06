import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { git } from '../core/io.mjs';
import { initSpace, openSpace, saveSpace, validateSettings, defaultSettings, trusted } from '../core/space.mjs';
import { snapshot } from '../core/snapshot.mjs';
import { newTask } from '../core/contract.mjs';
import { project, tempDir, write } from './helpers.mjs';

test('init hides the space from the project history once and starts its own history', async t => {
  const dir = await project(t);
  const first = await initSpace({ project: dir });
  assert.equal(first.created, true);
  assert.deepEqual(first.ignore, { changed: true, file: '.gitignore' });
  const second = await initSpace({ project: dir });
  assert.equal(second.created, false);
  assert.equal(second.ignore.changed, false);
  const rules = (await fs.readFile(path.join(dir, '.gitignore'), 'utf8')).split('\n').filter(l => l === '/borshkit/');
  assert.equal(rules.length, 1);
  await git(dir, ['check-ignore', '-q', '--', 'borshkit/']);
  assert.match(await git(path.join(dir, 'borshkit'), ['log', '--format=%an|%s']), /Borshkit\|Пространство Borshkit создано/);
  for (const f of ['START-HERE.md', 'journal.md', 'settings/workspace.json', 'settings/settings.md']) await fs.access(path.join(dir, 'borshkit', f));
});

test('the local-only option writes the rule to .git/info/exclude and leaves tracked files alone', async t => {
  const dir = await project(t);
  const r = await initSpace({ project: dir, localOnly: true });
  assert.equal(r.ignore.file, '.git/info/exclude');
  await assert.rejects(fs.access(path.join(dir, '.gitignore')));
  assert.equal((await git(dir, ['status', '--porcelain'])).trim(), '');
});

test('nothing written into the space changes the project digest', async t => {
  const dir = await project(t);
  const { space } = await initSpace({ project: dir });
  const before = await snapshot(dir, { exclude: [space.folder] });
  await write(path.join(dir, 'borshkit'), { 'knowledge/note.md': '# заметка\n', 'tasks/x/evidence.json': '{}' });
  assert.equal((await snapshot(dir, { exclude: [space.folder] })).digest, before.digest);
  await write(dir, { 'src/app.js': 'export const answer = 43;\n' });
  assert.notEqual((await snapshot(dir, { exclude: [space.folder] })).digest, before.digest);
});

test('a folder without Git gets a space with history and is snapshotted without the space', async t => {
  const dir = await tempDir(t);
  await write(dir, { 'notes/source.md': 'материал\n' });
  const r = await initSpace({ project: dir });
  assert.equal(r.git, false);
  await assert.rejects(fs.access(path.join(dir, '.gitignore')));
  const s = await snapshot(dir, { exclude: ['borshkit'] });
  assert.equal(s.kind, 'files');
  assert.equal(s.fileCount, 1);
  assert.match(await git(path.join(dir, 'borshkit'), ['log', '--oneline']), /создано/);
});

test('writes are refused once the ignore rule is gone', async t => {
  const dir = await project(t);
  await initSpace({ project: dir });
  await fs.writeFile(path.join(dir, '.gitignore'), '');
  const s = await openSpace(path.join(dir, 'src'));
  await assert.rejects(newTask(s, { taskId: 'a', goal: 'цель' }), /больше не в gitignore/);
});

test('settings refuse anything that looks like a key, but accept commit IDs', () => {
  const s = defaultSettings('borshkit');
  assert.throws(() => validateSettings({ ...s, token: 'sk-ant-' + 'a'.repeat(40) }), /похоже на ключ/);
  assert.throws(() => validateSettings({ ...s, note: 'Zx9' + 'Q'.repeat(45) }), /похоже на ключ/);
  validateSettings({ ...s, pinned: 'a'.repeat(40) });
});

test('a model PASS is trusted only when the measured false-PASS rate meets the user goal', () => {
  const s = defaultSettings('borshkit');
  s.acceptance.modelTrust = { docs: { maxFalsePassRate: 0.1 }, ui: { maxFalsePassRate: 0.1, measured: { runs: 20, falsePass: 1, source: 'eval/2026-10' } }, api: { maxFalsePassRate: 0.01, measured: { runs: 20, falsePass: 1, source: 'eval/2026-10' } } };
  validateSettings(s);
  assert.equal(trusted(s, 'docs'), false);
  assert.equal(trusted(s, 'ui'), true);
  assert.equal(trusted(s, 'api'), false);
  assert.equal(trusted(s, undefined), false);
});

test('a restore point names who made the change', async t => {
  const dir = await project(t);
  const { space } = await initSpace({ project: dir });
  await write(space.dir, { 'knowledge/idea.md': 'идея\n' });
  const commit = await saveSpace(space, 'Записал идею', { author: 'codex', email: 'codex@borshkit' });
  assert.ok(commit);
  assert.equal((await git(space.dir, ['log', '-1', '--format=%an <%ae>|%s'])).trim(), 'codex <codex@borshkit>|Записал идею');
  assert.equal(await saveSpace(space, 'пусто'), null);
});
