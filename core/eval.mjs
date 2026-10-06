import fs from 'node:fs/promises';
import path from 'node:path';
import { assert, atomicJSON, atomicWrite, exists, readJSON } from './io.mjs';
import { runCommand } from './process.mjs';
import { taskRepo } from './accept.mjs';
import { listJobs } from './dispatch.mjs';
import { proposeSettings } from './config.mjs';

// Evaluation (spec §17): measure what the harness claims. Hidden checks are the
// ground truth a person keeps outside the tasks; an accepted task whose hidden
// check fails is a false PASS. Model trust (decision D10) is measured from the
// cases where a person later judged a criterion a model had passed.

/** hidden: { taskId: { command, args } } — checks the executors never saw. */
export async function evaluate(space, hidden) {
  assert(hidden && typeof hidden === 'object', 'Нужны скрытые проверки: { "задача": { "command": "…", "args": [] } }');
  const jobs = await listJobs(space), rows = [];
  for (const taskId of Object.keys(hidden).sort()) {
    const dir = path.join(space.tasks, taskId);
    assert(await exists(path.join(dir, 'contract.json')), `Задачи «${taskId}» нет`);
    const report = await readJSON(path.join(dir, 'convergence.json')).catch(() => null);
    const basis = await readJSON(path.join(dir, 'basis.json'));
    const decision = await readJSON(path.join(dir, 'decision.json')).catch(() => null);
    let truth = 'PASS';
    try { await runCommand(hidden[taskId].command, hidden[taskId].args ?? [], { cwd: await taskRepo(space, taskId), timeout: hidden[taskId].timeoutMs ?? 120000 }); } catch { truth = 'FAIL'; }
    const evidence = (await fs.readdir(path.join(dir, 'evidence')).catch(() => [])).length
      ? await Promise.all((await fs.readdir(path.join(dir, 'evidence'))).map(f => readJSON(path.join(dir, 'evidence', f)))) : [];
    const taskJobs = jobs.filter(j => j.taskId === taskId);
    const usage = taskJobs.flatMap(j => j.attempts ?? []).reduce((u, a) => ({ input: u.input + (a.usage?.input_tokens ?? a.usage?.prompt_tokens ?? 0), output: u.output + (a.usage?.output_tokens ?? a.usage?.completion_tokens ?? 0), cost: u.cost + (a.usage?.costUsd ?? 0) }), { input: 0, output: 0, cost: 0 });
    rows.push({
      taskId, status: report?.status ?? 'unknown', truth,
      falsePass: report?.status === 'accepted' && truth === 'FAIL',
      confirmed: report?.status === 'accepted' && truth === 'PASS',
      overCaution: report?.status !== 'accepted' && report?.status !== 'needs-fix' && truth === 'PASS',
      interventions: evidence.filter(e => e.kind === 'human' || e.kind === 'signoff').length,
      minutesToAcceptance: decision && basis.createdAt ? Math.round((new Date(decision.decidedAt) - new Date(basis.createdAt)) / 60000) : null,
      jobs: taskJobs.length, switches: taskJobs.reduce((n, j) => n + Math.max(0, (j.attempts ?? []).filter(a => a.outcome !== 'skipped').length - 1), 0), usage,
    });
  }
  const n = rows.length || 1;
  const summary = {
    tasks: rows.length, confirmedQuality: rows.filter(r => r.truth === 'PASS').length / n, accepted: rows.filter(r => r.status === 'accepted').length,
    falsePass: rows.filter(r => r.falsePass).length, overCaution: rows.filter(r => r.overCaution).length,
    interventions: rows.reduce((s, r) => s + r.interventions, 0), switches: rows.reduce((s, r) => s + r.switches, 0),
    tokens: rows.reduce((s, r) => s + r.usage.input + r.usage.output, 0), costUsd: rows.reduce((s, r) => s + r.usage.cost, 0),
  };
  const at = new Date().toISOString();
  const out = { at, summary, rows };
  const stamp = at.slice(0, 19).replace(/[:T]/g, '-');
  await atomicJSON(path.join(space.dir, 'eval', `report-${stamp}.json`), out);
  await atomicWrite(path.join(space.dir, 'eval', `report-${stamp}.md`), [
    `# Оценка ${at.slice(0, 10)}`, '',
    `Задач: ${summary.tasks} · принято: ${summary.accepted} · **ложных PASS: ${summary.falsePass}** · лишней осторожности: ${summary.overCaution}`,
    `Вмешательств человека: ${summary.interventions} · переключений исполнителей: ${summary.switches} · токенов: ${summary.tokens} · стоимость: $${summary.costUsd.toFixed(4)}`, '',
    '| Задача | Итог Borshkit | Скрытая проверка | Ложный PASS | Вмешательств | Минут до приёмки |', '|---|---|---|---|---|---|',
    ...rows.map(r => `| ${r.taskId} | ${r.status} | ${r.truth} | ${r.falsePass ? '**да**' : 'нет'} | ${r.interventions} | ${r.minutesToAcceptance ?? '—'} |`), '',
    'Правило решения: вариант, который увеличивает число ложных PASS, отклоняется независимо от экономии.', '',
  ].join('\n'), { mode: 0o644 });
  return out;
}

