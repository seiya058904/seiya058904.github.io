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

test("desktop utilities share the main pill and the PPT count panel is removed", () => {
  const desktop = read("index.html");

  assert.match(desktop, /<ul class="nav-links" id="navLinks">[\s\S]*id="bgToggle"[\s\S]*data-account-link[\s\S]*<\/ul>/);
  assert.match(desktop, /class="pill-label">Theme<\/span>/);
  assert.match(desktop, /class="pill-label">Account<\/span>/);
  assert.doesNotMatch(desktop, /class="ppt-head-stat"/);
  assert.doesNotMatch(desktop, /id="pptCount"/);
  assert.match(desktop, /css\/style\.css\?v=[^"]+/);
  assert.match(desktop, /js\/bg-manager\.js\?v=[^"]+/);
  assert.match(desktop, /js\/pill-nav\.js\?v=[^"]+/);
  assert.match(desktop, /js\/main\.js\?v=[^"]+/);
  assert.match(desktop, /js\/auth\.js\?v=[^"]+/);
});

test("desktop homepage ignores the system reduced-motion preference", () => {
  assert.doesNotMatch(read("css/style.css"), /prefers-reduced-motion/);
  assert.doesNotMatch(read("js/main.js"), /prefers-reduced-motion/);
  assert.doesNotMatch(read("js/pill-nav.js"), /prefers-reduced-motion/);
  assert.match(read("css/mobile-legacy.css"), /prefers-reduced-motion/);
});

test("desktop animations remain active when reduced motion is enabled in Windows", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/index.html`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => {
      const circle = document.querySelector('.nav-links a[href="#about"] .hover-circle');
      return circle && circle.style.width;
    });

    const navAnimation = await page.locator(".nav-links").evaluate(
      (element) => getComputedStyle(element).animationName
    );
    assert.equal(navAnimation, "pill-nav-reveal");

    const projectCard = page.locator(".section-projects .project-card").first();
    await projectCard.hover();
    const cardTransform = await projectCard.evaluate(
      (element) => getComputedStyle(element).transform
    );
    assert.notEqual(cardTransform, "none");
  } finally {
    await browser.close();
  }
});

test("hidden WebGL background pauses drawing and resumes after switching", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.addInitScript(() => {
      window.__bgDraws = { webgl: 0, webgl2: 0 };

      const webglDraw = WebGLRenderingContext.prototype.drawArrays;
      WebGLRenderingContext.prototype.drawArrays = function (...args) {
        window.__bgDraws.webgl += 1;
        return webglDraw.apply(this, args);
      };

      if (window.WebGL2RenderingContext) {
        const webgl2Draw = WebGL2RenderingContext.prototype.drawArrays;
        WebGL2RenderingContext.prototype.drawArrays = function (...args) {
          window.__bgDraws.webgl2 += 1;
          return webgl2Draw.apply(this, args);
        };
      }
    });

    await page.goto(`${baseUrl}/index.html`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => document.querySelectorAll("#pageBgContainer canvas").length === 2
    );

    await page.waitForTimeout(250);
    const before = await page.evaluate(() => ({ ...window.__bgDraws }));
    await page.waitForTimeout(250);
    const activeFirst = await page.evaluate(() => ({ ...window.__bgDraws }));

    assert.ok(activeFirst.webgl > before.webgl, "Visible WebGL background keeps drawing");
    assert.equal(
      activeFirst.webgl2,
      before.webgl2,
      "Hidden WebGL2 background must stop drawing"
    );

    await page.locator("#bgToggle").click();
    await page.waitForTimeout(250);
    const switched = await page.evaluate(() => ({ ...window.__bgDraws }));
    await page.waitForTimeout(250);
    const activeSecond = await page.evaluate(() => ({ ...window.__bgDraws }));

    assert.equal(
      activeSecond.webgl,
      switched.webgl,
      "WebGL background must stop drawing after it is hidden"
    );
    assert.ok(
      activeSecond.webgl2 > switched.webgl2,
      "WebGL2 background resumes drawing after it becomes visible"
    );
  } finally {
    await browser.close();
  }
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

test("desktop About and Skills copy uses the restrained ShinyText effect", async () => {
  await withPage({ width: 1280, height: 720 }, "/index.html", async (page) => {
    const styles = await page.evaluate(() => {
      const targets = Array.from(
        document.querySelectorAll(
          ".about-card h3, .about-card p, .section-skills .card h3, .section-skills .card p"
        )
      );
      const projectTitle = document.querySelector(".section-projects .project-card h3");
      return {
        count: targets.length,
        targets: targets.map((element) => {
          const style = getComputedStyle(element);
          return {
            animationName: style.animationName,
            animationDuration: style.animationDuration,
            animationDelay: style.animationDelay,
            backgroundClip: style.backgroundClip || style.webkitBackgroundClip,
            backgroundRepeat: style.backgroundRepeat,
            textFill: style.webkitTextFillColor,
          };
        }),
        projectAnimation: getComputedStyle(projectTitle).animationName,
      };
    });

    assert.equal(styles.count, 14);
    assert.ok(
      styles.targets.every((style) => style.animationName === "shiny-text-sweep")
    );
    assert.ok(styles.targets.every((style) => style.animationDuration === "6s"));
    assert.ok(styles.targets.every((style) => style.backgroundClip === "text"));
    assert.ok(
      styles.targets.every((style) => style.backgroundRepeat === "repeat"),
      "The moving gradient must repeat so transparent glyphs never lose their fill"
    );
    assert.ok(
      styles.targets.every((style) => /transparent|rgba\(0, 0, 0, 0\)/.test(style.textFill))
    );
    assert.ok(new Set(styles.targets.map((style) => style.animationDelay)).size > 1);
    assert.equal(styles.projectAnimation, "none");
  });
});

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
      6,
      "Each desktop navigation item needs a second animated label"
    );

    // PillNav: hover-circle elements present
    assert.equal(
      await page.locator(".nav-links .hover-circle").count(),
      6,
      "Each desktop navigation item has a .hover-circle element"
    );

    assert.equal(await page.locator("#navLinks #bgToggle").count(), 1);
    assert.equal(await page.locator("#navLinks [data-account-link]").count(), 1);
    assert.equal(await page.locator(".ppt-head-stat").count(), 0);

    const themeButton = page.locator("#bgToggle");
    await themeButton.hover();
    await page.waitForFunction(() => {
      const circle = document.querySelector("#bgToggle .hover-circle");
      if (!circle) return false;
      return new DOMMatrix(getComputedStyle(circle).transform).a > 0.05;
    });
    const themeCircleAlignment = await page.evaluate(() => {
      const button = document.getElementById("bgToggle").getBoundingClientRect();
      const circle = document.querySelector("#bgToggle .hover-circle").getBoundingClientRect();
      return Math.abs(
        button.left + button.width / 2 - (circle.left + circle.width / 2)
      );
    });
    assert.ok(
      themeCircleAlignment < 2,
      `Theme hover circle must stay centered on Theme; offset was ${themeCircleAlignment}px`
    );

    const aboutLink = page.locator('.nav-links a[href="#about"]');
    const restingPillMotion = await page.evaluate(() => {
      const aboutLink = document.querySelector('.nav-links a[href="#about"]');
      const hoverLabel = aboutLink.querySelector(".pill-label-hover");
      const pillHeight = aboutLink.getBoundingClientRect().height;
      const matrix = new DOMMatrix(getComputedStyle(hoverLabel).transform);
      return {
        hoverLabelY: matrix.m42,
        pillHeight,
      };
    });
    assert.ok(
      restingPillMotion.hoverLabelY >= restingPillMotion.pillHeight + 90,
      "The incoming label starts well below the pill, matching the source timeline"
    );

    await aboutLink.hover();
    await page.waitForFunction(() => {
      const hoverLabel = document.querySelector('.nav-links a[href="#about"] .pill-label-hover');
      return hoverLabel && getComputedStyle(hoverLabel).opacity === "1";
    });

    // PillNav: verify hover-circle scale is active (not scale(0))
    await page.waitForFunction(() => {
      const circle = document.querySelector('.nav-links a[href="#about"] .hover-circle');
      if (!circle) return false;
      const transform = getComputedStyle(circle).transform;
      return transform !== "none" && !transform.includes("scale(0)");
    });

    const pillMotion = await page.evaluate(() => {
      const aboutLink = document.querySelector('.nav-links a[href="#about"]');
      const circle = aboutLink.querySelector(".hover-circle");
      return {
        fill: circle ? getComputedStyle(circle).transform : "none",
        primaryLabel: getComputedStyle(aboutLink.querySelector(".pill-label")).transform,
        primaryLabelOpacity: getComputedStyle(
          aboutLink.querySelector(".pill-label:not(.pill-label-hover)")
        ).opacity,
        hoverLabelOpacity: getComputedStyle(
          aboutLink.querySelector(".pill-label-hover")
        ).opacity,
      };
    });

    // PillNav: dynamic circle sizing — wider pills get larger circles
    const circleSizes = await page.evaluate(() => {
      return Array.from(document.querySelectorAll(".nav-links a")).map(function (link) {
        const circle = link.querySelector(".hover-circle");
        if (!circle) return 0;
        return parseFloat(getComputedStyle(circle).width);
      });
    });
    // Projects (index 3) circle >= About (index 0) circle
    assert.ok(
      circleSizes[3] >= circleSizes[0],
      "Wider nav links (Projects) get a larger hover-circle than narrower ones (About) — " +
      JSON.stringify(circleSizes)
    );

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
    assert.equal(
      pillMotion.primaryLabelOpacity,
      "1",
      "The outgoing label moves out of view without fading"
    );
    assert.equal(styles.cardBackground, "rgba(255, 255, 255, 0.72)");
    assert.match(styles.cardBackdrop, /blur/);
    assert.equal(styles.cardTextColor, "rgb(49, 69, 82)");

    // PillNav scroll-spy: scrolling to #skills sets is-active on [href="#skills"]
    await page.evaluate(() => {
      var skills = document.getElementById("skills");
      if (skills) skills.scrollIntoView({ block: "start" });
    });
    await page.waitForFunction(function () {
      var link = document.querySelector('.nav-links a[href="#skills"]');
      return link && link.classList.contains("is-active");
    });
    var isSkillsActive = await page.evaluate(function () {
      var link = document.querySelector('.nav-links a[href="#skills"]');
      return link && link.classList.contains("is-active");
    });
    assert.ok(isSkillsActive, "Scrolling to #skills highlights the Skills nav pill");
  });
});
