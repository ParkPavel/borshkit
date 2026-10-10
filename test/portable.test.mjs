import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { space,tempDir } from './helpers.mjs';
import { exportPortable,importPortable } from '../core/portable.mjs';
test('explicit inputs transfer intact without applying settings or carrying machine evidence',async t=>{
  const s=await space(t), target=await space(t), out=path.join(await tempDir(t),'capsule.json');
  await exportPortable(s,['src/app.js'],out);
  await fs.rm(path.join(target.project,'src/app.js'));
  const before=JSON.stringify(target.settings), r=await importPortable(target,out);
  assert.equal(r.state,'IMPORTED_UNVERIFIED');assert.equal(JSON.stringify(target.settings),before);
  assert.equal(await fs.readFile(path.join(target.project,'src/app.js'),'utf8'),'export const answer = 42;\n');
  const capsule=JSON.parse(await fs.readFile(out));assert.equal(capsule.settingsTemplate.autopilot,undefined);
});
test('tampering, hidden files and collisions fail before overwriting the project',async t=>{
  const s=await space(t), out=path.join(await tempDir(t),'capsule.json');
  await assert.rejects(exportPortable(s,['.git/config'],out),/обычные/);
  await exportPortable(s,['src/app.js'],out);await assert.rejects(importPortable(s,out),/перезаписывает/);
  const capsule=JSON.parse(await fs.readFile(out));capsule.files[0].content='';await fs.writeFile(out,JSON.stringify(capsule));
  await assert.rejects(importPortable(s,out),/целостность/);
});
