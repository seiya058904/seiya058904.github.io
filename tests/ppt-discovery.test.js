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

test("desktop uses pill navigation and translucent display cards", async () => {
  await withPage({ width: 1280, height: 720 }, "/index.html", async (page) => {
    assert.equal(
      await page.locator(".nav-links .pill-label-hover").count(),
      4,
      "Each desktop navigation item needs a second animated label"
    );

    const aboutLink = page.locator('.nav-links a[href="#about"]');
    await aboutLink.hover();
    await page.waitForFunction(() => {
      const hoverLabel = document.querySelector('.nav-links a[href="#about"] .pill-label-hover');
      return hoverLabel && getComputedStyle(hoverLabel).opacity === "1";
    });

    const pillMotion = await page.evaluate(() => {
      const aboutLink = document.querySelector('.nav-links a[href="#about"]');
      return {
        fill: getComputedStyle(aboutLink, "::before").transform,
        primaryLabel: getComputedStyle(aboutLink.querySelector(".pill-label")).transform,
        hoverLabelOpacity: getComputedStyle(
          aboutLink.querySelector(".pill-label-hover")
        ).opacity,
      };
    });

    await page.locator(".brand").hover();
    await page.waitForFunction(() => {
      const logo = document.querySelector(".brand-avatar");
      return logo && getComputedStyle(logo).transform !== "none";
    });

    const styles = await page.evaluate(() => {
      const navItems = getComputedStyle(document.querySelector(".nav-links"));
      const cardElement = document.querySelector(".section-skills .card");
      const card = getComputedStyle(cardElement);
      const aboutLink = document.querySelector('.nav-links a[href="#about"]');
      return {
        navRadius: navItems.borderRadius,
        navBackdrop: navItems.backdropFilter || navItems.webkitBackdropFilter,
        navAnimation: navItems.animationName,
        navHeight: document.querySelector(".nav-links").getBoundingClientRect().height,
        pillDisplay: getComputedStyle(aboutLink).display,
        pillWidth: aboutLink.getBoundingClientRect().width,
        logoTransform: getComputedStyle(document.querySelector(".brand-avatar")).transform,
        cardBackground: card.backgroundColor,
        cardBackdrop: card.backdropFilter || card.webkitBackdropFilter,
        cardTextColor: getComputedStyle(cardElement.querySelector("p")).color,
      };
    });

    assert.equal(styles.navRadius, "9999px");
    assert.match(styles.navBackdrop, /blur/);
    assert.equal(styles.navAnimation, "pill-nav-reveal");
    assert.ok(styles.navHeight <= 52);
    assert.equal(styles.pillDisplay, "flex");
    assert.ok(styles.pillWidth >= 70);
    assert.notEqual(styles.logoTransform, "none");
    assert.notEqual(pillMotion.fill, "none");
    assert.notEqual(pillMotion.primaryLabel, "none");
    assert.equal(pillMotion.hoverLabelOpacity, "1");
    assert.equal(styles.cardBackground, "rgb(244, 242, 249)");
    assert.match(styles.cardBackdrop, /blur/);
    assert.equal(styles.cardTextColor, "rgb(49, 69, 82)");
  });
});
