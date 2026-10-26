import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { commandSpec, runCommand, shimTarget } from '../core/process.mjs';
import { tempDir } from './helpers.mjs';

// The shims npm writes for a global install (cmd-shim), old and current layouts.
const CURRENT = `@ECHO off\r\nGOTO start\r\n:find_dp0\r\nSET dp0=%~dp0\r\nEXIT /b\r\n:start\r\nSETLOCAL\r\nCALL :find_dp0\r\n\r\nIF EXIST "%dp0%\\node.exe" (\r\n  SET "_prog=%dp0%\\node.exe"\r\n) ELSE (\r\n  SET "_prog=node"\r\n  SET PATHEXT=%PATHEXT:;.JS;=;%\r\n)\r\n\r\nendLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & "%_prog%"  "%dp0%\\node_modules\\@anthropic-ai\\claude-code\\cli.js" %*\r\n`;
const OLD = `@IF EXIST "%~dp0\\node.exe" (\r\n  "%~dp0\\node.exe"  "%~dp0\\node_modules\\@openai\\codex\\bin\\codex.js" %*\r\n) ELSE (\r\n  @SETLOCAL\r\n  @SET PATHEXT=%PATHEXT:;.JS;=;%\r\n  node  "%~dp0\\node_modules\\@openai\\codex\\bin\\codex.js" %*\r\n)\r\n`;
const NATIVE = `@ECHO off\r\nGOTO start\r\n:find_dp0\r\nSET dp0=%~dp0\r\nEXIT /b\r\n:start\r\nSETLOCAL\r\nCALL :find_dp0\r\n"%dp0%\\node_modules\\@anthropic-ai\\claude-code\\bin\\claude.exe"   %*\r\n`;
const p = (...parts) => parts.join(path.sep);

test('the program behind an npm .cmd shim is found in old, current and native layouts', () => {
  assert.equal(shimTarget(CURRENT), p('node_modules', '@anthropic-ai', 'claude-code', 'cli.js'));
  assert.equal(shimTarget(OLD), p('node_modules', '@openai', 'codex', 'bin', 'codex.js'));
  assert.equal(shimTarget(NATIVE), p('node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe'));
  assert.equal(shimTarget('@echo off\r\ncall "%_prog%" %*\r\n'), null);
  assert.equal(shimTarget('just text'), null);
});

test('on Windows an npm shim runs its script through Node without a shell', { skip: process.platform !== 'win32' }, async t => {
  const dir = await tempDir(t), pkg = path.join(dir, 'node_modules', '@anthropic-ai', 'claude-code');
  await fs.mkdir(pkg, { recursive: true });
  await fs.writeFile(path.join(pkg, 'cli.js'), 'console.log(JSON.stringify(process.argv.slice(2)));\n');
  await fs.writeFile(path.join(dir, 'claude.cmd'), CURRENT);
  const spec = await commandSpec(path.join(dir, 'claude.cmd'));
  assert.equal(spec.executable, process.execPath);
  assert.deepEqual(spec.prefix, [path.join(pkg, 'cli.js')]);
  // An argument with shell characters reaches the program unchanged.
  assert.deepEqual(JSON.parse((await runCommand(path.join(dir, 'claude.cmd'), ['--print', 'a & b'])).stdout), ['--print', 'a & b']);
  await fs.writeFile(path.join(dir, 'broken.cmd'), '@echo off\r\ncall something %*\r\n');
  await assert.rejects(commandSpec(path.join(dir, 'broken.cmd')), /полный путь к \.exe или \.js/);
});

import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { startProcess, checkFailureStatus, processFacts } from '../core/process.mjs';

test('commands preserve failure facts and never confuse POSIX exit 5 with NTSTATUS', async () => {
  await assert.rejects(runCommand(process.execPath, ['-e', 'process.stderr.write("diagnostic");process.exit(5)']), e => {
    assert.equal(checkFailureStatus(e), 'FAIL'); assert.equal(e.code, 5);
    assert.match(e.message, /0x00000005/); assert.match(e.message, /diagnostic/); return true;
  });
  for (const code of [0xC0000005, 0xC0000005 | 0]) {
    const c = new EventEmitter(); c.stdout = new PassThrough(); c.stderr = new PassThrough();
    const r = startProcess('fixture', [], { spawnImpl() { queueMicrotask(() => c.emit('close', code, null)); return c; } });
    await assert.rejects(r.done, e => {
      assert.equal(checkFailureStatus(e), 'UNKNOWN'); assert.equal(processFacts(e).hex, '0xc0000005'); return true;
    });
  }
});

test('timeout, cancellation and overflow settle even if termination never closes pipes', async () => {
  for (const reason of ['timeout', 'aborted', 'overflow']) {
    const child = new EventEmitter(); child.stdout = new PassThrough(); child.stderr = new PassThrough();
    let kills = 0, unrefs = 0; child.unref = () => unrefs++;
    const controller = new AbortController();
    const run = startProcess('fixture', [], { spawnImpl: () => child, killImpl: () => kills++, reapMs: 10,
      timeout: 30, maxBuffer: 8, signal: controller.signal });
    const rejected = assert.rejects(run.done, e => {
      assert.equal(e.reason, reason); assert.equal(checkFailureStatus(e), 'UNKNOWN');
      assert.equal(e.timedOut, reason === 'timeout'); return true;
    });
    if (reason === 'aborted') controller.abort();
    if (reason === 'overflow') child.stdout.write('0123456789');
    await rejected;
    assert.equal(kills, 1); assert.equal(unrefs, 1);
    assert.equal(child.stdout.destroyed, true);
  }
});

test('real command cancellation and timeout return bounded diagnostics', async () => {
  const started = Date.now();
  await assert.rejects(runCommand(process.execPath, ['-e', 'setInterval(()=>{},100)'], { timeout: 100 }), e => e.timedOut && e.infrastructure);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(runCommand(process.execPath, ['-e', 'process.exit(0)'], { signal: controller.signal }), e => e.reason === 'aborted');
  assert.ok(Date.now() - started < 10000);
});

test('owner interruption stops all registered children and removes shared signal listeners', async () => {
  const oldExitCode = process.exitCode, beforeInt = process.listenerCount('SIGINT'), beforeTerm = process.listenerCount('SIGTERM');
  const handles = [];
  try {
    for (let i = 0; i < 3; i++) {
      const child = new EventEmitter(); child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.unref = () => {};
      const h = startProcess('fixture', [], { spawnImpl: () => child, killImpl: () => queueMicrotask(() => child.emit('close', null, 'SIGKILL')) });
      handles.push(assert.rejects(h.done, e => e.reason === 'aborted'));
    }
    assert.equal(process.listenerCount('SIGTERM'), beforeTerm + 1);
    process.emit('SIGTERM'); await Promise.all(handles);
    assert.equal(process.listenerCount('SIGTERM'), beforeTerm); assert.equal(process.listenerCount('SIGINT'), beforeInt);
  } finally { process.exitCode = oldExitCode; }
});