/**
 * How often a model's PASS for criteria with this tag was overturned by a
 * person. Each model PASS later judged by a person is one run.
 */
export async function measureTrust(space, tag) {
  assert(/^[a-z0-9-]{1,40}$/.test(tag ?? ''), 'Укажи метку критериев');
  let runs = 0, falsePass = 0;
  for (const taskId of (await fs.readdir(space.tasks).catch(() => [])).sort()) {
    const contract = await readJSON(path.join(space.tasks, taskId, 'contract.json')).catch(() => null);
    if (!contract) continue;
    const ids = new Set(contract.criteria.filter(c => c.class === 'model' && c.tag === tag).map(c => c.id));
    if (!ids.size) continue;
    const dir = path.join(space.tasks, taskId, 'evidence');
    const records = (await Promise.all((await fs.readdir(dir).catch(() => [])).map(f => readJSON(path.join(dir, f))))).sort((a, b) => a.sequence - b.sequence);
    for (const id of ids) {
      const human = records.filter(e => e.kind === 'human' && e.criteria.includes(id));
      for (const review of records.filter(e => e.kind === 'review' && e.status === 'PASS' && e.criteria.includes(id))) {
        const verdict = human.find(h => h.sequence > review.sequence);
        if (!verdict) continue;
        runs++;
        if (verdict.status === 'FAIL') falsePass++;
      }
    }
  }
  return { tag, runs, falsePass, rate: runs ? falsePass / runs : null };
}
/** Turn a measurement into a settings proposal; applying it is a weakening, so a person confirms. */
export async function proposeTrust(space, tag, { maxFalsePassRate, minRuns = 20 } = {}) {
  const m = await measureTrust(space, tag);
  assert(m.runs >= minRuns, `Для «${tag}» сравнений с человеком ${m.runs}, нужно не меньше ${minRuns}: пока рано доверять модели`);
  const goal = maxFalsePassRate ?? space.settings.acceptance.modelTrust[tag]?.maxFalsePassRate;
  assert(typeof goal === 'number', 'Задай порог: какая доля ложных «готово» допустима (например, --порог 0.05)');
  return proposeSettings(space, { acceptance: { modelTrust: { ...space.settings.acceptance.modelTrust, [tag]: { maxFalsePassRate: goal, measured: { runs: m.runs, falsePass: m.falsePass, source: `borshkit оценка доверие ${tag}, ${new Date().toISOString().slice(0, 10)}` } } } } },
    { reason: `измерено: ${m.falsePass} ложных «готово» из ${m.runs}` });
}
