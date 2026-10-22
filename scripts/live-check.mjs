// Explicit opt-in smoke check; never part of CI and never invents live evidence.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { assert, exec, sha } from '../core/io.mjs';
import { stableJSON } from '../core/resources.mjs';
const args=process.argv.slice(2), enabled=args.includes('--run');
const outIndex=args.indexOf('--out'), output=path.resolve(outIndex<0?'live-check.json':args[outIndex+1]);
const record={schemaVersion:1,at:new Date().toISOString(),kind:'live-codex-smoke',status:'NOT_RUN',platform:process.platform,node:process.version,
  note:'Это живая проверка одного сценария, не рейтинг моделей и не автоматическая приёмка.'};
if(enabled){
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'borshkit-live-'));
  try{
    record.version=(await exec('codex',['--version'],{timeout:15000})).stdout.trim();
    const result=await exec('codex',['exec','--ephemeral','--ignore-user-config','--skip-git-repo-check','--sandbox','read-only','-C',dir,'--json','Ответь только строкой BORSHKIT_LIVE_OK. Не используй инструменты.'],{timeout:120000,maxBuffer:1024*1024});
    const events=result.stdout.split(/\r?\n/).flatMap(line=>{try{return[JSON.parse(line)];}catch{return[];}});
    const messages=events.filter(e=>e.type==='item.completed'&&e.item?.type==='agent_message');
    record.status=messages.at(-1)?.item.text.trim()==='BORSHKIT_LIVE_OK'?'PASS':'FAIL';
    record.outputDigest=sha(result.stdout);record.toolCalls=events.filter(e=>e.type==='item.started'&&e.item?.type==='command_execution').length;
    if(record.toolCalls)record.status='FAIL';
  }catch(error){record.status='UNKNOWN';record.error=String(error.message).slice(0,1000);}
  finally{await fs.rm(dir,{recursive:true,force:true});}
}else record.note+=' Для запуска через существующую подписку: --run; возможен расход квоты.';
record.digest=sha(stableJSON(record));await fs.writeFile(output,JSON.stringify(record,null,2)+'\n',{mode:0o600});
console.log(JSON.stringify(record));
assert(record.status!=='FAIL','Живая проверка не прошла');
