import test from 'node:test';
import assert from 'node:assert/strict';
import { applyProposal, proposeSettings } from '../core/config.mjs';
import { executorFingerprint } from '../core/resources.mjs';
import { executionStatus, reserveExecution, settleExecution, reconcileExecution, validateExecutionPolicy } from '../core/operations.mjs';
import { weakenings } from '../core/privacy.mjs';
import { space } from './helpers.mjs';

const executor = { kind: 'command', command: process.execPath, provider: 'fixture', model: 'test', dataPolicy: 'local', structuredOutput: 'json_schema', modalities: { output: ['text', 'code'] } };
async function configured(t, execution) {
  const s = await space(t);
  const p = await proposeSettings(s, { executors: { fixture: executor }, execution });
  await applyProposal(s, p.id, { confirmedByPerson: true }); return s;
}

test('a global ledger prevents concurrent calls from exceeding WIP or the reserved token budget', async t => {
  const s = await configured(t, { maxActiveRuns: 1, maxActiveTasks: 1, tokenBudget: 30 });
  const results = await Promise.allSettled([1, 2].map(n => reserveExecution(s, { taskId: 't'+n, executorId: 'fixture', estimate: { inputTokens: 10, outputTokens: 10 } })));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.filter(r => r.status === 'rejected').length, 1);
  const first = results.find(r => r.status === 'fulfilled').value;
  await settleExecution(s, first.id, { usage: { input_tokens: 10, output_tokens: 5, costUsd: 0 } });
  await assert.rejects(reserveExecution(s, { taskId: 'next', executorId: 'fixture', estimate: { inputTokens: 10, outputTokens: 10 } }), /бюджета токенов/);
  const status = await executionStatus(s);
  assert.equal(status.tokens, 15); assert.equal(status.activeRuns, 0);
});

test('unknown billing holds its reservation until explicit reconciliation', async t => {
  const s = await configured(t, { tokenBudget: 100 });
  const r = await reserveExecution(s, { taskId: 'x', executorId: 'fixture', estimate: { inputTokens: 20, outputTokens: 10 } });
  await settleExecution(s, r.id, { usage: null });
  assert.equal((await executionStatus(s)).tokens, 30);
  await assert.rejects(reserveExecution(s, { taskId: 'y', executorId: 'fixture', estimate: { inputTokens: 1, outputTokens: 1 } }), /неопределённый расход/);
  await assert.rejects(reconcileExecution(s, r.id, { tokens: 5, usd: 0, source: 'account observation' }), /владелец/);
  await reconcileExecution(s, r.id, { tokens: 5, usd: 0, source: 'account observation' }, { confirmedByPerson: true });
  const next = await reserveExecution(s, { taskId: 'y', executorId: 'fixture', estimate: { inputTokens: 1, outputTokens: 1 } });
  await settleExecution(s, next.id, { launched: false });
  assert.equal((await executionStatus(s)).tokens, 5);
});

test('finite money budgets require a current tariff tied to the actual model', async t => {
  const now = new Date(), rate = { at: now.toISOString(), expiresAt: new Date(+now+3600000).toISOString(), fingerprint: executorFingerprint(executor), source: 'test tariff', inputUsdPerMillion: 1, outputUsdPerMillion: 2 };
  const s = await configured(t, { usdBudget: 0.001, rates: { fixture: rate } });
  await assert.rejects(reserveExecution(s, { taskId: 'x', executorId: 'fixture', estimate: { inputTokens: 1000, outputTokens: 1000 } }), /денежного бюджета/);
  const r = await reserveExecution(s, { taskId: 'x', executorId: 'fixture', estimate: { inputTokens: 100, outputTokens: 100 } });
  await settleExecution(s, r.id, { usage: { input_tokens: 50, output_tokens: 25 } });
  assert.equal((await executionStatus(s)).usd, 0.0001);
  await assert.rejects(reserveExecution(s, { taskId: 'x', executorId: 'fixture', executor: { ...executor, model: 'changed' }, estimate: { inputTokens: 1, outputTokens: 1 } }), /актуального тарифа/);
});

test('relaxing an execution limit requires human confirmation', () => {
  const before = { privacy: 'strict', autopilot: false, execution: { tokenBudget: 10, maxActiveRuns: 1 } };
  assert.equal(weakenings(before, { ...before, execution: { tokenBudget: 20, maxActiveRuns: 2 } }).length, 2);
  assert.equal(weakenings(before, { ...before, execution: { tokenBudget: 5, maxActiveRuns: 1 } }).length, 0);
  assert.throws(() => validateExecutionPolicy({ maxActiveRuns: 0 }), /1..32/);
});
