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

test("smooth-scroll owns a manual Lenis RAF and exposes one fallback API", () => {
  const controller = read("js/smooth-scroll.js");

  assert.match(controller, /autoRaf\s*:\s*false/);
  assert.match(controller, /syncTouch\s*:\s*false/);
  assert.match(controller, /respectReducedMotion\s*:\s*true/);
  assert.match(controller, /requestAnimationFrame/);
  assert.match(controller, /\.raf\(time\)/);
  assert.match(controller, /MPW_SMOOTH_SCROLL/);
  assert.match(controller, /destroy/);
});

test("programmatic scrolling routes through the shared API", () => {
  const main = read("js/main.js");

  assert.match(main, /MPW_SMOOTH_SCROLL/);
  assert.match(main, /scrollToTarget\("top"\)/);
  assert.match(main, /scrollToTarget\(pptHeading\)/);
  assert.match(main, /scrollIntoView/);
});

test("desktop CSS does not layer native smooth scrolling over Lenis", () => {
  const css = read("css/style.css");
  const withoutReducedMotion = css.replace(/@media \(prefers-reduced-motion: reduce\)[\s\S]*$/i, "");

  assert.doesNotMatch(withoutReducedMotion, /scroll-behavior\s*:\s*smooth/);
});
