const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("render test modes are opt-in and loaded before visual systems", () => {
  const index = read("index.html");
  const script = read("js/render-test.js");
  assert.match(index, /js\/render-test\.js/);
  assert.ok(index.indexOf("js/render-test.js") < index.indexOf("js/bg-manager.js"));
  assert.match(script, /render-test/);
  assert.match(script, /no-backdrop/);
  assert.match(script, /no-borderglow/);
  assert.match(script, /no-border-pseudo/);
  assert.match(script, /no-edge-light/);
  assert.match(script, /no-glow-shadow/);
  assert.match(script, /no-webgl/);
  assert.match(script, /no-pointer/);
  assert.match(script, /image-borderglow/);
});
