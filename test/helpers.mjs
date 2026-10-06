import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { git, readJSON, atomicJSON } from '../core/io.mjs';
import { initSpace } from '../core/space.mjs';
import { newTask } from '../core/contract.mjs';

// After a commit Git may start `maintenance run --auto` (gc) as a detached
// process that keeps writing into .git/objects/pack while a test already
// removes its temporary folder (ENOTEMPTY on CI). Every git the tests spawn
// inherits this environment, so turn automatic gc and maintenance off.
const extra = [['gc.auto', '0'], ['maintenance.auto', 'false']];
const base = Number(process.env.GIT_CONFIG_COUNT ?? 0);
extra.forEach(([k, v], i) => { process.env[`GIT_CONFIG_KEY_${base + i}`] = k; process.env[`GIT_CONFIG_VALUE_${base + i}`] = v; });
process.env.GIT_CONFIG_COUNT = String(base + extra.length);

const ID = ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false'];
export async function tempDir(t) {
  const dir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'borshkit-')));
  t.after(() => fs.rm(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }));
  return dir;
}
/** A Git project with one committed file. */
export async function project(t, files = { 'src/app.js': 'export const answer = 42;\n' }) {
  const dir = await tempDir(t);
  await git(dir, ['init', '-q', '--initial-branch=main']);
  await write(dir, files);
  await git(dir, ['add', '-A']);
  await git(dir, [...ID, 'commit', '-q', '-m', 'start']);
  return dir;
}
export async function commit(dir, message = 'change') {
  await git(dir, ['add', '-A']);
  await git(dir, [...ID, 'commit', '-q', '-m', message]);
}
export async function write(dir, files) {
  for (const [rel, text] of Object.entries(files)) {
    await fs.mkdir(path.dirname(path.join(dir, rel)), { recursive: true });
    await fs.writeFile(path.join(dir, rel), text);
  }
}
export async function space(t, options = {}) {
  const dir = options.project ?? await project(t);
  return (await initSpace({ project: dir, ...options })).space;
}
/** Create a task and fill its contract. */
export async function task(s, taskId, contract) {
  const { file } = await newTask(s, { taskId, goal: contract.goal ?? 'Тестовая цель' });
  await atomicJSON(file, { ...(await readJSON(file)), ...contract });
  return file;
}
export const node = (code) => ({ command: process.execPath, args: ['-e', code] });
