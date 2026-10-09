<h1 align="center">✦ Seiya · Personal Web Space</h1>

<p align="center">
  <strong>A place for the things I build, explore, and keep learning.</strong>
</p>

<p align="center">
  An evolving personal portfolio of software projects, browser-native visual explainers,<br>
  and experiments at the intersection of technology and design.
</p>

<p align="center">
  <a href="https://seiya058904.github.io/"><strong>🌐 Visit the Website</strong></a>
  &nbsp;·&nbsp;
  <a href="#explore-the-space">✨ Explore</a>
  &nbsp;·&nbsp;
  <a href="#selected-work">🧩 Selected Work</a>
  &nbsp;·&nbsp;
  <a href="#how-it-works">⚙️ How It Works</a>
  &nbsp;·&nbsp;
  <a href="#run-locally">🛠️ Development</a>
</p>

<p align="center">
  <sub>12 PROJECT CARDS &nbsp;·&nbsp; 38 WEB PRESENTATIONS &nbsp;·&nbsp; DESKTOP + MOBILE &nbsp;·&nbsp; ONE PERSONAL SPACE</sub>
</p>

<p align="center">
  <img width="740" alt="Seiya's personal website — original project artwork" src="https://github.com/user-attachments/assets/4ecea310-3921-467f-9c54-444adb64174b" />
</p>

---

> **The work comes first. The website gives it a home.**
>
> This is a personal corner of the web for finished projects, works in progress, and ideas worth explaining. Some pieces can be experienced directly in a browser; others link to their own repositories and release pages.

<a id="explore-the-space"></a>
## ✨ Explore the Space

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>🧭 About &amp; Skills</h3>
      <p><sub>PERSONAL · LEARNING · TECHNOLOGY</sub></p>
      <p>A short introduction, technical interests, and the subjects behind the projects. The site is both an introduction and a record of ongoing exploration.</p>
      <p><strong><a href="https://seiya058904.github.io/#about">Meet the creator →</a></strong></p>
    </td>
    <td width="50%" valign="top">
      <h3>🧰 Project Gallery</h3>
      <p><sub>SOFTWARE · WEB · GAMES · EXPERIMENTS</sub></p>
      <p>Twelve project cards bringing together independent tools, interactive works, browser games, and longer-running software projects.</p>
      <p><strong><a href="https://seiya058904.github.io/#projects">Browse projects →</a></strong></p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>🎞️ Visual Explainers</h3>
      <p><sub>38 STANDALONE HTML PRESENTATIONS</sub></p>
      <p>Explore subjects from semiconductors and everyday science to people and culture. Search by title or keyword, filter by theme, and open each deck as its own webpage.</p>
      <p><strong><a href="https://seiya058904.github.io/#ppt">Open the presentation library →</a></strong></p>
    </td>
    <td width="50%" valign="top">
      <h3>💬 Community &amp; Interaction</h3>
      <p><sub>LIKES · COMMENTS · PUBLIC DISPLAY NAMES</sub></p>
      <p>Give a project a like, read the discussion, or sign in to post a comment. Account and profile features live alongside the gallery without becoming its focus.</p>
      <p><strong><a href="https://seiya058904.github.io/account.html">Account area →</a></strong></p>
    </td>
  </tr>
</table>

<a id="selected-work"></a>
## 🧩 Selected Work

A few entry points from the current gallery. Each project retains its own source, maintenance history, and release or deployment process; this website is the **index**, not a monolithic copy of every project.

