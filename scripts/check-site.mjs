import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { ROOT,buildSite } from './site.mjs';
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'borsh-site-check-'));
async function fingerprint(dir,prefix=''){const out=[];for(const e of (await fs.readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name,'en'))){const f=path.join(dir,e.name),key=prefix+e.name;if(e.isDirectory())out.push(...await fingerprint(f,key+'/'));else out.push([key,createHash('sha256').update(await fs.readFile(f)).digest('hex')]);}return out;}
try{
  const built=await buildSite(path.join(temp,'read'));
  for(const dir of ['read','media']){const actual=await fingerprint(path.join(ROOT,'docs',dir)),expected=await fingerprint(path.join(temp,dir));if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error(`docs/${dir} устарел: выполни npm run site и сохрани результат`);}
  console.log(`Документация актуальна: ${built.pages} страниц, Markdown и изображения совпадают со сборкой.`);
}finally{await fs.rm(temp,{recursive:true,force:true});}
