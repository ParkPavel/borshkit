import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { assert, atomicJSON, atomicWrite, contained, readJSON, sha } from './io.mjs';
import { relative } from './contract.mjs';
import { capable, privacyAllows } from './executors.mjs';
import { executorFingerprint } from './resources.mjs';
import { buildPrompt, loadRole, roleFingerprint, SCHEMAS, validateOutput } from './roles.mjs';
import { startExecutor } from './adapters.mjs';
import { childEnv, outboundFindings } from './privacy.mjs';
import { runCommand } from './process.mjs';
import { reserveExecution, settleExecution } from './operations.mjs';
import { proposeSettings } from './config.mjs';

export function validateSuite(s) {
  assert(s && s.schemaVersion === 1 && /^[a-z0-9-]{1,40}$/.test(s.id) && /^[a-z0-9-]{1,40}$/.test(s.role), 'Набор требует schemaVersion:1, id и роль');
  assert(Array.isArray(s.cases) && s.cases.length && s.cases.length <= 100 && new Set(s.cases.map(c => c.id)).size === s.cases.length, 'Нужны 1..100 разных заданий');
  for (const c of s.cases) {
    assert(/^[a-z0-9-]{1,40}$/.test(c.id) && typeof c.prompt === 'string' && c.prompt.trim(), 'Задание требует id и текст');
    assert(c.fixtures && typeof c.fixtures === 'object' && !Array.isArray(c.fixtures)
      && Object.entries(c.fixtures).every(([p, v]) => relative(p) && p !== '.' && !p.split(/[\\/]/).some(x => x.startsWith('.')) && typeof v === 'string'), 'fixtures — явные текстовые файлы без скрытых папок');
    assert(Array.isArray(c.checks) && c.checks.length && c.checks.every(k => typeof k.command === 'string' && k.command && Array.isArray(k.args) && k.args.every(a => typeof a === 'string')), 'Качество проверяется независимыми командами, а не ответом модели');
    assert(c.timeoutMs === undefined || Number.isInteger(c.timeoutMs) && c.timeoutMs > 0 && c.timeoutMs <= 900000, 'Таймаут задания — 1..900000 мс');
    assert(c.imagePath === undefined || relative(c.imagePath) && /\.png$/.test(c.imagePath) && !c.imagePath.split(/[\\/]/).some(p=>p.startsWith('.')), 'imagePath — явный PNG внутри задания');
  }
  return s;
}
/** A benchmark uses only explicit fixtures in a temporary checkout. Hidden
 * checks are not put in the prompt. Subjective design quality still needs a
 * project-authored assessment; passing these cases is no universal ranking. */
