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
