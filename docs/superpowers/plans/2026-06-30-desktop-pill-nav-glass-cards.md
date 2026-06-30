# Desktop Pill Navigation and Glass Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the desktop homepage a native PillNav-style navigation and light frosted-glass display cards without changing mobile, comments, account, or admin surfaces.

**Architecture:** Keep the existing HTML and JavaScript behavior. Add one Playwright visual-contract test, then append a scoped desktop override layer to `css/style.css`; do not edit `mobile.html` or `css/mobile-legacy.css`.

**Tech Stack:** Static HTML, CSS, browser JavaScript, Node `node:test`, Playwright.

---

## Review Revision

User review clarified that matching only the PillNav appearance was insufficient.
The completed implementation also updates `index.html` with dual label layers and
tests the expanding fill, label swap, logo rotation, initial reveal, compact pill
geometry, and reduced-motion fallback. The repository implementation and tests
supersede the initial CSS-only task sketch below.

### Task 1: Add the desktop visual contract

**Files:**
- Modify: `tests/ppt-discovery.test.js:147`
- Test: `tests/ppt-discovery.test.js`

- [ ] **Step 1: Add a failing desktop-only browser test**

Append:

```js
test("desktop uses pill navigation and translucent display cards", async () => {
  await withPage({ width: 1280, height: 720 }, "/index.html", async (page) => {
    const styles = await page.evaluate(() => {
      const navItems = getComputedStyle(document.querySelector(".nav-links"));
      const card = getComputedStyle(document.querySelector(".section-skills .card"));
      return {
        navRadius: navItems.borderRadius,
        navBackdrop: navItems.backdropFilter || navItems.webkitBackdropFilter,
        cardBackground: card.backgroundColor,
        cardBackdrop: card.backdropFilter || card.webkitBackdropFilter,
      };
    });

    assert.equal(styles.navRadius, "9999px");
    assert.match(styles.navBackdrop, /blur/);
    assert.match(styles.cardBackground, /^rgba\(.+,\s*0\.[0-9]+\)$/);
    assert.match(styles.cardBackdrop, /blur/);
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run the preview in one terminal:

```powershell
npx serve . -l 4173
```

Run the focused test in another terminal:

```powershell
node --test --test-name-pattern="desktop uses pill navigation" tests/ppt-discovery.test.js
```

Expected: FAIL because the current desktop navigation/cards do not expose the required pill radius and frosted backdrop.

### Task 2: Add the desktop-only CSS treatment

**Files:**
- Modify: `css/style.css:3826`
- Test: `tests/ppt-discovery.test.js`

- [ ] **Step 1: Append the minimal desktop override layer**

Append this block to `css/style.css`:

```css
/* Desktop PillNav and frosted surfaces */
@media (min-width: 761px) {
  .site-header {
    top: 12px;
    background: transparent;
    border: 0;
    pointer-events: none;
  }

  .nav {
    width: max-content;
    max-width: calc(100% - 32px);
    min-height: 48px;
    gap: 8px;
    padding: 0;
    pointer-events: auto;
  }

  .brand,
  .bg-toggle-btn {
    width: 48px;
    height: 48px;
    padding: 0;
    border: 1px solid rgba(255, 255, 255, 0.68);
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.58);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.82),
      0 10px 30px rgba(31, 42, 55, 0.1);
    backdrop-filter: blur(18px) saturate(125%);
    -webkit-backdrop-filter: blur(18px) saturate(125%);
  }

  .brand {
    justify-content: center;
  }

  .brand span {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }

  .brand-avatar {
    width: 30px;
    height: 30px;
  }

  .nav-links {
    gap: 2px;
    padding: 4px;
    border: 1px solid rgba(255, 255, 255, 0.68);
    border-radius: 9999px;
    background: rgba(255, 255, 255, 0.58);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.82),
      0 10px 30px rgba(31, 42, 55, 0.1);
    backdrop-filter: blur(18px) saturate(125%);
    -webkit-backdrop-filter: blur(18px) saturate(125%);
  }

  .nav-links a {
    isolation: isolate;
    overflow: hidden;
    padding: 10px 16px;
    border-radius: 999px;
  }

  .nav-links a::before {
    content: "";
    position: absolute;
    left: 50%;
    bottom: -46px;
    z-index: -1;
    width: 92px;
    height: 92px;
    border-radius: 50%;
    background: rgba(11, 111, 159, 0.14);
    transform: translateX(-50%) scale(0);
    transform-origin: 50% 100%;
    transition: transform 260ms cubic-bezier(0.22, 1, 0.36, 1);
  }

  .nav-links a::after {
    display: none;
  }

  .nav-links a:hover::before,
  .nav-links a:focus-visible::before {
    transform: translateX(-50%) scale(1.25);
  }

  .account-nav-link {
    min-height: 48px;
    padding: 0 18px;
    border: 1px solid rgba(255, 255, 255, 0.68);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.58);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.82),
      0 10px 30px rgba(31, 42, 55, 0.1);
    backdrop-filter: blur(18px) saturate(125%);
    -webkit-backdrop-filter: blur(18px) saturate(125%);
  }

  .hero-card,
  .about-card,
  .section-skills .card,
  .ppt-card,
  .section-projects .project-card {
    border-color: rgba(255, 255, 255, 0.64) !important;
    background: rgba(255, 255, 255, 0.54) !important;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.78),
      0 14px 40px rgba(31, 42, 55, 0.1) !important;
    backdrop-filter: blur(20px) saturate(120%);
    -webkit-backdrop-filter: blur(20px) saturate(120%);
  }
}

@media (min-width: 761px) and (prefers-reduced-motion: reduce) {
  .nav-links a::before {
    transition: none;
  }
}
```

- [ ] **Step 2: Run the focused test and verify GREEN**

```powershell
node --test --test-name-pattern="desktop uses pill navigation" tests/ppt-discovery.test.js
```

Expected: PASS.

- [ ] **Step 3: Run the complete test suite**

```powershell
npm test
```

Expected: all tests pass.

### Task 3: Browser verification

**Files:**
- Verify: `index.html`
- Verify unchanged: `mobile.html`, `css/mobile-legacy.css`

- [ ] **Step 1: Inspect desktop at 1280x720 and 1024x768**

Verify both background modes, navigation alignment, card contrast, image sharpness, hover/focus states, and no horizontal overflow.

- [ ] **Step 2: Exercise existing behavior**

Use section links, account link, background toggle, PPT search/category/expand, likes, Escape where applicable, and keyboard Tab navigation. Confirm no console errors.

- [ ] **Step 3: Check reduced motion**

Emulate `prefers-reduced-motion: reduce`; verify the navigation remains usable without animated pill transitions.

- [ ] **Step 4: Confirm mobile files are untouched**

```powershell
git diff -- mobile.html css/mobile-legacy.css
```

Expected: no output.

- [ ] **Step 5: Review final scope**

```powershell
git status --short
git diff --stat
git diff -- tests/ppt-discovery.test.js css/style.css
```

Expected task changes: `tests/ppt-discovery.test.js` and `css/style.css`, plus the approved design/plan documents. Existing `AGENTS.md` changes remain untouched. Do not commit without explicit authorization.
