import test from 'node:test';
import assert from 'node:assert/strict';
import { git, readJSON, atomicJSON } from '../core/io.mjs';
import { newTask, loadTask } from '../core/contract.mjs';
import { ensureWorktree } from '../core/jobs.mjs';
import { project, write, commit, space } from './helpers.mjs';

// A task can start from a commit other than the project's HEAD — for example a
// frozen release candidate that is not merged yet. Its snapshot, its working
// copy and the scope check all have to use that commit, or every file the
// candidate changed is reported as "outside the task".
test('задача новая --база: snapshot, copy and scope follow the given commit', async (t) => {
  const dir = await project(t);
  const candidate = (await git(dir, ['rev-parse', 'HEAD'])).trim();
  await write(dir, { 'src/later.js': 'export const later = 1;\n' });
  await commit(dir, 'main moves on');
  const s = await space(t, { project: dir });

  const { file } = await newTask(s, { taskId: 'from-candidate', goal: 'Работа от кандидата', base: candidate });
  const contract = await readJSON(file);
  assert.equal(contract.base.head, candidate);
  assert.equal(contract.base.ref, candidate);
  assert.equal(contract.base.fileCount, 1);
  await atomicJSON(file, { ...contract, paths: ['src/fix.js'] });
  const loaded = await loadTask(s, 'from-candidate');
  assert.equal(loaded.basis.base.head, candidate);
  assert.deepEqual(loaded.basis.uncommitted, {});

  const copy = await ensureWorktree(s, 'from-candidate');
  assert.equal((await git(copy.path, ['rev-parse', 'HEAD'])).trim(), candidate);
  assert.equal(copy.base, candidate);

  await write(copy.path, { 'src/fix.js': 'export const fix = 2;\n' });
  const changed = (await git(copy.path, ['diff', '--name-only', candidate])).trim();
  const untracked = (await git(copy.path, ['ls-files', '--others', '--exclude-standard'])).trim();
  assert.equal(changed, '');
  assert.equal(untracked, 'src/fix.js');
});

test('задача новая --база: an unknown ref is refused and no task is written', async (t) => {
  const s = await space(t);
  await assert.rejects(newTask(s, { taskId: 'nowhere', goal: 'цель', base: 'no-such-branch' }), /не найдена/);
  await assert.rejects(readJSON(`${s.tasks}/nowhere/contract.json`));
});
