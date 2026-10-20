import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { taskDiff } from '../core/jobs.mjs';
import { buildPrompt, loadRole } from '../core/roles.mjs';
import { git } from '../core/io.mjs';
import { project, write } from './helpers.mjs';

test('review context includes scoped new content, excludes other paths and preserves truncation', async t => {
  const root = await project(t);
  const base = (await git(root, ['rev-parse', 'HEAD'])).trim();
  await write(root, { 'src/app.js': 'changed\n', 'src/new.js': 'NEW_CONTENT\n', 'outside.txt': 'OUTSIDE_SECRET', 'borshkit/local.txt': 'PRIVATE_SPACE' });
  const contract = { taskId: 'review', paths: ['src'], base: { head: base }, goals: [], criteria: [] };
  const diff = await taskDiff(root, contract);
  assert.match(diff, /NEW_CONTENT/);
  assert.match(diff, /changed/);
  assert.doesNotMatch(diff, /OUTSIDE_SECRET|PRIVATE_SPACE|outside.txt/);
  const prompt = await buildPrompt({ role: await loadRole('reviewer'), contract, context: diff });
  assert.match(prompt, /NEW_CONTENT/);
  await write(root, { 'src/app.js': 'x'.repeat(25000) });
  const large = await taskDiff(root, contract);
  assert.ok(large.length < 9500);
  assert.match(large, /обрезаны|обрезано|Не поместилось/);
  const prompt2 = await buildPrompt({ role: await loadRole('reviewer'), contract, context: large });
  assert.match(prompt2, /обрезаны|обрезано/);
});

test('review diff failures propagate instead of pretending there are no changes', async t => {
  const root = await project(t);
  await assert.rejects(taskDiff(root, { paths: ['.'], base: { head: 'missing-ref' } }), /missing-ref/);
});

test('review context does not follow untracked symlinks outside the repository', { skip: process.platform === 'win32' }, async t => {
  const root = await project(t);
  const base = (await git(root, ['rev-parse', 'HEAD'])).trim();
  await fs.symlink(path.dirname(root), path.join(root, 'src', 'outside'));
  await assert.rejects(taskDiff(root, { paths: ['src'], base: { head: base } }), /выходит за пределы/);
});

test('an all-numeric short Git id is metadata, not a phone number', async t => {
  const { outboundFindings } = await import('../core/privacy.mjs');
  const root = await project(t);
  await git(root, ['branch', '123456789012']);
  const diff = await taskDiff(root, { paths: ['src'], base: { head: '123456789012' } });
  assert.deepEqual(outboundFindings(diff, 'moderate'), []);
  // Real personal data in file content must still be blocked.
  await write(root, { 'src/phone.txt': 'Call +1 (415) 555-0100\n' });
  assert.ok(outboundFindings(await taskDiff(root, { paths: ['src'], base: { head: '123456789012' } }), 'moderate').some(f => f.kind === 'phone'));
});
