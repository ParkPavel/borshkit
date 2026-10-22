import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { EventEmitter } from 'node:events';
import { packContext } from '../core/context-pack.mjs';
import { createHandoff, exportHandoff, importHandoff } from '../core/handoff.mjs';
import { mapCode } from '../core/code-map.mjs';
import { buildKnowledge, queryKnowledge } from '../core/kb.mjs';
import { prepareNative, validateNativeRequest, finishNative, claimNativeRequest } from '../core/native.mjs';
import { converge, verifyAll, recordReview, taskState, authorProviders } from '../core/accept.mjs';
import { readJSON, atomicJSON } from '../core/io.mjs';
import { space, task, write, tempDir, node, project } from './helpers.mjs';
const { NativeSession } = createRequire(import.meta.url)('../integrations/vscode/native.cjs');
const contract = { paths: ['src'], goals: [{ id: 'G1', text: 'Проверено', criteria: ['C1'] }], criteria: [{ id: 'C1', class: 'auto', text: 'Проходит проверка' }], checks: [{ id: 'check', ...node('process.exit(0)'), criteria: ['C1'] }] };

test('context packing preserves priority, provenance, limits, dedup and explicit omissions', () => {
  const fragments = [{ source: 'low', text: 'l'.repeat(2000), priority: 1 }, { source: 'critical', text: 'decision', priority: 100 }, { source: 'same', text: 'decision', priority: 99 }];
  const packed = packContext(fragments, { budget: 512 });
  assert.ok(packed.text.length <= 512);
  assert.equal(packed.manifest.selected[0].source, 'critical');
  assert.deepEqual(packed.manifest.selected[0].alsoFrom, ['same']);
  assert.ok(packed.manifest.selected.some(f => f.truncated));
  assert.deepEqual(packContext(fragments, { budget: 512 }), packed);
  assert.ok(!fragments.map(f => f.text).join('\n').slice(0, 512).includes('decision'));
  assert.ok(packed.text.includes('decision')); // Important facts survive unlike naive prefix clipping.
  assert.throws(() => packContext(fragments, { budget: 1 }));
});

test('task handoff round-trip preserves specification but never carries acceptance or settings', async t => {
  const source = await space(t), target = await space(t), out = path.join(await tempDir(t), 'task.json');
  await task(source, 'from', contract); await verifyAll(source, 'from');
  await exportHandoff(source, 'from', out, { next: ['Проверить снова'], unknowns: ['Живая модель не проверена'] });
  const before = JSON.stringify(target.settings);
  const imported = await importHandoff(target, out, 'received');
  assert.equal(imported.state, 'IMPORTED_UNVERIFIED');
  assert.deepEqual(await authorProviders(target, 'received'), ['unknown']);
  assert.equal(JSON.stringify(target.settings), before);
  const c = await readJSON(imported.file);
  assert.deepEqual(c.criteria, contract.criteria);
  assert.equal((await converge(target, 'received')).status, 'unknown');
  await assert.rejects(importHandoff(target, out, 'received'), /уже есть/);
  const capsule = await readJSON(out); capsule.contract.goal = 'tampered'; await atomicJSON(out, capsule);
  await assert.rejects(importHandoff(target, out, 'tampered'), /целостность/);
  await assert.rejects(fs.access(path.join(target.tasks, 'tampered')));
});

test('handoff filters secrets and native requests detect stale sources', async t => {
  const s = await space(t); await task(s, 'native', contract);
  const prepared = await prepareNative(s, 'native', 'roo');
  assert.equal((await validateNativeRequest(prepared.file)).host, 'roo');
  await write(prepared.cwd, { 'src/app.js': 'changed' });
  await assert.rejects(validateNativeRequest(prepared.file), /изменились/);
  await write(prepared.cwd, { 'src/secret.txt': 'sk-ant-' + 'x'.repeat(40) });
  await assert.rejects(createHandoff(s, 'native'), /секрет/);
});

test('Python, Go and Swift map only local resolvable imports, retain unknowns and exports', () => {
  const files = new Set(['pkg/a.py', 'pkg/b.py', 'lib/lib.go', 'main.go', 'Sources/Core/Core.swift', 'Tests/CoreTests/T.swift']);
  const py = mapCode('pkg/a.py', 'from .b import B\nimport unknown\ndef f(): pass\n', files);
  assert.deepEqual(py.imports, ['pkg/b.py']); assert.deepEqual(py.unresolved, ['unknown']); assert.deepEqual(py.exports, ['f']);
  assert.deepEqual(mapCode('main.go', 'package main\nimport "example.org/demo/lib"\n', files, { goModule: 'example.org/demo' }).imports, ['lib/lib.go']);
  assert.deepEqual(mapCode('Tests/CoreTests/T.swift', '@testable import Core\nimport Foundation', files).imports, ['Sources/Core/Core.swift']);
  assert.deepEqual(mapCode('Sources/Core/Core.swift', 'public struct Item {}', files).exports, ['Item']);
});

