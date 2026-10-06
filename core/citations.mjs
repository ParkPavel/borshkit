import fs from 'node:fs/promises';
import path from 'node:path';
import { contained } from './io.mjs';
import { listMaterials, loadMaterial, materialText } from './materials.mjs';

// A citation in a report: (источник: m-0123456789ab, «точная цитата») or
// (source: m-0123456789ab, "exact quote"). The quote is optional.
const CITE = /\((?:источник|source):\s*(m-[a-f0-9]{12})(?:\s*,\s*(?:«([^»]+)»|"([^"]+)"))?\)/giu;
const URL_IN_TEXT = /https?:\/\/[^\s)>\]"'«»]+/g;
const squash = s => s.replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * Built-in check `citations`: every citation names a material declared in the
 * task, the stored copy is intact, every quote is found in it word for word
 * (whitespace and case aside), and no web address appears that did not come
 * in through `borshkit материал добавить` — a source read around Borshkit
 * cannot be cited. Whether a claim follows from its source is not decided
 * here: that stays a `model` or `manual` criterion.
 */
export async function citationsCheck(space, contract, check) {
  const lines = [], failures = [], unknowns = [];
  const file = await contained(space.project, path.resolve(space.project, check.report));
  const text = await fs.readFile(file, 'utf8').catch(() => null);
  if (text === null) return { status: 'FAIL', log: `Отчёт ${check.report} не найден.\n` };
  const declared = new Set(contract.materials ?? []);
  const citations = [...text.matchAll(CITE)].map(m => ({ id: m[1], quote: m[2] ?? m[3] ?? null }));
  if (citations.length < (check.minCitations ?? 1)) failures.push(`В отчёте ссылок на источники: ${citations.length}, нужно не меньше ${check.minCitations ?? 1}.`);
  const texts = new Map();
  for (const c of citations) {
    if (!declared.has(c.id)) { failures.push(`${c.id}: источник не объявлен в задаче (поле materials).`); continue; }
    let material;
    try { material = await loadMaterial(space, c.id); } catch (e) { failures.push(`${c.id}: ${e.message}.`); continue; }
    if (!c.quote) { lines.push(`✓ ${c.id}: источник на месте`); continue; }
    if (!texts.has(c.id)) texts.set(c.id, materialText(material.record, material.bytes));
    const body = texts.get(c.id);
    if (body === null) unknowns.push(`${c.id}: не умею читать ${material.record.mediaType} — цитату «${c.quote}» проверь сам.`);
    else if (squash(body).includes(squash(c.quote))) lines.push(`✓ ${c.id}: цитата найдена — «${c.quote}»`);
    else failures.push(`${c.id}: цитаты «${c.quote}» в источнике нет.`);
  }
  const known = new Set((await listMaterials(space)).filter(r => declared.has(r.id) && r.origin.kind === 'url').flatMap(r => [r.origin.value, r.http?.finalUrl].filter(Boolean)));
  for (const url of new Set(text.match(URL_IN_TEXT) ?? [])) {
    if (!known.has(url)) failures.push(`Адрес ${url} упомянут, но не сохранён как материал задачи — источник получен в обход Borshkit.`);
  }
  const status = failures.length ? 'FAIL' : unknowns.length ? 'UNKNOWN' : 'PASS';
  const log = [...lines, ...failures.map(f => `✗ ${f}`), ...unknowns.map(u => `? ${u}`), ''].join('\n');
  return { status, log, error: failures[0] ?? unknowns[0] ?? null };
}
export const BUILTINS = { citations: citationsCheck };
