import fs from 'node:fs/promises';
import path from 'node:path';
import { git,ROOT,sha } from '../core/io.mjs';
const files=process.argv.slice(2);
if(!files.length)throw Error('Укажи архивы для checksum и сведений сборки');
const pkg=JSON.parse(await fs.readFile(path.join(ROOT,'package.json')));
const subjects=[];
for(const file of files){const bytes=await fs.readFile(file);subjects.push({name:path.basename(file),sha256:sha(bytes),bytes:bytes.length});}
const record={schemaVersion:1,version:pkg.version,source:{repository:pkg.repository.url,commit:(await git(ROOT,['rev-parse','HEAD'])).trim(),tree:(await git(ROOT,['write-tree'])).trim(),dirty:Boolean((await git(ROOT,['status','--porcelain'])).trim())},
  runtime:{node:process.version,platform:process.platform,arch:process.arch},subjects,
  assurance:'Локальный отчёт и checksum не являются подписью. GitHub attestation создаётся отдельно в workflow выпуска.'};
await fs.writeFile(path.resolve(path.dirname(files[0]),'build-provenance.json'),JSON.stringify(record,null,2)+'\n');
await fs.writeFile(path.resolve(path.dirname(files[0]),'SHA256SUMS'),subjects.map(s=>`${s.sha256}  ${s.name}`).join('\n')+'\n');
console.log(JSON.stringify(record));
