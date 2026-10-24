import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { StringDecoder } from 'node:string_decoder';
import { assert, exists, gitCrashed, killTree } from './io.mjs';

// Adapted from Claudex src/process.mjs (Apache-2.0, same author); see NOTICE.
// On Windows an npm-installed command is a .cmd shim, which execFile cannot run
// without a shell. Resolve it to the script it wraps instead of opening cmd.exe.
export async function commandSpec(command, options = {}) {
  assert(typeof command === 'string' && command.length > 0, 'Не указана команда');
  let executable = command;
  if (process.platform === 'win32' && !path.isAbsolute(command)) {
    const found = (await startProcess('where.exe', [command], { ...options, timeout: Math.min(options.timeout ?? 10000, 10000) }).done).stdout.trim().split(/\r?\n/);
    const shim = found.find(p => p.endsWith('.cmd'));
    executable = shim || found.find(p => /\.(exe|com)$/i.test(p)) || found[0];
  }
  if (process.platform === 'win32' && /\.(cmd|ps1)$/i.test(executable)) {
    const base = path.dirname(executable);
    const known = { npm: ['node_modules/npm/bin/npm-cli.js'], npx: ['node_modules/npm/bin/npx-cli.js'] };
    const name = path.basename(executable).replace(/\.(cmd|ps1)$/i, '');
    for (const relative of known[name] || []) {
      const script = path.join(base, relative);
      if (await exists(script)) return { executable: process.execPath, prefix: [script] };
    }
    // Any other npm shim (claude, codex, gemini…) names its target after %dp0%.
    const cmd = executable.replace(/\.ps1$/i, '.cmd');
    const target = await exists(cmd) ? shimTarget(await fs.readFile(cmd, 'utf8')) : null;
    if (target) {
      const file = path.resolve(base, target);
      if (/\.[mc]?js$/i.test(file) && await exists(file)) return { executable: process.execPath, prefix: [file] };
      if (/\.(exe|com)$/i.test(file) && await exists(file)) return { executable: file, prefix: [] };
    }
    throw new Error(`Команду ${name} нельзя запустить без оболочки: в ${path.basename(cmd)} не найден файл программы. Укажи в манифесте command полный путь к .exe или .js.`);
  }
  if (/\.[mc]?js$/i.test(executable)) return { executable: process.execPath, prefix: [executable] };
  return { executable, prefix: [] };
}
/**
 * The program an npm .cmd shim runs: the last "%dp0%\…" path before %*,
 * relative to the shim's folder. Both the old (%~dp0) and the current
 * (%dp0%) cmd-shim layouts end their command line this way.
 */
export function shimTarget(text) {
  const found = [...text.matchAll(/"%~?dp0%?\\?([^"]+)"\s*%\*/g)].map(m => m[1]);
  const target = found.at(-1);
  return target && !/%/.test(target) ? target.replaceAll('\\', path.sep) : null;
}
/** Machine-readable lifecycle facts, without command arguments or environment values. */
export function processFacts(error) {
  const code = error?.code ?? null;
  return { code, hex: Number.isInteger(code) ? `0x${(code >>> 0).toString(16).padStart(8, '0')}` : null,
    signal: error?.signal ?? null, timedOut: error?.timedOut === true,
    reason: error?.reason ?? (error?.signal || gitCrashed(code) ? 'crash' : Number.isInteger(code) ? 'exit' : 'spawn') };
}
export function processDiagnostic(error) {
  const f = processFacts(error);
  return `код=${f.code ?? 'нет'}${f.hex ? ` (${f.hex})` : ''}; сигнал=${f.signal ?? 'нет'}; таймаут=${f.timedOut ? 'да' : 'нет'}; причина=${f.reason}`;
}
export function checkFailureStatus(error) {
  return !error?.infrastructure && Number.isInteger(error?.code) && error.code > 0 && !gitCrashed(error.code)
    && !error.signal && !error.killed && !error.timedOut ? 'FAIL' : 'UNKNOWN';
}
export class CommandError extends Error {}

