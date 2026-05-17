# PPT Likes API Setup

## Worker API address

Replace the placeholder in the frontend config with your deployed Worker URL:

`https://ppt-likes-api.seiya-api.workers.dev`

For local testing, use:

`http://127.0.0.1:8787`

## KV commands

Create the production namespace:

```bash
npx wrangler kv namespace create LIKES_KV
```

Create a preview namespace if you want one:

```bash
npx wrangler kv namespace create LIKES_KV --preview
```

## Local development

1. Copy `.dev.vars.example` to `.dev.vars`
2. Set your local admin credentials in `.dev.vars`
3. Start the Worker:

```bash
npx wrangler dev
```

4. Start your static site locally, for example on `http://127.0.0.1:4173`
5. Open the homepage and test the like buttons
6. Open `admin-likes.html` and log in with your local admin password

## Deploy

```bash
npx wrangler deploy
```

## `wrangler.toml` example

See [wrangler.toml.example](./wrangler.toml.example).

## JavaScript Worker example

This is an equivalent JavaScript version of the Worker core logic:

```js
import { Hono } from "hono";

const app = new Hono();
const likeIdPattern = /^[a-z0-9-]+$/;
const LIKE_KEY_PREFIX = "likes:";

function splitOrigins(value) {
  return (value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

function getAllowedOrigins(env) {
  const productionOrigins = splitOrigins(env.ALLOWED_ORIGIN);
  const devOrigins = env.ENVIRONMENT === "development" ? splitOrigins(env.ALLOWED_DEV_ORIGINS) : [];
  return new Set([...productionOrigins, ...devOrigins]);
}

function getCorsOptions(origin, env) {
  const headers = new Headers({
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  });

  if (!origin) return { allowed: true, headers };
  if (getAllowedOrigins(env).has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    return { allowed: true, headers };
  }

  return { allowed: false, headers };
}

app.use("/api/*", async (c, next) => {
  const cors = getCorsOptions(c.req.header("Origin"), c.env);
  if (!cors.allowed) {
    return c.json({ success: false, error: "Origin not allowed" }, 403, cors.headers);
  }

  if (c.req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors.headers });
  }

  await next();
  cors.headers.forEach((value, key) => c.res.headers.set(key, value));
});

app.get("/api/likes", async (c) => {
  const likes = {};
  let cursor;

  do {
    const page = await c.env.LIKES_KV.list({ prefix: LIKE_KEY_PREFIX, cursor });
    cursor = page.list_complete ? undefined : page.cursor;

    await Promise.all(page.keys.map(async ({ name }) => {
      const rawCount = await c.env.LIKES_KV.get(name);
      likes[name.slice(LIKE_KEY_PREFIX.length)] = Math.max(0, parseInt(rawCount || "0", 10) || 0);
    }));
  } while (cursor);

  return c.json({ success: true, likes });
});

app.post("/api/like", async (c) => {
  const body = await c.req.json();
  if (!likeIdPattern.test(body.itemId || "")) {
    return c.json({ success: false, error: "Invalid itemId" }, 400);
  }
  if (!["like", "unlike"].includes(body.action)) {
    return c.json({ success: false, error: "Invalid action" }, 400);
  }

  const key = `${LIKE_KEY_PREFIX}${body.itemId}`;
  const currentCount = Math.max(0, parseInt((await c.env.LIKES_KV.get(key)) || "0", 10) || 0);
  const nextCount = body.action === "like" ? currentCount + 1 : Math.max(0, currentCount - 1);

  await c.env.LIKES_KV.put(key, String(nextCount));
  return c.json({ success: true, itemId: body.itemId, count: nextCount });
});

export default app;
```

## Frontend API config

In the homepage script, fill the production API base with your Worker URL:

```js
const LIKES_API_BASE = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost"
  ? "http://127.0.0.1:8787"
  : "https://ppt-likes-api.seiya-api.workers.dev";
```

## Quick API tests

```bash
curl http://127.0.0.1:8787/api/likes
```

```bash
curl -X POST http://127.0.0.1:8787/api/like ^
  -H "Content-Type: application/json" ^
  -d "{\"itemId\":\"ppt-ai-impact-on-modern-life\",\"action\":\"like\"}"
```
