import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import { space, tempDir } from './helpers.mjs';
import { proposeSettings } from '../core/config.mjs';
import { enrollApprovalDevice, createApprovalChallenge, consumeApproval, applyApprovedAction, revokeApprovalDevice } from '../core/approvals.mjs';

const digest = b => crypto.createHash('sha256').update(b).digest();
async function fixture(t) {
  const s = await space(t), store = await tempDir(t), keys = crypto.generateKeyPairSync('ec', { namedCurve:'prime256v1' });
  const descriptor={algorithm:'ES256', origin:'https://approval.example',rpId:'approval.example',credentialId:crypto.randomBytes(32).toString('base64url'),publicKey:keys.publicKey.export({type:'spki',format:'der'}).toString('base64url')};
  await enrollApprovalDevice(s,'phone',descriptor,{store,confirmedByPerson:true});
  const p=await proposeSettings(s,{autopilot:true});
  const challenge=await createApprovalChallenge(s,{deviceId:'phone',action:'apply-settings',target:p.id},{store});
  const sign=(overrides={})=>{
    const client=Buffer.from(JSON.stringify({type:'webauthn.get',challenge:challenge.challenge,origin:descriptor.origin,...overrides.client}));
    const auth=Buffer.concat([digest(overrides.rp??descriptor.rpId),Buffer.from([overrides.flags??5]),Buffer.alloc(4)]);
    return {challengeId:challenge.id,credentialId:descriptor.credentialId,clientDataJSON:client.toString('base64url'),authenticatorData:auth.toString('base64url'),signature:crypto.sign('sha256',Buffer.concat([auth,digest(client)]),keys.privateKey).toString('base64url')};
  };
  return {s,store,challenge,sign,descriptor};
}
test('a registered passkey can apply the exact proposal without a terminal, only once',async t=>{
  const f=await fixture(t); assert.equal(f.s.settings.autopilot,false);
  await applyApprovedAction(f.s,f.sign(),{store:f.store}); assert.equal(f.s.settings.autopilot,true);
  await assert.rejects(consumeApproval(f.s,f.sign(),{store:f.store}),/использовано/);
});
test('signature, origin, RP and user verification are checked before consumption',async t=>{
  const f=await fixture(t), opts={store:f.store};
  for(const change of [{client:{origin:'https://evil.example'}},{client:{challenge:'wrong'}},{rp:'evil.example'},{flags:1}]) await assert.rejects(consumeApproval(f.s,f.sign(change),opts));
  const bad=f.sign();bad.signature=crypto.randomBytes(70).toString('base64url');await assert.rejects(consumeApproval(f.s,bad,opts),/Подпись/);
  await consumeApproval(f.s,f.sign(),opts);
});
test('expired, revoked and other-project challenges are rejected',async t=>{
  const f=await fixture(t);
  await assert.rejects(consumeApproval(f.s,f.sign(),{store:f.store,now:new Date(Date.parse(f.challenge.expiresAt)+1)}),/истекло/);
  const other=await space(t);await assert.rejects(consumeApproval(other,f.sign(),{store:f.store}),/другому/);
  await revokeApprovalDevice(f.s,'phone',{store:f.store,confirmedByPerson:true});
  await assert.rejects(consumeApproval(f.s,f.sign(),{store:f.store}),/отозвано/);
});
test('untrusted enrollment and storage inside the project are refused',async t=>{
  const f=await fixture(t);
  await assert.rejects(enrollApprovalDevice(f.s,'second',f.descriptor,{store:f.store}),/владелец/);
  await assert.rejects(enrollApprovalDevice(f.s,'second',f.descriptor,{store:path.join(f.s.project,'trust'),confirmedByPerson:true}),/вне проекта/);
});
test('concurrent consumption cannot apply one approval twice',async t=>{
  const f=await fixture(t), results=await Promise.allSettled([consumeApproval(f.s,f.sign(),{store:f.store}),consumeApproval(f.s,f.sign(),{store:f.store})]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
});
test('editing the approved proposal invalidates a signature even if its base settings still match',async t=>{
  const f=await fixture(t),file=path.join(f.s.dir,'settings','proposals',`${f.challenge.target}.json`);
  const p=JSON.parse(await fs.readFile(file));p.reason='changed after preview';await fs.writeFile(file,JSON.stringify(p));
  await assert.rejects(applyApprovedAction(f.s,f.sign(),{store:f.store}),/изменилось/);
  assert.equal(f.s.settings.autopilot,false);
});
