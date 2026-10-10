const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

// Loads the real redirect script in a sandbox whose location/search/hash are synthetic,
// mirroring the original audit reproduction (Node VM, no real navigation).
function runRedirectScript(name, { matches, pathname, search = '', hash = '' }) {
  const replacements = [];
  const window = {
    matchMedia: () => ({ matches }),
    location: { pathname, search, hash, replace: (url) => replacements.push(url) },
  };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'js', name), 'utf8'), { window });
  return replacements;
}

test('desktop entry keeps query and hash when redirecting to mobile', () => {
  const replacements = runRedirectScript('redirect-mobile.js', {
    matches: true,
    pathname: '/index.html',
    search: '?x=1&x=2',
    hash: '#ppt',
  });
  assert.deepEqual(replacements, ['./mobile.html?x=1&x=2#ppt']);
});

test('mobile entry keeps encoded query and hash when redirecting to desktop', () => {
  const replacements = runRedirectScript('redirect-desktop.js', {
    matches: false,
    pathname: '/mobile.html',
    search: '?name=%E4%B8%AD%E6%96%87&v=a%2Bb',
    hash: '#ppt',
  });
  assert.deepEqual(replacements, ['./index.html?name=%E4%B8%AD%E6%96%87&v=a%2Bb#ppt']);
});

test('entries without query or hash keep the original bare targets', () => {
  assert.deepEqual(
    runRedirectScript('redirect-mobile.js', { matches: true, pathname: '/index.html' }),
    ['./mobile.html']
  );
  assert.deepEqual(
    runRedirectScript('redirect-desktop.js', { matches: false, pathname: '/mobile.html' }),
    ['./index.html']
  );
});

test('query-only and hash-only redirects are preserved both ways', () => {
  assert.deepEqual(
    runRedirectScript('redirect-mobile.js', { matches: true, pathname: '/index.html', search: '?q=a%20b' }),
    ['./mobile.html?q=a%20b']
  );
  assert.deepEqual(
    runRedirectScript('redirect-desktop.js', { matches: false, pathname: '/mobile.html', hash: '#ppt' }),
    ['./index.html#ppt']
  );
});

test('deployment prefix survives: relative target stays under the same prefix', () => {
  const replacements = runRedirectScript('redirect-mobile.js', {
    matches: true,
    pathname: '/preview-site/index.html',
    search: '?x=1',
    hash: '#ppt',
  });
  assert.deepEqual(replacements, ['./mobile.html?x=1#ppt']);
});

test('no redirect when the viewport already matches the current entry', () => {
  assert.deepEqual(
    runRedirectScript('redirect-mobile.js', { matches: false, pathname: '/index.html', search: '?x=1', hash: '#ppt' }),
    []
  );
  assert.deepEqual(
    runRedirectScript('redirect-mobile.js', { matches: true, pathname: '/mobile.html', search: '?x=1' }),
    []
  );
  assert.deepEqual(
    runRedirectScript('redirect-desktop.js', { matches: true, pathname: '/mobile.html' }),
    []
  );
  assert.deepEqual(
    runRedirectScript('redirect-desktop.js', { matches: false, pathname: '/index.html' }),
    []
  );
});
