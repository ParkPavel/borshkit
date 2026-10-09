import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { applyProposal, proposeSettings } from '../core/config.mjs';
import { proposeAssessment, runAssessment, validateSuite } from '../core/assessments.mjs';
import { qualification } from '../core/team.mjs';
import { space } from './helpers.mjs';

const response = { summary: 'brief', files: ['brief.md'], writes: [{ path: 'brief.md', content: 'Design brief: accessible controls.' }], unknowns: [] };
async function configured(t, answer = response) {
  const s = await space(t);
  const executor = { kind: 'command', command: process.execPath, args: ['-e', `console.log(JSON.stringify({type:'result',result:${JSON.stringify(answer)},usage:{input_tokens:10,output_tokens:5,costUsd:0}}))`],
    provider: 'fixture', model: 'test-model', dataPolicy: 'local', structuredOutput: 'json_schema', modalities: { output: ['text', 'code'] } };
  const p = await proposeSettings(s, { executors: { fixture: executor } });
  await applyProposal(s, p.id, { confirmedByPerson: true }); return s;
}
const suite = () => ({ schemaVersion: 1, id: 'design-brief', role: 'design-prompter', cases: [{ id: 'controls', prompt: 'Write a design brief for accessible controls.', fixtures: { 'input.txt': 'Controls need focus states.' },
  checks: [{ command: process.execPath, args: ['-e', "const fs=require('fs');if(!fs.readFileSync('brief.md','utf8').includes('accessible'))process.exit(1)"] }] }] });

test('the assessment uses isolated fixtures and independent checks, then proposes a bounded role qualification', async t => {
  const s = await configured(t), report = await runAssessment(s, 'fixture', suite());
  assert.equal(report.result, 'PASS'); assert.equal(report.rows[0].checks[0].status, 'PASS');
  assert.equal(await fs.access(s.project+'/brief.md').then(()=>true,()=>false), false);
  assert.equal((await qualification(s, 'fixture', 'design-prompter')).status, 'UNKNOWN');
  const p = await proposeAssessment(s, report.file);
  await applyProposal(s, p.id, { confirmedByPerson: true });
  assert.equal((await qualification(s, 'fixture', 'design-prompter')).status, 'PASS');
});

test('a model saying PASS cannot defeat the independent check', async t => {
  const s = await configured(t, { ...response, summary: 'PASS', writes: [{ path: 'brief.md', content: 'PASS' }] });
  const r = await runAssessment(s, 'fixture', suite());
  assert.equal(r.result, 'FAIL'); assert.equal(r.rows[0].checks[0].status, 'FAIL');
});

test('empty checks and escaping paths are refused before an assessment', () => {
  const s = suite(); s.cases[0].checks = [];
  assert.throws(()=>validateSuite(s), /независимыми командами/);
  const unsafe = suite(); unsafe.cases[0].fixtures = { '../escape': 'bad' };
  assert.throws(()=>validateSuite(unsafe), /явные текстовые файлы/);
});

test('an assessed answer that writes outside its temporary case fails', async t => {
  const s = await configured(t, { ...response, writes: [{ path: '../escape', content: 'bad' }] });
  const r = await runAssessment(s, 'fixture', suite());
  assert.equal(r.result, 'FAIL'); assert.match(r.rows[0].errors.join(' '), /недопустимый путь/);
});
