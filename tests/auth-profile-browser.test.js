const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const test=require('node:test');
const {chromium}=require('playwright');
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
const base=process.env.TEST_BASE_URL||'http://127.0.0.1:4173';
const sdk=fs.readFileSync(path.join(__dirname,'../node_modules/@supabase/supabase-js/dist/umd/supabase.js'),'utf8');
const user=id=>({id,email:`${id}@example.invalid`,aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'});
const session=id=>({user:user(id),access_token:`synthetic-${id}`,refresh_token:'synthetic-refresh',token_type:'bearer',expires_in:3600});
const payload=content=>({success:true,count:1,comments:[{author:'Synthetic',content,createdAt:'2026-01-01T00:00:00Z'}]});
const entries=[{name:'desktop',path:'/index.html',viewport:{width:1280,height:900}},{name:'mobile',path:'/mobile.html',viewport:{width:390,height:844}}];
async function setup(viewport){
 const browser=await chromium.launch();const page=await browser.newPage({viewport,reducedMotion:'reduce'});page.setDefaultTimeout(10000);
 await page.route('**/*',async route=>{
  const url=route.request().url();
  if(url.includes('@supabase/supabase-js@2.110.1'))return route.fulfill({contentType:'application/javascript',body:sdk});
  if(url.startsWith(base+'/'))return route.continue();
  if(url.includes('/api/likes'))return route.fulfill({headers:cors,json:{success:true,likes:{}}});
  // Tests below register higher-priority synthetic auth/API routes. Nothing
  // else may reach a production service while testing these real pages.
  return route.abort();
 });
 return {browser,page};
}
async function signIn(page,id){
 await page.locator('#accountSignIn').click();
 await page.locator('#authEmail').fill(`${id}@example.invalid`);await page.locator('#authPassword').fill('synthetic-password');
 await page.locator('#authSubmit').click();
 await page.waitForFunction(expected=>document.getElementById('accountEmail').textContent===expected,`${id}@example.invalid`);
 await page.locator('#authModal').waitFor({state:'hidden'});
}

for(const entry of entries)test(`browser ${entry.name}: old comment GET cannot replace reopened card`,async()=>{
 const {browser,page}=await setup(entry.viewport);const pending=[];
 try{
  await page.route('**/api/comments?*',route=>{pending.push(route);});
  await page.goto(base+entry.path);
  const buttons=page.locator('.comment-button');await buttons.first().waitFor();
  const firstCard=buttons.nth(0),secondCard=buttons.nth(1);
  await firstCard.click();await page.waitForFunction(()=>document.getElementById('commentsModal')?.hidden===false);
  await page.locator('#commentsModal [data-comments-close]').last().click();
  await secondCard.click();
  // Routing callbacks run before the visible Loading state settles.
  for(let i=0;pending.length<2 && i<500;i++)await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(pending.length,2);
  await pending[1].fulfill({headers:cors,json:payload('B comment')});await page.getByText('B comment',{exact:true}).waitFor();
  await pending[0].fulfill({headers:cors,json:payload('A comment')});
  await page.locator('#commentsInput').fill('B draft');
  assert.match(await page.locator('#commentsList').innerText(),/B comment/);
  assert.doesNotMatch(await page.locator('#commentsList').innerText(),/A comment/);
  await page.locator('#commentsInput').press('Escape');assert.equal(await page.locator('#commentsModal').isVisible(),false);
 }finally{await browser.close();}
});

for(const entry of entries)test(`browser ${entry.name}: only the submitted draft can be cleared across async boundaries`,async()=>{
 const {browser,page}=await setup(entry.viewport);const pendingGets=[],pendingPosts=[],pageErrors=[];
 page.on('pageerror',error=>pageErrors.push(error.message));
 const waitForRequest=async(requests,count)=>{
  for(let i=0;requests.length<count && i<500;i++)await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(requests.length,count);
  return requests[count-1];
 };
 const finishGet=async(index,content)=>{
  const route=await waitForRequest(pendingGets,index+1);
  await route.fulfill({headers:cors,json:payload(content)});
  await page.getByText(content,{exact:true}).waitFor();
 };
 const assertDraft=async(value)=>{
  assert.equal(await page.locator('#commentsInput').inputValue(),value);
  assert.equal(await page.locator('#commentsHint').textContent(),`${value.length}/500`);
 };
 try{
  await page.route('https://*.supabase.co/**',async route=>{
   if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:cors,body:''});
   return route.fulfill({headers:cors,json:session('draft-user')});
  });
  await page.route('**/api/profile',route=>route.fulfill({headers:cors,json:{success:true,profile:{id:'draft-user',displayName:'Synthetic'}}}));
  await page.route('**/api/comments**',route=>{
   if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:cors,body:''});
   (route.request().method()==='POST'?pendingPosts:pendingGets).push(route);
  });
  await page.goto(base+entry.path);
  await page.locator('.comment-button').first().click();
  await finishGet(0,'Existing comment');
  await page.locator('.comments-account-open').click();
  await page.locator('#authEmail').fill('draft-user@example.invalid');
  await page.locator('#authPassword').fill('synthetic-password');
  await page.locator('#authSubmit').click();
  await page.locator('#authModal').waitFor({state:'hidden'});
  await page.waitForFunction(()=>window.MPWAuth?.getCurrentUser()?.id==='draft-user');
  let getCount=1;

  // These barriers retain the real auth/fetch result; only completion timing
  // changes. Every external request remains intercepted by synthetic routes.
  for(const [index,boundary] of ['post','token','json','refresh','unchanged','edit-back','network','server'].entries()){
   const input=page.locator('#commentsInput');
   await input.fill(' A draft ');
   if(boundary==='token'||boundary==='json')await page.evaluate(stage=>{
    window.__draftBarrier={started:false};
    const hold=new Promise(resolve=>{window.__draftBarrier.release=resolve;});
    if(stage==='token'){
     const original=window.MPWAuth.getAccessToken;
     window.MPWAuth.getAccessToken=async()=>{
      window.__draftBarrier.started=true;
      await hold;
      window.MPWAuth.getAccessToken=original;
      return original();
     };
    }else{
     const original=window.fetch;
     window.fetch=async(...args)=>{
      const response=await original(...args);
      if(args[1]?.method==='POST'){
       const parse=response.json.bind(response);
       response.json=async()=>{
        window.__draftBarrier.started=true;
        await hold;
        window.fetch=original;
        return parse();
       };
      }
      return response;
     };
    }
   },boundary);
   await page.locator('#commentsSubmit').click();
   if(boundary==='token'){
    await page.waitForFunction(()=>window.__draftBarrier.started);
    await input.fill('B draft');
    await page.evaluate(()=>window.__draftBarrier.release());
   }
   const post=await waitForRequest(pendingPosts,index+1);
   assert.equal(post.request().postDataJSON().content,'A draft');
   if(boundary==='post'||boundary==='edit-back'||boundary==='network'||boundary==='server')await input.fill('B draft');
   if(boundary==='edit-back')await input.fill(' A draft ');
   if(boundary==='network')await post.abort('failed');
   else await post.fulfill({headers:cors,status:boundary==='server'?503:200,json:boundary==='server'?{success:false,error:'Synthetic failure'}:{success:true}});
   if(boundary==='json'){
    await page.waitForFunction(()=>window.__draftBarrier.started);
    await input.fill('B draft');
    await page.evaluate(()=>window.__draftBarrier.release());
   }
   const failure=boundary==='network'||boundary==='server';
   const refresh=failure?null:await waitForRequest(pendingGets,++getCount);
   if(failure)await page.waitForFunction(()=>document.getElementById('commentsStatus').dataset.tone==='error');
   if(boundary==='refresh')await input.fill('B draft');
   const expected=boundary==='unchanged'?'':boundary==='edit-back'?' A draft ':'B draft';
   await assertDraft(expected);
   if(refresh){
    await refresh.fulfill({headers:cors,json:payload(`Submitted ${index}`)});
    await page.getByText(`Submitted ${index}`,{exact:true}).waitFor();
   }
   await page.waitForFunction(()=>!document.getElementById('commentsSubmit').disabled);
   await assertDraft(expected);
  }
  assert.deepEqual(pageErrors,[]);
  if(process.env.QA_SCREENSHOT_DIR){
   await page.screenshot({path:path.join(process.env.QA_SCREENSHOT_DIR,`comment-draft-${entry.name}.png`)});
  }
 }finally{await browser.close();}
});

