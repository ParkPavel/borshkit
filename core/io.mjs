import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

// Adapted from Claudex src/io.mjs (Apache-2.0, same author); see NOTICE.
export const exec = promisify(execFile);
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const sha = data => crypto.createHash('sha256').update(data).digest('hex');
export const readJSON = async file => JSON.parse(await fs.readFile(file, 'utf8'));
export const exists = async file => fs.access(file).then(() => true, () => false);
export const norm = value => value.replaceAll('\\', '/');
export function assert(condition, message) { if (!condition) throw new Error(message); }
export function inside(parent, child) {
  const rel = path.relative(path.resolve(parent), path.resolve(child));
  return rel === '' || (!rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel));
}
/** Resolve `child` through symlinks and refuse anything that lands outside `parent`. */
export async function contained(parent, child) {
  const realParent = await fs.realpath(parent);
  let cursor = path.resolve(child);
  const tail = [];
  while (!(await exists(cursor))) {
    tail.unshift(path.basename(cursor));
    const next = path.dirname(cursor);
    assert(next !== cursor, 'Не удаётся разобрать путь');
    cursor = next;
  }
  const real = path.join(await fs.realpath(cursor), ...tail);
  assert(inside(realParent, real), 'Путь выходит за пределы своей папки');
  return real;
}
export async function atomicWrite(file, text, { mode = 0o600 } = {}) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(tmp, text, { mode });
  // On Windows a rename over a file another handle is reading fails with
  // EPERM/EBUSY/EACCES for a moment; the dispatcher and job watch read these
  // files constantly, so retry briefly before giving up.
  for (let attempt = 0; ; attempt++) {
    try { await fs.rename(tmp, file); return; }
    catch (e) {
      if (!['EPERM', 'EBUSY', 'EACCES'].includes(e.code) || attempt >= 20) { await fs.rm(tmp, { force: true }); throw e; }
      await new Promise(r => setTimeout(r, 10 + attempt * 10));
    }
  }
}
export const atomicJSON = (file, value) => atomicWrite(file, JSON.stringify(value, null, 2) + '\n');
export async function git(cwd, args, options = {}) {
  return (await exec('git', ['-C', cwd, ...args], { windowsHide: true, maxBuffer: 64 * 1024 * 1024, ...options })).stdout;
}
/** True when `dir` is the top level of a Git working tree. */
export async function isGitRoot(dir) {
  try {
    const top = (await git(dir, ['rev-parse', '--show-toplevel'])).trim();
    return (await fs.realpath(top)) === (await fs.realpath(dir));
  } catch { return false; }
}
/** One writer at a time inside a space's private state directory. */
export async function withLock(stateDir, fn) {
  await fs.mkdir(stateDir, { recursive: true });
  const file = path.join(stateDir, 'lock');
  let handle;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { handle = await fs.open(file, 'wx', 0o600); break; }
    catch (e) { if (e.code !== 'EEXIST') throw e; await new Promise(r => setTimeout(r, 50)); }
  }
  assert(handle, 'Пространство занято другой командой. Если она точно завершена, удали .state/lock.');
  await handle.writeFile(JSON.stringify({ pid: process.pid, created: new Date().toISOString() }));
  try { return await fn(); }
  finally { await handle.close(); await fs.unlink(file); }
}
