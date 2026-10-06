import path from 'node:path';
import { assert, atomicJSON, exists, readJSON } from './io.mjs';
import { journal, saveSpace } from './space.mjs';
import { keyLikeNames } from './privacy.mjs';

// The experiment mode (decision D2): everything may leave the machine, so every
// key used in the session must be disposable and revoked afterwards. Borshkit
// keeps the names — never the values — and the session stays "dirty" until a
// person confirms the keys are revoked; revocation itself cannot be verified.
const file = space => path.join(space.dir, 'experiment', 'session.json');
export const EXPERIMENT_BANNER = 'Режим эксперимента: всё, что ты дашь агентам, может уйти наружу. Используй только одноразовые ключи и отзови их после сессии.';

export async function experimentState(space) {
  return (await exists(file(space))) ? readJSON(file(space)) : null;
}
export async function startExperiment(space, { env = process.env } = {}) {
  assert(space.settings.privacy === 'experiment', 'Сессия эксперимента начинается только в режиме приватности «эксперимент»');
  const current = await experimentState(space);
  assert(!current || current.status === 'clean', 'Предыдущая сессия эксперимента не закрыта: сначала подтверди, что её ключи отозваны');
  const session = { id: new Date().toISOString(), status: 'open', keys: keyLikeNames(env).map(name => ({ name, source: 'окружение при старте' })), startedAt: new Date().toISOString() };
  await atomicJSON(file(space), session);
  await journal(space, `Начата сессия эксперимента. Ключей в окружении: ${session.keys.length}.`);
  await saveSpace(space, 'Эксперимент: начало сессии');
  return { session, banner: EXPERIMENT_BANNER };
}
export async function recordKey(space, name, source = 'указан вручную') {
  assert(/^[A-Za-z_][A-Za-z0-9_]{0,127}$/.test(name ?? ''), 'Укажи имя переменной с ключом, не сам ключ');
  const session = await experimentState(space);
  assert(session && session.status !== 'clean', 'Нет открытой сессии эксперимента');
  if (!session.keys.some(k => k.name === name)) session.keys.push({ name, source });
  await atomicJSON(file(space), session);
  return session;
}
/** Close the session; it becomes clean only on a person's confirmation that every key is revoked. */
export async function endExperiment(space, { revoked = false, confirmedByPerson = false } = {}) {
  const session = await experimentState(space);
  assert(session && session.status !== 'clean', 'Нет открытой сессии эксперимента');
  assert(confirmedByPerson, 'Закрыть сессию эксперимента может только человек в терминале');
  session.status = revoked ? 'clean' : 'dirty';
  session.endedAt = new Date().toISOString();
  if (revoked) session.revokedConfirmedAt = session.endedAt;
  await atomicJSON(file(space), session);
  await journal(space, revoked ? `Сессия эксперимента закрыта: ты подтвердил, что ключи отозваны (${session.keys.map(k => k.name).join(', ') || 'ключей не было'}).` : 'Сессия эксперимента закончена, но ключи не отозваны — она остаётся «грязной».');
  await saveSpace(space, revoked ? 'Эксперимент: ключи отозваны' : 'Эксперимент: сессия не закрыта');
  return session;
}
