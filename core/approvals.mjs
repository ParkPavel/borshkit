import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { acquireLock, assert, atomicJSON, exists, inside, readJSON, sha } from './io.mjs';
import { stableJSON } from './resources.mjs';
import { applyProposal, checkProposal } from './config.mjs';
import { answer, getQuestion } from './questions.mjs';
import { weakenings } from './privacy.mjs';

const ID = /^[a-z0-9][a-z0-9-]{0,39}$/;
const CHALLENGE_ID = /^a-[a-f0-9-]{36}$/;
const hash = b => crypto.createHash('sha256').update(b).digest();
const b64 = value => {
  assert(typeof value === 'string' && /^[A-Za-z0-9_-]+$/.test(value) && value.length <= 100000, 'Недопустимый base64url в подтверждении');
  const bytes = Buffer.from(value, 'base64url');
  assert(bytes.toString('base64url') === value, 'Неканонический base64url'); return bytes;
};
export function approvalOrigin(value) {
  const url = new URL(value);
  assert(url.href === url.origin + '/' && !url.username && !url.password
    && (url.protocol === 'https:' || url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)), 'Для телефона нужен HTTPS origin; HTTP допускается только на localhost');
  return url.origin;
}
async function storeRoot(space, options = {}) {
  const root = path.resolve(options.store ?? path.join(os.homedir(), '.config', 'borshkit', 'approvals'));
  await fs.mkdir(root, { recursive: true, mode: 0o700 });
  const real = await fs.realpath(root), project = await fs.realpath(space.project);
  assert(!inside(project, real) && !inside(real, project), 'Доверенные устройства хранятся вне проекта и его агентского пространства');
  return real;
}
const deviceFile = (root, id) => path.join(root, 'devices', `${id}.json`);
const challengeFile = (root, id) => path.join(root, 'challenges', `${id}.json`);
export async function enrollApprovalDevice(space, id, descriptor, { confirmedByPerson = false, ...options } = {}) {
  assert(confirmedByPerson, 'Первое сопряжение устройства подтверждает владелец вне агентской сессии');
  assert(ID.test(id) && descriptor && descriptor.algorithm === 'ES256', 'Устройство требует имя и ключ ES256');
  const origin = approvalOrigin(descriptor.origin), rpId = new URL(origin).hostname;
  assert(descriptor.rpId === rpId && b64(descriptor.credentialId).length >= 16, 'credentialId и rpId должны соответствовать выбранному origin');
  const bytes = b64(descriptor.publicKey), key = crypto.createPublicKey({ key: bytes, format: 'der', type: 'spki' });
  assert(key.asymmetricKeyType === 'ec' && key.asymmetricKeyDetails?.namedCurve === 'prime256v1', 'Допускается публичный ключ P-256');
  const root = await storeRoot(space, options), release = await acquireLock(path.join(root, 'devices.lock'), { waitMs: 30000 });
  try {
    assert(!await exists(deviceFile(root, id)), 'Имя устройства уже занято; сначала отзови старое устройство');
    const device = { schemaVersion: 1, id, origin, rpId, credentialId: descriptor.credentialId, publicKey: descriptor.publicKey, algorithm: 'ES256',
      registrationId: crypto.randomUUID(), fingerprint: sha(bytes), counter: 0, revoked: false, enrolledAt: new Date().toISOString() };
    await atomicJSON(deviceFile(root, id), device); return device;
  } finally { await release(); }
}
export async function revokeApprovalDevice(space, id, { confirmedByPerson = false, ...options } = {}) {
  assert(confirmedByPerson && ID.test(id), 'Отзыв устройства подтверждает владелец');
  const root = await storeRoot(space, options), release = await acquireLock(path.join(root, 'devices.lock'), { waitMs: 30000 });
  try {
    const device = await readJSON(deviceFile(root, id));
    device.revoked = true; device.revokedAt = new Date().toISOString();
    await atomicJSON(deviceFile(root, id), device); return { id, revoked: true };
  } finally { await release(); }
}
export async function approvalDevices(space, options = {}) {
  const root = await storeRoot(space, options), dir = path.join(root, 'devices');
  if (!await exists(dir)) return [];
  return Promise.all((await fs.readdir(dir)).filter(n => /^[a-z0-9-]+\.json$/.test(n)).map(async n => {
    const { publicKey, ...device } = await readJSON(path.join(dir, n)); return device;
  }));
}
async function targetState(space, action, target, option) {
  if (action === 'apply-settings') {
    const p = await checkProposal(space, target);
    // Display the actual bound settings, not an agent-editable change summary.
    return { digest: sha(stableJSON(p)), description: `Применить ${p.id}. Причина от автора (не полномочия): ${p.reason}`,
      changes: [{before:space.settings,after:p.after}], weakens:weakenings(space.settings,p.after) };
  }
  assert(action === 'answer-question', 'Удалённо подтверждаются только настройки и критический вопрос');
  const q = await getQuestion(space, target);
  assert(q.kind === 'critical' && q.status === 'open' && q.options.some(o => o.id === option), 'Критический вопрос или вариант больше не доступны');
  return { digest: sha(stableJSON(q)), description: `${q.text}\nОтвет: ${q.options.find(o => o.id === option).label}`, changes: [], weakens: [] };
}
export async function createApprovalChallenge(space, { deviceId, action, target, option = null }, { ttlMs = 120000, now = new Date(), ...options } = {}) {
  assert(ID.test(deviceId) && Number.isInteger(ttlMs) && ttlMs >= 1000 && ttlMs <= 300000, 'Выбери устройство; срок подтверждения — до пяти минут');
  const root = await storeRoot(space, options), device = await readJSON(deviceFile(root, deviceId));
  assert(!device.revoked, 'Устройство отозвано');
  const state = await targetState(space, action, target, option);
  const record = { schemaVersion: 1, id: `a-${crypto.randomUUID()}`, deviceId, registrationId: device.registrationId,
    projectDigest: sha(await fs.realpath(space.dir)), action, target, option, targetDigest: state.digest,
    challenge: crypto.randomBytes(32).toString('base64url'), createdAt: now.toISOString(), expiresAt: new Date(+now+ttlMs).toISOString(), used: false };
  await atomicJSON(challengeFile(root, record.id), record);
  return { ...record, origin: device.origin, rpId: device.rpId, credentialId: device.credentialId,
    description: state.description, changes: state.changes, weakens: state.weakens };
}
/** WebAuthn assertion verification: user presence AND user verification,
 * RP hash, exact origin/challenge, enrolled key, revision, expiry, revocation
 * and one-time consumption. Trusted enrollment is a separate prerequisite. */
