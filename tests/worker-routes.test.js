const assert=require('node:assert/strict');
const test=require('node:test');
const {spawnSync}=require('node:child_process');
test('real Worker route contracts with isolated Supabase transport',()=>{
 const result=spawnSync(process.execPath,['--import','./tests/helpers/worker-loader.mjs','./tests/helpers/worker-routes.mjs'],{encoding:'utf8'});
 assert.equal(result.status,0,result.stdout+result.stderr);
});
