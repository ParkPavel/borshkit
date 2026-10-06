#!/usr/bin/env node
// A stand-in executor for tests: reads the prompt, behaves as --mode says, answers in Borshkit's event format.
import fs from 'node:fs';
const mode = process.argv[process.argv.indexOf('--mode') + 1] ?? 'review-pass';
if (process.argv.includes('--version')) { console.log('fake 1.0'); process.exit(0); }
const prompt = fs.readFileSync(0, 'utf8');
const task = JSON.parse(prompt.match(/## Задача \(данные\)\s*```json\n([\s\S]*?)\n```/)[1]);
const say = event => console.log(JSON.stringify(event));
const wait = ms => new Promise(r => setTimeout(r, ms));
if (mode === 'quota') { say({ type: 'error', message: "You've hit your usage limit. Try again later." }); process.exit(1); }
if (mode === 'silent') { await wait(60000); process.exit(0); }
if (mode === 'tool-silent') { say({ type: 'tool', running: true }); await wait(60000); process.exit(0); }
if (mode === 'invalid') { say({ type: 'result', result: { nope: true } }); process.exit(0); }
if (mode === 'echo-prompt') { fs.writeFileSync('prompt.txt', prompt); say({ type: 'result', result: { summary: 'ok', files: ['prompt.txt'], writes: [], unknowns: [] } }); process.exit(0); }
if (mode === 'write') {
  say({ type: 'tool', running: true });
  fs.writeFileSync('feature.txt', `сделано для ${task.taskId}\n`);
  say({ type: 'tool', running: false });
  say({ type: 'result', result: { summary: 'Добавлен feature.txt', files: ['feature.txt'], writes: [], unknowns: [] }, usage: { input_tokens: 10, output_tokens: 5 } });
  process.exit(0);
}
const status = mode === 'review-fail' ? 'FAIL' : 'PASS';
say({ type: 'result', result: { taskId: task.taskId, criteria: task.criteria.map(c => ({ id: c.id, status, evidence: ['src/app.js:1 проверено'] })), findings: [], unknowns: [] } });
