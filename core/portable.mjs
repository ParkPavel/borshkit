import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { assert, atomicJSON, atomicWrite, contained, exists, git, readJSON, ROOT, sha } from './io.mjs';
import { relative } from './contract.mjs';
import { findSecrets } from './secrets.mjs';
import { proposeSettings } from './config.mjs';
import { stableJSON } from './resources.mjs';

const MAX=32*1024*1024;
function safeFile(p, folder) {
  return typeof p==='string' && relative(p) && p!=='.' && !p.includes('\\') && !p.split('/').some(s=>!s || s.startsWith('.'))
    && p.split('/')[0]!==folder && !/\.(pem|key|p12|pfx)$/i.test(p);
}
function cleanSettings(settings) {
  const executors=Object.fromEntries(Object.entries(settings.executors).map(([id,e])=>{const {qualifications,...clean}=e;return [id,clean];}));
  const execution=settings.execution ? {...settings.execution,rates:{}} : undefined;
  return {privacy:settings.privacy,executors,pools:settings.pools,...(execution?{execution}:{})};
}
/** Explicit source inputs, never .git, credentials, processes or machine-local
 * acceptance. Model output is not deterministic across devices/reruns. */
export async function exportPortable(space, paths, out) {
  assert(Array.isArray(paths) && paths.length && new Set(paths).size===paths.length,'Укажи явный список файлов проекта');
  const files=[];let bytes=0;
  for(const name of paths) {
    assert(safeFile(name,space.settings.folder),'Экспорт допускает обычные явные файлы проекта без скрытых папок и ключей');
    const file=path.resolve(space.project,name), stat=await fs.lstat(file);
    assert(stat.isFile() && !stat.isSymbolicLink(),'Ссылки и специальные файлы не экспортируются');
    await contained(space.project,file);
    assert(stat.size<=MAX-bytes,'Переносимый набор ограничен 32 MiB');
    const content=await fs.readFile(file);bytes+=content.length;
    assert(!findSecrets(content.toString('utf8')).length,`В ${name} обнаружен возможный секрет`);
    files.push({path:name,digest:sha(content),content:content.toString('base64'),mode:stat.mode&0o111?0o755:0o644});
  }
  const pkg=await readJSON(path.join(ROOT,'package.json'));
  const payload={schemaVersion:1,version:pkg.version,at:new Date().toISOString(),runtime:{node:process.version,platform:process.platform},
    sourceCommit:await git(space.project,['rev-parse','HEAD']).then(s=>s.trim(),()=>null),settingsTemplate:cleanSettings(space.settings),files,
    note:'Пробы, квалификации, приёмка, устройства, фоновые процессы и секреты не переносятся. На новой машине нужны новые проверки.'};
  const capsule={...payload,digest:sha(stableJSON(payload))};
  assert(!findSecrets(JSON.stringify(capsule.settingsTemplate)).length,'Шаблон настроек содержит возможный секрет');
  await atomicJSON(path.resolve(out),capsule);return {file:path.resolve(out),digest:capsule.digest,files:files.length,bytes};
}
export async function importPortable(space, source) {
  const stat=await fs.stat(source);assert(stat.size<=MAX*1.5,'Переносимый набор слишком большой');
  const capsule=await readJSON(source),{digest,...payload}=capsule;
  assert(capsule.schemaVersion===1 && digest===sha(stableJSON(payload)) && Array.isArray(capsule.files) && capsule.files.length,'Не совпала целостность переносимого набора');
  assert(new Set(capsule.files.map(f=>f.path)).size===capsule.files.length,'Повторяющиеся пути набора');
  assert(!findSecrets(JSON.stringify(capsule.settingsTemplate)).length,'Шаблон содержит возможный секрет');
  const planned=[];let total=0;
  for(const f of capsule.files) {
    assert(safeFile(f.path,space.settings.folder) && [0o644,0o755].includes(f.mode) && typeof f.content==='string','Недопустимый путь или режим файла');
    const content=Buffer.from(f.content,'base64');total+=content.length;
    assert(total<=MAX && content.toString('base64')===f.content && sha(content)===f.digest && !findSecrets(content.toString('utf8')).length,'Повреждён файл или обнаружен возможный секрет');
    const target=await contained(space.project,path.resolve(space.project,f.path));
    assert(!await exists(target),'Импорт не перезаписывает существующие файлы');planned.push({target,content,mode:f.mode});
  }
  // Validate/propose before writing any source. This is never applied on import.
  const template=cleanSettings({executors:capsule.settingsTemplate.executors??{},pools:capsule.settingsTemplate.pools??{},...capsule.settingsTemplate});
  const proposal=stableJSON(template)===stableJSON(cleanSettings(space.settings)) ? null : await proposeSettings(space,template,{reason:`переносимый набор ${digest}: повторная проверка новой машины обязательна`});
  const created=[];
  try {
    for(const p of planned) {await fs.mkdir(path.dirname(p.target),{recursive:true});await fs.writeFile(p.target,p.content,{flag:'wx',mode:p.mode});created.push(p.target);}
  } catch(e) {for(const file of created)await fs.rm(file,{force:true});throw e;}
  const record={id:crypto.randomUUID(),digest,at:new Date().toISOString(),files:capsule.files.map(f=>({path:f.path,digest:f.digest})),proposal:proposal?.id??null,
    state:'IMPORTED_UNVERIFIED',note:capsule.note};
  await atomicJSON(path.join(space.dir,'portable',`${record.id}.json`),record);return record;
}
