const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const script = fs.readFileSync(path.join(__dirname, "..", "js", "border-glow.js"), "utf8");

test("BorderGlow coalesces pointer updates per animation frame", () => {
  assert.match(script, /requestAnimationFrame\(updatePointer\)/);
  assert.match(script, /pointerFrameId === null/);
  assert.match(script, /getBoundingClientRect\(\)/);
  assert.match(script, /pointerleave/);
  assert.match(script, /enableImageCardGlow/);
  assert.match(script, /if \(window\.MPW_RENDER_TEST\?\.enableImageCardGlow\)/);
});
