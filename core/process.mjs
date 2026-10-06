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
    throw new Error(`Команду ${name} нельзя запустить без оболочки. Укажи настоящий исполняемый файл.`);
  }
  if (/\.[mc]?js$/i.test(executable)) return { executable: process.execPath, prefix: [executable] };
  return { executable, prefix: [] };
}
export async function runCommand(command, args, options = {}) {
  const spec = await commandSpec(command);
  return exec(spec.executable, [...spec.prefix, ...args], { windowsHide: true, timeout: 120000, maxBuffer: 16 * 1024 * 1024, ...options });
}
