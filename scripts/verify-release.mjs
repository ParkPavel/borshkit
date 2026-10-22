// Install the exact tarball and inspect the generated VSIX before publication.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { assert, ROOT, readJSON } from '../core/io.mjs';
import { runCommand } from '../core/process.mjs';
const [tgzArg,vsixArg,outArg]=process.argv.slice(2);
assert(tgzArg&&vsixArg,'Укажи tgz и VSIX');
const tgz=path.resolve(tgzArg),vsix=path.resolve(vsixArg),pkg=await readJSON(path.join(ROOT,'package.json'));
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'borshkit-release-'));
try{
  await runCommand('npm',['install','--prefix',temp,'--ignore-scripts','--no-audit','--no-fund',tgz],{timeout:120000});
  const installed=path.join(temp,'node_modules','borshkit');
  assert((await readJSON(path.join(installed,'package.json'))).version===pkg.version,'Версия установленного архива не совпала');
  const help=(await runCommand(process.execPath,[path.join(installed,'bin','borshkit.mjs'),'помощь'],{timeout:30000})).stdout;
  assert(help.includes('--база')&&help.includes('передача'),'Установленный CLI не содержит новые команды');
  for(const file of ['core/handoff.mjs','core/context-pack.mjs','core/code-map.mjs','core/native.mjs','scripts/live-check.mjs'])await fs.access(path.join(installed,file));
  for(const file of ['.state','settings','journal.md','START-HERE.md','borshkit'])await assertAbsent(path.join(installed,file));
  const bytes=await fs.readFile(vsix),entries=new Map();let offset=0;
  while(offset+30<=bytes.length&&bytes.readUInt32LE(offset)===0x04034b50){
    assert(bytes.readUInt16LE(offset+8)===0,'Ожидался VSIX без сжатия');
    const size=bytes.readUInt32LE(offset+18),nameLength=bytes.readUInt16LE(offset+26),extra=bytes.readUInt16LE(offset+28);
    const name=bytes.subarray(offset+30,offset+30+nameLength).toString(),start=offset+30+nameLength+extra;
    assert(!name.split('/').includes('..')&&start+size<=bytes.length,'Повреждён VSIX');entries.set(name,bytes.subarray(start,start+size));offset=start+size;
  }
  const manifest=JSON.parse(entries.get('extension/package.json'));
  assert(manifest.version===pkg.version&&entries.has('extension/native.cjs')&&entries.has('extension/runtime/core/handoff.mjs'),'VSIX не содержит актуальную нативную интеграцию');
  const report={schemaVersion:1,version:pkg.version,status:'PASS',cliInstalled:true,nativeVsix:true,vsixEntries:entries.size,at:new Date().toISOString()};
  if(outArg)await fs.writeFile(path.resolve(outArg),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await fs.rm(temp,{recursive:true,force:true,maxRetries:10,retryDelay:100});}
async function assertAbsent(file){try{await fs.access(file);}catch(e){if(e.code==='ENOENT')return;throw e;}throw Error('Локальный служебный файл попал в архив');}
