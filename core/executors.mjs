import path from 'node:path';
import { assert, atomicJSON, exists, readJSON } from './io.mjs';
import { runCommand } from './process.mjs';
import { executorFingerprint, recordResources, resourcesFromHeaders } from './resources.mjs';

// Executors (spec §4): who does the work. The manifest is declared by a person
// (through a settings proposal) and checked by a probe; the free-API catalog is
// a hint for finding candidates, never a source of capabilities.
export const KINDS = ['claude-cli', 'codex-cli', 'openai-compat', 'command'];
export const DATA_POLICIES = ['trains', 'no-train', 'local', 'unknown'];
export const STRUCTURED = ['json_schema', 'json_mode', 'none'];
export const MODALITIES = ['text', 'code', 'image'];
export const EXECUTOR_ID = /^[a-z0-9][a-z0-9._-]{0,40}$/;
const NAME = /^[A-Za-z_][A-Za-z0-9_]{0,127}$/;

export function validateExecutor(id, e) {
  assert(EXECUTOR_ID.test(id), `Недопустимое имя исполнителя «${id}»: строчные латинские буквы, цифры, . _ -`);
  assert(e && KINDS.includes(e.kind), `Исполнитель ${id}: kind — один из ${KINDS.join(', ')}`);
  assert(typeof e.provider === 'string' && /^[a-z0-9-]{1,40}$/.test(e.provider), `Исполнитель ${id}: provider — семейство моделей (anthropic, openai, local…)`);
  assert(DATA_POLICIES.includes(e.dataPolicy), `Исполнитель ${id}: dataPolicy — ${DATA_POLICIES.join(', ')}`);
  assert(STRUCTURED.includes(e.structuredOutput), `Исполнитель ${id}: structuredOutput — ${STRUCTURED.join(', ')}`);
  assert(e.modalities && Array.isArray(e.modalities.output) && e.modalities.output.length && e.modalities.output.every(m => MODALITIES.includes(m)), `Исполнитель ${id}: modalities.output — список из ${MODALITIES.join(', ')}`);
  if (['claude-cli', 'codex-cli', 'command'].includes(e.kind)) assert(typeof e.command === 'string' && e.command, `Исполнитель ${id}: нужна command`);
  if (e.kind === 'command') assert(e.args === undefined || (Array.isArray(e.args) && e.args.every(a => typeof a === 'string')), `Исполнитель ${id}: args — список строк`);
  if (e.kind === 'openai-compat') {
    const url = new URL(e.baseUrl ?? 'invalid:');
    assert(['http:', 'https:'].includes(url.protocol), `Исполнитель ${id}: baseUrl — адрес http(s)`);
    assert(typeof e.model === 'string' && e.model, `Исполнитель ${id}: нужна model`);
  }
  assert(e.apiKeyEnv === undefined || NAME.test(e.apiKeyEnv), `Исполнитель ${id}: apiKeyEnv — ИМЯ переменной окружения, не сам ключ`);
  assert(e.envAllow === undefined || (Array.isArray(e.envAllow) && e.envAllow.every(n => NAME.test(n))), `Исполнитель ${id}: envAllow — имена переменных`);
  assert(e.model === undefined || /^[a-zA-Z0-9._:/@-]{1,120}$/.test(e.model), `Исполнитель ${id}: недопустимое имя модели`);
  assert(e.quotaGroup === undefined || EXECUTOR_ID.test(e.quotaGroup), `Исполнитель ${id}: недопустимая группа общего лимита`);
  assert(e.service === undefined || EXECUTOR_ID.test(e.service), `Исполнитель ${id}: недопустимое имя сервиса`);
  if (e.qualifications !== undefined) {
    assert(e.qualifications && typeof e.qualifications === 'object' && !Array.isArray(e.qualifications), 'qualifications — объект оценок ролей');
    for (const [role, q] of Object.entries(e.qualifications)) {
      assert(/^[a-z0-9-]{1,40}$/.test(role) && e.model && q && ['PASS', 'FAIL'].includes(q.result), `Оценка ${id}/${role}: нужна явная модель и результат PASS или FAIL`);
      assert(Number.isFinite(Date.parse(q.at)) && Date.parse(q.expiresAt) > Date.parse(q.at), `Оценка ${id}/${role}: нужны at и expiresAt`);
      assert(typeof q.evidence === 'string' && !path.isAbsolute(q.evidence) && !q.evidence.split(/[\\/]/).some(p => p === '..' || p.startsWith('.')) && /\.(md|json|txt)$/.test(q.evidence), `Оценка ${id}/${role}: материал — относительный путь к md/json/txt без скрытых папок`);
      assert(/^[a-f0-9]{64}$/.test(q.evidenceSha) && /^[a-f0-9]{64}$/.test(q.fingerprint) && /^[a-f0-9]{64}$/.test(q.roleDigest), `Оценка ${id}/${role}: нужны SHA-256 материала, конфигурации и роли`);
    }
  }
  return e;
}
export function validatePool(name, pool, executors) {
  assert(/^[a-z0-9-]{1,40}$/.test(name), `Недопустимое имя пула «${name}»`);
  assert(pool && Array.isArray(pool.members) && pool.members.length && pool.members.every(m => m in executors), `Пул ${name}: members — имена объявленных исполнителей`);
  assert(pool.maxSwitches === undefined || (Number.isInteger(pool.maxSwitches) && pool.maxSwitches >= 0 && pool.maxSwitches <= 20), `Пул ${name}: maxSwitches — 0..20`);
  assert(pool.waitSeconds === undefined || (Number.isInteger(pool.waitSeconds) && pool.waitSeconds >= 0 && pool.waitSeconds <= 3600), `Пул ${name}: waitSeconds — 0..3600`);
  assert(pool.qualificationRequired === undefined || typeof pool.qualificationRequired === 'boolean', `Пул ${name}: qualificationRequired — boolean`);
  assert(pool.role === undefined || /^[a-z0-9-]{1,40}$/.test(pool.role), `Пул ${name}: недопустимая роль`);
  return pool;
}
/** Decision D2: in the strict mode only executors that keep data (local or contractually no-train). */
export function privacyAllows(mode, executor) {
  if (mode !== 'strict') return { ok: true };
  return ['local', 'no-train'].includes(executor.dataPolicy)
    ? { ok: true } : { ok: false, reason: `строгий режим: у исполнителя политика данных «${executor.dataPolicy}»` };
}
/** Whether an executor can serve a role at all; the refusal happens where the choice is made. */
export function capable(role, executor, probe) {
  const missing = [];
  for (const m of role.requires?.output ?? []) if (!executor.modalities.output.includes(m)) missing.push(`нет выхода «${m}»`);
  if (role.requires?.structuredOutput && executor.structuredOutput === 'none') missing.push('нет структурированного ответа');
  if (role.authority === 'workspace-write' && executor.kind === 'openai-compat' && role.output !== 'files' && role.output !== 'image') missing.push('API-модель не может писать файлы сама');
  if (probe && probe.ok === false) missing.push(`проверка исполнителя не пройдена: ${probe.missing.join(', ')}`);
  return { ok: !missing.length, missing };
}

