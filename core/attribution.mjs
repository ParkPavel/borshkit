import fs from 'node:fs/promises';
import path from 'node:path';
import { assert, atomicWrite, contained, exists, readJSON } from './io.mjs';

// Attribution and GitHub ethics (decisions D11, D14): every reference project
// is credited with its authors, license and support links; sources without a
// license are only mentioned, never copied; avatars are linked, not copied.

/**
 * Built-in check `attribution`. The manifest (third-party.json by default)
 * lists { name, url, license, authors?, files?, support? } per project.
 */
export async function attributionCheck(space, contract, check, repo = space.project) {
  const failures = [], lines = [];
  const manifestFile = await contained(repo, path.resolve(repo, check.manifest ?? 'third-party.json'));
  const entries = await readJSON(manifestFile).catch(() => null);
  if (!Array.isArray(entries)) return { status: 'FAIL', log: `Манифест ${check.manifest ?? 'third-party.json'} не найден или не список.\n`, error: 'нет манифеста' };
  const ackFile = await contained(repo, path.resolve(repo, check.readme ?? 'README.md'));
  const ack = await fs.readFile(ackFile, 'utf8').catch(() => '');
  for (const e of entries) {
    const who = e?.name ?? '(без имени)';
    if (!e?.name || !e?.url || !e?.license) { failures.push(`${who}: нужны name, url и license (для проектов без лицензии — "none")`); continue; }
    if (!ack.includes(e.url)) failures.push(`${who}: нет в благодарностях (${check.readme ?? 'README.md'} не ссылается на ${e.url})`);
    if (e.support && !ack.includes(e.support)) failures.push(`${who}: не указана ссылка на поддержку ${e.support}`);
    const files = e.files ?? [];
    if (e.license === 'none' && files.length) failures.push(`${who}: лицензии нет — копировать нельзя, а скопировано файлов: ${files.length}`);
    for (const rel of files) {
      const file = path.resolve(repo, rel);
      const bytes = await fs.readFile(await contained(repo, file)).catch(() => null);
      if (!bytes) { failures.push(`${who}: файл ${rel} указан, но его нет`); continue; }
      if (!(await licensed(repo, file, bytes, e.license))) failures.push(`${who}: в копии ${rel} нет текста лицензии рядом (LICENSE/NOTICE) или в самом файле`);
    }
    if (!failures.some(f => f.startsWith(`${who}:`))) lines.push(`✓ ${who} — ${e.license}${files.length ? `, файлов: ${files.length}` : ''}`);
  }
  return { status: failures.length ? 'FAIL' : 'PASS', log: [...lines, ...failures.map(f => `✗ ${f}`), ''].join('\n'), error: failures[0] ?? null };
}
async function licensed(repo, file, bytes, license) {
  const head = bytes.toString('utf8', 0, 4000);
  if (/SPDX-License-Identifier|Permission is hereby granted|Licensed under the Apache License/i.test(head) || (license && head.includes(license))) return true;
  for (let dir = path.dirname(file); dir.startsWith(repo); dir = path.dirname(dir)) {
    for (const name of ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'NOTICE', 'COPYING']) if (await exists(path.join(dir, name))) return true;
    if (dir === repo) break;
  }
  return false;
}

