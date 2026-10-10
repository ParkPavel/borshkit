import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { space } from './helpers.mjs';
import { exportInstructions,HOST_FILES } from '../core/integrations.mjs';
test('all host formats export instructions, preserve user edits and never start jobs',async t=>{
  const s=await space(t), before=JSON.stringify(s.settings);
  for(const host of Object.keys(HOST_FILES)) {const r=await exportInstructions(s,host);await exportInstructions(s,host);await fs.appendFile(r.file,'\nCustom instructions');await assert.rejects(exportInstructions(s,host),/собственные/);}
  assert.equal(JSON.stringify(s.settings),before);
  assert.match(await fs.readFile(path.join(s.project,'GEMINI.md'),'utf8'),/Голос/);
});
