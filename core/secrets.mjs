// Credential patterns adapted from Claudex src/security.mjs (Apache-2.0, same author).
const rules = [
  ['private-key', /-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----/],
  ['github-credential', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b/],
  ['provider-credential', /\bsk-(?:ant-[A-Za-z0-9_-]{25,}|[A-Za-z0-9_-]{32,})\b/],
  ['cloud-credential', /\bAKIA[0-9A-Z]{16}\b/],
  ['credential-literal', /(?:api[_-]?key|access[_-]?token|password|secret)\s*["']?\s*[:=]\s*["'][A-Za-z0-9+/_=-]{24,}["']/i],
];
/** Kinds of credential found in a text, each with its line number. Values are never returned. */
export function findSecrets(text) {
  const findings = [];
  String(text).split(/\r?\n/).forEach((line, i) => {
    for (const [kind, pattern] of rules) if (pattern.test(line)) findings.push({ kind, line: i + 1 });
  });
  return findings;
}
/** A JSON value whose string leaves look like credentials. Reports the key path, not the value. */
export function secretsInValue(value, where = '') {
  // A long opaque token is treated as a key, except hex digests and commit IDs.
  if (typeof value === 'string') return findSecrets(value).length || /^[A-Za-z0-9+/_=-]{40,}$/.test(value) && !/^[a-f0-9]{40,64}$/.test(value) && /\d/.test(value) && /[A-Za-z]/.test(value) ? [where || '(значение)'] : [];
  if (Array.isArray(value)) return value.flatMap((v, i) => secretsInValue(v, `${where}[${i}]`));
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([k, v]) => secretsInValue(v, where ? `${where}.${k}` : k));
  return [];
}
