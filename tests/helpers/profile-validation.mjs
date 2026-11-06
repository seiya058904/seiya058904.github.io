import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import app from '../../ppt-likes-api/src/index.ts';
import { ProfileUpsertBody } from '../../ppt-likes-api/src/types.ts';
import { validateDisplayName } from '../../ppt-likes-api/src/supabase.ts';

const context = { window: {}, document: { readyState: 'loading', addEventListener() {} } };
vm.runInNewContext(readFileSync(new URL('../../js/profile.js', import.meta.url), 'utf8'), context);
const browserValidate = context.window.MPWProfile.validateDisplayName;
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const env = { SUPABASE_URL: 'https://db.example.invalid', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service', SUPABASE_ANON_KEY: 'synthetic-public' };
const request = displayName => app.fetch(new Request('https://worker.example.invalid/api/profile', {
  method: 'POST', headers: { Authorization: 'Bearer synthetic-user', 'Content-Type': 'application/json' },
  body: JSON.stringify({ displayName }),
}), env);

const cases = [
  ['  ', false], ['\u3000\u00a0\t', false], ['12', false], ['  123  ', false], ['a', false],
  ['a'.repeat(25), false], ['<name>', false], ['\u9fa6\u9fa6', false], ['\u9fff\u9fff', false],
  ['😀😀', false], [123, false], [null, false], [{ name: 'Hello' }, false],
  ['一龥', true, '一龥'], ['AB', true, 'AB'], ['a'.repeat(24), true, 'a'.repeat(24)],
  ['  Seiya\u3000\t\u00a0Name  ', true, 'Seiya Name'], ['   ' + 'a'.repeat(24) + '   ', true, 'a'.repeat(24)],
  ['  A     B  ', true, 'A B'], ['A-_9', true, 'A-_9'], ['12 34', true, '12 34'],
];

test('normalizes before length checks and matches the checked-in SQL character range', () => {
  const sql = readFileSync(new URL('../../supabase/profiles_init.sql', import.meta.url), 'utf8');
  assert.ok(sql.includes("'^[一-龥A-Za-z0-9 _-]+$'"));
  for (const [input, valid, value] of cases) {
    const browser = browserValidate(input);
    const backend = validateDisplayName(input);
    const schema = ProfileUpsertBody.safeParse({ displayName: input });
    assert.equal(browser.valid, valid, `browser ${JSON.stringify(input)}`);
    assert.equal(backend.valid, valid, `backend ${JSON.stringify(input)}`);
    assert.equal(schema.success, valid, `schema ${JSON.stringify(input)}`);
    if (valid) {
      assert.equal(browser.value, value);
      assert.equal(backend.value, value);
      assert.equal(schema.data.displayName, value);
      assert.match(value, /^[一-龥A-Za-z0-9 _-]+$/u);
      assert.ok(value.length >= 2 && value.length <= 24 && !/^\d+$/.test(value));
    }
  }
});

test('invalid requests return 400 without any auth lookup or database write', async () => {
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error('unexpected upstream'); };
  for (const [input, valid] of cases) {
    if (!valid) assert.equal((await request(input)).status, 400, JSON.stringify(input));
  }
  assert.equal(calls, 0);
});

test('valid requests persist exactly the canonical value, including Unicode whitespace', async () => {
  const saved = [];
  globalThis.fetch = async (url, init) => {
    assert.ok(String(url).startsWith(env.SUPABASE_URL));
    if (String(url).includes('/auth/v1/user')) return Response.json({ id: 'synthetic-user' });
    const row = JSON.parse(init.body);
    saved.push(row.display_name);
    return Response.json([row]);
  };
  for (const [input, valid, value] of cases) {
    if (!valid) continue;
    const response = await request(input);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).profile.displayName, value);
    assert.equal(saved.at(-1), value);
  }
});

test('only known display-name CHECK errors are input errors; unrelated upstream failures remain 503', async () => {
  const failures = [
    ...['length', 'allowed_chars', 'no_angle_brackets', 'not_numeric'].map(suffix => ({ status: 400, code: '23514', message: `new row for relation "profiles" violates check constraint "profiles_display_name_${suffix}"`, expected: 400 })),
    { status: 400, code: '23514', message: 'new row for relation "profiles" violates check constraint "other_constraint"', expected: 503 },
    { status: 400, code: '23514', message: 'new row for relation "other_table" violates check constraint "profiles_display_name_length"', expected: 503 },
    { status: 400, code: '42501', message: 'permission denied', expected: 503 },
    { status: 503, code: '23514', message: 'new row for relation "profiles" violates check constraint "profiles_display_name_length"', expected: 503 },
    { status: 400, code: '23514', message: null, expected: 503 },
  ];
  for (const failure of failures) {
    globalThis.fetch = async url => String(url).includes('/auth/v1/user')
      ? Response.json({ id: 'synthetic-user' })
      : Response.json({ code: failure.code, message: failure.message, details: 'PRIVATE SYNTHETIC ROW' }, { status: failure.status });
    const response = await request('Valid Name');
    assert.equal(response.status, failure.expected);
    const body = await response.text();
    assert.ok(!body.includes('PRIVATE SYNTHETIC ROW') && !body.includes('constraint'));
  }
  globalThis.fetch = async url => String(url).includes('/auth/v1/user') ? Response.json({ id: 'synthetic-user' }) : new Response('not-json', { status: 503 });
  assert.equal((await request('Valid Name')).status, 503);
});

test('the normalization schema remains compatible with generated OpenAPI', async () => {
  const response = await app.fetch(new Request('https://worker.example.invalid/openapi.json'), env);
  assert.equal(response.status, 200);
  const schema = await response.json();
  assert.ok(schema.paths['/api/profile'].post);
});
