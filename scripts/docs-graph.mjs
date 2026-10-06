// Borshkit documents itself with its own knowledge base: it opens (or creates)
// a space in this repository, builds the graph, and writes what GitHub can
// show natively — the graph as a SQL script and a page with a Mermaid map.
// Run: node scripts/docs-graph.mjs
import fs from 'node:fs/promises';
import path from 'node:path';
import { ROOT, exists } from '../core/io.mjs';
import { initSpace, openSpace } from '../core/space.mjs';
import { buildKnowledge, knowledgeSQL, queryKnowledge } from '../core/kb.mjs';

if (!(await exists(path.join(ROOT, 'borshkit', 'settings', 'workspace.json')))) await initSpace({ project: ROOT });
const space = await openSpace(ROOT);
const built = await buildKnowledge(space);
const out = path.join(ROOT, 'docs', 'graph');
await fs.mkdir(out, { recursive: true });
await fs.writeFile(path.join(out, 'borshkit.sql'), await knowledgeSQL(space));

const PUBLIC = /^(README\.md|AGENTS\.md|CONTRIBUTING\.md|SECURITY\.md|docs\/(?!spec\.md|graph\/).*\.md|library\/README\.md)$/;
const docs = (await queryKnowledge(space, "SELECT id, path, title, kind FROM notes WHERE type = 'doc' ORDER BY path")).filter(d => PUBLIC.test(d.path));
const byId = new Map(docs.map(d => [d.id, d]));
const links = (await queryKnowledge(space, "SELECT src, dst, rel FROM links WHERE rel IN ('references', 'related') ORDER BY src, dst"))
  .filter(l => byId.has(l.src) && byId.has(l.dst));
const pairs = [...new Map(links.map(l => [`${l.src}\0${l.dst}`, l])).values()];
const nodeId = new Map(docs.map((d, i) => [d.id, `n${i}`]));
const short = d => (d.kind ? d.title : d.path).replace(/["[\]`]/g, '');
const KIND = { concept: 'понятие', guide: 'руководство', reference: 'справка', index: 'карта' };
const documented = await queryKnowledge(space, "SELECT l.src, n.path FROM links l JOIN notes n ON n.id = l.dst WHERE l.rel = 'documents' AND n.type = 'module' ORDER BY l.src, n.path");
const undocumented = await queryKnowledge(space, "SELECT path FROM undocumented_modules WHERE path LIKE 'core/%' OR path LIKE 'bin/%' ORDER BY path");
const counts = Object.fromEntries((await queryKnowledge(space, 'SELECT type, COUNT(*) AS n FROM notes GROUP BY type')).map(r => [r.type, r.n]));

const page = ['---', 'bk-type: index', 'related: ["../README.md", "../concepts/knowledge.md"]', '---',
  '# Граф документации', '',
  'Эту страницу Borshkit написал сам: собрал свою базу знаний по этому репозиторию и выгрузил её. Команда — `node scripts/docs-graph.mjs`.', '',
  `Всего в графе: модулей ${counts.module ?? 0}, тестов ${counts.test ?? 0}, документов ${counts.doc ?? 0}, связей ${built.links}.`, '',
  '- [`borshkit.sql`](borshkit.sql) — весь граф одним SQL-скриптом. Загрузить: `sqlite3 graph.db < borshkit.sql`, потом спрашивать, например, `SELECT * FROM undocumented_modules;`.',
  '- Ниже — карта документов: стрелка значит «ссылается на». GitHub рисует её сам (Mermaid).', '',
  '```mermaid', 'flowchart LR',
  ...docs.map(d => `  ${nodeId.get(d.id)}["${short(d)}"]`),
  ...pairs.map(l => `  ${nodeId.get(l.src)} --> ${nodeId.get(l.dst)}`),
  '```', '',
  '## Документы и код, который они описывают', '', '| Документ | Вид | Описывает код |', '|---|---|---|',
  ...docs.map(d => `| [${short(d)}](${path.posix.relative('docs/graph', d.path)}) | ${KIND[d.kind] ?? '—'} | ${documented.filter(r => r.src === d.id).map(r => `\`${r.path}\``).join(', ') || '—'} |`), '',
  '## Модули ядра без документации', '',
  undocumented.length ? undocumented.map(r => `- \`${r.path}\``).join('\n') : 'Таких нет.', ''];
await fs.writeFile(path.join(out, 'README.md'), page.join('\n'));
console.log(`docs/graph: заметок ${built.notes}, связей ${built.links}, документов на карте ${docs.length}, стрелок ${pairs.length}.`);