export async function runAssessment(space, executorId, suite, { fetchImpl = globalThis.fetch, estimate = null, expiresHours = 24 } = {}) {
  validateSuite(suite);
  assert(Number.isFinite(expiresHours) && expiresHours > 0 && expiresHours <= 720, 'Срок оценки — до 720 часов');
  const executor = space.settings.executors[executorId], role = await loadRole(suite.role);
  assert(executor?.model, 'Для оценки нужно закрепить конкретную модель');
  assert(capable(role, executor).ok && privacyAllows(space.settings.privacy, executor).ok, 'Исполнитель не соответствует возможностям роли или приватности');
  const roleDigest = await roleFingerprint(role), fingerprint = executorFingerprint(executor), suiteDigest = sha(JSON.stringify(suite));
  const id = `assessment-${crypto.randomUUID()}`, at = new Date(), rows = [];
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'borshkit-assessment-'));
  try {
    for (const c of suite.cases) {
      assert(role.output !== 'image' || c.imagePath, 'Задание изображения требует imagePath и независимую проверку файла');
      const dir = path.join(root, c.id); await fs.mkdir(dir);
      for (const [name, content] of Object.entries(c.fixtures)) {
        assert(!outboundFindings(content, space.settings.privacy).some(f => f.action === 'block'), 'В файле задания обнаружены запрещённые данные');
        await atomicWrite(path.join(dir, name), content, { mode: 0o644 });
      }
      const prompt = await buildPrompt({ role, contract: c.contract ?? { taskId: c.id, goal: c.prompt, criteria: [], paths: Object.keys(c.fixtures) },
        context: `Задание: ${c.prompt}\nЯвные входы:\n${Object.entries(c.fixtures).map(([p,v]) => `${p}:\n${v}`).join('\n\n')}`, imagePath:c.imagePath??null });
      assert(!outboundFindings(prompt, space.settings.privacy).some(f => f.action === 'block'), 'В задании обнаружены данные, запрещённые к отправке');
      const reserved = await reserveExecution(space, { taskId: id, executorId, estimate });
      let launched = false, result = null;
      try {
        const handle = await startExecutor({ executor, prompt, schema: SCHEMAS[role.output], cwd: dir, writable: role.authority === 'workspace-write',
          scratch: path.join(root, 'scratch', c.id), timeoutMs: c.timeoutMs ?? 120000, fetchImpl, env: process.env, maxOutputTokens: estimate?.outputTokens,
          image: role.output==='image' && ['openai-compat','gemini-api'].includes(executor.kind), onEvent: e => { if (['spawn', 'request'].includes(e.kind)) launched = true; } });
        result = await handle.done;
      } finally { await settleExecution(space, reserved.id, { usage: result?.usage, launched }); }
      const errors = [], checks = [];
      if (!result.ok) errors.push(result.error ?? 'исполнитель не завершил задание');
      else {
        try {
          if(role.output==='image' && ['openai-compat','gemini-api'].includes(executor.kind)) {
            const bytes=Buffer.from(result.result.imageBase64??'','base64');
            assert(bytes.length>=8 && bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),'Модель не вернула PNG');
            await atomicWrite(path.join(dir,c.imagePath),bytes,{mode:0o644});
            result.result={summary:'Изображение API',files:[c.imagePath],unknowns:['Визуальное качество требует отдельного ревью']};
          }
          validateOutput(role, result.result, c.contract ?? { taskId: c.id, criteria: [] });
          for (const w of result.result.writes ?? []) {
            assert(relative(w.path) && w.path !== '.' && !w.path.split(/[\\/]/).some(p => p.startsWith('.')), 'Ответ содержит недопустимый путь');
            const target = await contained(dir, path.resolve(dir, w.path));
            await atomicWrite(target, w.content, { mode: 0o644 });
          }
          await atomicJSON(path.join(dir, 'result.json'), result.result);
        } catch (e) { errors.push(e.message); }
        if (!errors.length) for (const check of c.checks) {
          try {
            await runCommand(check.command, check.args, { cwd: dir, env: childEnv(), timeout: Math.min(check.timeoutMs ?? 30000, 900000) });
            checks.push({ status: 'PASS', command: check.command, args: check.args });
          } catch (e) { checks.push({ status: 'FAIL', command: check.command, args: check.args, error: String(e.message).slice(0, 500) }); }
        }
      }
      rows.push({ id: c.id, status: !errors.length && checks.length === c.checks.length && checks.every(k => k.status === 'PASS') ? 'PASS' : 'FAIL',
        errors, checks, usage: result.usage ?? null, reservation: reserved.id });
    }
  } finally { await fs.rm(root, { recursive: true, force: true }); }
  assert(roleDigest === await roleFingerprint(await loadRole(suite.role)) && fingerprint === executorFingerprint(space.settings.executors[executorId]), 'Инструкции или конфигурация изменились во время оценки');
  const report = { schemaVersion: 1, id, executorId, model: executor.model, provider: executor.provider, role: suite.role, fingerprint, roleDigest, suiteDigest,
    at: at.toISOString(), expiresAt: new Date(at.getTime() + expiresHours * 3600000).toISOString(), result: rows.every(r => r.status === 'PASS') ? 'PASS' : 'FAIL', rows,
    runtime: { node: process.version, platform: process.platform }, scope: 'только указанный набор заданий; это не приёмка задач и не универсальный рейтинг моделей' };
  const file = path.join(space.dir, 'assessments', `${id}.json`);
  await atomicJSON(file, report);
  await atomicWrite(file.replace(/\.json$/, '.md'), `# Оценка роли ${suite.role}\n\n${executorId} · ${executor.model} · ${report.result}\n\n${rows.map(r => `- ${r.id}: ${r.status}${r.errors.length ? ` — ${r.errors.join('; ')}` : ''}`).join('\n')}\n\n${report.scope}\n`, { mode: 0o644 });
  return { ...report, file };
}
export async function proposeAssessment(space, reportFile) {
  const file = await contained(space.project, path.resolve(reportFile)), report = await readJSON(file);
  const e = space.settings.executors[report.executorId], role = await loadRole(report.role);
  assert(e?.model && report.fingerprint === executorFingerprint(e) && report.roleDigest === await roleFingerprint(role)
    && ['PASS', 'FAIL'].includes(report.result) && Date.parse(report.expiresAt) > Date.now(), 'Оценка устарела или не соответствует модели/роли');
  const q = { result: report.result, at: report.at, expiresAt: report.expiresAt, evidence: path.relative(space.project, file).replaceAll('\\', '/'),
    evidenceSha: sha(await fs.readFile(file)), fingerprint: report.fingerprint, roleDigest: report.roleDigest };
  return proposeSettings(space, { executors: { [report.executorId]: { qualifications: { [report.role]: q } } } }, {
    reason: `оценка на наборе ${report.suiteDigest}; ${report.role}: ${report.result}`, inputs: [{ root: 'project', path: q.evidence, digest: q.evidenceSha }],
    roleInputs: [{ role: report.role, digest: report.roleDigest }], expiresAt: report.expiresAt });
}
