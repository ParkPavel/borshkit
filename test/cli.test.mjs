import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ROOT } from '../core/io.mjs';
import { parse } from '../bin/borshkit.mjs';
import { project } from './helpers.mjs';

const run = promisify(execFile);
const cli = (cwd, ...args) => run(process.execPath, [path.join(ROOT, 'bin', 'borshkit.mjs'), ...args], { cwd, windowsHide: true });

test('Russian flag names map to the English ones and lone flags stay flags', () => {
  assert.deepEqual(parse(['задача', 'новая', 'x', '--цель', 'Сделать кнопку', '--json']),
    { positional: ['задача', 'новая', 'x'], flags: { goal: 'Сделать кнопку', json: true } });
  assert.deepEqual(parse(['начать', '--только-локально', '--папка=space']), { positional: ['начать'], flags: { 'local-only': true, folder: 'space' } });
});

test('the CLI creates a space, a task and reports status in Russian and as JSON', async t => {
  const dir = await project(t);
  assert.match((await cli(dir, 'начать')).stdout, /Пространство создано/);
  assert.match((await cli(path.join(dir, 'src'), 'задача', 'новая', 'demo', '--цель', 'Показать работу')).stdout, /Задача «demo» создана/);
  const status = JSON.parse((await cli(dir, 'status', '--json')).stdout);
  assert.equal(status.tasks[0].taskId, 'demo');
  assert.equal(status.privacy, 'moderate');
  await assert.rejects(cli(dir, 'задача', 'анализ', 'demo'), e => /Черновик/.test(e.stdout) && e.code === 1);
  const unknown = await cli(dir, 'что-то').catch(e => e);
  assert.match(unknown.stderr, /Неизвестная команда/);
});