const IMG_MD = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const IMG_HTML = /<img\b[^>]*>/gi;
const LINK_MD = /(?<!!)\[[^\]]*\]\(([^)\s#]+)(?:#[^)\s]*)?\)/g;
/**
 * Built-in check `readme-assets`: every local image exists, carries alt text
 * and fits the size limit; every local link points at a file. Remote images
 * and links are listed, not fetched.
 */
export async function readmeAssetsCheck(space, contract, check, repo = space.project) {
  const failures = [], lines = [];
  const readme = check.readme ?? 'README.md';
  const file = await contained(repo, path.resolve(repo, readme));
  const text = await fs.readFile(file, 'utf8').catch(() => null);
  if (text === null) return { status: 'FAIL', log: `${readme} не найден.\n`, error: 'нет README' };
  const max = check.maxBytes ?? 1024 * 1024;
  const images = [...text.matchAll(IMG_MD)].map(m => ({ alt: m[1], src: m[2] }));
  for (const tag of text.match(IMG_HTML) ?? []) images.push({ alt: /\balt="([^"]*)"/i.exec(tag)?.[1] ?? '', src: /\bsrc="([^"]+)"/i.exec(tag)?.[1] ?? '' });
  for (const src of [...text.matchAll(/<source\b[^>]*srcset="([^"]+)"/gi)].map(m => m[1])) images.push({ alt: 'source', src });
  const local = src => src && !/^(https?:|data:|mailto:)/i.test(src);
  for (const img of images) {
    if (!local(img.src)) { lines.push(`· внешнее изображение не проверялось: ${img.src}`); continue; }
    if (!img.alt.trim()) failures.push(`у изображения ${img.src} нет alt-текста`);
    const target = path.resolve(path.dirname(file), img.src);
    const stat = await fs.stat(await contained(repo, target)).catch(() => null);
    if (!stat) failures.push(`изображения ${img.src} нет`);
    else if (stat.size > max) failures.push(`${img.src}: ${stat.size} байт, больше лимита ${max}`);
    else lines.push(`✓ ${img.src} (${stat.size} байт)`);
  }
  const links = [...text.matchAll(LINK_MD)].map(m => m[1]).filter(local);
  for (const href of links) {
    if (!(await exists(await contained(repo, path.resolve(path.dirname(file), decodeURI(href))).catch(() => '')))) failures.push(`ссылка на ${href} ведёт в никуда`);
  }
  if (links.length) lines.push(`✓ локальных ссылок проверено: ${links.length}`);
  return { status: failures.length ? 'FAIL' : 'PASS', log: [...lines, ...failures.map(f => `✗ ${f}`), ''].join('\n'), error: failures[0] ?? null };
}

/**
 * All contributors of each reference repository from the GitHub API (every
 * page), bots listed apart; written as a Markdown file with linked avatars.
 * Public data the authors published themselves (decision D11).
 */
export async function contributorsReport(space, repos, { apiBase = 'https://api.github.com', fetchImpl = globalThis.fetch, env = process.env, confirm = false } = {}) {
  assert(space.settings.privacy !== 'strict' || confirm, 'Строгий режим приватности: запрос к GitHub уходит наружу. Подтверди явно флагом --да.');
  assert(Array.isArray(repos) && repos.length && repos.every(r => /^[\w.-]+\/[\w.-]+$/.test(r)), 'Список репозиториев вида владелец/имя');
  const headers = { accept: 'application/vnd.github+json', 'user-agent': 'borshkit', ...(env.GITHUB_TOKEN ? { authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}) };
  const result = [];
  for (const repo of repos) {
    const people = [];
    for (let page = 1; page <= 100; page++) {
      const response = await fetchImpl(`${apiBase}/repos/${repo}/contributors?per_page=100&page=${page}`, { headers });
      assert(response.ok, `GitHub ответил ${response.status} для ${repo}${response.status === 403 ? ' — возможно, лимит запросов; задай GITHUB_TOKEN' : ''}`);
      const batch = await response.json();
      if (!batch.length) break;
      people.push(...batch);
      if (batch.length < 100) break;
    }
    const bots = people.filter(p => p.type === 'Bot' || /\[bot\]$/.test(p.login));
    result.push({ repo, people: people.filter(p => !bots.includes(p)).map(p => ({ login: p.login, url: p.html_url, avatar: p.avatar_url, contributions: p.contributions })), bots: bots.map(b => b.login) });
  }
  return result;
}
export function contributorsMarkdown(result, { at = new Date().toISOString().slice(0, 10) } = {}) {
  const out = ['# Контрибьюторы проектов, на которых построен Borshkit', '', `Список собран из API GitHub ${at}. Спасибо каждому — без вашей работы этого проекта бы не было.`, ''];
  for (const r of result) {
    out.push(`## [${r.repo}](https://github.com/${r.repo})`, '', `Людей: ${r.people.length}${r.bots.length ? ` · боты: ${r.bots.join(', ')}` : ''}`, '');
    out.push(r.people.map(p => `<a href="${p.url}" title="@${p.login}"><img src="${p.avatar}${p.avatar.includes('?') ? '&' : '?'}s=40" width="40" height="40" alt="@${p.login}"></a>`).join(' '), '');
    out.push(r.people.map(p => `[@${p.login}](${p.url})`).join(' · '), '');
  }
  return out.join('\n');
}
export async function writeContributors(space, result, file) {
  const target = path.resolve(space.project, file);
  await atomicWrite(target, contributorsMarkdown(result), { mode: 0o644 });
  return target;
}
