const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("ScrollReveal exposes the explicit registration API without a global DOM observer", () => {
  const script = read("js/scroll-reveal.js");

  assert.match(script, /function init\(\)/);
  assert.match(script, /function register\(root = document\)/);
  assert.match(script, /window\.MPWScrollReveal = \{ init, register \}/);
  assert.match(script, /IntersectionObserver/);
  assert.doesNotMatch(script, /MutationObserver/);
  assert.doesNotMatch(script, /observer\.unobserve/);
  assert.match(script, /grid:not\(\.ppt-grid\):not\(\.ppt-overflow-grid\)/);
  assert.match(script, /Math\.min\(index \* 40, 160\)/);
});

test("ScrollReveal uses individual translate and is loaded by every visible page", () => {
  const styles = read("css/scroll-reveal.css");
  assert.match(styles, /translate: 0 30px/);
  assert.match(styles, /translate: 0 0/);
  assert.match(styles, /700ms cubic-bezier/);
  assert.match(styles, /transition-delay: min\(var\(--reveal-delay, 0ms\), 160ms\)/);
  assert.match(styles, /grid:not\(\.ppt-grid\):not\(\.ppt-overflow-grid\)/);
  const desktopStyles = read("css/style.css");
  assert.match(desktopStyles, /\.section-ppt,\s*\.section-projects \{[\s\S]*content-visibility: visible/);
  assert.match(styles, /prefers-reduced-motion/);

  for (const page of ["index.html", "mobile.html", "account.html", "admin-likes.html"]) {
    const markup = read(page);
    assert.match(markup, /css\/scroll-reveal\.css/);
    assert.match(markup, /js\/scroll-reveal\.js/);

    if (page === "index.html" || page === "mobile.html") {
      assert.equal((markup.match(/loading="eager" fetchpriority="low"/g) || []).length, 0);
      assert.equal((markup.match(/loading="lazy" decoding="async"/g) || []).length >= 38, true);
    }
  }
});

test("PPT and project image shells reserve their scroll geometry", () => {
  const desktopStyles = read("css/style.css");
  const mobileStyles = read("css/mobile-legacy.css");

  for (const styles of [desktopStyles, mobileStyles]) {
    assert.match(styles, /\.ppt-cover\s*\{[\s\S]*aspect-ratio: 292 \/ 210/);
    assert.match(styles, /\.ppt-cover img\s*\{[\s\S]*height: 100%/);
  }

  assert.match(desktopStyles, /\.section-projects \.project-poster\s*\{[\s\S]*aspect-ratio: 4 \/ 3/);
  assert.match(desktopStyles, /\.section-projects \.project-cover,[\s\S]*height: 100%/);
});

test("large PPT and project sections do not animate as one scrolling reveal", () => {
  for (const page of ["index.html", "mobile.html"]) {
    const markup = read(page);
    assert.doesNotMatch(markup, /<section[^>]*section-ppt[^>]*\breveal\b/);
    assert.doesNotMatch(markup, /<section[^>]*section-projects[^>]*\breveal\b/);
    assert.doesNotMatch(markup, /<section[^>]*section-ppt[^>]*>[\s\S]{0,160}<div class="container reveal"/);
    assert.doesNotMatch(markup, /<section[^>]*section-projects[^>]*>[\s\S]{0,160}<div class="container reveal"/);
  }

  const desktopStyles = read("css/style.css");
  assert.doesNotMatch(desktopStyles, /\.project-card,\s*\.ppt-card,\s*\.ppt-card-featured\s*\{\s*will-change:\s*transform;/);
  assert.doesNotMatch(desktopStyles, /\.ppt-card,\s*\.ppt-card-featured\s*\{\s*will-change:\s*transform;/);
});
