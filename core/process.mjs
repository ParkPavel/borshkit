import fs from 'node:fs/promises';
import path from 'node:path';
import { assert, exec, exists } from './io.mjs';

// Adapted from Claudex src/process.mjs (Apache-2.0, same author); see NOTICE.
// On Windows an npm-installed command is a .cmd shim, which execFile cannot run
// without a shell. Resolve it to the script it wraps instead of opening cmd.exe.
export async function commandSpec(command) {
  assert(typeof command === 'string' && command.length > 0, 'Не указана команда');
  let executable = command;
  if (process.platform === 'win32' && !path.isAbsolute(command)) {
    const found = (await exec('where.exe', [command], { windowsHide: true })).stdout.trim().split(/\r?\n/);
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
export async function runCommand(command, args, options = {}) {
  const spec = await commandSpec(command);
  return exec(spec.executable, [...spec.prefix, ...args], { windowsHide: true, timeout: 120000, maxBuffer: 16 * 1024 * 1024, ...options });
}
