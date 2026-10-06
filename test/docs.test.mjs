import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ROOT, git } from '../core/io.mjs';
import { attributionCheck, readmeAssetsCheck } from '../core/attribution.mjs';
import { parseFrontmatter } from '../core/kb.mjs';
import { DIAGRAMS, LANGS } from '../scripts/diagrams.mjs';

const READMES = ['README.md', 'README.en.md', 'README.de.md', 'README.ko.md', 'README.zh-TW.md', 'README.fr.md'];
const tracked = async () => (await git(ROOT, ['ls-files', '-z', '--cached', '--others', '--exclude-standard'])).split('\0').filter(Boolean);

test('every README translation exists, credits every source and has working images and links', async () => {
  for (const readme of READMES) {
    const credits = await attributionCheck({ project: ROOT }, null, { readme });
    assert.equal(credits.status, 'PASS', `${readme}\n${credits.log}`);
    const assets = await readmeAssetsCheck({ project: ROOT }, null, { readme });
    assert.equal(assets.status, 'PASS', `${readme}\n${assets.log}`);
    const text = await fs.readFile(path.join(ROOT, readme), 'utf8');
    for (const other of READMES) if (other !== readme) assert.ok(text.includes(`href="${other}"`), `${readme}: нет ссылки на ${other}`);
  }
});

test('every page of the documentation has Borshkit frontmatter and only links that lead somewhere', async () => {
  const pages = (await tracked()).filter(f => /^docs\/.*\.md$/.test(f) || f === 'library/README.md');
  assert.ok(pages.length >= 15);
  for (const page of pages) {
    const { data } = parseFrontmatter(await fs.readFile(path.join(ROOT, page), 'utf8'));
    assert.ok(data['bk-type'], `${page}: нет bk-type`);
    for (const ref of [data.related ?? [], data.documents ?? []].flat()) {
      await fs.access(path.resolve(ROOT, path.dirname(page), ref)).catch(() => assert.fail(`${page}: связь ведёт в никуда — ${ref}`));
    }
    const r = await readmeAssetsCheck({ project: ROOT }, null, { readme: page });
    assert.equal(r.status, 'PASS', `${page}\n${r.log}`);
  }
});

test('the animated diagrams are generated from scripts/diagrams.mjs and are up to date', async () => {
  for (const lang of LANGS) for (const [name, make] of Object.entries(DIAGRAMS)) {
    const file = path.join(ROOT, 'assets', 'diagrams', `${name}.${lang}.svg`);
    const committed = (await fs.readFile(file, 'utf8')).replace(/\r\n/g, '\n');
    assert.equal(committed, make(lang), `${name}.${lang}.svg устарел: node scripts/diagrams.mjs`);
    assert.match(committed, /prefers-reduced-motion:reduce/);
    assert.match(committed, /prefers-color-scheme:dark/);
  }
});
