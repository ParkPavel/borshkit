import fs from 'node:fs/promises';
import path from 'node:path';
import { assert, atomicJSON, atomicWrite, exists, readJSON, sha } from './io.mjs';
import { assertIgnored, journal, saveSpace } from './space.mjs';
import { assertSettingsIntact } from './config.mjs';

// Inputs that live outside Git — files, web pages, text a person pasted — are
// stored by content. A record names where the bytes came from and when; the
// bytes never change, so a new version of a source is a new record that
// supersedes the old one. Evidence cites the stored copy, never the live URL.
export const MATERIAL_ID = /^m-[a-f0-9]{12}$/;
const MAX_BYTES = 20 * 1024 * 1024;
const TYPES = { '.md': 'text/markdown', '.txt': 'text/plain', '.html': 'text/html', '.htm': 'text/html', '.json': 'application/json', '.csv': 'text/csv', '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };

const dirs = space => ({ blobs: path.join(space.dir, 'materials', 'blobs'), records: path.join(space.dir, 'materials', 'records') });
const blobPath = (space, hash) => path.join(dirs(space).blobs, hash.slice(0, 2), hash);
const recordPath = (space, id) => path.join(dirs(space).records, `${id}.json`);
const materialId = (origin, hash) => `m-${sha(`${origin.kind}\0${origin.value}\0${hash}`).slice(0, 12)}`;

async function store(space, bytes, origin, extra) {
  assert(bytes.length <= MAX_BYTES, `Материал больше ${MAX_BYTES / 1024 / 1024} МБ`);
  const hash = sha(bytes), id = materialId(origin, hash), file = recordPath(space, id);
  if (await exists(file)) return { record: await readJSON(file), added: false };
  const blob = blobPath(space, hash);
  if (!(await exists(blob))) await atomicWrite(blob, bytes, { mode: 0o644 });
  const record = { schemaVersion: 1, id, sha256: hash, size: bytes.length, origin, capturedAt: new Date().toISOString(), ...extra };
  await atomicJSON(file, record);
  return { record, added: true };
}
/**
 * Add a file, a web page or pasted text. In the strict privacy mode a request
 * to the network leaves the machine, so it needs `confirm` from a person.
 */
export async function addMaterial(space, { file, url, text, title = null, confirm = false, supersedes = null, fetchImpl = globalThis.fetch }) {
  assert([file, url, text].filter(v => v != null).length === 1, 'Укажи ровно один источник: файл, --url или --текст');
  await assertIgnored(space);
  await assertSettingsIntact(space);
  let result;
  if (file != null) {
    const full = path.resolve(file);
    const bytes = await fs.readFile(full);
    const rel = path.relative(space.project, full).replaceAll('\\', '/');
    const value = rel.startsWith('..') || path.isAbsolute(rel) ? full.replaceAll('\\', '/') : rel;
    result = await store(space, bytes, { kind: 'file', value }, { mediaType: TYPES[path.extname(full).toLowerCase()] ?? 'application/octet-stream', title, supersedes });
  } else if (text != null) {
    assert(typeof text === 'string' && text.trim(), 'Пустой текст');
    result = await store(space, Buffer.from(text, 'utf8'), { kind: 'user', value: title ?? 'текст от пользователя' }, { mediaType: 'text/plain', title, supersedes });
  } else {
    const parsed = new URL(url);
    assert(['http:', 'https:'].includes(parsed.protocol), 'Поддерживаются только адреса http и https');
    assert(space.settings.privacy !== 'strict' || confirm, 'Строгий режим приватности: запрос в интернет уходит наружу. Подтверди явно флагом --да.');
    const response = await fetchImpl(parsed.href, { redirect: 'follow' });
    assert(response.ok, `Сервер ответил ${response.status} — материал не сохранён`);
    const bytes = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
    result = await store(space, bytes, { kind: 'url', value: parsed.href }, {
      mediaType: contentType.split(';')[0].trim(), title, supersedes,
      http: { status: response.status, finalUrl: response.url || parsed.href, etag: response.headers.get('etag'), lastModified: response.headers.get('last-modified') },
    });
  }
  if (result.added) {
    await journal(space, `Добавлен материал ${result.record.id}: ${result.record.title ?? result.record.origin.value}`);
    await saveSpace(space, `Материал ${result.record.id}`);
  }
  return result;
}
export async function listMaterials(space) {
  const dir = dirs(space).records;
  if (!(await exists(dir))) return [];
  const all = await Promise.all((await fs.readdir(dir)).filter(f => f.endsWith('.json')).map(f => readJSON(path.join(dir, f))));
  const replaced = new Set(all.map(r => r.supersedes).filter(Boolean));
  return all.map(r => ({ ...r, superseded: replaced.has(r.id) })).sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
}
/** The stored bytes, refused when they no longer match the recorded hash. */
export async function loadMaterial(space, id) {
  assert(MATERIAL_ID.test(id), `Недопустимый идентификатор материала «${id}»`);
  const file = recordPath(space, id);
  assert(await exists(file), `Материал ${id} не найден`);
  const record = await readJSON(file);
  const bytes = await fs.readFile(blobPath(space, record.sha256)).catch(() => null);
  assert(bytes, `Копия материала ${id} пропала`);
  assert(sha(bytes) === record.sha256, `Копия материала ${id} изменена после сохранения`);
  return { record, bytes };
}
/** Fetch a URL material again; a different answer becomes a new record that supersedes it. */
export async function refreshMaterial(space, id, { confirm = false, fetchImpl = globalThis.fetch } = {}) {
  const { record } = await loadMaterial(space, id);
  assert(record.origin.kind === 'url', 'Обновить можно только материал из интернета');
  const result = await addMaterial(space, { url: record.origin.value, title: record.title, confirm, supersedes: id, fetchImpl });
  return { changed: result.record.sha256 !== record.sha256, record: result.record };
}
/** Readable text of a material, or null when Borshkit cannot read this type. */
export function materialText(record, bytes) {
  const type = record.mediaType;
  if (type === 'text/html') {
    return bytes.toString('utf8').replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  }
  if (type.startsWith('text/') || type === 'application/json') return bytes.toString('utf8');
  return null;
}
