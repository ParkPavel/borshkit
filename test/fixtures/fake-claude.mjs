#!/usr/bin/env node
// Imitates `claude --print --output-format stream-json`: system/init, a tool call, the result event.
import fs from 'node:fs';
const a = process.argv.slice(2);
if (a.includes('--help')) { console.log('--print --output-format --json-schema --tools --strict-mcp-config --no-session-persistence --model --effort'); process.exit(0); }
if (a.includes('--version')) { console.log('2.1.289 (Claude Code)'); process.exit(0); }
const prompt = fs.readFileSync(0, 'utf8');
const task = JSON.parse(prompt.match(/## Задача \(данные\)\s*```json\n([\s\S]*?)\n```/)[1]);
const say = e => console.log(JSON.stringify(e));
say({ type: 'system', subtype: 'init' });
say({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Read' }] } });
say({ type: 'user', message: { content: [{ type: 'tool_result' }] } });
const tools = a[a.indexOf('--tools') + 1];
say({ type: 'result', is_error: false, total_cost_usd: 0.01, usage: { input_tokens: 100 }, structured_output: { taskId: task.taskId, criteria: task.criteria.map(c => ({ id: c.id, status: 'PASS', evidence: [`инструменты: ${tools}`] })), findings: [], unknowns: [] } });
