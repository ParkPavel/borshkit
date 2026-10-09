import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { tempDir } from './helpers.mjs';
import { startExecutor } from '../core/adapters.mjs';
const executor={kind:'gemini-api',baseUrl:'https://fixture.example/v1beta/',model:'fixture-model',apiKeyEnv:'FIXTURE_KEY'};
const opts={executor,prompt:'Task',schema:{type:'object'},timeoutMs:1000,image:false,onEvent:()=>{},env:{FIXTURE_KEY:'fixture'}};
test('Gemini API sends no tools, uses header credentials, limits output and records usage',async()=>{
  let request;
  const h=await startExecutor({...opts,maxOutputTokens:50,fetchImpl:async(url,options)=>{request={url,...options};return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:'{"ok":true}'}]}}],usageMetadata:{promptTokenCount:3,candidatesTokenCount:4,thoughtsTokenCount:2}}));}});
  const r=await h.done;assert.equal(r.ok,true);assert.deepEqual(r.usage,{input_tokens:3,output_tokens:6});
  assert.equal(request.headers['x-goog-api-key'],'fixture');assert.equal(request.url.includes('fixture'),true);
  const body=JSON.parse(request.body);assert.equal(body.tools,undefined);assert.equal(body.generationConfig.maxOutputTokens,50);
});
test('Gemini image output, quotas, truncated output and function calls remain distinct',async()=>{
  const respond=data=>async()=>new Response(JSON.stringify(data));
  let h=await startExecutor({...opts,image:true,fetchImpl:respond({candidates:[{finishReason:'STOP',content:{parts:[{inlineData:{mimeType:'image/png',data:'fixture'}}]}}]})});assert.equal((await h.done).result.imageBase64,'fixture');
  for(const data of [{candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'{}'}]}}]},{candidates:[{finishReason:'STOP',content:{parts:[{functionCall:{name:'write'}}]}}]}]) {h=await startExecutor({...opts,fetchImpl:respond(data)});assert.equal((await h.done).ok,false);}
  h=await startExecutor({...opts,fetchImpl:async()=>new Response('limit',{status:429})});assert.equal((await h.done).failure,'QUOTA');
});
test('Gemini CLI uses deny-all policy and refuses a silently substituted model',async t=>{
  const dir=await tempDir(t),answer={summary:'ok',files:[],writes:[],unknowns:[]};
  // A local fixture sees the actual adapter argv, without a provider call.
  const code=String.raw`const fs=require('fs');const args=process.argv.slice(1);if(!args.includes('--sandbox')||!args.includes('--policy')||!fs.readFileSync(args[args.indexOf('--policy')+1],'utf8').includes('decision = "deny"'))process.exit(2);fs.writeSync(1,JSON.stringify({type:'init',model:'fixture-model'})+'\n');fs.writeSync(1,JSON.stringify({type:'message',role:'assistant',content:${JSON.stringify(JSON.stringify(answer))}})+'\n');fs.writeSync(1,JSON.stringify({type:'result',status:'success',stats:{input_tokens:3,output_tokens:4}})+'\n');`;
  const wrapper=path.join(dir,'fixture.cjs');await (await import('node:fs/promises')).writeFile(wrapper,code);
  // A direct Node entry point works without a shell on every supported OS.
  const fs=await import('node:fs/promises');
  const h=await startExecutor({...opts,executor:{kind:'gemini-cli',command:wrapper,model:'fixture-model'},cwd:dir,scratch:path.join(dir,'scratch')});
  const result=await h.done;assert.equal(result.ok,true,JSON.stringify(result));
  await fs.writeFile(wrapper,code.replace("model:'fixture-model'","model:'different-model'"));
  const bad=await startExecutor({...opts,executor:{kind:'gemini-cli',command:wrapper,model:'fixture-model'},cwd:dir,scratch:path.join(dir,'scratch')});assert.equal((await bad.done).ok,false);
});
