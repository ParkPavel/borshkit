import { findSecrets } from './secrets.mjs';

// Privacy modes (decision D2): how much may leave the machine.
export const STRICTNESS = { experiment: 0, moderate: 1, strict: 2 };
const DATA_RANK = { local: 0, 'no-train': 1, unknown: 2, trains: 2 };
export const PRIVACY_WORDS = { moderate: 'умеренный', strict: 'строгий', experiment: 'эксперимент' };

/**
 * Environment for a child process an executor runs in: only what the process
 * itself needs, never the project's secrets. Claudex passed the whole parent
 * environment to providers; Borshkit passes an allowlist plus names the
 * executor declares (its own login, for example).
 */
const BASE_ENV = /^(PATH|PATHEXT|HOME|USERPROFILE|APPDATA|LOCALAPPDATA|SYSTEMROOT|SYSTEMDRIVE|COMSPEC|WINDIR|TEMP|TMP|TMPDIR|LANG|LANGUAGE|LC_[A-Z]+|TERM|COLORTERM|TZ|SHELL|USER|USERNAME|LOGNAME|XDG_[A-Z_]+|HTTPS?_PROXY|NO_PROXY|https?_proxy|no_proxy|NODE_EXTRA_CA_CERTS|SSL_CERT_FILE)$/;
export function childEnv(env = process.env, allow = []) {
  const extra = new Set(allow);
  return Object.fromEntries(Object.entries(env).filter(([name]) => BASE_ENV.test(name) || extra.has(name)));
}
/** Names (never values) of environment variables that look like credentials. */
export const KEYLIKE = /(KEY|TOKEN|SECRET|PASSWORD|PASSWD|CREDENTIAL|COOKIE|AUTH)/i;
export const keyLikeNames = (env = process.env) => Object.keys(env).filter(name => KEYLIKE.test(name)).sort();

// Personal data a regular expression can see. It misses a lot; the guarantee is
// only for these formats and for paths the project declares as personal.
const PII = [
  ['email', /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/],
  ['phone', /(?:^|[\s(])\+?\d[\d\s()-]{9,}\d(?=$|[\s),.;])/],
];
function luhn(digits) {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}
/**
 * What a payload about to leave the machine contains. Secrets block in every
 * mode except the experiment, where they are recorded for revocation instead;
 * personal data blocks in the moderate and strict modes.
 */
export function outboundFindings(text, mode) {
  const findings = findSecrets(text).map(f => ({ ...f, action: mode === 'experiment' ? 'record' : 'block' }));
  if (mode === 'experiment') return findings;
  String(text).split(/\r?\n/).forEach((line, i) => {
    for (const [kind, pattern] of PII) if (pattern.test(line)) findings.push({ kind, line: i + 1, action: 'block' });
    for (const m of line.matchAll(/\b(?:\d[ -]?){13,19}\b/g)) {
      const digits = m[0].replace(/\D/g, '');
      if (digits.length >= 13 && luhn(digits)) findings.push({ kind: 'card-number', line: i + 1, action: 'block' });
    }
  });
  return findings;
}
/**
 * Which changes to the settings weaken protection. Those are never applied on
 * an agent's word, only on a person's confirmation (decision D1).
 */
export function weakenings(before, after) {
  const out = [];
  if (STRICTNESS[after.privacy] < STRICTNESS[before.privacy]) out.push(`режим приватности: ${PRIVACY_WORDS[before.privacy]} → ${PRIVACY_WORDS[after.privacy]}`);
  if (!before.autopilot && after.autopilot) out.push('включение автопилота: рутинные вопросы будут решаться без тебя');
  if ((before.trustedAgent ?? null) !== (after.trustedAgent ?? null)) out.push(`доверенный агент: ${before.trustedAgent ?? 'нет'} → ${after.trustedAgent ?? 'нет'}`);
  for (const key of ['maxActiveRuns', 'maxActiveTasks', 'tokenBudget', 'usdBudget']) {
    const old = before.execution?.[key], next = after.execution?.[key];
    if (old != null && (next == null || next > old)) out.push(`предел execution.${key}: ${old} → ${next ?? 'без предела'}`);
  }
  if (JSON.stringify(before.execution?.rates ?? {}) !== JSON.stringify(after.execution?.rates ?? {})) out.push('тарифы моделей изменены — проверь источник и срок');
  for (const [tag, goal] of Object.entries(after.acceptance?.modelTrust ?? {})) {
    const old = before.acceptance?.modelTrust?.[tag];
    if (!old) out.push(`новая цель доверия «${tag}»: модель сможет закрывать такие критерии сама`);
    else if (goal.maxFalsePassRate > old.maxFalsePassRate) out.push(`цель доверия «${tag}»: допустимая доля ложных «готово» ${old.maxFalsePassRate} → ${goal.maxFalsePassRate}`);
    else if (JSON.stringify(goal.measured ?? null) !== JSON.stringify(old.measured ?? null)) out.push(`цель доверия «${tag}»: новое измерение`);
  }
  for (const [id, e] of Object.entries(after.executors ?? {})) {
    const old = before.executors?.[id];
    if (!old) out.push(`новый исполнитель «${id}» (${e.kind}, данные: ${e.dataPolicy})`);
    else if (DATA_RANK[e.dataPolicy] > DATA_RANK[old.dataPolicy] || JSON.stringify({ ...e, model: 0, effort: 0 }) !== JSON.stringify({ ...old, model: 0, effort: 0 })) out.push(`исполнитель «${id}» изменён`);
  }
  for (const [name, pool] of Object.entries(after.pools ?? {})) {
    if (before.pools?.[name]?.qualificationRequired && !pool.qualificationRequired) out.push(`пул «${name}»: отключена проверка пригодности роли`);
    const old = before.pools?.[name]?.members ?? [];
    const added = pool.members.filter(m => !old.includes(m));
    if (added.length) out.push(`пул «${name}»: добавлены ${added.join(', ')}`);
    if ((pool.maxSwitches ?? 3) > (before.pools?.[name]?.maxSwitches ?? 3)) out.push(`пул «${name}»: больше переключений`);
  }
  if (after.folder !== before.folder) out.push('смена папки пространства');
  return out;
}