test('the knowledge SQL graph includes non-JS modules and test links', async t => {
  const root = await project(t, { 'pkg/a.py': 'from .b import B\n', 'pkg/b.py': 'class B: pass\n', 'tests/test_py.py': 'from pkg.b import B\n', 'go.mod': 'module example.org/demo\n', 'main.go': 'package main\nimport "example.org/demo/lib"', 'lib/lib.go': 'package lib\nfunc Exported(){}', 'Sources/Core/A.swift': 'public struct A {}', 'Tests/CoreTests/A.swift': '@testable import Core' });
  const s = await space(t, { project: root }); await buildKnowledge(s);
  const rows = await queryKnowledge(s, "SELECT rel FROM links WHERE src LIKE '%tests/test_py.py.md' AND rel='tests'");
  assert.equal(rows.length, 1);
  const note = await fs.readFile(path.join(s.dir, 'knowledge/_generated/code/main.go.md'), 'utf8');
  assert.match(note, /bk-language: "go"/);
});

test('Roo sessions correlate lifecycle events, refuse busy hosts and never accept tasks', async () => {
  const api = new EventEmitter(); let stack = [];
  api.getCurrentTaskStack = () => stack;
  api.startNewTask = async () => { stack = ['owned']; api.emit('taskCompleted', 'owned'); return 'owned'; };
  api.cancelCurrentTask = async () => {};
  const session = new NativeSession('roo', api);
  assert.equal((await session.start('data')).state, 'HARNESS_COMPLETED_UNVERIFIED');
  api.emit('taskCompleted', 'other'); assert.equal(session.status().acceptance, 'UNVERIFIED');
  stack = ['other']; await assert.rejects(session.cancel(), /чужая/);
  await assert.rejects(new NativeSession('roo', api).start('data'), /активная/);
  session.dispose(); assert.equal(api.listenerCount('taskCompleted'), 0);
});

test('Cline launch is real API but status/cancellation stay honestly unsupported', async () => {
  let calls = 0;
  const session = new NativeSession('cline', { startNewTask: async text => { assert.equal(text, 'data'); calls++; } });
  assert.equal((await session.start('data')).state, 'LAUNCHED_STATUS_UNKNOWN');
  assert.equal(calls, 1); await assert.rejects(session.cancel(), /не предоставляет/);
  const hung = new NativeSession('cline', { startNewTask: () => new Promise(() => {}) }, { timeoutMs: 10 });
  await assert.rejects(hung.start('data'), /не ответила/);
});

test('Copilot uses the native Language Model API without executing tools and supports cancellation', async () => {
  let cancelled = false;
  const vscode = { CancellationTokenSource: class { token = {}; cancel() { cancelled = true; } dispose() {} }, LanguageModelChatMessage: { User: text => ({ role: 'user', text }) } };
  const model = { id: 'exact-model', async sendRequest(messages, options) { assert.deepEqual(options, {}); assert.equal(messages[0].text, 'prompt'); return { text: (async function* () { yield 'result'; })() }; } };
  const session = new NativeSession('copilot', null, { vscode, model });
  assert.equal((await session.start('prompt')).output, 'result');
  assert.equal(session.status().acceptance, 'UNVERIFIED');
  await session.cancel(); assert.equal(cancelled, true);
});

test('the handoff CLI exports and imports a real task using Russian aliases', async t => {
  const { runCommand } = await import('../core/process.mjs');
  const { ROOT } = await import('../core/io.mjs');
  const from = await space(t), to = await space(t), out = path.join(await tempDir(t), 'handoff.json');
  await task(from, 'cli-transfer', contract);
  const cli = path.join(ROOT, 'bin', 'borshkit.mjs');
  await runCommand(process.execPath, [cli, 'передача', 'экспорт', 'cli-transfer', '--файл', out, '--budget', '512', '--json'], { cwd: from.project });
  const imported = await runCommand(process.execPath, [cli, 'передача', 'import', 'received-cli', '--файл', out, '--json'], { cwd: to.project });
  assert.equal(JSON.parse(imported.stdout).state, 'IMPORTED_UNVERIFIED');
  assert.equal((await readJSON(path.join(to.tasks, 'received-cli', 'contract.json'))).taskId, 'received-cli');
});

