#!/usr/bin/env node
// Imitates `codex exec --json`: thread events and an agent message holding the JSON answer.
import fs from 'node:fs';
const a = process.argv.slice(2);
if (a.includes('--help')) { console.log('--sandbox --output-schema --json --ignore-user-config --ephemeral'); process.exit(0); }
if (a.includes('--version')) { console.log('codex-cli 0.99.0'); process.exit(0); }
const prompt = fs.readFileSync(0, 'utf8');
const task = JSON.parse(prompt.match(/## Задача \(данные\)\s*```json\n([\s\S]*?)\n```/)[1]);
const say = e => console.log(JSON.stringify(e));
say({ type: 'thread.started' }); say({ type: 'turn.started' });
const sandbox = a[a.indexOf('--sandbox') + 1];
const answer = { taskId: task.taskId, criteria: task.criteria.map(c => ({ id: c.id, status: 'PASS', evidence: [`sandbox: ${sandbox}`] })), findings: [], unknowns: [] };
say({ type: 'item.completed', item: { type: 'agent_message', text: JSON.stringify(answer) } });
say({ type: 'turn.completed', usage: { input_tokens: 50 } });
