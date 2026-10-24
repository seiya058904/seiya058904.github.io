const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4173';

async function withBrowser(run) {
  const browser = await chromium.launch({ headless: true });
  try { await run(browser); } finally { await browser.close(); }
}

test('account/admin remain readable without JavaScript and explain unavailable actions', () => withBrowser(async browser => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 800 } });
  for (const route of ['account', 'admin-likes']) {
    const page = await context.newPage();
    await page.goto(`${base}/${route}.html`);
    const opacity = await page.locator('.reveal').first().evaluate(e => getComputedStyle(e).opacity);
    assert.equal(opacity, '1', route);
    assert.equal(await page.locator('noscript').innerText().then(t => t.includes('JavaScript')), true);
    if (route === 'account') assert.equal(await page.locator('#accountLoadingView').isVisible(), false);
    if (route === 'admin-likes') assert.equal(await page.locator('#loginForm').isVisible(), false);
    await page.close();
  }
}));

test('tablet skills use two columns, desktop retains four, and project count matches cards', () => withBrowser(async browser => {
  const page = await browser.newPage({ viewport: { width: 768, height: 1024 } });
  await page.goto(`${base}/index.html`);
  await page.locator('#skills').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('#skills .reveal').classList.contains('is-visible'));
  await page.waitForTimeout(900); // 700ms entrance plus at most 160ms stagger; measure settled geometry.
  const cards = await page.locator('#skills .card').evaluateAll(es => es.map(e => e.getBoundingClientRect().toJSON()));
  assert.ok(Math.abs(cards[0].top - cards[1].top) < 1);
  assert.ok(cards[2].top > cards[0].bottom);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('#skills').scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  const tops = await page.locator('#skills .card').evaluateAll(es => es.map(e => e.getBoundingClientRect().top));
  assert.ok(tops.every(top => Math.abs(top - tops[0]) < 1));
  assert.equal(Number(await page.locator('.hero-stat-item:last-child strong').innerText()), await page.locator('#projects article[data-like-id]').count());
}));

test('AI deck B toggle, paging and reduced-motion initialization work without script errors', () => withBrowser(async browser => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${base}/ppt/ai-impact-on-modern-life.html`);
  await page.keyboard.press('b');
  assert.equal(await page.evaluate(() => window.__lowPowerMode), true);
  assert.match(await page.locator('#hint').innerText(), /切换动态/);
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('.dot').evaluateAll(es => es.findIndex(e => e.classList.contains('active'))), 1);
  await page.keyboard.press('b');
  assert.equal(await page.evaluate(() => window.__lowPowerMode), false);
  assert.deepEqual(errors, []);
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const reduced = await context.newPage();
  await reduced.goto(`${base}/ppt/ai-impact-on-modern-life.html`);
  assert.equal(await reduced.evaluate(() => window.__lowPowerMode), true);
  assert.equal(await reduced.locator('body').evaluate(e => e.classList.contains('low-power')), true);
}));