test('browser account: failed logout remains signed in; A response cannot contaminate B',async()=>{
 const {browser,page}=await setup({width:1280,height:900});let logoutStatus=503;let aProfile;let gets=0;let logoutCalls=0;const pageErrors=[];page.on('pageerror',error=>pageErrors.push(error.message));
 try{
  await page.route('https://*.supabase.co/**',async route=>{
   if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:cors,body:''});
   const url=route.request().url();if(url.includes('/logout')){logoutCalls++;return route.fulfill({headers:cors,status:logoutStatus,body:logoutStatus===204?'':JSON.stringify({message:'Synthetic service failure'}),contentType:'application/json'});}
   const input=route.request().postDataJSON();return route.fulfill({headers:cors,json:session(input.email.startsWith('user-b')?'user-b':'user-a')});
  });
  await page.route('**/api/profile',async route=>{
   if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:cors,body:''});
   gets++;if(route.request().headers().authorization==='Bearer synthetic-user-a'){aProfile=route;return;}
   return route.fulfill({headers:cors,json:{success:true,profile:{id:'user-b',displayName:'Bob'}}});
  });
  await page.goto(base+'/account.html');await signIn(page,'user-a');
  await page.locator('#accountSignOut').click();
  await page.waitForFunction(()=>document.getElementById('accountProfileStatus').dataset.tone==='error');
  assert.equal(await page.locator('#signedInView').isVisible(),true);
  logoutStatus=204;await page.locator('#accountSignOut').click();await page.locator('#signedOutView').waitFor({state:'visible'});
  await signIn(page,'user-b');await page.waitForFunction(()=>document.getElementById('accountDisplayName').value==='Bob');
  await aProfile.fulfill({headers:cors,json:{success:true,profile:{id:'user-a',displayName:'Alice'}}});
  assert.equal(await page.locator('#accountDisplayName').inputValue(),'Bob');assert.equal(gets,2);
 }catch(error){console.log('Account diagnostic',JSON.stringify({logoutCalls,gets,pageErrors,status:await page.locator('#accountProfileStatus').textContent(),signedIn:await page.locator('#signedInView').isVisible()}));throw error;}finally{await browser.close();}
});
