import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { GitExitError, GitSpawnError, git, isGitRoot, gitCrashed, killTree } from '../core/io.mjs';
import { tempDir } from './helpers.mjs';

// A fake git: node running a script whose behaviour per call comes from a plan file.
// Plan entries: "crash" (exit 0xC0000005), "fail" (exit 1 with stderr), "hang", "ok".
async function fake(t, plan) {
  const dir = await tempDir(t);
  const planFile = path.join(dir, 'plan.json'), countFile = path.join(dir, 'count');
  await fs.writeFile(planFile, JSON.stringify(plan));
  await fs.writeFile(countFile, '0');
  const script = path.join(dir, 'fake-git.mjs');
  await fs.writeFile(script, `import fs from 'node:fs';
const plan = JSON.parse(fs.readFileSync(${JSON.stringify(planFile)}, 'utf8'));
const n = Number(fs.readFileSync(${JSON.stringify(countFile)}, 'utf8'));
fs.writeFileSync(${JSON.stringify(countFile)}, String(n + 1));
const step = plan[Math.min(n, plan.length - 1)];
if (step === 'crash') { if (process.platform === 'win32') process.exit(0xC0000005 | 0); else process.kill(process.pid, 'SIGKILL'); }
if (step === 'fail') { process.stderr.write('fatal: bad revision'); process.exit(128); }
if (step === 'hang') setInterval(() => {}, 1000);
else process.stdout.write('ok:' + process.argv.slice(2).join(' '));
`);
  return { dir, command: [process.execPath, script], calls: async () => Number(await fs.readFile(countFile, 'utf8')) };
}

test('git retries a crashed start and then succeeds', async t => {
  const f = await fake(t, ['crash', 'crash', 'ok']);
  const out = await git(f.dir, ['status'], { command: f.command });
  assert.match(out, /^ok:-C .* status$/);
  assert.equal(await f.calls(), 3);
});

test('git gives up after two retries with a spawn error', async t => {
  const f = await fake(t, ['crash']);
  await assert.rejects(git(f.dir, ['status'], { command: f.command }), e => e instanceof GitSpawnError && /аварийно завершился/.test(e.message));
  assert.equal(await f.calls(), 3);
});

test('a real git failure is not retried and carries stderr', async t => {
  const f = await fake(t, ['fail', 'ok']);
  await assert.rejects(git(f.dir, ['rev-parse', 'x'], { command: f.command }), e => e instanceof GitExitError && e.code === 128 && /fatal: bad revision/.test(e.message));
  assert.equal(await f.calls(), 1);
});

test('a hung git is killed after the timeout', async t => {
  const f = await fake(t, ['hang']);
  const started = Date.now();
  await assert.rejects(git(f.dir, ['fetch'], { command: f.command, timeout: 500, retries: 0 }), e => e instanceof GitSpawnError && /не ответил/.test(e.message));
  assert.ok(Date.now() - started < 10_000);
});

test('a missing git binary is a spawn error', async t => {
  const dir = await tempDir(t);
  await assert.rejects(git(dir, ['status'], { command: path.join(dir, 'no-such-git'), retries: 0 }), GitSpawnError);
});

test('isGitRoot never turns a spawn failure into "not Git" when .git exists', async t => {
  const f = await fake(t, ['crash']);
  await fs.mkdir(path.join(f.dir, '.git'));
  await assert.rejects(isGitRoot(f.dir, { command: f.command, retries: 0 }), GitSpawnError);
  const plain = await tempDir(t);
  await assert.rejects(isGitRoot(plain, { command: f.command, retries: 0 }), GitSpawnError);
});

test('isGitRoot is still false for a real "not a repository" answer', async t => {
  assert.equal(await isGitRoot(await tempDir(t)), false);
});

test('NTSTATUS classification does not confuse POSIX exit 5 with a crash', () => {
  assert.equal(gitCrashed(5), false);
  assert.equal(gitCrashed(0xC0000005), true);
  assert.equal(gitCrashed(0xC0000005 | 0), true);
});
for (const verb of ['commit', 'merge', 'push']) test(`${verb} is never repeated after an ambiguous crash`, async t => {
  const f = await fake(t, ['crash', 'ok']);
  await assert.rejects(git(f.dir, [verb], { command: f.command }), GitSpawnError);
  assert.equal(await f.calls(), 1);
});
test('timeout is not retried and cancellation settles promptly', async t => {
  const f = await fake(t, ['hang']);
  await assert.rejects(git(f.dir, ['status'], { command: f.command, timeout: 300 }), e => e.reason === 'timeout');
  assert.equal(await f.calls(), 1);
  const controller = new AbortController();
  const pending = git(f.dir, ['status'], { command: f.command, signal: controller.signal });
  setTimeout(() => controller.abort(), 100);
  await assert.rejects(pending, e => e.reason === 'aborted');
});
test('Windows taskkill failure falls back to direct termination', async () => {
  const { EventEmitter } = await import('node:events');
  for (const mode of ['error', 'exit', 'throw']) {
    let killed = false;
    killTree({ pid: 123, kill() { killed = true; } }, { platform: 'win32', spawnImpl() {
      if (mode === 'throw') throw new Error('unavailable');
      const c = new EventEmitter();
      queueMicrotask(() => mode === 'error' ? c.emit('error', new Error('unavailable')) : c.emit('exit', 1));
      return c;
    } });
    await new Promise(r => setImmediate(r));
    assert.equal(killed, true);
  }
});

test('a hanging Windows taskkill has a bounded fallback', async () => {
  const { EventEmitter } = await import('node:events');
  let killed = false, killerKilled = false;
  const killer = new EventEmitter(); killer.kill = () => { killerKilled = true; };
  killTree({ pid: 123, kill() { killed = true; } }, { platform: 'win32', graceMs: 10, spawnImpl: () => killer });
  await new Promise(r => setTimeout(r, 30));
  assert.equal(killed, true);
  assert.equal(killerKilled, true);
});
