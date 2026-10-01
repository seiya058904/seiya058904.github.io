const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { JSDOM } = require('jsdom');
const { createClient } = require('@supabase/supabase-js');
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

for(const status of [503,401,204]) test(`full pinned SDK + auth.js logout ${status}`,async()=>{
  const {dom,w,load}=fixture();const values=new Map();let token;
  const client=createClient('https://auth.example.invalid','synthetic-public',{auth:{storage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)},autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:async(url,init)=>{
    if(String(url).includes('/logout')){token=new Headers(init.headers).get('Authorization');return status===204?new Response(null,{status}):response({message:'Synthetic failure'},status);}
    return response(session('user-a'));
  }}});
  await client.auth.signInWithPassword({email:'a@example.invalid',password:'synthetic-password'});
  w.supabase={createClient:()=>client};load('auth.js');await tick();
  if(status===503) await assert.rejects(w.MPWAuth.signOut()); else await w.MPWAuth.signOut();
  assert.equal(Boolean(w.MPWAuth.getCurrentUser()),status===503);
  assert.equal(Boolean((await client.auth.getSession()).data.session),status===503);
  assert.equal(token,'Bearer synthetic-user-a');client.auth.stopAutoRefresh();dom.window.close();
});

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

test('late A profile cannot block or contaminate B account after actual logout/login',async()=>{
  const {dom,w,requests}=accountFixture();await tick();
  assert.equal(requests.length,1);
  w.document.getElementById('accountSignOut').click();await tick();
  await w.MPWAuth.signIn('b@example.invalid','synthetic-password');await tick();
  assert.equal(requests.length,2,'B must start its own GET while A is pending');
  requests[1].resolve(response({success:true,profile:{id:'user-b',displayName:'Bob'}}));await tick();
  requests[0].resolve(response({success:true,profile:{id:'user-a',displayName:'Alice'}}));await tick();
  assert.equal(w.document.getElementById('accountDisplayName').value,'Bob');
  assert.equal(w.MPWProfile.getCachedProfile().id,'user-b');
  assert.equal(w.document.getElementById('accountEmail').textContent,'user-b@example.invalid');
  dom.window.close();
});

const cards='<article class="project-card" data-like-id="project-a"><h3>Project A</h3><div class="card-actions"></div></article><article class="project-card" data-like-id="project-b"><h3>Project B</h3><div class="card-actions"></div></article>';
function commentsFixture(){const f=fixture(cards);const requests=[];f.w.MPWAuth={getCurrentUser:()=>user('user-a'),getAccessToken:async()=> 'synthetic-user-a',onAuthStateChange:()=>{}};f.w.fetch=(url,init)=>{const d=deferred();requests.push({url,init,...d});return d.promise};f.load('comments.js');return {...f,requests};}
const commentPayload = content=>({success:true,count:1,comments:[{author:'Synthetic',content,createdAt:'2026-01-01T00:00:00Z'}]});
test('comments A close B reverses GET completion without changing B list',async()=>{
  const {dom,w,requests}=commentsFixture();
  w.document.querySelector('[data-comment-item-id="project-a"]').click();
  w.document.querySelector('[data-comments-close]').click();
  w.document.querySelector('[data-comment-item-id="project-b"]').click();
  requests[1].resolve(response(commentPayload('B comment')));await tick();
  requests[0].resolve(response(commentPayload('A comment')));await tick();
  assert.match(w.document.getElementById('commentsList').textContent,/B comment/);
  assert.doesNotMatch(w.document.getElementById('commentsList').textContent,/A comment/);
  dom.window.close();
});

module.exports={fixture,accountFixture,commentsFixture,response,deferred,tick,commentPayload};

test('same card reopen and late rejection preserve current comments and focus',async()=>{
 const {dom,w,requests}=commentsFixture();
 const open=()=>w.document.querySelector('[data-comment-item-id="project-a"]').click();
 open();w.document.querySelector('[data-comments-close]').click();open();
 requests[1].resolve(response(commentPayload('Newest')));await tick();
 w.document.getElementById('commentsSubmit').focus();
 requests[0].reject(Error('old failure'));await tick();
 assert.match(w.document.getElementById('commentsList').textContent,/Newest/);
 assert.equal(w.document.getElementById('commentsStatus').textContent,'');
 assert.equal(w.document.activeElement.id,'commentsSubmit');dom.window.close();
});

test('old comment POST cannot clear B draft, refresh B, or unlock its pending POST',async()=>{
 const {dom,w,requests}=commentsFixture();
 const open=id=>w.document.querySelector(`[data-comment-item-id="${id}"]`).click();
 const submit=()=>w.document.getElementById('commentsForm').dispatchEvent(new w.Event('submit',{cancelable:true}));
 open('project-a');requests[0].resolve(response(commentPayload('A')));await tick();
 w.document.getElementById('commentsInput').value='A draft';submit();await tick();
 open('project-b');requests[2].resolve(response(commentPayload('B')));await tick();
 w.document.getElementById('commentsInput').value='B draft';submit();await tick();
 assert.equal(requests.length,4);
 requests[1].resolve(response({success:true}));await tick();
 assert.equal(w.document.getElementById('commentsInput').value,'B draft');
 assert.equal(w.document.getElementById('commentsSubmit').disabled,true);
 assert.equal(requests.length,4);
 requests[3].resolve(response({success:true}));await tick();
 requests[4].resolve(response(commentPayload('B draft')));await tick();
 assert.equal(w.document.getElementById('commentsSubmit').disabled,false);dom.window.close();
});

