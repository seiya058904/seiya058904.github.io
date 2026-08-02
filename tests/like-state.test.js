const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { chromium } = require("playwright");

const root = path.resolve(__dirname, "..");
const baseUrl = process.env.TEST_BASE_URL || "http://127.0.0.1:4173";

function loadLikeState() {
  const context = { window: {} };
  vm.runInNewContext(
    fs.readFileSync(path.join(root, "js", "like-state.js"), "utf8"),
    context,
    { filename: "js/like-state.js" }
  );
  return context.window.MPW_LIKE_STATE;
}

test("like state uses storage when it is available", () => {
  const data = new Map([["mpw-like-v1:project-demo", "1"]]);
  const storage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
  const state = loadLikeState().create(() => storage);

  assert.equal(state.read("project-demo"), true);
  assert.equal(state.write("project-demo", false), true);
  assert.equal(data.has("mpw-like-v1:project-demo"), false);
  assert.equal(state.read("project-demo"), false);
});

test("like state keeps alternating in memory when storage methods throw", () => {
  const storage = {
    getItem() {
      throw new Error("storage disabled");
    },
    setItem() {
      throw new Error("storage disabled");
    },
    removeItem() {
      throw new Error("storage disabled");
    },
  };
  const state = loadLikeState().create(() => storage);

  assert.equal(state.read("project-demo"), false);
  assert.equal(state.write("project-demo", true), true);
  assert.equal(state.read("project-demo"), true);
  assert.equal(state.write("project-demo", false), true);
  assert.equal(state.read("project-demo"), false);
  assert.equal(state.write("project-demo", true), true);
  assert.equal(state.read("project-demo"), true);
});

test("like state rejects invalid IDs without touching storage", () => {
  let calls = 0;
  const state = loadLikeState().create(() => ({
    getItem() {
      calls += 1;
    },
    setItem() {
      calls += 1;
    },
    removeItem() {
      calls += 1;
    },
  }));

  assert.equal(state.read("bad/id"), false);
  assert.equal(state.write("bad/id", true), false);
  assert.equal(calls, 0);
});

for (const pageCase of [
  { name: "desktop", viewport: { width: 1280, height: 720 }, path: "/index.html" },
  { name: "mobile", viewport: { width: 390, height: 844 }, path: "/mobile.html" },
]) {
  test(`${pageCase.name} like buttons fall back to memory and roll back failed mutations`, async () => {
    const browser = await chromium.launch({ headless: true });
    let mutationCount = 0;
    const actions = [];
    try {
      const context = await browser.newContext({ viewport: pageCase.viewport });
      const page = await context.newPage();
      await page.addInitScript(() => {
        for (const method of ["getItem", "setItem", "removeItem"]) {
          Storage.prototype[method] = function () {
            throw new Error("storage disabled");
          };
        }
      });
      await page.route("**/api/likes", (route) =>
        route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({ success: true, likes: {} }),
        })
      );
      await page.route("**/api/like", async (route) => {
        const request = JSON.parse(route.request().postData());
        actions.push(request.action);
        mutationCount += 1;
        if (mutationCount === 3) {
          await route.fulfill({ status: 500, body: "failed" });
          return;
        }
        await route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            itemId: request.itemId,
            count: request.action === "like" ? 1 : 0,
          }),
        });
      });

      await page.goto(`${baseUrl}${pageCase.path}`, { waitUntil: "domcontentloaded" });
      const button = page.locator(".project-card[data-like-id='ppt-ai-impact-on-modern-life'] .like-button");
      await button.click();
      await page.waitForFunction((element) => element.dataset.pending === "false", await button.elementHandle());
      await button.click();
      await page.waitForFunction((element) => element.dataset.pending === "false", await button.elementHandle());
      await button.click();
      await page.waitForFunction((element) => element.dataset.pending === "false", await button.elementHandle());

      assert.deepEqual(actions, ["like", "unlike", "like"]);
      assert.equal(await button.getAttribute("aria-pressed"), "false");
      assert.equal(await button.getAttribute("data-like-count"), "0");
      assert.equal(await button.getAttribute("data-pending"), "false");
      assert.equal(await button.isDisabled(), false);
    } finally {
      await browser.close();
    }
  });
}
