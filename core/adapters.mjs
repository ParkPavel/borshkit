import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { commandSpec } from './process.mjs';
import { childEnv } from './privacy.mjs';
import { classifyFailure } from './executors.mjs';
import { resetTime, resourcesFromHeaders } from './resources.mjs';
import { assert } from './io.mjs';

// One interface for every executor: start(...) returns { done, stop }. `done`
// resolves to { ok, result, usage, error, failure }. Every sign of life calls
// onEvent({ kind, toolRunning }) so the dispatcher can tell silence from work.
// CLI arguments adapted from Claudex src/adapters.mjs (Apache-2.0, same author).

function stopTree(child) {
  if (!child.pid || child.exitCode !== null) return;
  try { process.platform === 'win32' ? spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true }) : process.kill(-child.pid, 'SIGKILL'); }
  catch { try { child.kill('SIGKILL'); } catch { /* already gone */ } }
}
async function spawnLines({ command, args, cwd, env, input, onLine, onStart, timeoutMs }) {
  const spec = await commandSpec(command);
  const child = spawn(spec.executable, [...spec.prefix, ...args], { cwd, env, windowsHide: true, shell: false, detached: process.platform !== 'win32', stdio: ['pipe', 'pipe', 'pipe'] });
  child.once('spawn', () => onStart());
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
  let geminiText = '', geminiModelSeen = false;
  let args;
  if (e.kind === 'claude-cli') args = claudeArgs(e, schema, writable);
  else if (e.kind === 'codex-cli') {
    const schemaFile = path.join(scratch, 'schema.json');
    await fs.mkdir(scratch, { recursive: true });
    await fs.writeFile(schemaFile, JSON.stringify(schema));
    args = codexArgs(e, schemaFile, writable);
  } else if (e.kind === 'gemini-cli') {
    assert(e.model && !['auto','pro','flash','flash-lite'].includes(e.model), 'Gemini требует точный ID модели, без автоматического маршрутизатора');
    // Gemini's workspace policies are currently disabled upstream. Use an
    // explicit user-tier deny-all policy; refuse higher-tier overrides.
    const adminDir = process.platform === 'win32' ? path.join(process.env.ProgramData ?? 'C:\\ProgramData','gemini-cli','policies') :
      process.platform === 'darwin' ? '/Library/Application Support/GeminiCli/policies' : '/etc/gemini-cli/policies';
    const admin = await fs.readdir(adminDir).catch(err => { if(err.code==='ENOENT')return [];throw err; });
    assert(!admin.some(n=>n.endsWith('.toml')), 'Gemini: административные политики требуют отдельного аудита; автоматический запуск заблокирован');
    await fs.mkdir(scratch,{recursive:true});
    const policy = path.join(scratch,'deny-tools.toml');
    await fs.writeFile(policy,'[[rule]]\ntoolName = "*"\ndecision = "deny"\npriority = 999\n');
    args=['--sandbox','--approval-mode','plan','--output-format','stream-json','--policy',policy,'--extensions','none','--model',e.model];
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
    } else if (ev && e.kind === 'gemini-cli') {
      if(ev.type==='init') {geminiModelSeen=ev.model===e.model;if(!geminiModelSeen)error='Gemini фактически использовал другую модель';}
      if(ev.type==='tool_use') error='Gemini нарушил профиль без инструментов';
      if(ev.type==='message' && ev.role==='assistant') geminiText+=ev.content??'';
      if(ev.type==='error') error=ev.message??ev.error?.message??'Ошибка Gemini';
      if(ev.type==='result') {
        const tokens=ev.stats?.tokens??ev.stats;
        usage=tokens?{input_tokens:tokens.input??tokens.input_tokens,output_tokens:tokens.output??tokens.output_tokens}:null;
        if(ev.status!=='success') error=ev.error?.message??'Gemini не подтвердил успех';
        try {result=JSON.parse(geminiText);}catch{error='ответ не по схеме';}
      }
    } else if (ev && e.kind === 'command') {
      if (ev.type === 'tool') toolRunning = Boolean(ev.running);
      if (ev.type === 'result') { result = ev.result; usage = ev.usage ?? null; }
      if (ev.type === 'error') error = ev.message;
    }
    onEvent({ kind: ev?.type ?? 'output', toolRunning });
  };
  const run = await spawnLines({ command: e.command, args, cwd, env: childEnv(process.env, e.envAllow ?? []), input: prompt, onLine, onStart: () => onEvent({ kind: 'spawn', toolRunning: false }), timeoutMs });
  const done = run.done.then(({ code, stderr, stoppedBy }) => {
    if (stoppedBy) return { ok: false, failure: stoppedBy, error: stoppedBy === 'TIMEOUT' ? 'превышено время' : 'остановлен', usage };
    // A structured answer counts only from a process that also says it succeeded.
    // If the two disagree, the job fails and the answer is kept for a person.
    if(e.kind==='gemini-cli' && !geminiModelSeen) error='Gemini не подтвердил фактическую модель';
    if (result && !error && code === 0) return { ok: true, result, usage };
    if (result && !error) return { ok: false, failure: failureOf(stderr.trim() || 'ошибка'), error: `программа выдала ответ, но завершилась с кодом ${code}${stderr.trim() ? `: ${stderr.trim().slice(0, 500)}` : ''}`, unconfirmedResult: result, usage };
    const message = error ?? (stderr.trim() || `процесс завершился с кодом ${code}`);
    return { ok: false, failure: error === 'ответ не по схеме' ? 'INVALID' : failureOf(message), error: message.slice(0, 2000), usage };
  });
  return { done, stop: run.stop };
}

