import path from 'node:path';
import { acquireLock, assert, atomicJSON, exists, readJSON, sha } from './io.mjs';

// Observations are advisory facts, never settings or permission grants. A
// model-list response describes that endpoint, not a generation quota.
export const RESOURCE_NAMES = ['requests', 'tokens', 'images', 'usd', 'contextTokens', 'memoryBytes'];
const WINDOWS = ['rate', 'subscription', 'balance', 'context', 'local'];
export const stableJSON = value => JSON.stringify(value, (_, v) => v && typeof v === 'object' && !Array.isArray(v)
  ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v);
export const executorFingerprint = executor => {
  const { qualifications, ...configuration } = executor;
  return sha(stableJSON(configuration));
};
export const resourcesFile = space => path.join(space.state, 'resources.json');
export async function readResources(space) {
  return await exists(resourcesFile(space)) ? readJSON(resourcesFile(space)) : {};
}
export function fresh(record, now = new Date()) {
  return Boolean(record && Number.isFinite(Date.parse(record.at)) && Number.isFinite(Date.parse(record.expiresAt))
    && Date.parse(record.at) <= +now && +now < Date.parse(record.expiresAt));
}
export function validateResourceObservation(input, now = new Date()) {
  assert(input && fresh(input, now), 'Наблюдение ресурсов: нужны актуальные at и expiresAt');
  assert(['account', 'endpoint'].includes(input.scope), 'Наблюдение ресурсов: scope — account или endpoint');
  assert(input.scope !== 'endpoint' || /^[a-z][a-z0-9/_-]{0,100}$/.test(input.endpoint ?? ''), 'Наблюдение ресурсов: нужен endpoint');
  assert(Array.isArray(input.metrics) && input.metrics.length > 0, 'Наблюдение ресурсов: нужен непустой список metrics');
  const keys = new Set();
  for (const m of input.metrics) {
    assert(m && RESOURCE_NAMES.includes(m.name) && WINDOWS.includes(m.window), 'Наблюдение ресурсов: неизвестная единица или окно лимита');
    assert(Number.isFinite(m.remaining) && m.remaining >= 0, 'Наблюдение ресурсов: remaining — неотрицательное число');
    assert(m.limit == null || Number.isFinite(m.limit) && m.limit >= m.remaining, 'Наблюдение ресурсов: limit не меньше remaining');
    assert(m.resetAt == null || Number.isFinite(Date.parse(m.resetAt)) && Date.parse(m.resetAt) > +now, 'Наблюдение ресурсов: resetAt должен быть в будущем');
    const key = `${m.name}:${m.window}`;
    assert(!keys.has(key), 'Наблюдение ресурсов: одна единица и окно указаны дважды');
    keys.add(key);
  }
  return input;
}
const number = s => s != null && /^\d+(?:\.\d+)?$/.test(s.trim()) ? Number(s) : null;
export function resetTime(value, now = new Date()) {
  if (!value) return null;
  const iso = timestamp => Number.isFinite(timestamp) && Math.abs(timestamp) <= 8640000000000000 ? new Date(timestamp).toISOString() : null;
  if (Number.isFinite(Date.parse(value)) && !/^\d+(?:\.\d+)?$/.test(value)) return iso(Date.parse(value));
  if (/^\d+(?:\.\d+)?$/.test(value)) return iso(+now + Number(value) * 1000);
  if (!/^(?:\d+(?:\.\d+)?(?:ms|s|m|h))+$/.test(value)) return null;
  const units = { ms: 1, s: 1000, m: 60000, h: 3600000 };
  const duration = [...value.matchAll(/(\d+(?:\.\d+)?)(ms|s|m|h)/g)].reduce((sum, m) => sum + Number(m[1]) * units[m[2]], 0);
  return iso(+now + duration);
}
export function resourcesFromHeaders(headers, endpoint, now = new Date()) {
  const metrics = [];
  for (const name of ['requests', 'tokens', 'images']) {
    const remaining = number(headers.get(`x-ratelimit-remaining-${name}`));
    if (remaining == null || !Number.isFinite(remaining)) continue;
    const limit = number(headers.get(`x-ratelimit-limit-${name}`));
    const resetAt = resetTime(headers.get(`x-ratelimit-reset-${name}`), now);
    metrics.push({ name, window: 'rate', remaining, ...(limit != null && limit >= remaining ? { limit } : {}),
      ...(resetAt && Date.parse(resetAt) > +now ? { resetAt } : {}) });
  }
  if (!metrics.length) return null;
  return { scope: 'endpoint', endpoint, at: now.toISOString(), expiresAt: new Date(+now + 60000).toISOString(), metrics };
}
export async function recordResources(space, id, input, { source = 'DECLARED', executor = space.settings.executors?.[id], now = new Date() } = {}) {
  assert(executor && space.settings.executors?.[id], `Исполнитель ${id} не объявлен`);
  assert(['DECLARED', 'HTTP_HEADERS'].includes(source), 'Неизвестный источник ресурсов');
  validateResourceObservation(input, now);
  // Copy only documented fields; imported JSON must not retain credentials.
  const observation = { executor: id, fingerprint: executorFingerprint(executor), group: executor.quotaGroup ?? id,
    source, at: new Date(input.at).toISOString(), expiresAt: new Date(input.expiresAt).toISOString(), scope: input.scope,
    ...(input.scope === 'endpoint' ? { endpoint: input.endpoint } : {}),
    metrics: input.metrics.map(m => ({ name: m.name, window: m.window, remaining: m.remaining,
      ...(m.limit != null ? { limit: m.limit } : {}), ...(m.resetAt ? { resetAt: new Date(m.resetAt).toISOString() } : {}) })) };
  const release = await acquireLock(path.join(space.state, 'resources.lock'), { waitMs: 30000 });
  try {
    const all = await readResources(space);
    const key = `${id}:${input.scope}:${input.scope === 'endpoint' ? input.endpoint : 'account'}`;
    // A slow response must not replace a more recent observation.
    if (!all[key] || Date.parse(all[key].at) <= Date.parse(observation.at)) {
      all[key] = observation;
      await atomicJSON(resourcesFile(space), all);
    }
  } finally { await release(); }
  return observation;
}
export function resourcesFor(space, id, observations, { endpoint = null, now = new Date() } = {}) {
  const e = space.settings.executors?.[id], group = e?.quotaGroup ?? id;
  const relevant = Object.values(observations).filter(o => {
    const origin = space.settings.executors?.[o.executor];
    return origin && o.group === group && o.fingerprint === executorFingerprint(origin)
      && (o.scope === 'account' || o.endpoint === endpoint);
  }).sort((a, b) => b.at.localeCompare(a.at));
  const metrics = new Map();
  for (const o of relevant) for (const m of o.metrics) {
    const key = `${o.scope}:${m.name}:${m.window}`;
    if (metrics.has(key)) continue;
    const current = fresh(o, now) && (!m.resetAt || +now < Date.parse(m.resetAt));
    metrics.set(key, { ...m, source: o.source, at: o.at, expiresAt: o.expiresAt, scope: o.scope,
      freshness: current ? 'CURRENT' : 'STALE', remaining: current ? m.remaining : null });
  }
  return { group, status: metrics.size ? [...metrics.values()].some(m => m.freshness === 'CURRENT') ? 'CURRENT' : 'STALE' : 'UNKNOWN', metrics: [...metrics.values()] };
}
