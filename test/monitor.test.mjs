import test from 'node:test';
import assert from 'node:assert/strict';
import { space } from './helpers.mjs';
import { exists } from '../core/io.mjs';
import { monitorPulse, monitorStatus, runMonitor, startMonitor, stopMonitor } from '../core/monitor.mjs';
test('initialization never starts a monitor and one cycle only observes',async t=>{
  const s=await space(t), before=JSON.stringify(s.settings);
  assert.equal((await monitorStatus(s)).state,'NOT_STARTED');
  assert.equal((await monitorPulse(s)).status,'OBSERVED');
  assert.equal(JSON.stringify(s.settings),before);
  assert.equal(await exists(s.dir+'/jobs'),false);
});
test('an explicitly started background worker reports its PID and acknowledges stop',async t=>{
  const s=await space(t), started=await startMonitor(s,{maxCycles:2,intervalMs:1000});
  assert.equal(started.state,'RUNNING');assert.notEqual(started.pid,process.pid);
  await stopMonitor(s);
  let final;
  for(let i=0;i<40;i++){final=await monitorStatus(s);if(final.state==='STOPPED')break;await new Promise(r=>setTimeout(r,100));}
  assert.equal(final.state,'STOPPED');
});
test('a bounded monitor acknowledges a cooperative stop and releases its lock',async t=>{
  const s=await space(t);
  const r=await runMonitor(s,{maxCycles:3,intervalMs:1000,onPulse:async()=>{assert.equal((await stopMonitor(s)).state,'STOP_REQUESTED');}});
  assert.equal(r.state,'STOPPED');assert.equal(r.cycle,1);
  assert.equal((await monitorStatus(s)).state,'STOPPED');
  assert.equal(await exists(s.state+'/monitor.lock'),false);
});
