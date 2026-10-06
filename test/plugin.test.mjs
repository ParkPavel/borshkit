import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { ROOT, readJSON } from '../core/io.mjs';
import { judgeCommand, judgeFile, runHook } from '../core/hooks.mjs';
import { evaluate, measureTrust, proposeTrust } from '../core/eval.mjs';
import { confirmItem, converge, recordReview, verifyAll } from '../core/accept.mjs';
import { applyProposal } from '../core/config.mjs';
import { node, space, task, write } from './helpers.mjs';

const run = promisify(execFile);

test('the plugin manifest, marketplace entry and hooks point at real files', async () => {
  const plugin = await readJSON(path.join(ROOT, '.claude-plugin', 'plugin.json'));
  const pkg = await readJSON(path.join(ROOT, 'package.json'));
  assert.equal(plugin.name, 'borshkit');
  assert.equal(plugin.version, pkg.version);
  const hooks = await readJSON(path.resolve(ROOT, plugin.hooks));
  for (const entries of Object.values(hooks.hooks)) for (const e of entries) for (const h of e.hooks) assert.match(h.command, /\$\{CLAUDE_PLUGIN_ROOT\}\/bin\/borshkit\.mjs" hook (session-start|pre-tool)$/);
  assert.equal((await readJSON(path.join(ROOT, '.claude-plugin', 'marketplace.json'))).plugins[0].source, './');
  assert.match(await fs.readFile(path.join(ROOT, 'skills', 'borshkit', 'SKILL.md'), 'utf8'), /^---\nname: borshkit\n/);
});

test('the pre-tool hook refuses destructive Git and pushing, and lets ordinary work through', () => {
  for (const cmd of ['git push --force origin main', 'git push -f', 'git push origin :old', 'git push origin main', 'git reset --hard HEAD~1', 'git clean -fdx', 'git branch -D feature', 'git checkout -- .', 'echo x > borshkit/settings/workspace.json'])
    assert.ok(judgeCommand(cmd), cmd);
  for (const cmd of ['git status', 'git diff', 'npm test', 'git commit -m "x"', 'git log --oneline', 'cat borshkit/STATUS.md', 'git checkout -b feat'])
    assert.equal(judgeCommand(cmd), null, cmd);
});

test('the hooks guard the space files and tell a new session where things stand', async t => {
  const s = await space(t);
  assert.match(judgeFile(s, path.join(s.dir, 'settings', 'workspace.json')), /предложения/);
  assert.match(judgeFile(s, path.join(s.dir, 'tasks', 'a', 'evidence', 'x.json')), /доказательства/);
  assert.equal(judgeFile(s, path.join(s.project, 'src', 'app.js')), null);
  const deny = await runHook('pre-tool', { cwd: s.project, tool_name: 'Edit', tool_input: { file_path: 'borshkit/settings/workspace.json' } });
  assert.equal(deny.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(await fs.readFile(path.join(s.dir, 'journal.md'), 'utf8'), /Остановлено действие агента \(Edit\)/);
  assert.equal(await runHook('pre-tool', { cwd: path.dirname(s.project), tool_name: 'Bash', tool_input: { command: 'git push --force' } }), null);
  const start = await runHook('session-start', { cwd: s.project });
  assert.match(start.hookSpecificOutput.additionalContext, /^Borshkit · умеренный · работ: 0/);
  const pending = run(process.execPath, [path.join(ROOT, 'bin', 'borshkit.mjs'), 'hook', 'pre-tool'], { cwd: s.project, timeout: 30000 });
  pending.child.stdin.end(JSON.stringify({ cwd: s.project, tool_name: 'Bash', tool_input: { command: 'git push origin main' } }));
  const cli = await pending;
  assert.equal(JSON.parse(cli.stdout).hookSpecificOutput.permissionDecision, 'deny');
  assert.match(await fs.readFile(path.join(s.dir, 'AGENTS.md'), 'utf8'), /^# Как работать в пространстве Borshkit/);
});

test('evaluation finds a false PASS through a hidden check and counts interventions', async t => {
  const s = await space(t);
  const tasks = { good: 'process.exit(0)', fooled: 'process.exit(0)' };
  for (const id of Object.keys(tasks)) {
    await task(s, id, { goals: [{ id: 'G1', text: 'Работает', criteria: ['C1', 'C2'] }],
      criteria: [{ id: 'C1', text: 'Тесты проходят', class: 'auto' }, { id: 'C2', text: 'Видно на экране', class: 'manual' }],
      checks: [{ id: 't', ...node(tasks[id]), criteria: ['C1'] }] });
    await verifyAll(s, id);
    await confirmItem(s, id, 'C2', { verdict: 'PASS' });
    assert.equal((await converge(s, id)).status, 'accepted');
  }
  const r = await evaluate(s, { good: node('process.exit(0)'), fooled: node('process.exit(1)') });
  assert.deepEqual(r.rows.map(x => [x.taskId, x.falsePass, x.interventions]), [['fooled', true, 1], ['good', false, 1]]);
  assert.equal(r.summary.falsePass, 1);
  assert.ok(r.rows.every(x => Number.isInteger(x.minutesToAcceptance)));
  const reports = await fs.readdir(path.join(s.dir, 'eval'));
  assert.ok(reports.some(f => f.endsWith('.md')));
});

test('model trust is measured against later human verdicts and becomes a proposal a person applies', async t => {
  const s = await space(t);
  for (let i = 0; i < 4; i++) {
    const id = `ui${i}`;
    await task(s, id, { goals: [{ id: 'G1', text: 'Доступно', criteria: ['C1'] }], criteria: [{ id: 'C1', text: 'Кнопка подписана', class: 'model', tag: 'ui-a11y' }], checks: [] });
    await recordReview(s, id, { executor: 'codex', provider: 'openai', result: { taskId: id, criteria: [{ id: 'C1', status: 'PASS', evidence: ['src/x.js:1'] }], findings: [], unknowns: [] } });
    await confirmItem(s, id, 'C1', { verdict: i === 0 ? 'FAIL' : 'PASS' });
  }
  assert.deepEqual(await measureTrust(s, 'ui-a11y'), { tag: 'ui-a11y', runs: 4, falsePass: 1, rate: 0.25 });
  await assert.rejects(proposeTrust(s, 'ui-a11y', { maxFalsePassRate: 0.3 }), /нужно не меньше 20/);
  const p = await proposeTrust(s, 'ui-a11y', { maxFalsePassRate: 0.3, minRuns: 4 });
  await assert.rejects(applyProposal(s, p.id), /ослабляет защиту/);
  await applyProposal(s, p.id, { confirmedByPerson: true });
  assert.deepEqual(s.settings.acceptance.modelTrust['ui-a11y'].measured.runs, 4);
});