| Project | A glimpse inside |
| --- | --- |
| **[🧬 INSTANCE](https://github.com/seiya058904/INSTANCE)** | An interactive narrative experience built for the browser. |
| **[🖥️ Hardware Monitoring](https://github.com/seiya058904/Hardware-Monitoring)** | A Windows overlay for live hardware readings and game-performance metrics. |
| **[🚴 Grand Tour](https://github.com/seiya058904/Grand-Tour)** | An interactive cycling-race simulation with its own presentation and race systems. |
| **[🌿 NutriFlow](https://github.com/seiya058904/NutriFlow)** | A local-first daily nutrition, weight, and hydration tracker. |

### 📖 Open an Explainer

Curious about how things work? Start with **[Microchips](https://seiya058904.github.io/ppt/chips.html)**, **[Planetary Defense](https://seiya058904.github.io/ppt/planetary-defense-changing-the-odds.html)**, or **[The Art of Cinema](https://seiya058904.github.io/ppt/the-art-of-cinema.html)**. The full collection lives in [`ppt/`](ppt/) and is available through the website's searchable catalogue.

> [!NOTE]
> The homepage displays a **curated selection** of works from this GitHub account. It does not automatically publish or mirror every repository. Projects linked from the gallery may have their own requirements, licenses, and availability.

<a id="how-it-works"></a>
## ⚙️ How It Works

The portfolio uses a small static frontend, with an independent API for features that need shared state.

```text
                    GitHub Pages
           HTML · CSS · browser JavaScript
                         │
               Browser interactions
                         │
                 Cloudflare Worker
                    /          \
                   /            \
             Supabase       Cloudflare KV
        Accounts · Profiles   Likes · Rate limits
               · Comments
```

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>🪟 Static by Design</h3>
      <p>The homepage and its presentations use HTML, CSS, and browser JavaScript, with no frontend framework build step. Desktop and mobile have separate layouts, sharing the project's content and interaction contracts.</p>
    </td>
    <td width="50%" valign="top">
      <h3>🔐 Services Where Needed</h3>
      <p>A TypeScript Cloudflare Worker handles the interaction API. Supabase supports authentication, profiles, and comments; Cloudflare KV holds decorative like counts and soft rate-limit state.</p>
    </td>
  </tr>
</table>

**A few deliberate boundaries:** the desktop experience includes switchable WebGL backgrounds, while mobile uses a lighter static backdrop. Account credentials and server-side database access stay out of the published frontend. Likes and comments are separate from the static presentation files.

<a id="run-locally"></a>
## 🚀 Run Locally

The public-facing frontend can be served directly from the repository root. No Vite, React, or frontend compilation step is required.

```powershell
npx serve . -l 4173
```

Open **http://127.0.0.1:4173/**. The source entry points include [`index.html`](index.html) for desktop, [`mobile.html`](mobile.html) for the mobile layout, and [`account.html`](account.html) for account management. A complete local test of likes, comments, and accounts additionally requires a correctly configured Worker and backend.

<details>
<summary><strong>🛠️ Expand architecture, tests &amp; Worker development</strong></summary>

### Repository map

```text
index.html / mobile.html    Desktop and mobile portfolio pages
account.html               Account and profile interface
css/ · js/                 Frontend styles and browser behavior
assets/                     Project artwork and presentation covers
ppt/                        38 standalone HTML presentations
ppt-likes-api/              TypeScript Cloudflare Worker API
supabase/                   Database setup and permissions SQL
tests/                      Node.js and Playwright checks
design-system/              Historical design guidance; verify against current UI
```

### Frontend verification

Install the repository's test dependencies and run a local static server before the browser-based checks:

```powershell
npm ci
npx serve . -l 4173
```

In another terminal, from the repository root:

```powershell
npm test
```

Tests cover catalogue and like-ID consistency, desktop/mobile presentation discovery, interactive filtering, and other browser and interface contracts. Browser tests need a usable Playwright/Chromium installation.

### Optional Worker development

The API is a separate project. For authorized local development, run:

```powershell
cd ppt-likes-api
npm ci
npm run dev
npm run typecheck
```

Local Worker development is **not deployment**. Worker publishing, database SQL application, secret changes, and production configuration updates are separate operations that require explicit authorization. Read [`ppt-likes-api/AGENTS.md`](ppt-likes-api/AGENTS.md) and [`COMMENTS_SETUP.md`](COMMENTS_SETUP.md) before changing authentication or data access.

### Integration contracts

The twelve project cards and thirty-eight presentation cards must retain matching IDs across the desktop and mobile pages, the [PPT catalogue](js/ppt-catalog.js), and the [Worker allowlist](ppt-likes-api/src/allowedLikeIds.ts). A new interactive card is not fully supported until the relevant frontend and Worker code are consistent and the Worker is separately deployed.

See [`AGENTS.md`](AGENTS.md), [`PRODUCT.md`](PRODUCT.md), and [`DESIGN.md`](DESIGN.md) for current development boundaries and presentation principles.

</details>

## 📜 Content & Attribution

The site collects different kinds of work under one portfolio. Linked repositories and presentation assets may have different attribution and reuse requirements; the rights of one project should not be assumed to apply to another. The root `package.json` declares ISC metadata, but there is no root `LICENSE` file covering every linked work or media asset.

---

<p align="center">
  <sub>PROJECTS TO EXPLORE. IDEAS TO SHARE. A SPACE THAT KEEPS GROWING.</sub><br>
  <sub>Seiya · Personal Web Space</sub>
</p>
