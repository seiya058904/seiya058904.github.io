const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const baseUrl = process.env.TEST_BASE_URL || "http://127.0.0.1:4173";

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function extractIds(html, selectorClass) {
  const pattern = new RegExp(
    `<article class="[^"]*${selectorClass}[^"]*" data-like-id="([^"]+)"`,
    "g"
  );
  return Array.from(html.matchAll(pattern), (match) => match[1]);
}

function sortedUnique(values) {
  const unique = new Set(values);
  assert.equal(unique.size, values.length, "IDs must not contain duplicates");
  assert.ok(values.every(Boolean), "IDs must not be empty");
  return [...unique].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

test("desktop, mobile, catalog, and allowlist keep matching ID sets", () => {
  const desktop = read("index.html");
  const mobile = read("mobile.html");
  const catalogSource = read("js/ppt-catalog.js");
  const allowlistSource = read("ppt-likes-api/src/allowedLikeIds.ts");

  const desktopPptIds = sortedUnique(extractIds(desktop, "ppt-card"));
  const mobilePptIds = sortedUnique(extractIds(mobile, "ppt-card"));
  const catalogIds = sortedUnique(
    Array.from(catalogSource.matchAll(/^\s*"(ppt-[^"]+)"\s*:/gm), (match) => match[1])
  );
  const desktopLikeIds = sortedUnique(extractIds(desktop, "project-card"));
  const mobileLikeIds = sortedUnique(extractIds(mobile, "project-card"));
  const allowlistIds = sortedUnique(
    Array.from(allowlistSource.matchAll(/"([^"]+)"/g), (match) => match[1])
  );

  assert.deepEqual(mobilePptIds, desktopPptIds);
  assert.deepEqual(catalogIds, desktopPptIds);
  assert.deepEqual(mobileLikeIds, desktopLikeIds);
  assert.deepEqual(allowlistIds, desktopLikeIds);
});

test("priority markup only promotes the desktop LCP image", () => {
  const desktop = read("index.html");
  const mobile = read("mobile.html");

  assert.match(desktop, /<link rel="preload" as="image" href="\.\/assets\/[^"]+\.webp"/);
  assert.match(desktop, /class="hero-intro-image"[^>]+fetchpriority="high"/);
  assert.doesNotMatch(mobile, /fetchpriority="high"/);
  assert.doesNotMatch(mobile, /<link rel="preload" as="image"/);
});

async function withPage(viewport, pathname, callback) {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    page.setDefaultTimeout(3000);
    await page.goto(`${baseUrl}${pathname}`, { waitUntil: "domcontentloaded" });
    await callback(page);
  } finally {
    await browser.close();
  }
}

for (const pageCase of [
  { name: "desktop", viewport: { width: 1280, height: 720 }, path: "/index.html" },
  { name: "mobile", viewport: { width: 390, height: 844 }, path: "/mobile.html" },
]) {
  test(`${pageCase.name} filters existing cards and restores collapsed state`, async () => {
    await withPage(pageCase.viewport, pageCase.path, async (page) => {
      await page.waitForSelector("#pptSearch");
      const before = await page.evaluate(() => {
        window.__pptNodeRefs = Array.from(document.querySelectorAll(".ppt-card"));
        return {
          toggleExpanded: document.querySelector("#pptToggle").getAttribute("aria-expanded"),
          visible: window.__pptNodeRefs.filter((card) => card.offsetParent !== null).length,
        };
      });
      assert.equal(before.toggleExpanded, "false");
      assert.equal(before.visible, 5);

      await page.fill("#pptSearch", "Wi-Fi");
      await assert.doesNotReject(() => page.waitForFunction(() => {
        const visible = Array.from(document.querySelectorAll(".ppt-card")).filter((card) => !card.hidden);
        return visible.length === 1 && visible[0].dataset.likeId === "ppt-wifi";
      }));

      const filtered = await page.evaluate(() => ({
        sameNodes: window.__pptNodeRefs.every(
          (card, index) => card === document.querySelectorAll(".ppt-card")[index]
        ),
        overflowOpen: !document.querySelector(".ppt-overflow-grid").hidden,
        toggleHidden: document.querySelector("#pptToggle").hidden,
      }));
      assert.equal(filtered.sameNodes, true);
      assert.equal(filtered.overflowOpen, true);
      assert.equal(filtered.toggleHidden, true);

      await page.fill("#pptSearch", "不存在的作品关键词");
      await page.waitForFunction(() => document.querySelector("#pptEmpty").hidden === false);
      assert.equal(await page.locator(".ppt-card:not([hidden])").count(), 0);

      await page.fill("#pptSearch", "");
      await page.waitForFunction(() =>
        document.querySelector("#pptToggle").hidden === false &&
        document.querySelector("#pptToggle").getAttribute("aria-expanded") === "false"
      );
      const restoredVisible = await page.locator(".ppt-card").evaluateAll((cards) =>
        cards.filter((card) => card.offsetParent !== null).length
      );
      assert.equal(restoredVisible, 5);
    });
  });

  test(`${pageCase.name} combines category and text filtering and restores expanded state`, async () => {
    await withPage(pageCase.viewport, pageCase.path, async (page) => {
      await page.waitForSelector("#pptSearch");
      await page.click("#pptToggle");
      await page.click('[data-ppt-category="technology"]');
      await page.fill("#pptSearch", "AI");

      const filteredIds = await page.locator(".ppt-card:not([hidden])").evaluateAll((cards) =>
        cards.map((card) => card.dataset.likeId)
      );
      assert.deepEqual(filteredIds, ["ppt-ai-impact-on-modern-life", "ppt-ai-and-life"]);

      await page.fill("#pptSearch", "");
      await page.click('[data-ppt-category="all"]');
      await page.waitForFunction(() =>
        document.querySelector("#pptToggle").hidden === false &&
        document.querySelector("#pptToggle").getAttribute("aria-expanded") === "true"
      );
      assert.equal(await page.locator(".ppt-card:not([hidden])").count(), 28);
    });
  });
}
