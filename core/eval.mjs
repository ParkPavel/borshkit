import fs from 'node:fs/promises';
import path from 'node:path';
import { assert, atomicJSON, atomicWrite, exists, readJSON } from './io.mjs';
import { runCommand } from './process.mjs';
import { taskRepo } from './accept.mjs';
import { listJobs } from './dispatch.mjs';
import { proposeSettings } from './config.mjs';
import { upperErrorBound } from './space.mjs';
import { snapshot } from './snapshot.mjs';

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
    // The hidden check runs on today's files; it says something about Borshkit's
    // verdict only if those are the files the verdict was given on.
    const repo = await taskRepo(space, taskId);
    const comparable = Boolean(report?.state?.source) && report.state.source.digest === (await snapshot(repo, { exclude: [space.folder] })).digest;
    let truth = 'PASS';
    try { await runCommand(hidden[taskId].command, hidden[taskId].args ?? [], { cwd: repo, timeout: hidden[taskId].timeoutMs ?? 120000 }); } catch { truth = 'FAIL'; }
    const evidence = (await fs.readdir(path.join(dir, 'evidence')).catch(() => [])).length
      ? await Promise.all((await fs.readdir(path.join(dir, 'evidence'))).map(f => readJSON(path.join(dir, 'evidence', f)))) : [];
    const taskJobs = jobs.filter(j => j.taskId === taskId);
    const usage = taskJobs.flatMap(j => j.attempts ?? []).reduce((u, a) => ({ input: u.input + (a.usage?.input_tokens ?? a.usage?.prompt_tokens ?? 0), output: u.output + (a.usage?.output_tokens ?? a.usage?.completion_tokens ?? 0), cost: u.cost + (a.usage?.costUsd ?? 0) }), { input: 0, output: 0, cost: 0 });
    rows.push({
      taskId, status: report?.status ?? 'unknown', truth, comparable,
      falsePass: comparable ? report.status === 'accepted' && truth === 'FAIL' : null,
      confirmed: comparable ? report.status === 'accepted' && truth === 'PASS' : null,
      overCaution: comparable ? report.status !== 'accepted' && report.status !== 'needs-fix' && truth === 'PASS' : null,
      interventions: evidence.filter(e => e.kind === 'human' || e.kind === 'signoff').length,
      minutesToAcceptance: decision && basis.createdAt ? Math.round((new Date(decision.decidedAt) - new Date(basis.createdAt)) / 60000) : null,
      jobs: taskJobs.length, switches: taskJobs.reduce((n, j) => n + Math.max(0, (j.attempts ?? []).filter(a => a.outcome !== 'skipped').length - 1), 0), usage,
    });
  }
  const same = rows.filter(r => r.comparable), n = same.length || 1;
  const summary = {
    tasks: rows.length, comparable: same.length, incomparable: rows.filter(r => !r.comparable).map(r => r.taskId),
    confirmedQuality: same.filter(r => r.truth === 'PASS').length / n, accepted: same.filter(r => r.status === 'accepted').length,
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
    `Задач: ${summary.tasks} (сравнимых: ${summary.comparable}) · принято: ${summary.accepted} · **ложных PASS: ${summary.falsePass}** · лишней осторожности: ${summary.overCaution}`,
    ...(summary.incomparable.length ? [`Не сравниваются — файлы изменились после итога Borshkit или итога нет: ${summary.incomparable.join(', ')}. Запусти borshkit задача итог и оценку заново.`] : []),
    `Вмешательств человека: ${summary.interventions} · переключений исполнителей: ${summary.switches} · токенов: ${summary.tokens} · стоимость: $${summary.costUsd.toFixed(4)}`, '',
    '| Задача | Итог Borshkit | Скрытая проверка | Ложный PASS | Вмешательств | Минут до приёмки |', '|---|---|---|---|---|---|',
    ...rows.map(r => `| ${r.taskId} | ${r.status} | ${r.truth} | ${r.falsePass === null ? 'не сравнимо' : r.falsePass ? '**да**' : 'нет'} | ${r.interventions} | ${r.minutesToAcceptance ?? '—'} |`), '',
    'Правило решения: вариант, который увеличивает число ложных PASS, отклоняется независимо от экономии.', '',
  ].join('\n'), { mode: 0o644 });
  return out;
}

/**
 * How often a model's PASS for criteria with this tag was overturned by a
 * person. One run is one human verdict, paired with the latest model PASS
 * that came before it on the same work (same files, contract and materials)
 * and was made by a review job that saw that state. Several PASSes before one
 * verdict are still one run; a verdict on changed files measures nothing.
 * Runs are counted per model family, because trust does not transfer.
 */
