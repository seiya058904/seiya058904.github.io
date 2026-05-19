# seiya058904.github.io

Personal tech homepage — live at [seiya058904.github.io](https://seiya058904.github.io)

## Tech Stack

- **Frontend**: HTML + CSS + JavaScript, zero build step
- **Backend API**: Cloudflare Worker (Hono + chanfana + OpenAPI)
- **Database**: Cloudflare KV (likes) + Supabase (comments, auth, profiles)
- **Deployment**: GitHub Pages (frontend) + Wrangler (Worker)

## Project Structure

```
├── index.html              # Desktop homepage (hero, skills, 28 PPTs, 4 projects)
├── mobile.html             # Mobile homepage (auto-redirect under 760px)
├── account.html            # Account page (display name, sign out)
├── admin-likes.html        # Likes admin dashboard
├── css/                    # 6 CSS files (style, auth, comments, account, admin, mobile)
├── js/                     # 7 JS modules (main, auth, comments, profile, account, admin, config)
├── ppt/                    # 28 independent HTML presentation pages
├── assets/                 # Images and favicon
├── supabase/               # SQL init scripts (comments + profiles tables)
└── ppt-likes-api/          # Cloudflare Worker
    └── src/
        ├── index.ts        # Hono routes + CORS/auth middleware + OpenAPI
        ├── auth.ts         # HMAC-SHA256 admin token
        ├── cors.ts         # Origin whitelist
        ├── kv.ts           # KV read/write for like counts
        ├── rateLimit.ts    # IP-based like rate limiting
        ├── supabase.ts     # Supabase REST API wrapper
        ├── types.ts        # Zod schemas and type definitions
        └── endpoints/      # One file per API endpoint
```

## API Endpoints

| Endpoint | Method | Description | Auth |
|---|---|---|---|
| `/api/health` | GET | Health check | Public |
| `/api/likes` | GET | Get all like counts | Public |
| `/api/like` | POST | Like/unlike an item | Public (rate-limited) |
| `/api/comments` | GET | List comments | Public |
| `/api/comments` | POST | Create a comment | Supabase access token |
| `/api/profile` | GET/POST | Read/update display name | Supabase access token |
| `/api/admin/login` | POST | Admin password login | Password |
| `/api/admin/likes` | GET | List all likes | Bearer token |
| `/api/admin/likes/set` | POST | Set like count | Bearer token |
| `/api/admin/likes/reset` | POST | Reset like count | Bearer token |

## Local Development

```bash
# Preview frontend
npx serve .

# Start Worker locally
cd ppt-likes-api && npm run dev

# Deploy Worker
npm run deploy

# Type check
npm run typecheck
```

## Versions

- `5.1` — Profile Zod schema, admin likes schema unification, error message desensitization, health endpoint
- `5.0` — Supabase comments, account page, auth modal, display names
