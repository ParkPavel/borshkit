// Fast static checks a contributor runs before the tests: every module parses,
// the example contract is valid, and no tracked file carries a credential.
import fs from 'node:fs/promises';
import path from 'node:path';
import { ROOT, exec, git, readJSON } from '../core/io.mjs';
import { validateContract } from '../core/contract.mjs';
import { findSecrets } from '../core/secrets.mjs';

const problems = [];
const files = (await git(ROOT, ['ls-files', '-z', '--cached', '--others', '--exclude-standard'])).split('\0').filter(Boolean);
for (const file of files.filter(f => /\.(mjs|cjs|js)$/.test(f))) {
  try { await exec(process.execPath, ['--check', path.join(ROOT, file)]); }
  catch (e) { problems.push(`${file}: не разбирается — ${e.stderr || e.message}`); }
}
try { validateContract(await readJSON(path.join(ROOT, 'examples', 'contract.json'))); }
catch (e) { problems.push(`examples/contract.json: ${e.message}`); }
for (const file of files) {
  const bytes = await fs.readFile(path.join(ROOT, file)).catch(() => null);
  if (!bytes || bytes.includes(0)) continue;
  for (const f of findSecrets(bytes.toString('utf8'))) problems.push(`${file}:${f.line}: похоже на секрет (${f.kind})`);
}
const pkg = await readJSON(path.join(ROOT, 'package.json'));
if (pkg.dependencies && Object.keys(pkg.dependencies).length) problems.push('package.json: у ядра не должно быть зависимостей времени выполнения');
if (problems.length) { console.error(problems.join('\n')); process.exitCode = 1; }
else console.log(`Статические проверки пройдены: ${files.length} файлов.`);
