import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { git, isGitRoot } from './io.mjs';

// Git snapshot adapted from Claudex src/io.mjs snapshot() (Apache-2.0, same author).

/**
 * The exact state evidence is bound to. In a Git project: HEAD plus the bytes of
 * every tracked and non-ignored untracked file, so an uncommitted edit changes
 * the digest and ignored files (the space folder among them) never do.
 * Outside Git: every file except `.git` and the excluded top-level folders.
 */
export async function snapshot(project, { exclude = [] } = {}) {
  return (await isGitRoot(project)) ? gitSnapshot(project) : filesSnapshot(project, exclude);
}
async function hashFiles(root, files, seed) {
  const hash = crypto.createHash('sha256');
  hash.update(seed);
  for (const file of files) {
    hash.update(`\0${file}\0`);
    const full = path.join(root, file);
    try {
      const stat = await fs.lstat(full);
      if (stat.isSymbolicLink()) hash.update(`link:${await fs.readlink(full)}`);
      else if (stat.isFile()) {
        // The executable bit changes behaviour (and Git records it); Windows has none to read.
        if (process.platform !== 'win32') hash.update(stat.mode & 0o111 ? 'x:' : '-:');
        hash.update(await fs.readFile(full));
      } else if (stat.isDirectory()) hash.update(await submoduleState(full));
      else hash.update('non-file');
    } catch (e) { if (e.code === 'ENOENT') hash.update('deleted'); else throw e; }
  }
  return hash.digest('hex');
}
/**
 * A directory in a Git listing is a submodule: its checked-out commit and
 * any uncommitted change inside it are part of the state.
 */
async function submoduleState(dir) {
  try {
    const head = (await git(dir, ['rev-parse', 'HEAD'])).trim();
    const status = await git(dir, ['status', '--porcelain', '--untracked-files=all']);
    let dirty = '';
    if (status.trim()) {
      const files = (await git(dir, ['ls-files', '-z', '--modified', '--others', '--exclude-standard'])).split('\0').filter(Boolean).sort();
      dirty = await hashFiles(dir, files, status);
    }
    return `submodule:${head}:${dirty}`;
  } catch { return 'non-file'; }
}
async function gitSnapshot(repo) {
  let head = null;
  try { head = (await git(repo, ['rev-parse', '--verify', '-q', 'HEAD'])).trim() || null; } catch { /* no commits yet */ }
  const listed = (await git(repo, ['ls-files', '-z', '--cached', '--others', '--exclude-standard'])).split('\0').filter(Boolean);
  const files = [...new Set(listed)].sort();
  return { kind: 'git', head, digest: await hashFiles(repo, files, head ?? 'unborn'), fileCount: files.length };
}
async function listFiles(root, exclude) {
  const skip = new Set(['.git', ...exclude]);
  const files = [];
  async function walk(dir, prefix) {
    for (const item of (await fs.readdir(dir, { withFileTypes: true })).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
      const rel = prefix ? `${prefix}/${item.name}` : item.name;
      if (!prefix && skip.has(item.name)) continue;
      if (item.isDirectory()) await walk(path.join(dir, item.name), rel);
      else files.push(rel);
    }
  }
  await walk(root, '');
  return files;
}
async function filesSnapshot(root, exclude) {
  const files = await listFiles(root, exclude);
  return { kind: 'files', head: null, digest: await hashFiles(root, files, 'files'), fileCount: files.length };
}
/** Per-file digests of a folder without Git, so a task can tell which files changed. */
export async function fileDigests(root, { exclude = [] } = {}) {
  const out = {};
  for (const rel of await listFiles(root, exclude)) out[rel] = await hashFiles(root, [rel], '');
  return out;
}