test('same-user GET started before or during a save cannot replace its result',async()=>{
 const {dom,w,requests}=accountFixture();await tick();
 const saving=w.MPWProfile.saveProfile('New Name');await tick();
 const loading=w.MPWProfile.loadProfile().catch(error=>error.code);await tick();
 requests[1].resolve(response({success:true,profile:{id:'user-a',displayName:'New Name'}}));await saving;
 requests[2].resolve(response({success:true,profile:{id:'user-a',displayName:'Old Name'}}));
 assert.equal(await loading,'STALE_PROFILE');
 requests[0].resolve(response({success:true,profile:{id:'user-a',displayName:'Oldest'}}));await tick();
 assert.equal(w.MPWProfile.getCachedProfile().displayName,'New Name');dom.window.close();
});

test('account switch invalidates old saves, old finally, and token acquisition',async()=>{
 const {dom,w,requests}=accountFixture();await tick();
 requests[0].resolve(response({success:true,profile:{id:'user-a',displayName:'Alice'}}));await tick();
 const field=w.document.getElementById('accountDisplayName');field.value='Alice New';
 w.document.getElementById('accountProfileForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();
 await w.MPWAuth.signOut();await w.MPWAuth.signIn('b@example.invalid','synthetic-password');await tick();
 requests[2].resolve(response({success:true,profile:{id:'user-b',displayName:'Bob'}}));await tick();
 field.value='Bob New';w.document.getElementById('accountProfileForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();
 requests[1].resolve(response({success:true,profile:{id:'user-a',displayName:'Alice New'}}));await tick();
 assert.equal(field.value,'Bob New');assert.equal(w.document.getElementById('accountProfileSave').disabled,true);
 requests[3].resolve(response({success:true,profile:{id:'user-b',displayName:'Bob New'}}));await tick();
 assert.equal(w.MPWProfile.getCachedProfile().id,'user-b');
 const token=deferred();w.MPWAuth.getAccessToken=()=>token.promise;
 const pending=w.MPWProfile.saveProfile('Blocked Name').catch(error=>error.code);
 await w.MPWAuth.signOut();token.resolve('synthetic-user-b');
 assert.equal(await pending,'STALE_PROFILE');assert.equal(requests.length,4);dom.window.close();
});

test('profile modal old completion and delayed close cannot call a newer callback',async()=>{
 const {dom,w,requests}=accountFixture();await tick();requests[0].resolve(response({success:true,profile:{id:'user-a',displayName:'Alice'}}));await tick();
 const timers=[];w.setTimeout=fn=>{timers.push(fn);return timers.length};let old=0,newer=0;
 w.MPWProfile.openProfileModal({displayName:'Alice One',onSuccess:()=>old++});
 w.document.getElementById('profileForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();
 requests[1].resolve(response({success:true,profile:{id:'user-a',displayName:'Alice One'}}));await tick();
 w.MPWProfile.closeProfileModal();w.MPWProfile.openProfileModal({displayName:'Alice Two',onSuccess:()=>newer++});
 for(const timer of timers)timer();
 assert.equal(old,0);assert.equal(newer,0);assert.equal(w.document.getElementById('profileModal').hidden,false);
 assert.equal(w.document.getElementById('profileDisplayName').value,'Alice Two');dom.window.close();
});

test('same-modal POST refresh supersedes the original pending GET and late error',async()=>{
 const {dom,w,requests}=commentsFixture();
 w.document.querySelector('[data-comment-item-id="project-a"]').click();
 w.document.getElementById('commentsInput').value='Newest comment';
 w.document.getElementById('commentsForm').dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();
 requests[1].resolve(response({success:true}));await tick();
 requests[2].resolve(response(commentPayload('Newest comment')));await tick();
 requests[0].reject(Error('old failure'));await tick();
 assert.match(w.document.getElementById('commentsList').textContent,/Newest comment/);
 assert.match(w.document.getElementById('commentsStatus').textContent,/Sent/);
 assert.equal(w.document.getElementById('commentsSubmit').disabled,false);dom.window.close();
});

test('application logout rejection reaches the account error without clearing identity',async()=>{
 const {dom,w,load}=fixture(accountHtml);
 w.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:session('user-a')}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>{throw Error('Synthetic rejection');}}})};
 load('auth.js');await tick();load('account.js');
 w.document.getElementById('accountSignOut').click();await tick();
 assert.equal(w.MPWAuth.getCurrentUser().id,'user-a');
 assert.match(w.document.getElementById('accountProfileStatus').textContent,/Synthetic rejection/);
 assert.equal(w.document.getElementById('accountSignOut').disabled,false);dom.window.close();
});
