const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');

// Self-contained fixture (same harness pattern as tests/auth-profile-races.test.js):
// real auth.js / profile.js / account.js are evaluated in jsdom; only the network
// boundary (fetch) and Supabase SDK are synthetic, with manually released promises.
const root = path.resolve(__dirname, '..');
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() { let resolve, reject; const promise = new Promise((a,b) => {resolve=a;reject=b;}); return {promise,resolve,reject}; }
function response(value, status=200) { return new Response(JSON.stringify(value), {status,headers:{'Content-Type':'application/json'}}); }
function fixture(html='') {
  const dom = new JSDOM(html, {url:'https://fixture.example.invalid/account.html',runScripts:'outside-only'});
  const w=dom.window;
  Object.defineProperty(w.document,'readyState',{value:'complete',configurable:true});
  w.MPW_COMMENTS_CONFIG={API_BASE:'https://api.example.invalid',SUPABASE_URL:'https://auth.example.invalid',SUPABASE_ANON_KEY:'synthetic-public'};
  const load=name=>w.eval(fs.readFileSync(path.join(root,'js',name),'utf8'));
  return {dom,w,load};
}
const user = id => ({id,email:`${id}@example.invalid`,aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'});
const session = id => ({user:user(id),access_token:`synthetic-${id}`,refresh_token:'synthetic-refresh',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600});
const accountHtml = fs.readFileSync(path.join(root,'account.html'),'utf8');

function accountFixture(){
  const f=fixture(accountHtml);let current=session('user-a');const listeners=[];const requests=[];
  f.w.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:current}}),onAuthStateChange:cb=>{listeners.push(cb);return {data:{subscription:{unsubscribe(){}}}}},
    signOut:async()=>{current=null;listeners.forEach(cb=>cb('SIGNED_OUT',null));return {error:null}},
    signInWithPassword:async()=>{current=session('user-b');listeners.forEach(cb=>cb('SIGNED_IN',current));return {data:{session:current},error:null}}
  }})};
  f.w.fetch=(url,init)=>{const d=deferred();requests.push({url,init,...d});return d.promise};
  f.load('auth.js');f.load('profile.js');f.load('account.js');
  return {...f,requests,listeners};
}

function typeInto(w, value) {
  const field = w.document.getElementById('accountDisplayName');
  field.value = value;
  field.dispatchEvent(new w.Event('input'));
}

test('initial GET completion keeps a newer typed draft', async () => {
  const {dom,w,requests}=accountFixture();await tick();
  assert.equal(requests.length,1);
  typeInto(w,'New typed name');
  requests[0].resolve(response({success:true,profile:{id:'user-a',displayName:'Original Name'}}));await tick();
  const field=w.document.getElementById('accountDisplayName');
  assert.equal(field.value,'New typed name','newer typed draft must survive the initial GET backfill');
  assert.equal(w.document.getElementById('accountProfileStatus').textContent,'');
  dom.window.close();
});

