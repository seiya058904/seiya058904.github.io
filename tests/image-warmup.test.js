const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("showcase images keep native browser loading", () => {
  const index = read("index.html");
  const mobile = read("mobile.html");
  const main = read("js/main.js");

  assert.doesNotMatch(index, /js\/image-warmup\.js/);
  assert.doesNotMatch(mobile, /js\/image-warmup\.js/);
  assert.doesNotMatch(main, /imageWarmup/);
  assert.match(index, /project-hardware-monitoring\.webp[\s\S]*loading="eager"/);
  assert.match(mobile, /project-hardware-monitoring\.webp[\s\S]*loading="eager"/);
});