export async function measureTrust(space, tag, { provider } = {}) {
  assert(/^[a-z0-9-]{1,40}$/.test(tag ?? ''), 'Укажи метку критериев');
  const sameWork = (a, b) => a?.source?.digest === b?.source?.digest && a?.contractDigest === b?.contractDigest && a?.materialsDigest === b?.materialsDigest;
  const byProvider = {};
  let skipped = 0;
  for (const taskId of (await fs.readdir(space.tasks).catch(() => [])).sort()) {
    const contract = await readJSON(path.join(space.tasks, taskId, 'contract.json')).catch(() => null);
    if (!contract) continue;
    const ids = new Set(contract.criteria.filter(c => c.class === 'model' && c.tag === tag).map(c => c.id));
    if (!ids.size) continue;
    const dir = path.join(space.tasks, taskId, 'evidence');
    const records = (await Promise.all((await fs.readdir(dir).catch(() => [])).map(f => readJSON(path.join(dir, f))))).sort((a, b) => a.sequence - b.sequence);
    for (const id of ids) {
      for (const verdict of records.filter(e => e.kind === 'human' && e.criteria.includes(id))) {
        const review = records.filter(e => e.kind === 'review' && e.criteria.includes(id) && e.sequence < verdict.sequence).at(-1);
        if (!review || review.status !== 'PASS') continue;
        if (review.origin !== 'job' || review.freshness !== 'CURRENT' || !review.provider || !sameWork(review.state, verdict.state)) { skipped++; continue; }
        const p = (byProvider[review.provider] ??= { runs: 0, falsePass: 0 });
        p.runs++;
        if (verdict.status === 'FAIL') p.falsePass++;
      }
    }
  }
  const pick = provider === undefined ? Object.values(byProvider) : [byProvider[provider] ?? { runs: 0, falsePass: 0 }];
  const runs = pick.reduce((n, p) => n + p.runs, 0), falsePass = pick.reduce((n, p) => n + p.falsePass, 0);
  return { tag, provider: provider ?? null, runs, falsePass, rate: runs ? falsePass / runs : null, upperBound: upperErrorBound(falsePass, runs), byProvider, skipped };
}
/**
 * Turn a measurement into a settings proposal; applying it is a weakening, so
 * a person confirms. It is refused while even the pessimistic end of the
 * measured error rate misses the goal, and it names how many clean runs the
 * goal would need.
 */
export async function proposeTrust(space, tag, { maxFalsePassRate, provider, minRuns = 20 } = {}) {
  const all = await measureTrust(space, tag);
  const families = Object.keys(all.byProvider);
  const family = provider ?? (families.length === 1 ? families[0] : null);
  assert(family, families.length ? `Доверие задаётся для одного семейства моделей. Выбери: --семейство ${families.join(' | ')}` : `Для «${tag}» сравнений с человеком пока нет`);
  const m = await measureTrust(space, tag, { provider: family });
  assert(m.runs >= minRuns, `Для «${tag}» (${family}) сравнений с человеком ${m.runs}, нужно не меньше ${minRuns}: пока рано доверять модели`);
  const goal = maxFalsePassRate ?? space.settings.acceptance.modelTrust[tag]?.maxFalsePassRate;
  assert(typeof goal === 'number' && goal > 0 && goal < 1, 'Задай порог: какая доля ложных «готово» допустима (например, --порог 0.05)');
  const needed = Math.ceil(1.96 ** 2 * (1 - goal) / goal);
  assert(m.upperBound <= goal, `Измерено ${m.falsePass} ложных «готово» из ${m.runs}, но с учётом случайности доля может доходить до ${Math.round(m.upperBound * 1000) / 10}% — больше цели ${goal * 100}%. Даже без единой ошибки для такой цели нужно около ${needed} сравнений.`);
  return proposeSettings(space, { acceptance: { modelTrust: { ...space.settings.acceptance.modelTrust, [tag]: { maxFalsePassRate: goal, measured: { runs: m.runs, falsePass: m.falsePass, provider: family, source: `borshkit оценка доверие ${tag}, ${new Date().toISOString().slice(0, 10)}` } } } } },
    { reason: `измерено для ${family}: ${m.falsePass} ложных «готово» из ${m.runs}; верхняя граница ${Math.round(m.upperBound * 1000) / 10}%` });
}
