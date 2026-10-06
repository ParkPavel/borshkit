import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ROOT, exists, readJSON } from '../core/io.mjs';
import { buildPrompt, listPacks, listRoles, loadRole, loadSkill } from '../core/roles.mjs';

const contract = { taskId: 't1', kind: 'feature', goal: 'Кнопка', nonGoals: [], decisions: [], paths: ['src'], goals: [], criteria: [{ id: 'C1', class: 'model', text: 'видно' }], materials: [] };

test('every pack is pinned, licensed and lists files that exist', async () => {
  const thirdParty = await readJSON(path.join(ROOT, 'third-party.json'));
  for (const pack of await listPacks()) {
    assert.match(pack.commit, /^[0-9a-f]{40}$/, pack.id);
    assert.ok(await exists(path.join(ROOT, 'packs', pack.id, 'LICENSE')), `${pack.id}: LICENSE`);
    const entry = thirdParty.find(e => e.url === pack.source);
    assert.ok(entry, `${pack.id}: нет в third-party.json`);
    for (const [id, skill] of Object.entries(pack.skills)) {
      assert.ok(skill.when && skill.files.length, `${pack.id}/${id}`);
      for (const f of skill.files) {
        assert.ok(await exists(path.join(ROOT, 'packs', pack.id, f)), `${pack.id}/${f}`);
        assert.ok(entry.files?.includes(`packs/${pack.id}/${f}`), `third-party.json не перечисляет packs/${pack.id}/${f}`);
      }
    }
  }
});

test('every role resolves its skills and library entries, and its packet stays readable in size', async () => {
  const catalog = await readJSON(path.join(ROOT, 'library', 'catalog.json'));
  const ids = new Set(catalog.entries.map(e => e.id));
  for (const role of await listRoles()) {
    for (const id of role.library ?? []) assert.ok(ids.has(id), `${role.id}: ${id}`);
    const prompt = await buildPrompt({ role, contract, lens: 'full' });
    assert.ok(prompt.length < 120000, `${role.id}: ${prompt.length} символов`);
    for (const ref of role.packs) assert.ok(prompt.includes(`## Навык ${ref}`), `${role.id}: ${ref}`);
  }
});

test('the lazy-senior lens is opt-in, extra skills are added on request, wrong names are refused', async () => {
  const implementer = await loadRole('implementer');
  assert.ok(!(await buildPrompt({ role: implementer, contract })).includes('## Навык ponytail/ponytail'));
  assert.match(await buildPrompt({ role: implementer, contract, lens: 'lite' }), /## Навык ponytail\/ponytail .*\(уровень: lite\)/);
  await assert.rejects(buildPrompt({ role: implementer, contract, lens: 'max' }), /Линза/);
  const withSwift = await buildPrompt({ role: implementer, contract, skills: ['emil/write-swift'] });
  assert.ok(withSwift.includes((await fs.readFile(path.join(ROOT, 'packs/emil/skills/write-swift/SKILL.md'), 'utf8')).trim().slice(0, 200)));
  await assert.rejects(loadSkill('emil/nope'), /нет навыка/);
  await assert.rejects(loadSkill('../etc/passwd'), /пакет\/навык/);
  await assert.rejects(loadSkill('nope/x'), /Пакета «nope» нет/);
});

test('library/README.md is generated from the catalog and the packs and is up to date', async () => {
  const { renderLibrary } = await import('../scripts/library.mjs');
  const committed = (await fs.readFile(path.join(ROOT, 'library', 'README.md'), 'utf8')).replace(/\r\n/g, '\n');
  assert.equal(committed, await renderLibrary(), 'Запусти node scripts/library.mjs');
});
