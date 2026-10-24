const test = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4173';

async function withBrowser(run) {
  const browser = await chromium.launch({ headless: true });
  try { await run(browser); } finally { await browser.close(); }
}

test('content remains readable without JavaScript, and account/admin explain unavailable actions', () => withBrowser(async browser => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 800 } });
  for (const route of ['index', 'mobile', 'account', 'admin-likes']) {
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

test('mobile motion preference changes stop and restore title motion without hiding content', () => withBrowser(async browser => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${base}/mobile.html`);
  const title = page.locator('#about .section-title');
  assert.equal(await title.evaluate(e => getComputedStyle(e).animationName), 'gradient-yoyo');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('#about').scrollIntoViewIfNeeded();
  assert.equal(await title.evaluate(e => getComputedStyle(e).animationName), 'none');
  assert.equal(await page.locator('#about').evaluate(e => getComputedStyle(e).opacity), '1');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  assert.equal(await title.evaluate(e => getComputedStyle(e).animationName), 'gradient-yoyo');
}));

test('tablet grid and pill typography retain usable geometry; shine retains contrast through its sweep', () => withBrowser(async browser => {
  const page = await browser.newPage({ viewport: { width: 768, height: 1024 } });
  await page.goto(`${base}/index.html`);
  await page.locator('#skills').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('#skills .reveal').classList.contains('is-visible'));
  await page.waitForTimeout(900); // 700ms entrance plus at most 160ms stagger; measure settled geometry.
  const cards = await page.locator('#skills .card').evaluateAll(es => es.map(e => e.getBoundingClientRect().toJSON()));
  assert.ok(Math.abs(cards[0].top - cards[1].top) < 1);
  assert.ok(cards[2].top > cards[0].bottom);
  const nav = await page.locator('.nav-links > li > :is(a,button)').evaluateAll(es => es.map(e => getComputedStyle(e).font));
  assert.equal(new Set(nav).size, 1);
  assert.equal(await page.locator('.site-header').evaluate(e => getComputedStyle(e).backdropFilter), 'none');
  const stops = await page.locator('#skills .card p').first().evaluate(e => ({ gradient: getComputedStyle(e).backgroundImage, animation: getComputedStyle(e).animationName }));
  assert.equal(stops.animation, 'shiny-text-sweep');
  const luminance = rgb => rgb.map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((v, c, i) => v + c * [0.2126, 0.7152, 0.0722][i], 0);
  // Glass at 72% white over black is the darkest possible backing.
  const backing = luminance([255 * 0.72, 255 * 0.72, 255 * 0.72]);
  const colors = [...stops.gradient.matchAll(/rgb\((\d+), (\d+), (\d+)\)/g)];
  assert.ok(colors.length >= 3);
  for (const color of colors) assert.ok((backing + 0.05) / (luminance(color.slice(1).map(Number)) + 0.05) >= 4.5);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('#skills').scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  const tops = await page.locator('#skills .card').evaluateAll(es => es.map(e => e.getBoundingClientRect().top));
  assert.ok(tops.every(top => Math.abs(top - tops[0]) < 1));
  assert.equal(Number(await page.locator('.hero-stat-item:last-child strong').innerText()), await page.locator('#projects article[data-like-id]').count());
}));

test('comment retry has content insets and remains a GET-only action', () => withBrowser(async browser => {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const methods = [];
    await page.route('**/api/comments?*', route => {
      methods.push(route.request().method());
      return route.fulfill({ status: 503, headers: { 'Access-Control-Allow-Origin': '*' }, json: { success: false, error: 'Synthetic failure' } });
    });
    await page.goto(`${base}/${width < 761 ? 'mobile' : 'index'}.html`);
    await page.locator('.comment-button').first().click();
    await page.locator('#commentsRetry').waitFor({ state: 'visible' });
    const panel = await page.locator('.comments-modal__panel').boundingBox();
    const retry = await page.locator('#commentsRetry').boundingBox();
    assert.ok(retry.x - panel.x >= 16);
    assert.ok(panel.x + panel.width - retry.x - retry.width >= 16);
    await page.locator('#commentsRetry').click();
    await page.locator('#commentsRetry').waitFor({ state: 'visible' });
    assert.deepEqual(methods, ['GET', 'GET']);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.comments-modal').isVisible(), false);
    await page.close();
  }
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
