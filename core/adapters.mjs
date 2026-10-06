import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { commandSpec } from './process.mjs';
import { childEnv } from './privacy.mjs';
import { classifyFailure } from './executors.mjs';

// One interface for every executor: start(...) returns { done, stop }. `done`
// resolves to { ok, result, usage, error, failure }. Every sign of life calls
// onEvent({ kind, toolRunning }) so the dispatcher can tell silence from work.
// CLI arguments adapted from Claudex src/adapters.mjs (Apache-2.0, same author).

function stopTree(child) {
  if (!child.pid || child.exitCode !== null) return;
  try { process.platform === 'win32' ? spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true }) : process.kill(-child.pid, 'SIGKILL'); }
  catch { try { child.kill('SIGKILL'); } catch { /* already gone */ } }
}
async function spawnLines({ command, args, cwd, env, input, onLine, timeoutMs }) {
  const spec = await commandSpec(command);
  const child = spawn(spec.executable, [...spec.prefix, ...args], { cwd, env, windowsHide: true, shell: false, detached: process.platform !== 'win32', stdio: ['pipe', 'pipe', 'pipe'] });
  let buffer = '', stderr = '', stoppedBy = null;
  const timer = setTimeout(() => { stoppedBy = 'TIMEOUT'; stopTree(child); }, timeoutMs);
  const done = new Promise(resolve => {
    child.stdout.on('data', chunk => {
      buffer += chunk.toString();
      let i;
      while ((i = buffer.indexOf('\n')) >= 0) { const line = buffer.slice(0, i).trim(); buffer = buffer.slice(i + 1); if (line) onLine(line); }
    });
    child.stderr.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-20000); });
    child.on('error', e => { stderr += e.message; });
    child.on('close', code => { clearTimeout(timer); if (buffer.trim()) onLine(buffer.trim()); resolve({ code, stderr, stoppedBy }); });
  });
  child.stdin.on('error', () => {});
  child.stdin.end(input);
  return { done, stop: reason => { stoppedBy = reason; stopTree(child); } };
}
const parse = line => { try { return JSON.parse(line); } catch { return null; } };
const failureOf = (message, stoppedBy) => stoppedBy ?? classifyFailure(message);

function claudeArgs(e, schema, writable) {
  const tools = writable ? 'Read,Glob,Grep,Edit,Write' : 'Read,Glob,Grep';
  return ['--print', '--output-format', 'stream-json', '--verbose', '--no-session-persistence',
    ...(e.model ? ['--model', e.model] : []), ...(e.effort ? ['--effort', e.effort] : []),
    '--tools', tools, '--allowedTools', tools, '--disallowedTools', 'mcp__*', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}',
    '--permission-mode', 'dontAsk', '--json-schema', JSON.stringify(schema)];
}
function codexArgs(e, schemaFile, writable) {
  return ['exec', '--ignore-user-config', '--ephemeral', '--sandbox', writable ? 'workspace-write' : 'read-only', '-c', 'approval_policy="never"',
    ...(e.model ? ['-m', e.model] : []), ...(e.effort ? ['-c', `model_reasoning_effort=${JSON.stringify(e.effort)}`] : []),
    '--json', '--output-schema', schemaFile, '-'];
}