async function startApi({ executor: e, prompt, schema, onEvent, timeoutMs, fetchImpl, image, env = process.env, maxOutputTokens = null }) {
  const controller = new AbortController();
  let stoppedBy = null;
  const timer = setTimeout(() => { stoppedBy = 'TIMEOUT'; controller.abort(); }, timeoutMs);
  const base = e.baseUrl.endsWith('/') ? e.baseUrl : `${e.baseUrl}/`;
  const headers = { 'content-type': 'application/json', ...(e.apiKeyEnv && env[e.apiKeyEnv] ? { authorization: `Bearer ${env[e.apiKeyEnv]}` } : {}) };
  let resources = null;
  const done = (async () => {
    try {
      onEvent({ kind: 'request', toolRunning: true });
      const body = image
        ? { model: e.model, prompt, n: 1, response_format: 'b64_json' }
        : { model: e.model, messages: [{ role: 'user', content: prompt }],
          ...(Number.isInteger(maxOutputTokens) && maxOutputTokens > 0 ? { max_tokens: maxOutputTokens } : {}),
          ...(e.structuredOutput === 'json_schema' ? { response_format: { type: 'json_schema', json_schema: { name: 'result', schema, strict: false } } } : e.structuredOutput === 'json_mode' ? { response_format: { type: 'json_object' } } : {}) };
      const response = await fetchImpl(new URL(image ? 'images/generations' : 'chat/completions', base).href, { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal });
      resources = resourcesFromHeaders(response.headers, image ? 'images/generations' : 'chat/completions');
      onEvent({ kind: 'response', toolRunning: false });
      const text = await response.text();
      if (!response.ok) {
        const message = `HTTP ${response.status}: ${text.slice(0, 500)}`;
        const reset = resetTime(response.headers.get('retry-after'));
        return { ok: false, failure: response.status === 429 ? 'QUOTA' : classifyFailure(message), error: message, resources, retryAfter: reset ? Math.max(0, Math.ceil((Date.parse(reset) - Date.now()) / 1000)) : null };
      }
      const data = JSON.parse(text);
      if (image) {
        const item = data.data?.[0];
        if (!item?.b64_json) return { ok: false, failure: 'INVALID', error: 'в ответе нет изображения' };
        return { ok: true, result: { imageBase64: item.b64_json }, usage: data.usage ?? null, resources };
      }
      const content = data.choices?.[0]?.message?.content;
      try { return { ok: true, result: JSON.parse(content), usage: data.usage ?? null, resources }; }
      catch { return { ok: false, failure: 'INVALID', error: 'ответ не по схеме', usage: data.usage ?? null, resources }; }
    } catch (err) {
      return { ok: false, failure: stoppedBy ?? classifyFailure(err.message), error: stoppedBy === 'TIMEOUT' ? 'превышено время' : err.message, resources };
    } finally { clearTimeout(timer); }
  })();
  return { done, stop: reason => { stoppedBy = reason; controller.abort(); } };
}

