import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { applyProposal, proposeSettings } from '../core/config.mjs';
import { probeExecutor } from '../core/executors.mjs';
import { startExecutor } from '../core/adapters.mjs';
import { readJSON } from '../core/io.mjs';
import { space } from './helpers.mjs';

// A local OpenAI-compatible router (FreeLLMAPI, LiteLLM, Ollama…): the person
// must learn from the message what to fix — address, key or a stopped server.
const manifest = new URL('../examples/openai-compat.json', import.meta.url);
async function router(t) {
  const srv = http.createServer((req, res) => {
    const json = (code, value) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(value)); };
    if (!req.url.startsWith('/v1/')) return json(404, { error: 'not found' });
    if (req.headers.authorization !== 'Bearer fixture-key') return json(401, { error: { message: 'Invalid API key' } });
    json(200, { object: 'list', data: [{ id: 'auto' }] });
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  t.after(() => new Promise(r => srv.close(r)));
  return `http://127.0.0.1:${srv.address().port}`;
}
async function probe(t, change, env) {
  const s = await space(t);
  const e = { ...await readJSON(manifest), ...change };
  const p = await proposeSettings(s, { executors: { router: e } });
  await applyProposal(s, p.id, { confirmedByPerson: true });
  return probeExecutor(s, 'router', { env });
}

test('the router example passes the probe with its key and explains each connection mistake', async t => {
  const origin = await router(t), env = { ROUTER_API_KEY: 'fixture-key' };
  assert.deepEqual((await probe(t, { baseUrl: `${origin}/v1` }, env)).missing, []);
  assert.match((await probe(t, { baseUrl: origin }, env)).missing.join(), /404: .*кончается на \/v1/);
  assert.match((await probe(t, { baseUrl: `${origin}/v1` }, { ROUTER_API_KEY: 'wrong' })).missing.join(), /401: ключ не принят .*ROUTER_API_KEY/);
  assert.deepEqual((await probe(t, { baseUrl: `${origin}/v1` }, {})).missing, [
    'переменная ROUTER_API_KEY не задана — после setx или export открой терминал заново, чтобы Borshkit её увидел']);
  const closed = http.createServer(); await new Promise(r => closed.listen(0, '127.0.0.1', r));
  const port = closed.address().port; await new Promise(r => closed.close(r));
  assert.match((await probe(t, { baseUrl: `http://127.0.0.1:${port}/v1` }, env)).missing.join(), /^NETWORK: .*ECONNREFUSED.*не отвечает; проверь, что он запущен/);
});

test('an API job without its key variable stops before any request and names the variable', async () => {
  let called = false;
  const h = await startExecutor({ executor: { ...await readJSON(manifest) }, prompt: 'Task', schema: { type: 'object' }, timeoutMs: 1000,
    onEvent: () => {}, env: {}, fetchImpl: async () => { called = true; return new Response('{}'); } });
  const r = await h.done;
  assert.equal(called, false);
  assert.equal(r.failure, 'AUTH');
  assert.match(r.error, /ROUTER_API_KEY не задана/);
});
