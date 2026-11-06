const assert = require('node:assert/strict');
const test = require('node:test');
const { spawnSync } = require('node:child_process');

test('profile validation agrees across browser, Worker schema and existing SQL', () => {
  const result = spawnSync(process.execPath, ['--import', './tests/helpers/worker-loader.mjs', '--test', './tests/helpers/profile-validation.mjs'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