async function startCli({ executor: e, prompt, schema, cwd, writable, onEvent, timeoutMs, scratch }) {
  let result = null, usage = null, error = null, toolRunning = false;
  let args;
  if (e.kind === 'claude-cli') args = claudeArgs(e, schema, writable);
  else if (e.kind === 'codex-cli') {
    const schemaFile = path.join(scratch, 'schema.json');
    await fs.mkdir(scratch, { recursive: true });
    await fs.writeFile(schemaFile, JSON.stringify(schema));
    args = codexArgs(e, schemaFile, writable);
  } else args = [...(e.args ?? [])];
  const onLine = line => {
    const ev = parse(line);
    if (ev && e.kind === 'claude-cli') {
      if (ev.type === 'assistant' && ev.message?.content?.some?.(c => c.type === 'tool_use')) toolRunning = true;
      if (ev.type === 'user') toolRunning = false;
      if (ev.type === 'result') {
        usage = { ...(ev.usage ?? {}), costUsd: ev.total_cost_usd ?? null };
        if (ev.is_error) error = typeof ev.result === 'string' ? ev.result : JSON.stringify(ev);
        else try { result = ev.structured_output ?? JSON.parse(ev.result); } catch { error = 'ответ не по схеме'; }
      }
    } else if (ev && e.kind === 'codex-cli') {
      if (ev.type === 'item.started' && ev.item?.type === 'command_execution') toolRunning = true;
      if (ev.type === 'item.completed' && ev.item?.type === 'command_execution') toolRunning = false;
      if (ev.type === 'item.completed' && ev.item?.type === 'agent_message') { try { result = JSON.parse(ev.item.text); } catch { error = 'ответ не по схеме'; } }
      if (ev.type === 'turn.completed') usage = ev.usage ?? null;
      if (ev.type === 'error' || ev.type === 'turn.failed') error = ev.message ?? ev.error?.message ?? JSON.stringify(ev);
    } else if (ev && e.kind === 'command') {
      if (ev.type === 'tool') toolRunning = Boolean(ev.running);
      if (ev.type === 'result') { result = ev.result; usage = ev.usage ?? null; }
      if (ev.type === 'error') error = ev.message;
    }
    onEvent({ kind: ev?.type ?? 'output', toolRunning });
  };
  const run = await spawnLines({ command: e.command, args, cwd, env: childEnv(process.env, e.envAllow ?? []), input: prompt, onLine, timeoutMs });
  const done = run.done.then(({ code, stderr, stoppedBy }) => {
    if (stoppedBy) return { ok: false, failure: stoppedBy, error: stoppedBy === 'TIMEOUT' ? 'превышено время' : 'остановлен', usage };
    // A structured answer counts only from a process that also says it succeeded.
    // If the two disagree, the job fails and the answer is kept for a person.
    if (result && !error && code === 0) return { ok: true, result, usage };
    if (result && !error) return { ok: false, failure: failureOf(stderr.trim() || 'ошибка'), error: `программа выдала ответ, но завершилась с кодом ${code}${stderr.trim() ? `: ${stderr.trim().slice(0, 500)}` : ''}`, unconfirmedResult: result, usage };
    const message = error ?? (stderr.trim() || `процесс завершился с кодом ${code}`);
    return { ok: false, failure: error === 'ответ не по схеме' ? 'INVALID' : failureOf(message), error: message.slice(0, 2000), usage };
  });
  return { done, stop: run.stop };
}

async function startApi({ executor: e, prompt, schema, onEvent, timeoutMs, fetchImpl, image, env = process.env }) {
  const controller = new AbortController();
  let stoppedBy = null;
  const timer = setTimeout(() => { stoppedBy = 'TIMEOUT'; controller.abort(); }, timeoutMs);
  const base = e.baseUrl.endsWith('/') ? e.baseUrl : `${e.baseUrl}/`;
  const headers = { 'content-type': 'application/json', ...(e.apiKeyEnv && env[e.apiKeyEnv] ? { authorization: `Bearer ${env[e.apiKeyEnv]}` } : {}) };
  const done = (async () => {
    try {
      onEvent({ kind: 'request', toolRunning: true });
      const body = image
        ? { model: e.model, prompt, n: 1, response_format: 'b64_json' }
        : { model: e.model, messages: [{ role: 'user', content: prompt }],
          ...(e.structuredOutput === 'json_schema' ? { response_format: { type: 'json_schema', json_schema: { name: 'result', schema, strict: false } } } : e.structuredOutput === 'json_mode' ? { response_format: { type: 'json_object' } } : {}) };
      const response = await fetchImpl(new URL(image ? 'images/generations' : 'chat/completions', base).href, { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal });
      onEvent({ kind: 'response', toolRunning: false });
      const text = await response.text();
      if (!response.ok) {
        const message = `HTTP ${response.status}: ${text.slice(0, 500)}`;
        return { ok: false, failure: response.status === 429 ? 'QUOTA' : classifyFailure(message), error: message, retryAfter: Number(response.headers.get('retry-after')) || null };
      }
      const data = JSON.parse(text);
      if (image) {
        const item = data.data?.[0];
        if (!item?.b64_json) return { ok: false, failure: 'INVALID', error: 'в ответе нет изображения' };
        return { ok: true, result: { imageBase64: item.b64_json }, usage: data.usage ?? null };
      }
      const content = data.choices?.[0]?.message?.content;
      try { return { ok: true, result: JSON.parse(content), usage: data.usage ?? null }; }
      catch { return { ok: false, failure: 'INVALID', error: 'ответ не по схеме', usage: data.usage ?? null }; }
    } catch (err) {
      return { ok: false, failure: stoppedBy ?? classifyFailure(err.message), error: stoppedBy === 'TIMEOUT' ? 'превышено время' : err.message };
    } finally { clearTimeout(timer); }
  })();
  return { done, stop: reason => { stoppedBy = reason; controller.abort(); } };
}

export async function startExecutor(options) {
  return options.executor.kind === 'openai-compat' ? startApi(options) : startCli(options);
}
