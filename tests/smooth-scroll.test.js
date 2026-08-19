const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("desktop loads the local smooth-scroll controller while mobile stays native", () => {
  const desktop = read("index.html");
  const mobile = read("mobile.html");

  assert.match(desktop, /js\/vendor\/lenis@1\.3\.26\.min\.js/);
  assert.match(desktop, /js\/smooth-scroll\.js/);
  assert.doesNotMatch(mobile, /lenis@1\.3\.26|smooth-scroll\.js/);
});

test("smooth-scroll delegates the Lenis RAF and exposes one fallback API", () => {
  const controller = read("js/smooth-scroll.js");

  assert.match(controller, /autoRaf\s*:\s*true/);
  assert.match(controller, /syncTouch\s*:\s*false/);
  assert.match(controller, /respectReducedMotion\s*:\s*true/);
  assert.match(controller, /\[data-lenis-prevent\], textarea, select/);
  assert.doesNotMatch(controller, /\[data-lenis-prevent\], textarea, input, select/);
  assert.doesNotMatch(controller, /\.raf\(time\)/);
  assert.match(controller, /MPW_SMOOTH_SCROLL/);
  assert.match(controller, /destroy/);
  assert.match(controller, /stop/);
  assert.match(controller, /start/);
  assert.match(controller, /resize/);
  assert.match(controller, /DOMContentLoaded/);
  assert.match(controller, /if \(!document\.body\)/);
  assert.doesNotMatch(controller, /if \(document\.readyState === "loading"\)/);
  assert.match(controller, /requestAnimationFrame/);
  assert.doesNotMatch(controller, /lenis\.raf/);
});

test("programmatic scrolling routes through the shared API", () => {
  const main = read("js/main.js");

  assert.match(main, /MPW_SMOOTH_SCROLL/);
  assert.match(main, /scrollToTarget\("top"\)/);
  assert.match(main, /getAbsoluteScrollTarget\(pptHeading\)/);
  assert.match(main, /immediate:\s*true/);
  assert.match(main, /smoothScroll\?\.stop\?\.\(\)/);
  assert.match(main, /smoothScroll\?\.start\?\.\(\)/);
  assert.match(main, /syncSmoothScrollLayout/);
  assert.match(main, /scrollIntoView/);
  assert.match(main, /classList\.contains\("show"\)/);
  assert.match(main, /classList\.toggle\("show",\s*shouldShow\)/);
});

test("desktop CSS does not layer native smooth scrolling over Lenis", () => {
  const css = read("css/style.css");
  const withoutReducedMotion = css.replace(/@media \(prefers-reduced-motion: reduce\)[\s\S]*$/i, "");

  assert.doesNotMatch(withoutReducedMotion, /scroll-behavior\s*:\s*smooth/);
});

test("back-to-top visibility does not animate during scroll", () => {
  const css = read("css/style.css");
  const visibilityRule = css.match(/\/\* Back to top — smooth appearance with icon \*\/[\s\S]*?\.back-to-top:hover/);

  assert.ok(visibilityRule);
  assert.doesNotMatch(visibilityRule[0], /transition:[\s\S]*opacity/);
  assert.match(visibilityRule[0], /transition:[\s\S]*background-color/);
  assert.match(visibilityRule[0], /\.back-to-top,\s*\.back-to-top\.show[\s\S]*transform:\s*none/);
});

test("PPT boundary sections stay rendered during smooth scrolling", () => {
  const css = read("css/style.css");

  assert.match(css, /\.section-about,\s*\.section-skills\s*\{[\s\S]*content-visibility:\s*visible/);
});

test("background changes queue until scrolling is idle", () => {
  const manager = read("js/bg-manager.js");

  assert.match(manager, /var pendingBg = null/);
  assert.match(manager, /function queueBackgroundChange/);
  assert.match(manager, /setTimeout\(function \(\) \{[\s\S]*pendingBg/);
  assert.match(manager, /queueBackgroundChange\(\(base \+ 1\) % inits\.length\)/);
});
