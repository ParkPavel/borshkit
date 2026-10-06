// Renders library/README.md from library/catalog.json and the packs, so the
// page people read and the list roles receive cannot drift apart.
// Run: node scripts/library.mjs (a test fails when the page is out of date).
import fs from 'node:fs/promises';
import path from 'node:path';
import { ROOT, readJSON } from '../core/io.mjs';
import { listPacks, listRoles } from '../core/roles.mjs';

export async function renderLibrary() {
  const catalog = await readJSON(path.join(ROOT, 'library', 'catalog.json'));
  const packs = await listPacks(), roles = await listRoles();
  const usedBy = id => roles.filter(r => r.library?.includes(id)).map(r => `\`${r.id}\``);
  const skillUsers = ref => roles.filter(r => r.packs.includes(ref)).map(r => `\`${r.id}\``);
  const out = ['---', 'bk-type: reference', 'related: ["../docs/concepts/roles-and-skills.md", "../docs/ingredients.md"]', '---',
    '# Библиотека: навыки и проверенные ссылки', '',
    'Здесь две вещи:', '',
    '1. **Пакеты навыков** — тексты с опытом других проектов, скопированные в `packs/` с лицензиями. Роль получает только свои навыки; другие можно добавить к работе флагом `--навыки пакет/навык`.',
    '2. **Каталог ссылок** — первоисточники для фронтенда, дизайна и доступности. Роли получают ссылки из своей части каталога и сверяются с ними, а не с памятью модели.', '',
    `> ${catalog.how} Отклонённые кандидаты и причины — в [\`catalog.json\`](catalog.json), поле \`rejected\`.`, '',
    'В терминале: `borshkit навыки` и `borshkit библиотека [категория]`.', '',
    '> Файл собирается командой `node scripts/library.mjs` из `catalog.json` и `packs/*/pack.json`. Не правь его руками.', '',
    '## Пакеты навыков', ''];
  for (const p of packs) {
    out.push(`### ${p.title}`, '', `Источник: [${p.source.replace('https://github.com/', '')}](${p.source}) @ \`${p.commit.slice(0, 7)}\` · лицензия ${p.license} ([текст](../packs/${p.id}/LICENSE))${p.support ? ` · [поддержать автора](${p.support})` : ''}`, '',
      '| Навык | Когда нужен | Роли |', '|---|---|---|',
      ...Object.entries(p.skills).map(([id, s]) => `| [\`${p.id}/${id}\`](../packs/${p.id}/${s.files[0]}) | ${s.when} | ${skillUsers(`${p.id}/${id}`).join(', ') || 'по запросу'} |`), '');
  }
  out.push('## Каталог ссылок', '');
  for (const [cat, title] of Object.entries(catalog.categories)) {
    const list = catalog.entries.filter(e => e.category === cat);
    if (!list.length) continue;
    out.push(`### ${title}`, '', '| Что | Зачем | Лицензия | Роли |', '|---|---|---|---|',
      ...list.map(e => `| [${e.title}](${e.url}) | ${e.what}${e.paid ? ' **Платно.**' : ''} | ${e.license === 'see-site' ? 'на сайте' : e.license === 'none' ? 'не указана' : e.license.startsWith('GSAP') ? 'GSAP Standard (не открытая)' : e.license} | ${usedBy(e.id).join(', ') || '—'} |`), '');
  }
  return out.join('\n');
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('library.mjs')) {
  await fs.writeFile(path.join(ROOT, 'library', 'README.md'), await renderLibrary());
  console.log('library/README.md обновлён.');
}
