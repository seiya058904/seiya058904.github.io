const assert=require('node:assert/strict');
const test=require('node:test');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const moduleUrl=pathToFileURL(path.join(__dirname,'../ppt-likes-api/src/supabase.ts')).href;
const env={SUPABASE_URL:'https://db.example.invalid',SUPABASE_SERVICE_ROLE_KEY:'synthetic-service',SUPABASE_ANON_KEY:'synthetic-public'};
const reply=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});

test('default initialization must not overwrite a rename committed after empty read',async()=>{
 const {ensureUserProfile,upsertUserProfile}=await import(moduleUrl);
 let row=null,release;const empty=new Promise(resolve=>{release=resolve});let gets=0;
 const original=global.fetch;
 global.fetch=async(url,init)=>{
  if(init.method==='GET'){gets++;if(gets===1)return empty;return reply(row?[row]:[]);}
  const incoming=JSON.parse(init.body);
  if(!row||!init.headers.Prefer.includes('ignore-duplicates')){row=incoming;return reply([row]);}
  return reply([]);
 };
 try{
  const initializing=ensureUserProfile(env,'abcd-user');
  await upsertUserProfile(env,'abcd-user','Chosen Name');
  release(reply([]));
  const profile=await initializing;
  assert.equal(row.display_name,'Chosen Name');
  assert.equal(profile.displayName,'Chosen Name');
 }finally{global.fetch=original;}
});

test('two initializers converge and existing profiles are read-only',async()=>{
 const {ensureUserProfile}=await import(moduleUrl);let row=null,posts=0;const original=global.fetch;
 global.fetch=async(url,init)=>{if(init.method==='GET')return reply(row?[row]:[]);posts++;if(!row)row=JSON.parse(init.body);return new Response(null,{status:204});};
 try{const profiles=await Promise.all([ensureUserProfile(env,'abcd-user'),ensureUserProfile(env,'abcd-user')]);assert.equal(profiles[0].displayName,'User-ABCD');assert.deepEqual(profiles[0],profiles[1]);const before=posts;await ensureUserProfile(env,'abcd-user');assert.equal(posts,before);}finally{global.fetch=original;}
});

for(const mode of ['insert-failure','reread-failure','reread-empty','network'])test(`initializer reports ${mode} instead of inventing a profile`,async()=>{
 const {ensureUserProfile}=await import(moduleUrl);let gets=0;const original=global.fetch;
 global.fetch=async(url,init)=>{if(init.method==='GET'){gets++;return gets===1||mode==='reread-empty'?reply([]):new Response(null,{status:503});}if(mode==='network')throw Error('synthetic network');return new Response(null,{status:mode==='insert-failure'?503:204});};
 try{await assert.rejects(ensureUserProfile(env,'abcd-user'));}finally{global.fetch=original;}
});

test('first comment uses the actual renamed profile after insert-only initialization conflicts',async()=>{
 const {insertComment,upsertUserProfile}=await import(moduleUrl);let row=null,release;const empty=new Promise(resolve=>{release=resolve});let gets=0;const original=global.fetch;
 global.fetch=async(url,init)=>{
  if(String(url).includes('/comments'))return reply([{id:'comment-fixture',item_id:'project-a',user_id:'abcd-user',content:'Synthetic',created_at:'2026-01-01T00:00:00Z'}]);
  if(init.method==='GET'){gets++;return gets===1?empty:reply(row?[row]:[]);}
  if(!row||!init.headers.Prefer.includes('ignore-duplicates'))row=JSON.parse(init.body);
  return reply([row]);
 };
 try{const comment=insertComment(env,'project-a',{id:'abcd-user'},'Synthetic');await upsertUserProfile(env,'abcd-user','Chosen Name');release(reply([]));assert.equal((await comment).author,'Chosen Name');assert.equal(row.display_name,'Chosen Name');}finally{global.fetch=original;}
});