export async function startExecutor(options) {
  return options.executor.kind === 'gemini-api' ? startGeminiApi(options) : options.executor.kind === 'openai-compat' ? startApi(options) : startCli(options);
}

async function startGeminiApi({executor:e,prompt,schema,onEvent,timeoutMs,fetchImpl,image,env=process.env,maxOutputTokens=null}) {
  const controller=new AbortController();let stoppedBy=null,resources=null;
  const timer=setTimeout(()=>{stoppedBy='TIMEOUT';controller.abort();},timeoutMs);
  const done=(async()=>{
    try {
      const base=e.baseUrl.endsWith('/')?e.baseUrl:e.baseUrl+'/';
      const generationConfig={...(Number.isInteger(maxOutputTokens)&&maxOutputTokens>0?{maxOutputTokens}:{}),
        ...(image?{responseModalities:['TEXT','IMAGE']}:{responseMimeType:'application/json',...(e.structuredOutput==='json_schema'?{responseJsonSchema:schema}:{})})};
      onEvent({kind:'request',toolRunning:true});
      const response=await fetchImpl(new URL(`models/${encodeURIComponent(e.model)}:generateContent`,base).href,{method:'POST',headers:{'content-type':'application/json',...(e.apiKeyEnv&&env[e.apiKeyEnv]?{'x-goog-api-key':env[e.apiKeyEnv]}:{})},
        body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt}]}],generationConfig}),signal:controller.signal});
      resources=resourcesFromHeaders(response.headers,'generateContent');onEvent({kind:'response',toolRunning:false});
      const text=await response.text();if(!response.ok)return{ok:false,failure:response.status===429?'QUOTA':classifyFailure(`HTTP ${response.status}`),error:`HTTP ${response.status}: ${text.slice(0,500)}`,resources};
      const data=JSON.parse(text),u=data.usageMetadata,usage=u?{input_tokens:u.promptTokenCount,output_tokens:(u.candidatesTokenCount??0)+(u.thoughtsTokenCount??0)}:null;
      const candidate=data.candidates?.[0],parts=candidate?.content?.parts??[];
      if(candidate?.finishReason!=='STOP' || parts.some(p=>p.functionCall))return{ok:false,failure:'INVALID',error:'Gemini не подтвердил полный ответ без инструментов',usage,resources};
      if(image){const item=parts.find(p=>p.inlineData?.mimeType==='image/png');return item?{ok:true,result:{imageBase64:item.inlineData.data},usage,resources}:{ok:false,failure:'INVALID',error:'Gemini не вернул PNG',usage,resources};}
      try{return{ok:true,result:JSON.parse(parts.filter(p=>!p.thought).map(p=>p.text??'').join('')),usage,resources};}
      catch{return{ok:false,failure:'INVALID',error:'ответ не по схеме',usage,resources};}
    }catch(err){return{ok:false,failure:stoppedBy??classifyFailure(err.message),error:err.message,resources};}finally{clearTimeout(timer);}
  })();
  return{done,stop:reason=>{stoppedBy=reason;controller.abort();}};
}
