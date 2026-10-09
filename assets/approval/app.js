/* Public key material only. Private keys stay in the authenticator. */
const el = id => document.getElementById(id);
const encode = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const decode = s => Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')), c => c.charCodeAt(0));
let current = null;
async function post(url, data) { const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }); const v = await r.json(); if(!r.ok) throw Error(v.error); return v; }
function show(e) { el('details').textContent = String(e.message ?? e); }
fetch('/devices').then(r => r.json()).then(ds => ds.forEach(d => { const o = document.createElement('option'); o.value=d.id; o.textContent=d.id; el('device').append(o); })).catch(show);
for(const id of ['device','action','target','option']) el(id).addEventListener('input', () => { current=null; el('approve').disabled=true; });
el('preview').onclick = async () => { current=null; el('approve').disabled=true; try {
  current=await post('/challenge',{deviceId:el('device').value,action:el('action').value,target:el('target').value,option:el('option').value||null});
  el('details').textContent=[current.description,JSON.stringify(current.changes,null,2),...current.weakens,`Действует до ${current.expiresAt}`,`Отпечаток: ${current.targetDigest}`].join('\n'); el('approve').disabled=false;
} catch(e){show(e);} };
el('approve').onclick = async () => { const c=current; current=null; el('approve').disabled=true; try {
  if(!c) throw Error('Сначала покажи действие');
  const a=await navigator.credentials.get({publicKey:{challenge:decode(c.challenge),rpId:c.rpId,allowCredentials:[{type:'public-key',id:decode(c.credentialId)}],userVerification:'required',timeout:120000}});
  await post('/apply',{challengeId:c.id,credentialId:encode(a.rawId),clientDataJSON:encode(a.response.clientDataJSON),authenticatorData:encode(a.response.authenticatorData),signature:encode(a.response.signature)});
  show('Применено. Работа автоматически не запускается.');
} catch(e){show(e);} };
el('pair').onclick = async () => { try {
  const a=await navigator.credentials.create({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),rp:{name:'Borshkit',id:location.hostname},user:{id:crypto.getRandomValues(new Uint8Array(32)),name:'owner',displayName:'Владелец'},pubKeyCredParams:[{type:'public-key',alg:-7}],authenticatorSelection:{userVerification:'required'},timeout:120000,attestation:'none'}});
  if(!a.response.getPublicKey) throw Error('Браузер не поддерживает экспорт SPKI; используй актуальный браузер');
  const descriptor={algorithm:'ES256',origin:location.origin,rpId:location.hostname,credentialId:encode(a.rawId),publicKey:encode(a.response.getPublicKey())};
  const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([JSON.stringify(descriptor,null,2)],{type:'application/json'}));link.download='borshkit-device.json';link.click();URL.revokeObjectURL(link.href);show('Публичный файл создан. Доверенная регистрация ещё требуется.');
} catch(e){show(e);} };