test('native cancellation affects only the owned Roo task and Copilot timeout cancels the token', async () => {
  const api = new EventEmitter(); let calls = 0;
  api.getCurrentTaskStack = () => ['owned']; api.cancelCurrentTask = async () => { calls++; };
  const roo = new NativeSession('roo', api); roo.id = 'owned'; roo.state = 'RUNNING';
  assert.equal((await roo.cancel()).state, 'CANCELLED'); assert.equal(calls, 1);
  let cancelled = false;
  const vscode = { CancellationTokenSource: class { token = {}; cancel() { cancelled = true; } dispose() {} }, LanguageModelChatMessage: { User: text => text } };
  const copilot = new NativeSession('copilot', null, { vscode, timeoutMs: 10, model: { id: 'model', sendRequest: () => new Promise(() => {}) } });
  await assert.rejects(copilot.start('data'), /не ответила/); assert.equal(cancelled, true);
  assert.equal(copilot.status().acceptance, 'UNVERIFIED');
});

test('VS Code refuses a native launch from an untrusted workspace before host activation', async () => {
  const { Script } = await import('node:vm');
  const { ROOT } = await import('../core/io.mjs');
  const callbacks = new Map(); let hostCalls = 0;
  const vscode = { workspace: { isTrusted: false }, commands: { registerCommand(id, callback) { callbacks.set(id, callback); return { dispose() {} }; } },
    window: { createOutputChannel() { return { dispose() {}, appendLine() {}, show() {} }; }, showOpenDialog() { hostCalls++; } },
    lm: { selectChatModels() { hostCalls++; } } };
  const module = { exports: {} }, localRequire = createRequire(path.join(ROOT, 'integrations/vscode/extension.cjs'));
  const source = await fs.readFile(path.join(ROOT, 'integrations/vscode/extension.cjs'), 'utf8');
  new Script(`(function(require,module,exports){${source}\n})`).runInThisContext()(id => id === 'vscode' ? vscode : localRequire(id), module, module.exports);
  module.exports.activate({ subscriptions: [], extensionPath: ROOT });
  await assert.rejects(callbacks.get('borshkit.nativeStart')(), /доверенный/);
  assert.equal(hostCalls, 0);
});


test('native sessions reserve the writer and unknown authors cannot establish independence', async t => {
  const { runJob } = await import('../core/jobs.mjs');
  const s = await space(t);
  await task(s, 'native-owner', { paths: ['src'], goals: [{ id: 'G1', text: 'Ревью', criteria: ['C1'] }], criteria: [{ id: 'C1', class: 'model', text: 'Понятный код' }], checks: [] });
  const request = await prepareNative(s, 'native-owner', 'roo');
  assert.deepEqual(await authorProviders(s, 'native-owner'), ['unknown']);
  await assert.rejects(runJob(s, { taskId: 'native-owner', role: 'implementer', executor: 'unused' }), /нативная работа/);
  await assert.rejects(prepareNative(s, 'native-owner', 'roo'), /незавершённая/);
  await claimNativeRequest(request.file);
  await assert.rejects(claimNativeRequest(request.file), /уже запущен/);
  const seen = await taskState(s, 'native-owner');
  await recordReview(s, 'native-owner', { executor: 'reviewer', provider: 'openai', seenState: seen, origin: 'job', result: { taskId: 'native-owner', criteria: [{ id: 'C1', status: 'PASS', evidence: ['src/app.js:1'] }], findings: [], unknowns: [] } });
  const report = await converge(s, 'native-owner');
  assert.equal(report.criteria[0].status, 'WAITING'); assert.match(report.criteria[0].reason, /автора нативной/);
  await assert.rejects(finishNative(s, 'native-owner'), /человек/);
  await finishNative(s, 'native-owner', { confirmedByPerson: true });
  await assert.rejects(validateNativeRequest(request.file));
  assert.deepEqual(await authorProviders(s, 'native-owner'), ['unknown']);
});


test('strict privacy blocks native preparation and invalidates previously prepared requests', async t => {
  const { proposeSettings, applyProposal } = await import('../core/config.mjs');
  const s = await space(t); await task(s, 'strict-native', contract);
  const prepared = await prepareNative(s, 'strict-native', 'copilot');
  const proposal = await proposeSettings(s, { privacy: 'strict' });
  await applyProposal(s, proposal.id);
  await assert.rejects(validateNativeRequest(prepared.file), /настройки изменились/);
  await assert.rejects(prepareNative(s, 'strict-native', 'roo'), /Строгий режим/);
});
