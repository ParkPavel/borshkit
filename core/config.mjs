import fs from 'node:fs/promises';
import path from 'node:path';
import { assert, atomicJSON, atomicWrite, exists, git, readJSON } from './io.mjs';
import { journal, saveSpace, settingsMirror, validateSettings } from './space.mjs';
import { weakenings } from './privacy.mjs';

// Settings change only through proposals (decision D1): the trusted agent or a
// person proposes, Borshkit validates and explains, and anything that weakens
// protection waits for a person's confirmation.
const PERSON = 'человек';
const proposalsDir = space => path.join(space.dir, 'settings', 'proposals');

function changes(before, after, prefix = '') {
  const out = [];
  for (const key of new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])) {
    const a = before?.[key], b = after?.[key], name = prefix ? `${prefix}.${key}` : key;
    if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a)) out.push(...changes(a, b, name));
    else if (JSON.stringify(a) !== JSON.stringify(b)) out.push({ key: name, from: a ?? null, to: b ?? null });
  }
  return out;
}
const merge = (base, patch) => Object.fromEntries(Object.entries({ ...base, ...patch }).map(([k, v]) =>
  [k, v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' ? merge(base[k], v) : v]).filter(([, v]) => v !== undefined));

/** A proposed change: kept as a file in the space, explained, applied later. */
export async function proposeSettings(space, patch, { from = PERSON, reason = '' } = {}) {
  await assertSettingsIntact(space);
  assert(patch && typeof patch === 'object' && !Array.isArray(patch), 'Предложение — объект с изменяемыми полями');
  assert(from === PERSON || from === space.settings.trustedAgent, from && space.settings.trustedAgent
    ? `Предлагать изменения настроек может только доверенный агент (${space.settings.trustedAgent}) или ты`
    : 'Доверенный агент не выбран — предлагать изменения настроек можешь только ты');
  const before = space.settings, after = validateSettings(merge(before, patch));
  assert(after.folder === before.folder, 'Папку пространства так не поменять: создай новое пространство');
  const list = changes(before, after);
  assert(list.length, 'Предложение ничего не меняет');
  await fs.mkdir(proposalsDir(space), { recursive: true });
  const id = `p${String((await fs.readdir(proposalsDir(space))).filter(f => f.endsWith('.json')).length + 1).padStart(3, '0')}`;
  const proposal = { id, from, reason, createdAt: new Date().toISOString(), changes: list, weakens: weakenings(before, after), after, status: 'open' };
  await atomicJSON(path.join(proposalsDir(space), `${id}.json`), proposal);
  await journal(space, `${from === PERSON ? 'Ты предложил' : `${from} предложил`} изменить настройки (${id}): ${list.map(c => c.key).join(', ')}.`);
  return proposal;
}
/**
 * Apply a proposal. Changes toward strictness apply at once; a weakening needs
 * `confirmedByPerson`, which the CLI grants only after a typed confirmation in
 * a real terminal.
 */
export async function applyProposal(space, id, { confirmedByPerson = false } = {}) {
  await assertSettingsIntact(space);
  assert(/^p\d{3,}$/.test(id ?? ''), 'Укажи номер предложения, например p001');
  const file = path.join(proposalsDir(space), `${id}.json`);
  assert(await exists(file), `Предложения ${id} нет`);
  const proposal = await readJSON(file);
  assert(proposal.status === 'open', `Предложение ${id} уже ${proposal.status === 'applied' ? 'применено' : 'закрыто'}`);
  const after = validateSettings(proposal.after);
  const weak = weakenings(space.settings, after);
  assert(!weak.length || confirmedByPerson, `Это ослабляет защиту — нужно твоё подтверждение в терминале:\n  ${weak.join('\n  ')}`);
  await writeSettings(space, after);
  await atomicJSON(file, { ...proposal, status: 'applied', appliedAt: new Date().toISOString(), confirmedByPerson });
  await journal(space, `Применены настройки ${id}${weak.length ? ' (ослабление подтверждено тобой)' : ''}.`);
  await saveSpace(space, `Настройки: предложение ${id}`, proposal.from === PERSON ? {} : { author: proposal.from, email: `${proposal.from}@borshkit` });
  return { ...proposal, status: 'applied', weakens: weak };
}
async function writeSettings(space, settings) {
  await atomicJSON(space.settingsFile, settings);
  await atomicWrite(path.join(space.dir, 'settings', 'settings.md'), settingsMirror(settings), { mode: 0o644 });
  space.settings = settings;
}

/**
 * A settings file changed without Borshkit — by hand, or by an agent's own
 * session — differs from the last saved version in the space's history.
 * Until a person accepts or reverts it, nothing else is written.
 */
export async function settingsIntegrity(space) {
  const rel = 'settings/workspace.json';
  let committed;
  try { committed = JSON.parse(await git(space.dir, ['show', `HEAD:${rel}`])); } catch { return { ok: true, changes: [] }; }
  const current = await readJSON(space.settingsFile).catch(() => null);
  if (!current) return { ok: false, changes: [{ key: '(файл)', from: 'был', to: 'нет или повреждён' }] };
  const list = changes(committed, current);
  return { ok: !list.length, changes: list, committed, current };
}
export async function assertSettingsIntact(space) {
  const state = await settingsIntegrity(space);
  assert(state.ok, `Настройки изменены в обход Borshkit (${state.changes.map(c => c.key).join(', ')}). Если это ты — «borshkit настройки принять» в терминале; иначе — «borshkit настройки вернуть».`);
}
/** Accept a manual edit of the settings; a weakening still needs a person. */
export async function acceptManualEdit(space, { confirmedByPerson = false } = {}) {
  const state = await settingsIntegrity(space);
  if (state.ok) return { changed: false };
  const after = validateSettings(state.current), weak = weakenings(state.committed, after);
  assert(confirmedByPerson, `Принять правку настроек может только человек в терминале${weak.length ? `; она ослабляет защиту:\n  ${weak.join('\n  ')}` : ''}`);
  await writeSettings(space, after);
  await journal(space, `Ты принял ручную правку настроек: ${state.changes.map(c => c.key).join(', ')}.`);
  await saveSpace(space, 'Настройки: принята ручная правка');
  return { changed: true, changes: state.changes, weakens: weak };
}
/** Put back the last saved settings. */
export async function revertSettings(space) {
  await git(space.dir, ['checkout', 'HEAD', '--', 'settings/workspace.json']);
  space.settings = validateSettings(await readJSON(space.settingsFile));
  await atomicWrite(path.join(space.dir, 'settings', 'settings.md'), settingsMirror(space.settings), { mode: 0o644 });
  await journal(space, 'Настройки возвращены к последней сохранённой версии.');
  return space.settings;
}
