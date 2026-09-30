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

for(const entry of [{name:'desktop',path:'/index.html',viewport:{width:1280,height:900}},{name:'mobile',path:'/mobile.html',viewport:{width:390,height:844}}])test(`browser ${entry.name}: old comment GET cannot replace reopened card`,async()=>{
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

test('browser account: failed logout remains signed in; A response cannot contaminate B',async()=>{
 const {browser,page}=await setup({width:1280,height:900});let logoutStatus=503;let aProfile;let gets=0;
 try{
  await page.route('https://*.supabase.co/**',async route=>{
   if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:cors,body:''});
   const url=route.request().url();if(url.includes('/logout'))return route.fulfill({headers:cors,status:logoutStatus,body:logoutStatus===204?'':JSON.stringify({message:'Synthetic service failure'}),contentType:'application/json'});
   const input=route.request().postDataJSON();return route.fulfill({headers:cors,json:session(input.email.startsWith('user-b')?'user-b':'user-a')});
  });
  await page.route('**/api/profile',async route=>{
   if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:cors,body:''});
   gets++;if(route.request().headers().authorization==='Bearer synthetic-user-a'){aProfile=route;return;}
   return route.fulfill({headers:cors,json:{success:true,profile:{id:'user-b',displayName:'Bob'}}});
  });
  await page.goto(base+'/account.html');await signIn(page,'user-a');
  await page.locator('#accountSignOut').click();
  await page.locator('#accountProfileStatus').filter({hasText:/Synthetic|失败|sign out/i}).waitFor();
  assert.equal(await page.locator('#signedInView').isVisible(),true);
  logoutStatus=204;await page.locator('#accountSignOut').click();await page.locator('#signedOutView').waitFor({state:'visible'});
  await signIn(page,'user-b');await page.waitForFunction(()=>document.getElementById('accountDisplayName').value==='Bob');
  await aProfile.fulfill({headers:cors,json:{success:true,profile:{id:'user-a',displayName:'Alice'}}});
  assert.equal(await page.locator('#accountDisplayName').inputValue(),'Bob');assert.equal(gets,2);
 }finally{await browser.close();}
});
