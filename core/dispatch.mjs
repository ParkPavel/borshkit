import fs from 'node:fs/promises';
import path from 'node:path';
import { atomicWrite, exists, readJSON } from './io.mjs';
import { listQuestions } from './questions.mjs';
import { FAILURE_WORDS } from './executors.mjs';
import { PRIVACY_WORDS } from './privacy.mjs';

// The dispatcher (decision D18): one status model, several views — a terminal
// card list, a one-line status, STATUS.md for Obsidian and a self-refreshing
// local status.html. It shows; it never decides.
export const JOB_WORDS = { QUEUED: 'в очереди', RUNNING: 'работает', WAITING_LIMIT: 'ждёт лимит', WAITING_HUMAN: 'ждёт тебя', COMPLETED: 'готово', FAILED: 'ошибка', STOPPED: 'остановлено' };
const ACTIVE = new Set(['QUEUED', 'RUNNING', 'WAITING_LIMIT']);

export async function listJobs(space) {
  const dir = path.join(space.dir, 'jobs');
  if (!(await exists(dir))) return [];
  const jobs = await Promise.all((await fs.readdir(dir)).filter(f => f.endsWith('.json')).map(f => readJSON(path.join(dir, f)).catch(() => null)));
  return jobs.filter(Boolean).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
const ago = (iso, now) => {
  if (!iso) return 'нет данных';
  const s = Math.max(0, Math.round((now - new Date(iso)) / 1000));
  return s < 60 ? `${s} с назад` : s < 3600 ? `${Math.round(s / 60)} мин назад` : `${Math.round(s / 3600)} ч назад`;
};
/** Cards for jobs worth looking at: running ones, ones waiting for a person, and the last few finished. */
export async function cards(space, { now = new Date(), recent = 5 } = {}) {
  const jobs = await listJobs(space), questions = await listQuestions(space, { open: true });
  const shown = [...jobs.filter(j => ACTIVE.has(j.status) || j.status === 'WAITING_HUMAN'), ...jobs.filter(j => !ACTIVE.has(j.status) && j.status !== 'WAITING_HUMAN').slice(0, recent)];
  return shown.map(j => {
    const silentFor = j.status === 'RUNNING' && j.lastEventAt ? (now - new Date(j.lastEventAt)) / 1000 : 0;
    const q = questions.filter(x => x.jobId === j.id);
    return {
      jobId: j.id, taskId: j.taskId, role: j.role, executor: j.executor ?? '—', status: j.status, word: JOB_WORDS[j.status] ?? j.status,
      since: j.startedAt ?? j.createdAt, lastEvent: ago(j.lastEventAt, now), silent: silentFor > space.settings.silenceSeconds ? Math.round(silentFor) : 0,
      activity: j.activity ?? '', handovers: (j.attempts ?? []).filter(a => a.outcome !== 'ok' && a.outcome !== 'running').map(a => `${a.executor}: ${FAILURE_WORDS[a.failure] ?? a.reason ?? a.outcome}`),
      quota: j.quota ?? 'неизвестно', needsYou: q.map(x => `${x.kind === 'critical' ? '⛔' : '❓'} ${x.text} (${x.id})`),
    };
  });
}
export async function statusLine(space, { now = new Date() } = {}) {
  const c = await cards(space, { now, recent: 0 }), questions = await listQuestions(space, { open: true });
  const running = c.filter(x => ACTIVE.has(x.status)).length;
  const mode = `${PRIVACY_WORDS[space.settings.privacy]}${space.settings.autopilot ? ' · автопилот' : ''}`;
  const critical = questions.filter(q => q.kind === 'critical').length;
  return `Borshkit · ${mode} · работ: ${running}${questions.length ? ` · ждёт тебя: ${questions.length}${critical ? ` (критических ${critical})` : ''}` : ''}`;
}
export function formatCards(list) {
  if (!list.length) return 'Работ пока не было.';
  return list.map(c => [
    `${c.status === 'FAILED' ? '🔴' : c.status === 'WAITING_HUMAN' ? '⛔' : c.status === 'COMPLETED' ? '🟢' : c.silent ? '🟠' : '🔵'} ${c.taskId} · ${c.role} · ${c.word}`,
    `   кому ушло: ${c.executor} · с ${c.since.slice(11, 16)} · последний признак жизни: ${c.lastEvent}${c.silent ? ` · молчит ${c.silent} с` : ''}`,
    c.activity ? `   что делает: ${c.activity}` : null,
    c.handovers.length ? `   передачи: ${c.handovers.join(' → ')}` : null,
    `   квота: ${c.quota}`,
    ...c.needsYou.map(n => `   ${n}`),
  ].filter(Boolean).join('\n')).join('\n\n');
}
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
/** Rewrite STATUS.md and status.html; called after every job or question event. */
export async function writeStatusFiles(space, { now = new Date() } = {}) {
  const list = await cards(space, { now }), line = await statusLine(space, { now });
  await atomicWrite(path.join(space.dir, 'STATUS.md'), `# Диспетчерская\n\n> ${line}\n> Обновлено: ${now.toISOString().slice(0, 19).replace('T', ' ')}\n\n\`\`\`\n${formatCards(list)}\n\`\`\`\n`, { mode: 0o644 });
  const rows = list.map(c => `<tr class="${esc(c.status)}"><td>${esc(c.taskId)}</td><td>${esc(c.role)}</td><td>${esc(c.executor)}</td><td>${esc(c.word)}${c.silent ? ` · молчит ${c.silent} с` : ''}</td><td>${esc(c.lastEvent)}</td><td>${esc(c.activity)}</td><td>${esc(c.handovers.join(' → '))}</td><td>${c.needsYou.map(esc).join('<br>')}</td></tr>`).join('\n');
  await atomicWrite(path.join(space.dir, 'status.html'), `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta http-equiv="refresh" content="5"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Borshkit — диспетчерская</title>
<style>:root{color-scheme:light dark;--bg:#fff;--fg:#1d1d1f;--line:#ddd;--wait:#b35c00;--bad:#c62828;--ok:#2e7d32}@media(prefers-color-scheme:dark){:root{--bg:#161616;--fg:#eee;--line:#333}}
body{margin:0;padding:16px;background:var(--bg);color:var(--fg);font:15px/1.4 system-ui,sans-serif}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid var(--line);padding:6px;text-align:left;vertical-align:top}
.WAITING_HUMAN td{color:var(--wait)}.FAILED td{color:var(--bad)}.COMPLETED td:nth-child(4){color:var(--ok)}div.wrap{overflow-x:auto}</style></head>
<body><h1>Диспетчерская</h1><p>${esc(line)}</p><div class="wrap"><table><tr><th>Задача</th><th>Роль</th><th>Кому ушло</th><th>Состояние</th><th>Признак жизни</th><th>Что делает</th><th>Передачи</th><th>Ждёт тебя</th></tr>
${rows || '<tr><td colspan="8">Работ пока не было.</td></tr>'}</table></div><p><small>Обновлено ${esc(now.toISOString().slice(0, 19).replace('T', ' '))}. Страница обновляется сама.</small></p></body></html>
`, { mode: 0o644 });
}
