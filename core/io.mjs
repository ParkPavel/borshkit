import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile, spawn } from 'node:child_process';
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
/** Git ran and answered with a non-zero exit: a real answer, never retried. */
export class GitExitError extends Error {}
/** Git could not be started, crashed, was killed or timed out: the environment, not the repository. */
export class GitSpawnError extends Error {}
export const GIT_TIMEOUT_MS = 60_000;
// Windows NTSTATUS crash codes (0xC0000005 access violation, 0xC0000142 dll init
// failed, …) mean the process never really ran; Git's own exits are small numbers.
const crashed = code => typeof code === 'number' && code >= 0xC0000000;
export function killTree(child) {
  if (!child.pid) return;
  try {
    if (process.platform === 'win32') spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }).on('error', () => {});
    else process.kill(-child.pid, 'SIGKILL');
  } catch { try { child.kill('SIGKILL'); } catch { /* gone */ } }
}
function runGitOnce(argv, { timeout, env, input, maxBuffer, command = 'git' }) {
  return new Promise((resolve, reject) => {
    let child;
    try { const [exe, ...prefix] = [].concat(command); child = spawn(exe, [...prefix, ...argv], { env, windowsHide: true, shell: false, detached: process.platform !== 'win32', stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'] }); }
    catch (e) { reject(new GitSpawnError(`не удалось запустить git: ${e.message}`)); return; }
    const out = [], err = []; let size = 0, done = false, timedOut = false, overflow = false;
    const finish = (fn, value) => { if (done) return; done = true; clearTimeout(timer); fn(value); };
    const timer = setTimeout(() => { timedOut = true; killTree(child); }, timeout);
    const collect = sink => chunk => { size += chunk.length; if (size > maxBuffer) { overflow = true; killTree(child); } else sink.push(chunk); };
    child.stdout.on('data', collect(out)); child.stderr.on('data', collect(err));
    child.on('error', e => finish(reject, new GitSpawnError(`не удалось запустить git: ${e.message}`)));
    if (input !== undefined) { child.stdin.on('error', () => {}); child.stdin.end(input); }
    child.on('close', (code, signal) => {
      const stdout = Buffer.concat(out).toString('utf8'), stderr = Buffer.concat(err).toString('utf8').trim();
      const what = `git ${argv.join(' ')}`;
      if (overflow) return finish(reject, new GitExitError(`${what}: вывод больше ${maxBuffer} байт`));
      if (timedOut) return finish(reject, new GitSpawnError(`${what}: не ответил за ${Math.round(timeout / 1000)} с, процесс остановлен`));
      if (signal || crashed(code)) return finish(reject, new GitSpawnError(`не удалось запустить git (${signal || `код 0x${code.toString(16).toUpperCase()}`}): ${what}${stderr ? `\n${stderr}` : ''}`));
      if (code !== 0) { const e = new GitExitError(`Команда завершилась с ошибкой (${code}): ${what}${stderr ? `\n${stderr}` : ''}`); Object.assign(e, { code, stdout, stderr }); return finish(reject, e); }
      finish(resolve, stdout);
    });
  });
}
/**
 * Run git with a timeout (the whole process tree is killed when it passes),
 * up to two retries when git could not be started or crashed — never when it
 * really ran and failed — and git's stderr in the error message.
 */
export async function git(cwd, args, { timeout = GIT_TIMEOUT_MS, retries = 2, env, input, maxBuffer = 64 * 1024 * 1024, command } = {}) {
  for (let attempt = 0; ; attempt++) {
    try { return await runGitOnce(['-C', cwd, ...args], { timeout, env, input, maxBuffer, command }); }
    catch (e) {
      if (!(e instanceof GitSpawnError) || attempt >= retries) throw e;
      await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
    }
  }
}
/**
 * True when `dir` is the top level of a Git working tree. Git answering "no"
 * is false; git failing to start is reported, never mistaken for "not Git" —
 * unless there is no `.git` at all, which already answers the question.
 */
export async function isGitRoot(dir, options) {
  try {
    const top = (await git(dir, ['rev-parse', '--show-toplevel'], options)).trim();
    return (await fs.realpath(top)) === (await fs.realpath(dir));
  } catch (e) {
    if (e instanceof GitSpawnError && await exists(path.join(dir, '.git'))) throw new Error(`Не удалось запустить git, поэтому неизвестно, Git ли проект. Повтори команду. ${e.message}`);
    return false;
  }
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
/**
 * An exclusive lock file holding the owner's pid. A lock left by a process
 * that no longer runs is taken over. With `waitMs` 0 a held lock is refused
 * at once with `busy`; otherwise it is retried until the time is up.
 */
export async function acquireLock(file, { waitMs = 0, busy = 'Занято другой командой', owner = {} } = {}) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
  const until = Date.now() + waitMs;
  for (;;) {
    try {
      const handle = await fs.open(file, 'wx', 0o600);
      await handle.writeFile(JSON.stringify({ pid: process.pid, created: new Date().toISOString(), ...owner }));
      await handle.close();
      return async () => { await fs.rm(file, { force: true }); };
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      const held = await readJSON(file).catch(() => null);
      if (held && Number.isInteger(held.pid) && !alive(held.pid)) { await fs.rm(file, { force: true }); continue; }
      if (Date.now() >= until) throw new Error(`${busy}${held?.jobId ? ` (работа ${held.jobId})` : ''}.`);
      await new Promise(r => setTimeout(r, 25 + Math.random() * 50));
    }
  }
}