export async function consumeApproval(space, assertion, { now = new Date(), ...options } = {}) {
  assert(assertion && CHALLENGE_ID.test(assertion.challengeId), 'Укажи проверяемое WebAuthn подтверждение');
  const root = await storeRoot(space, options), release = await acquireLock(path.join(root, 'devices.lock'), { waitMs: 30000 });
  try {
    const record = await readJSON(challengeFile(root, assertion.challengeId)), device = await readJSON(deviceFile(root, record.deviceId));
    assert(!record.used && Date.parse(record.expiresAt) > +now, 'Подтверждение уже использовано или истекло');
    assert(!device.revoked && record.registrationId === device.registrationId, 'Устройство отозвано или переподключено');
    assert(record.projectDigest === sha(await fs.realpath(space.dir)), 'Подтверждение относится к другому пространству');
    assert(assertion.credentialId === device.credentialId, 'Подтверждение другого устройства');
    const clientBytes = b64(assertion.clientDataJSON), client = JSON.parse(clientBytes.toString('utf8'));
    assert(client.type === 'webauthn.get' && client.challenge === record.challenge && client.origin === device.origin && !client.crossOrigin, 'Не совпали origin, challenge или тип подтверждения');
    const auth = b64(assertion.authenticatorData);
    assert(auth.length >= 37 && crypto.timingSafeEqual(auth.subarray(0,32), hash(device.rpId)), 'Не совпал RP устройства');
    assert((auth[32] & 5) === 5, 'Нужны присутствие пользователя и проверка личности на устройстве');
    const counter = auth.readUInt32BE(33);
    assert(!(counter && device.counter && counter <= device.counter), 'Счётчик устройства не увеличился');
    const key = crypto.createPublicKey({ key: b64(device.publicKey), format: 'der', type: 'spki' });
    assert(crypto.verify('sha256', Buffer.concat([auth, hash(clientBytes)]), key, b64(assertion.signature)), 'Подпись устройства не прошла проверку');
    const state = await targetState(space, record.action, record.target, record.option);
    assert(state.digest === record.targetDigest, 'Действие изменилось после показа пользователю — нужно новое подтверждение');
    record.used = true; record.usedAt = now.toISOString();
    device.counter = counter || device.counter;
    await atomicJSON(deviceFile(root, device.id), device);
    await atomicJSON(challengeFile(root, record.id), record);
    await atomicJSON(path.join(root, 'audit', `${record.id}.json`), { action: record.action, target: record.target, targetDigest: record.targetDigest,
      device: device.id, keyFingerprint: device.fingerprint, projectDigest: record.projectDigest, at: now.toISOString() });
    return record;
  } finally { await release(); }
}
export async function applyApprovedAction(space, assertion, options = {}) {
  const approved = await consumeApproval(space, assertion, options);
  if (approved.action === 'apply-settings') return applyProposal(space, approved.target, { confirmedByPerson: true, approvalDigest: approved.targetDigest });
  return answer(space, approved.target, approved.option, { confirmedByPerson: true, expectedDigest: approved.targetDigest });
}