/** Bounded lifecycle shared by checks and streaming executors. No automatic retries. */
export function startProcess(executable, args, { cwd, env, input, signal, timeout = 120000,
  maxBuffer = 16 * 1024 * 1024, onStdout, onStart = () => {}, spawnImpl = spawn, killImpl = killTree, reapMs = 1500 } = {}) {
  assert(Number.isFinite(timeout) && timeout > 0, 'Таймаут команды должен быть положительным');
  assert(Number.isFinite(maxBuffer) && maxBuffer > 0, 'Лимит вывода должен быть положительным');
  let child, timer, reapTimer, settled = false, stopped = null, size = 0, stdout = '', stderr = '';
  const decoder = new StringDecoder('utf8');
  let finish;
  const done = new Promise((resolve, reject) => {
    finish = (code, killedBy, cause) => {
      if (settled) return;
      settled = true; clearTimeout(timer); clearTimeout(reapTimer); signal?.removeEventListener('abort', abort);
      const tail = decoder.end();
      if (tail) { if (onStdout) onStdout(tail); else stdout += tail; }
      if (!stopped && !cause && code === 0 && !killedBy) return resolve({ stdout, stderr, code, signal: null });
      const reason = stopped ?? (cause ? 'spawn' : killedBy || gitCrashed(code) ? 'crash' : 'exit');
      const error = Object.assign(new CommandError('', { cause }), { code: cause?.code ?? code ?? null,
        signal: killedBy ?? null, timedOut: reason === 'timeout', killed: Boolean(stopped), reason,
        infrastructure: reason !== 'exit', stdout, stderr });
      error.message = `Не удалось выполнить ${path.basename(executable)}: ${processDiagnostic(error)}${stderr.trim() ? `\n${stderr.trim()}` : ''}`;
      reject(error);
    };
    const abort = () => stop('aborted');
    if (signal?.aborted) { stopped = 'aborted'; finish(null); return; }
    try {
      child = spawnImpl(executable, args, { cwd, env, windowsHide: true, shell: false, detached: process.platform !== 'win32',
        stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'] });
    } catch (e) { finish(null, null, e); return; }
    child.once('spawn', onStart);
    child.on('error', e => finish(null, null, e));
    child.on('close', (code, sig) => finish(code, sig));
    child.stdout.on('data', chunk => {
      if (settled || stopped) return;
      size += chunk.length;
      if (size > maxBuffer) return stop('overflow');
      const text = decoder.write(chunk);
      if (onStdout) onStdout(text); else stdout += text;
    });
    child.stderr.on('data', chunk => {
      if (settled || stopped) return;
      size += chunk.length;
      if (size > maxBuffer) return stop('overflow');
      stderr = onStdout ? (stderr + chunk.toString()).slice(-20000) : stderr + chunk.toString();
    });
    if (input !== undefined) { child.stdin.on('error', () => {}); child.stdin.end(input); }
    signal?.addEventListener('abort', abort, { once: true });
    timer = setTimeout(() => stop('timeout'), timeout);
  });
  function stop(reason = 'aborted') {
    if (settled || stopped) return;
    stopped = reason;
    killImpl(child);
    reapTimer = setTimeout(() => {
      child.stdout?.destroy(); child.stderr?.destroy(); child.stdin?.destroy(); child.unref?.();
      finish(null);
    }, reapMs);
  }
  return { done, stop };
}
export async function runCommand(command, args, options = {}) {
  assert(options.timeout === undefined || Number.isFinite(options.timeout) && options.timeout > 0, 'Таймаут команды должен быть положительным');
  const started = Date.now();
  let spec;
  try { spec = await commandSpec(command, options); }
  catch (e) { e.infrastructure = true; throw e; }
  return startProcess(spec.executable, [...spec.prefix, ...args], {
    ...options, timeout: Math.max(1, (options.timeout ?? 120000) - (Date.now() - started)),
  }).done;
}