// Adapted from Claudex src/jobs.mjs classifyProviderFailure (Apache-2.0, same author).
const FAILURES = [
  [/ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|can't reach|waiting for network|connection failed|stream disconnected/i, 'NETWORK'],
  [/usage limit|session limit|weekly limit|hit your \w+ limit|quota|rate.?limit|insufficient_quota|credit|\b429\b|too many requests/i, 'QUOTA'],
  [/requires a newer version|unsupported model|unknown model|model_not_found|does not (?:exist|support)|invalid_request_error/i, 'MODEL'],
  [/oauth|unauthori[sz]ed|forbidden|\b401\b|\b403\b|not allowed|login/i, 'AUTH'],
  [/ENOENT|not recognized|command not found|no such file/i, 'EXECUTABLE'],
];
export function classifyFailure(message) {
  if (!message) return 'OTHER';
  for (const [pattern, kind] of FAILURES) if (pattern.test(message)) return kind;
  return 'OTHER';
}
export const FAILURE_WORDS = { NETWORK: 'нет связи', QUOTA: 'лимит исчерпан', MODEL: 'модель недоступна', AUTH: 'нужен вход', EXECUTABLE: 'программа не найдена', PRIVACY: 'запрещено режимом приватности', TIMEOUT: 'не уложился во время', SILENT: 'молчал и был заменён', INVALID: 'ответ не по схеме', OTHER: 'ошибка' };

const REQUIRED_FLAGS = {
  'claude-cli': ['--print', '--output-format', '--json-schema', '--tools', '--strict-mcp-config', '--no-session-persistence'],
  'codex-cli': ['--sandbox', '--output-schema', '--json'],
};
const probesFile = space => path.join(space.dir, 'settings', 'probes.json');
export async function readProbes(space) { return (await exists(probesFile(space))) ? readJSON(probesFile(space)) : {}; }
/**
 * Check the installed executor against what the adapter needs: the CLI's own
 * --help for its flags, or the API's model list. The result is a fact about
 * this machine, stored beside the settings rather than inside them.
 */
export async function probeExecutor(space, id, { fetchImpl = globalThis.fetch, env = process.env } = {}) {
  const e = space.settings.executors?.[id];
  assert(e, `Исполнитель ${id} не объявлен`);
  const now = new Date();
  const probe = { at: now.toISOString(), expiresAt: new Date(now.getTime() + 3600000).toISOString(), fingerprint: executorFingerprint(e), ok: true, missing: [], version: null };
  try {
    if (e.kind === 'claude-cli' || e.kind === 'codex-cli') {
      const help = (await runCommand(e.command, e.kind === 'codex-cli' ? ['exec', '--help'] : ['--help'], { timeout: 30000 })).stdout;
      probe.version = (await runCommand(e.command, ['--version'], { timeout: 30000 })).stdout.trim() || null;
      for (const flag of REQUIRED_FLAGS[e.kind]) if (!help.includes(flag)) probe.missing.push(`флаг ${flag}`);
    } else if (e.kind === 'command') {
      probe.version = (await runCommand(e.command, ['--version'], { timeout: 30000 })).stdout.trim() || null;
    } else {
      const headers = e.apiKeyEnv && env[e.apiKeyEnv] ? { authorization: `Bearer ${env[e.apiKeyEnv]}` } : {};
      if (e.apiKeyEnv && !env[e.apiKeyEnv]) probe.missing.push(`переменная ${e.apiKeyEnv} не задана`);
      const response = await fetchImpl(new URL('models', e.baseUrl.endsWith('/') ? e.baseUrl : `${e.baseUrl}/`).href, { headers });
      probe.rateLimit = { limit: response.headers.get('x-ratelimit-limit-requests'), remaining: response.headers.get('x-ratelimit-remaining-requests') };
      const resources = resourcesFromHeaders(response.headers, 'models', now);
      if (resources) await recordResources(space, id, resources, { source: 'HTTP_HEADERS', executor: e, now });
      if (!response.ok) probe.missing.push(`сервер ответил ${response.status}`);
      else {
        const ids = ((await response.json()).data ?? []).map(m => m.id);
        if (ids.length && !ids.includes(e.model)) probe.missing.push(`модели ${e.model} нет в списке сервера`);
      }
    }
  } catch (err) { probe.missing.push(`${classifyFailure(err.message)}: ${err.message.split('\n')[0]}`); }
  probe.ok = !probe.missing.length;
  const all = await readProbes(space);
  all[id] = probe;
  await atomicJSON(probesFile(space), all);
  return probe;
}
