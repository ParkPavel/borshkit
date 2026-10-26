import path from 'node:path';
import { assert, atomicJSON, readJSON } from './io.mjs';
import { runCommand } from './process.mjs';

export const jobStopFile = (space, id) => path.join(space.state, 'job-controls', `${id}.json`);
export async function requestJobStop(space, id) {
  assert(/^j-[a-z0-9]+-[a-f0-9]{6}$/.test(id ?? ''), 'Выбери работу из списка');
  const job = await readJSON(path.join(space.dir, 'jobs', `${id}.json`));
  if (!['RUNNING', 'QUEUED', 'WAITING_LIMIT'].includes(job.status)) return { id, state: job.status, requested: false };
  assert(job.runToken, 'Эта работа создана старой версией. Останови её в терминале, где она запущена');
  const request = { id, runToken: job.runToken, requestedAt: new Date().toISOString() };
  await atomicJSON(jobStopFile(space, id), request);
  return { id, state: 'STOP_REQUESTED', requested: true, note: 'Запрос передан владельцу работы; ожидается подтверждение остановки' };
}
export async function jobStopRequested(space, job) {
  const request = await readJSON(jobStopFile(space, job.id)).catch(e => { if (e.code === 'ENOENT') return null; throw e; });
  return Boolean(job.runToken && request?.runToken === job.runToken);
}
export const processAlive = pid => {
  if (!Number.isInteger(pid) || pid <= 0) return null;
  try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM' ? null : false; }
};
const cpuSeconds = value => {
  const [days, rest] = value.includes('-') ? value.split('-') : ['0', value];
  return rest.split(':').reduce((n, v) => n * 60 + Number(v), 0) + Number(days) * 86400;
};
/** On-demand observation only: no sampling daemon, no command lines/secrets,
 * no PID-based termination, and no claim of hard CPU/RAM quotas. */
export async function sampleProcesses(pids, { platform = process.platform, run = runCommand } = {}) {
  const ids = [...new Set(pids.filter(p => Number.isInteger(p) && p > 0))];
  if (!ids.length) return { state: 'EMPTY', processes: [] };
  try {
    if (platform === 'win32') {
      const script = `Get-Process -Id ${ids.join(',')} -ErrorAction SilentlyContinue | Select-Object Id,WorkingSet64,PrivateMemorySize64,CPU | ConvertTo-Json -Compress`;
      const { stdout } = await run('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script], { timeout: 5000, maxBuffer: 1048576 });
      const rows = stdout.trim() ? [].concat(JSON.parse(stdout)) : [];
      return { state: 'OBSERVED', processes: rows.map(r => ({ pid: r.Id, rssBytes: r.WorkingSet64, privateBytes: r.PrivateMemorySize64, cpuSeconds: r.CPU ?? null })) };
    }
    const { stdout } = await run('ps', ['-p', ids.join(','), '-o', 'pid=,ppid=,rss=,vsz=,time='], { timeout: 5000, maxBuffer: 1048576 });
    const rows = stdout.trim().split('\n').filter(Boolean).map(line => line.trim().split(/\s+/));
    return { state: 'OBSERVED', processes: rows.map(([pid, ppid, rss, vsz, cpu]) => ({ pid: Number(pid), parentPid: Number(ppid), rssBytes: Number(rss) * 1024, virtualBytes: Number(vsz) * 1024, cpuSeconds: cpuSeconds(cpu) })) };
  } catch (e) { return { state: 'UNKNOWN', processes: [], reason: e.message.split('\n')[0] }; }
}