test('successful save keeps a newer draft and never calls it saved', async () => {
  const {dom,w,requests}=accountFixture();await tick();
  requests[0].resolve(response({success:true,profile:{id:'user-a',displayName:'Original Name'}}));await tick();
  const field=w.document.getElementById('accountDisplayName');
  typeInto(w,'First Rename');
  w.document.getElementById('accountProfileForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();
  assert.equal(JSON.parse(requests[1].init.body).displayName,'First Rename');
  typeInto(w,'Second Draft');
  requests[1].resolve(response({success:true,profile:{id:'user-a',displayName:'First Rename'}}));await tick();
  assert.equal(field.value,'Second Draft','newer draft must survive the save completion');
  assert.equal(w.document.getElementById('accountProfileSave').disabled,false,'save button must be re-enabled');
  assert.equal(w.MPWProfile.getCachedProfile().displayName,'First Rename','trusted saved baseline must update');
  assert.equal(w.document.getElementById('accountProfileReset').hidden,false,'draft differs from baseline, reset stays visible');
  assert.match(w.document.getElementById('accountProfileStatus').textContent,/未保存/,'status must not claim the newer draft is saved');
  dom.window.close();
});

test('failed save keeps the newer draft and the previous baseline', async () => {
  const {dom,w,requests}=accountFixture();await tick();
  requests[0].resolve(response({success:true,profile:{id:'user-a',displayName:'Original Name'}}));await tick();
  const field=w.document.getElementById('accountDisplayName');
  typeInto(w,'First Rename');
  w.document.getElementById('accountProfileForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();
  typeInto(w,'Second Draft');
  requests[1].resolve(response({success:false,error:'保存失败 / Failed to save'},503));await tick();
  assert.equal(field.value,'Second Draft');
  assert.match(w.document.getElementById('accountProfileStatus').textContent,/保存失败|Failed to save/);
  assert.equal(w.MPWProfile.getCachedProfile().displayName,'Original Name','baseline must stay at the last trusted value');
  dom.window.close();
});

test('ABA edit history is judged by revision, not final text equality (control)', async () => {
  const {dom,w,requests}=accountFixture();await tick();
  requests[0].resolve(response({success:true,profile:{id:'user-a',displayName:'Original Name'}}));await tick();
  const field=w.document.getElementById('accountDisplayName');
  typeInto(w,'First Rename');
  w.document.getElementById('accountProfileForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();
  typeInto(w,'Second Draft');
  typeInto(w,'First Rename');
  requests[1].resolve(response({success:true,profile:{id:'user-a',displayName:'First Rename'}}));await tick();
  assert.equal(field.value,'First Rename');
  assert.equal(w.document.getElementById('accountProfileStatus').textContent,'已保存 Saved','draft equals the new baseline, so it is saved');
  dom.window.close();
});

test('IME composition is not interrupted by a completing GET', async () => {
  const {dom,w,requests}=accountFixture();await tick();
  const field=w.document.getElementById('accountDisplayName');
  field.dispatchEvent(new w.Event('compositionstart'));
  field.value='新';
  field.dispatchEvent(new w.Event('input'));
  requests[0].resolve(response({success:true,profile:{id:'user-a',displayName:'Original Name'}}));await tick();
  assert.equal(field.value,'新','backfill must not cut an in-flight composition');
  field.dispatchEvent(new w.Event('compositionend'));
  assert.equal(field.value,'新');
  assert.equal(w.document.getElementById('accountProfileReset').hidden,false);
  dom.window.close();
});

test('normal flows without later edits behave as before', async () => {
  const {dom,w,requests}=accountFixture();await tick();
  requests[0].resolve(response({success:true,profile:{id:'user-a',displayName:'Original Name'}}));await tick();
  const field=w.document.getElementById('accountDisplayName');
  assert.equal(field.value,'Original Name','plain initial backfill still applies');
  assert.equal(w.document.getElementById('accountProfileReset').hidden,true);
  typeInto(w,'Renamed');
  w.document.getElementById('accountProfileForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();
  requests[1].resolve(response({success:true,profile:{id:'user-a',displayName:'Renamed'}}));await tick();
  assert.equal(field.value,'Renamed');
  assert.equal(w.document.getElementById('accountProfileStatus').textContent,'已保存 Saved');
  assert.equal(w.document.getElementById('accountProfileReset').hidden,true);
  dom.window.close();
});

test('a genuinely new GET after a successful save still refreshes the cached profile', async () => {
  const {dom,w,requests}=accountFixture();await tick();
  requests[0].resolve(response({success:true,profile:{id:'user-a',displayName:'Original Name'}}));await tick();
  typeInto(w,'First Rename');
  w.document.getElementById('accountProfileForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();
  typeInto(w,'Second Draft');
  requests[1].resolve(response({success:true,profile:{id:'user-a',displayName:'First Rename'}}));await tick();
  const loading=w.MPWProfile.loadProfile();await tick();
  requests[2].resolve(response({success:true,profile:{id:'user-a',displayName:'Third Name'}}));await loading;await tick();
  assert.equal(w.MPWProfile.getCachedProfile().displayName,'Third Name','new reads must still be accepted');
  assert.equal(w.document.getElementById('accountDisplayName').value,'Second Draft','unsaved draft is still not clobbered');
  dom.window.close();
});
