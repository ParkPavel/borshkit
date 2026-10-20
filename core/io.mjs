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
/** Git launch/lifecycle failure; it does not establish a repository defect. */
export class GitSpawnError extends Error {}
export const GIT_TIMEOUT_MS = 60_000;
// NTSTATUS can arrive signed or unsigned; POSIX exit 5 is an ordinary failure.
export const gitCrashed = code => typeof code === 'number' && (code >>> 0) >= 0xC0000000;
export function killTree(child, { platform = process.platform, spawnImpl = spawn, graceMs = 1000 } = {}) {
  if (!child.pid) return;
  const fallback = () => { try { child.kill('SIGKILL'); } catch { /* already gone */ } };
  if (platform !== 'win32') {
    try { process.kill(-child.pid, 'SIGKILL'); } catch { fallback(); }
    return;
  }
  // taskkill itself can fail or hang. Never let it keep this process alive.
  let killer;
  const timer = setTimeout(() => { fallback(); try { killer?.kill(); } catch { /* gone */ } }, graceMs);
  timer.unref();
  try {
    killer = spawnImpl('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    killer.unref?.();
    killer.once('error', () => { clearTimeout(timer); fallback(); });
    killer.once('exit', code => { clearTimeout(timer); if (code !== 0) fallback(); });
  } catch { clearTimeout(timer); fallback(); }
}
function runGitOnce(argv, { timeout, env, input, maxBuffer, signal, command = 'git' }) {
  return new Promise((resolve, reject) => {
    let child, timer, reapTimer, done = false, size = 0;
    const out = [], err = [];
    const diagnostic = (message, reason, cause) => Object.assign(new GitSpawnError(`${message}${err.length ? `\n${Buffer.concat(err).toString('utf8').trim()}` : ''}`, { cause }), { reason, code: cause?.code });
    const finish = (fn, value) => {
      if (done) return;
      done = true; clearTimeout(timer); clearTimeout(reapTimer);
      signal?.removeEventListener('abort', abort);
      fn(value);
    };
    const stop = (reason, message) => {
      killTree(child);
      // Even inherited pipes or a failed taskkill must not cause an unbounded wait.
      reapTimer ??= setTimeout(() => {
        child.stdout?.destroy(); child.stderr?.destroy(); child.stdin?.destroy(); child.unref();
        finish(reject, diagnostic(message, reason));
      }, 1500);
      finishError = () => diagnostic(message, reason);
    };
    let finishError = null;
    const abort = () => stop('aborted', 'Git отменён');
    if (signal?.aborted) { reject(diagnostic('Git отменён', 'aborted')); return; }
    try {
      const [exe, ...prefix] = [].concat(command);
      child = spawn(exe, [...prefix, ...argv], { env, windowsHide: true, shell: false, detached: process.platform !== 'win32', stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'] });
    } catch (e) { reject(diagnostic(`Не удалось запустить git: ${e.message}`, 'spawn', e)); return; }
    signal?.addEventListener('abort', abort, { once: true });
    timer = setTimeout(() => stop('timeout', `Git не ответил за ${timeout} мс; запрошено завершение дерева процессов`), timeout);
    const collect = sink => chunk => {
      size += chunk.length;
      if (size > maxBuffer) { if (!finishError) stop('overflow', `Вывод Git больше ${maxBuffer} байт`); }
      else sink.push(chunk);
    };
    child.stdout.on('data', collect(out)); child.stderr.on('data', collect(err));
    child.on('error', e => finish(reject, diagnostic(`Не удалось запустить git: ${e.message}`, 'spawn', e)));
    if (input !== undefined) { child.stdin.on('error', () => {}); child.stdin.end(input); }
    child.on('close', (code, killedBy) => {
      const stdout = Buffer.concat(out).toString('utf8'), stderr = Buffer.concat(err).toString('utf8').trim();
      if (finishError) return finish(reject, finishError());
      if (killedBy || gitCrashed(code)) return finish(reject, diagnostic(`Git аварийно завершился (${killedBy || `0x${(code >>> 0).toString(16)}`}): git ${argv.join(' ')}`, 'crash'));
      if (code !== 0) return finish(reject, Object.assign(new GitExitError(`Команда завершилась с ошибкой (${code}): git ${argv.join(' ')}${stderr ? `\n${stderr}` : ''}`), { code, stdout, stderr }));
      finish(resolve, stdout);
    });
  });
}
// Conservative allowlist: no config/global options, aliases, writes or network mutations.
const READ_ONLY_GIT = new Set(['status', 'diff', 'rev-parse', 'ls-files', 'ls-tree', 'show', 'log', 'cat-file', 'check-ignore']);
export async function git(cwd, args, { timeout = GIT_TIMEOUT_MS, retries = 2, env, input, maxBuffer = 64 * 1024 * 1024, command, signal } = {}) {
  assert(Number.isFinite(timeout) && timeout > 0, 'Таймаут Git должен быть положительным');
  for (let attempt = 0; ; attempt++) {
    try { return await runGitOnce(['-C', cwd, ...args], { timeout, env, input, maxBuffer, command, signal }); }
    catch (e) {
      const transient = e.reason === 'crash' || e.reason === 'spawn' && ['EAGAIN', 'EBUSY', 'ENOMEM'].includes(e.code);
      if (!READ_ONLY_GIT.has(args[0]) || !transient || signal?.aborted || attempt >= retries) throw e;
      await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
    }
  }
}
/** Only Git's explicit non-repository answer means false; infrastructure errors propagate. */
export async function isGitRoot(dir, options) {
  try {
    const top = (await git(dir, ['rev-parse', '--show-toplevel'], options)).trim();
    return (await fs.realpath(top)) === (await fs.realpath(dir));
  } catch (e) {
    if (e instanceof GitExitError && /not a git repository/i.test(e.stderr)) return false;
    throw e;
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
