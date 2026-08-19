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
    assert.match(read(page), /css\/scroll-reveal\.css/);
    assert.match(read(page), /js\/scroll-reveal\.js/);
  }
});
