import { assert, sha } from './io.mjs';

/** Extractive packing: no generated facts, stable priority and explicit omissions. */
export function packContext(fragments, { budget = 12000 } = {}) {
  assert(Number.isInteger(budget) && budget >= 512 && budget <= 120000, 'Бюджет контекста — 512..120000 символов');
  const selected = [], omitted = [], seen = new Map();
  let text = '';
  for (const f of fragments.map((f, i) => ({ ...f, order: i })).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || a.order - b.order)) {
    assert(typeof f.source === 'string' && f.source.length <= 500 && !/[\r\n]/.test(f.source) && typeof f.text === 'string', 'Фрагменту нужны источник и текст');
    const digest = sha(f.text);
    if (seen.has(digest)) { seen.get(digest).alsoFrom.push(f.source); continue; }
    const header = `\n## ${f.source}\n`, reserve = 95;
    const available = budget - text.length - header.length - reserve;
    if (available < 80) { omitted.push({ source: f.source, digest, reason: 'budget' }); continue; }
    const body = f.text.slice(0, available), truncated = body.length < f.text.length;
    const entry = { source: f.source, digest, snippetDigest: sha(body), characters: body.length, truncated, alsoFrom: [] };
    selected.push(entry); seen.set(digest, entry);
    text += header + body + (truncated ? '\n[Фрагмент обрезан; источник нужно прочитать отдельно]\n' : '\n');
  }
  if (omitted.length) text += `\n[Не поместилось источников: ${omitted.length}; см. manifest.omitted]\n`.slice(0, budget - text.length);
  return { schemaVersion: 1, strategy: 'extractive-priority-v1', budget, characters: text.length, text, manifest: { selected, omitted }, digest: sha(text) };
}
