import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { acquireLock, assert, atomicJSON, exists, readJSON, ROOT, sha } from './io.mjs';
import { openSpace } from './space.mjs';
import { childEnv } from './privacy.mjs';
import { planTeam, proposeTeam, writeTeamFiles } from './team.mjs';
import { writeStatusFiles } from './dispatch.mjs';
import { recoverExecution } from './operations.mjs';
import { stableJSON } from './resources.mjs';

const file = s => path.join(s.state, 'monitor.json');
const stopFile = s => path.join(s.state, 'monitor-stop.json');
const alive = pid => { try { process.kill(pid,0);return true; } catch(e){return e.code==='EPERM';} };
export async function monitorStatus(s) {
  const state = await readJSON(file(s)).catch(()=>null);
  return state ? {...state, state:state.state==='RUNNING' && !alive(state.pid) ? 'INTERRUPTED' : state.state} : {state:'NOT_STARTED'};
}
export async function monitorPulse(space, { taskId, roles, suggest = false, previousDigest = null } = {}) {
  // Reload applied settings each cycle; never use cached quota as current.
  space = await openSpace(space.project, {folder:space.settings.folder});
  await recoverExecution(space); await writeTeamFiles(space); await writeStatusFiles(space);
  if (!taskId) return {at:new Date().toISOString(), status:'OBSERVED', digest:null, proposal:null};
  const plan=await planTeam(space,{taskId,roles});
  const digest=sha(stableJSON({settings:space.settings,taskId,rows:plan.rows}));
  const currentPools=Object.fromEntries(plan.rows.map(r=>[`team-${r.role}`,space.settings.pools[`team-${r.role}`]?.members??[]]));
  const desiredPools=Object.fromEntries(plan.rows.map(r=>[`team-${r.role}`,r.members]));
  const changed=stableJSON(currentPools)!==stableJSON(desiredPools);
  const proposal=suggest && changed && digest!==previousDigest && plan.status==='PROPOSED' ? (await proposeTeam(space,{taskId,roles},{from:'монитор состояния'})).proposal.id : null;
  return {at:new Date().toISOString(),status:plan.status,digest,proposal,plan};
}
export async function runMonitor(space, { intervalMs=30000, maxCycles=120, taskId, roles, suggest=false, token=crypto.randomUUID(), onPulse=()=>{} } = {}) {
  assert(Number.isInteger(intervalMs) && intervalMs>=1000 && intervalMs<=3600000 && Number.isInteger(maxCycles) && maxCycles>=1 && maxCycles<=1440,'Монитор: intervalMs 1000..3600000; maxCycles 1..1440');
  const release=await acquireLock(path.join(space.state,'monitor.lock'),{busy:'Монитор уже работает'});
  const state={schemaVersion:1,state:'RUNNING',pid:process.pid,token,startedAt:new Date().toISOString(),cycle:0,intervalMs,maxCycles,taskId:taskId??null,suggest};
  let previousDigest=null, wake;
  const stop=()=>{state.state='STOPPING';wake?.();};
  process.on('SIGINT',stop);process.on('SIGTERM',stop);
  try {
    await atomicJSON(file(space),state);
    while(state.cycle<maxCycles && state.state==='RUNNING') {
      const request=await readJSON(stopFile(space)).catch(()=>null);
      if(request?.token===token) break;
      try { state.last=await monitorPulse(space,{taskId,roles,suggest,previousDigest}); previousDigest=state.last.digest; state.error=null; }
      catch(e){state.error=e.message;state.last={at:new Date().toISOString(),status:'ERROR'};}
      state.cycle++; await atomicJSON(file(space),state);await onPulse({...state});
      if(state.cycle<maxCycles && state.state==='RUNNING') await new Promise(resolve=>{
        const timer=setTimeout(resolve,intervalMs);wake=()=>{clearTimeout(timer);resolve();};
      });
    }
    state.state='STOPPED';state.stoppedAt=new Date().toISOString();await atomicJSON(file(space),state);return state;
  } finally {process.off('SIGINT',stop);process.off('SIGTERM',stop);await release();}
}
export async function startMonitor(space, options={}) {
  const status=await monitorStatus(space);assert(status.state!=='RUNNING','Монитор уже запущен');
  const token=crypto.randomUUID();
  const child=spawn(process.execPath,[path.join(ROOT,'bin','monitor-worker.mjs'),space.project,space.settings.folder,JSON.stringify({...options,token})],{
    cwd:space.project,env:childEnv(),detached:true,windowsHide:true,stdio:'ignore'});
  await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});child.unref();
  for(let i=0;i<100;i++) {const current=await monitorStatus(space);if(current.token===token)return current;await new Promise(r=>setTimeout(r,50));}
  throw Error('Монитор не подтвердил запуск; проверь состояние. Автозапуска работ нет.');
}
export async function stopMonitor(space) {
  const state=await monitorStatus(space);
  if(state.state!=='RUNNING')return state;
  await atomicJSON(stopFile(space),{token:state.token,at:new Date().toISOString()});
  return {...state,state:'STOP_REQUESTED',note:'Остановка будет подтверждена после текущего цикла; чужие PID не завершаются.'};
}
