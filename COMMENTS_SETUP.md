# Comments and Profile Setup: use the existing Supabase project

This site uses:

GitHub Pages frontend -> Cloudflare Worker API -> Supabase Auth and Database

Do not create a new Supabase project. Use the existing project and only add the tables needed by this site.

## 1. Run SQL in the existing Supabase project

1. Open the Supabase dashboard.
2. Enter the existing project for this website.
3. Open SQL Editor.
4. Copy and run `supabase/comments_init.sql`.
5. Copy and run `supabase/profiles_init.sql`.

`comments_init.sql` creates the comments table and policies.
`profiles_init.sql` creates the public profile table and policies.

The `profiles` table only stores public profile data:

- `id`
- `display_name`
- `created_at`
- `updated_at`

Do not store email in `profiles`. The comment area shows `display_name`, not the full email and not the email prefix.
If a signed-in user does not have a profile yet, the Worker creates a default name like `User-A1B2`.

## 2. Copy Supabase API values

In the existing Supabase project, open Project Settings / API and copy:

- Project URL -> `SUPABASE_URL`
- anon / public / publishable key -> `SUPABASE_ANON_KEY`
- service_role key -> `SUPABASE_SERVICE_ROLE_KEY`

Security rules:

- `SUPABASE_URL` can be used in the frontend and Worker.
- `SUPABASE_ANON_KEY` / publishable key can be used in the frontend and Worker.
- `SUPABASE_SERVICE_ROLE_KEY` can only be stored as a Cloudflare Worker secret.
- Never write the service role key, database password, or database connection string into frontend files, Git, or real documentation examples.

## 3. Frontend config

Frontend config file:

```text
js/comments-config.js
```

Current public values:

```js
SUPABASE_URL: "https://rqzaidftxbfdwlzqdtep.supabase.co"
SUPABASE_ANON_KEY: "sb_publishable_KENKUZq9ez-vrHXLXcDL9g_tmknacUf"
```

Do not add `SUPABASE_SERVICE_ROLE_KEY` to this file.

## 4. Supabase Auth URL settings

In Supabase dashboard, open Authentication / URL Configuration.

Set Site URL:

```text
https://seiya058904.github.io
```

Set Redirect URLs:

```text
https://seiya058904.github.io/**
http://127.0.0.1:4173/**
http://localhost:4173/**
```

These URLs allow login, signup, password reset, and email verification to return to the site or local test page.

## 5. Cloudflare Worker secrets

In the Worker folder, run:

```bash
cd "D:\xia zai\AI project\5.13\my-personal-website\ppt-likes-api"
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_ANON_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

The command will ask you to paste each value.

Placeholder examples only:

```text
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-or-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Do not write the real service role key into this repository.

## 6. Local test

Start the Worker:

```bash
cd "D:\xia zai\AI project\5.13\my-personal-website\ppt-likes-api"
npm run dev
```

Start the static frontend:

```bash
cd "D:\xia zai\AI project\5.13\my-personal-website"
npx serve . -l 4173
```

Open:

```text
http://127.0.0.1:4173
```

Check:

- Home page opens without login.
- Like buttons still work.
- Comment buttons still appear.
- Comments modal opens and closes on desktop and mobile.
- Unauthenticated users can read comments.
- Sending a comment requires login.
- Signed-in users without a display name get a default public name automatically.
- Comments show display name only.
- Comments never show full email or email prefix.

## 7. Deploy Worker

After SQL and local tests are ready:

```bash
cd "D:\xia zai\AI project\5.13\my-personal-website\ppt-likes-api"
npm run deploy
```

## 8. Push GitHub Pages

After you confirm the local tests:

```bash
cd "D:\xia zai\AI project\5.13\my-personal-website"
git add account.html index.html mobile.html js/auth.js js/profile.js js/account.js js/comments.js css/auth.css css/account.css css/comments.css COMMENTS_SETUP.md supabase/profiles_init.sql ppt-likes-api/src
git commit -m "Add profile display names"
git push
```

Do not commit `.dev.vars`, `.wrangler`, temporary logs, service role keys, database passwords, or database connection strings.
