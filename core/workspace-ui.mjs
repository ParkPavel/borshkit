import fs from 'node:fs/promises';
import path from 'node:path';
import { readJSON } from './io.mjs';
import readline from 'node:readline/promises';
import { workspaceSnapshot, formatWorkspace, settingsReview, formatSettingsReview } from './workspace.mjs';
import { openSpace } from './space.mjs';
import { newTask } from './contract.mjs';
import { readyTask, verifyCheck, converge } from './accept.mjs';
import { applyProposal, proposeSettings } from './config.mjs';
import { requestJobStop } from './runtime-control.mjs';

/** Foreground terminal menu, including VS Code's integrated terminal. No
 * detached workers and no polling timers; EOF/Ctrl+C closes the interface. */
export async function workspaceMenu(space, { input = process.stdin, output = process.stdout } = {}) {
  const rl = readline.createInterface({ input, output });
  let closed = false;
  const controller = new AbortController();
  rl.once('close', () => { closed = true; controller.abort(); });
  rl.on('SIGINT', () => rl.close());
  const ask = async text => { if (closed) return ''; try { return (await rl.question(text)).trim(); } catch { return ''; } };
  const say = text => output.write(text + '\n');
  try {
    while (!closed) {
      space = await openSpace(space.project, { folder: space.folder });
      say('\n' + formatWorkspace(await workspaceSnapshot(space)));
      say('\n1 Новая задача   2 Проверить задачу   3 Остановить работу\n4 Настройки     5 RAM и CPU          6 Обновить   0 Выход');
      const action = await ask('Выбери действие: ');
      if (!action || action === '0') break;
      try {
        if (action === '1') {
          const goal = await ask('Что должно получиться? '); if (!goal) continue;
          const id = `task-${Date.now().toString(36)}`;
          await newTask(space, { taskId: id, goal });
          say(`Создана задача ${id}. Попроси текущий Claude/Codex уточнить критерии и продолжить работу здесь.`);
        } else if (action === '2') {
          const tasks = (await workspaceSnapshot(space)).tasks;
          tasks.forEach((t, i) => say(`${i + 1} ${t.goal}`));
          const id = tasks[Number(await ask('Номер задачи (0 назад): ')) - 1]?.id; if (!id) continue;
          const task = await readyTask(space, id);
          for (const [i, check] of task.contract.checks.entries()) {
            if (closed) break;
            say(`Проверка ${i + 1}/${task.contract.checks.length}: ${check.id}…`);
            const result = await verifyCheck(space, id, check.id, { signal: controller.signal });
            const filled = Math.round((i + 1) / task.contract.checks.length * 12);
            say(`[${'█'.repeat(filled)}${'░'.repeat(12 - filled)}] ${i + 1}/${task.contract.checks.length} · ${result.status}`);
          }
          if (closed) break;
          const result = await converge(space, id); say(`Итог: ${result.status}. Завершение проверок не означает автоматическую приёмку.`);
        } else if (action === '3') {
          const jobs = (await workspaceSnapshot(space)).jobs.filter(j => j.canStop);
          if (!jobs.length) { say('Нет доступных для остановки работ Borshkit.'); continue; }
          jobs.forEach((j, i) => say(`${i + 1} ${j.taskId} · ${j.executor} · ${j.activity}`));
          const id = jobs[Number(await ask('Номер работы (0 назад): ')) - 1]?.id;
          if (id) say((await requestJobStop(space, id)).note);
        } else if (action === '4') {
          say('1 Приватность   2 Параллельные вызовы   3 Применить подготовленные изменения   0 Назад');
          const choice = await ask('Настройка: '); let id;
          if (choice === '1') {
            say('1 Умеренная   2 Строгая'); const value = await ask('Выбор: ');
            if (!['1', '2'].includes(value)) continue;
            id = (await proposeSettings(space, { privacy: value === '1' ? 'moderate' : 'strict' }, { reason: 'выбор в рабочем пространстве' })).id;
          } else if (choice === '2') {
            const limit = Number(await ask('Максимум одновременно работающих дополнительных вызовов (1–32): '));
            id = (await proposeSettings(space, { execution: { maxActiveRuns: limit } }, { reason: 'лимит параллельных запусков' })).id;
          } else if (choice === '3') {
            const dir = path.join(space.dir, 'settings', 'proposals');
            const files = await fs.readdir(dir).catch(e => { if (e.code === 'ENOENT') return []; throw e; });
            const proposals = (await Promise.all(files.filter(f => f.endsWith('.json')).map(f => readJSON(path.join(dir, f))))).filter(p => p.status === 'open');
            proposals.forEach((p, i) => say(`${i + 1} ${p.reason || 'Изменение настроек'} (${p.id})`));
            if (!proposals.length) { say('Нет подготовленных изменений.'); continue; }
            id = proposals[Number(await ask('Номер изменения (0 назад): ')) - 1]?.id;
          }
          if (!id) continue;
          const review = await settingsReview(space, id);
          say(formatSettingsReview(review));
          if (review.implications.length) say('Что изменится в доступе: ' + review.implications.join('; '));
          if (await ask('1 Применить эти изменения   0 Отмена: ') === '1') {
            await applyProposal(space, id, { confirmedByPerson: true, approvalDigest: review.digest, confirmationSource: 'terminal-menu' }); say('Настройки применены.');
          }
        } else if (action === '5') say(formatWorkspace(await workspaceSnapshot(space, { resources: true })));
        else if (action !== '6') say('Выбери номер действия из меню.');
      } catch (e) { say(`Не получилось: ${e.message}`); }
    }
  } finally { rl.close(); }
}
