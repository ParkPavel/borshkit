import test from 'node:test';
import assert from 'node:assert/strict';
import { probeExecutor } from '../core/executors.mjs';
import { space } from './helpers.mjs';

async function fixture(t) {
  const s = await space(t);
  s.settings.executors = { cli: { kind: 'command', command: process.execPath } };
  return s;
}

test('only transient read-only probes retry once and retain both attempt facts', async t => {
  for (const code of [0xC0000005, 0xC0000005 | 0, 'EAGAIN', 'ENOMEM', 'EBUSY']) {
    const s = await fixture(t); let calls = 0;
    const p = await probeExecutor(s, 'cli', { runCommandImpl: async (_cmd, args) => {
      assert.deepEqual(args, ['--version']);
      if (++calls === 1) throw Object.assign(new Error('Command failed'), { code });
      return { stdout: 'fixture 1' };
    } });
    assert.equal(calls, 2); assert.equal(p.status, 'PASS'); assert.equal(p.attempts[0].code, code);
    assert.equal(p.attempts[1].status, 'PASS');
  }
});

test('persistent crash blocks the probe; ordinary exit, timeout and missing command never retry', async t => {
  for (const [error, count, status] of [
    [{ code: 3221225477 }, 2, 'BLOCKED'], [{ code: 5 }, 1, 'FAIL'],
    [{ code: 'ENOENT' }, 1, 'BLOCKED'], [{ code: null, timedOut: true, reason: 'timeout' }, 1, 'BLOCKED'],
  ]) {
    const s = await fixture(t); let calls = 0;
    const p = await probeExecutor(s, 'cli', { runCommandImpl: async () => { calls++; throw Object.assign(new Error('empty output'), error); } });
    assert.equal(calls, count); assert.equal(p.status, status); assert.equal(p.ok, false);
    assert.match(p.missing[0], /код=.*сигнал=.*таймаут=/);
  }
});

test('help and version have separate attempt histories and probes honor the provided environment', async t => {
  const s = await fixture(t); s.settings.executors.cli.kind = 'claude-cli';
  let calls = 0;
  const p = await probeExecutor(s, 'cli', { env: { PROBE: 'fixture' }, runCommandImpl: async (_cmd, args, opts) => {
    assert.equal(opts.env.PROBE, 'fixture'); calls++;
    if (args[0] === '--help') return { stdout: '--print --output-format --json-schema --tools --strict-mcp-config --no-session-persistence' };
    if (calls === 2) throw Object.assign(new Error('crash'), { code: 0xC0000005 });
    return { stdout: 'fixture 2' };
  } });
  assert.equal(p.ok, true); assert.deepEqual(p.attempts.map(a => a.step), ['--help', '--version', '--version']);
});

import { readProbes } from '../core/executors.mjs';
import { doctor } from '../core/status.mjs';

test('concurrent probes preserve results for both executors', async t => {
  const s = await fixture(t); s.settings.executors.second = { ...s.settings.executors.cli };
  await Promise.all(['cli', 'second'].map(id => probeExecutor(s, id, { runCommandImpl: async () => ({ stdout: 'fixture' }) })));
  const saved = await readProbes(s);
  assert.equal(saved.cli.ok, true); assert.equal(saved.second.ok, true);
});

test('doctor does not diagnose an unavailable Git binary from an arbitrary process failure', async () => {
  const rows = await doctor(null, { runCommandImpl: async (_cmd, _args, options) => {
    assert.equal(options.timeout, 10000); throw new Error('код=3221225477 (0xc0000005)');
  } });
  assert.equal(rows[1].ok, false); assert.equal(rows[1].text, 'Не удалось проверить Git');
  assert.match(rows[1].fix, /0xc0000005/);
});
