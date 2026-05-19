# seiya058904.github.io

个人技术主页 / Personal tech homepage

在线访问 / Live at [seiya058904.github.io](https://seiya058904.github.io)

---

## 技术栈 / Tech Stack

- **前端 Frontend**: HTML + CSS + JavaScript，零构建步骤 / zero build step
- **后端 API Backend**: Cloudflare Worker (Hono + chanfana + OpenAPI)
- **数据库 Database**: Cloudflare KV (点赞 / likes) + Supabase (评论/comments, 认证/auth, 用户展示名/profiles)
- **部署 Deployment**: GitHub Pages (前端 / frontend) + Wrangler (Worker)

---

## 项目结构 / Project Structure

```
├── index.html              # 桌面端首页 / Desktop homepage
├── mobile.html             # 移动端首页 / Mobile homepage
├── account.html            # 账户页 / Account page
├── admin-likes.html        # 点赞管理后台 / Likes admin dashboard
├── css/                    # 6 个样式文件 / 6 CSS files
├── js/                     # 7 个 JS 模块 / 7 JS modules
├── ppt/                    # 28 个独立 HTML 展示页 / 28 HTML presentations
├── assets/                 # 图片和图标 / Images and favicon
├── supabase/               # SQL 初始化脚本 / SQL init scripts
└── ppt-likes-api/          # Cloudflare Worker
    └── src/
        ├── index.ts        # 路由 + 中间件 + OpenAPI / Routes + middleware
        ├── auth.ts         # 管理后台 HMAC-SHA256 token
        ├── cors.ts         # 来源白名单 / Origin whitelist
        ├── kv.ts           # 点赞计数读写 / Like count read/write
        ├── rateLimit.ts    # IP 限流 / IP-based rate limiting
        ├── supabase.ts     # Supabase REST API 封装 / Wrapper
        ├── types.ts        # Zod schema 定义 / Type definitions
        └── endpoints/      # 每个端点一个文件 / One file per endpoint
```

---

## API 端点 / API Endpoints

| 端点 Endpoint | 方法 Method | 说明 Description | 认证 Auth |
|---|---|---|---|
| `/api/health` | GET | 健康检查 / Health check | 公开 Public |
| `/api/likes` | GET | 获取所有点赞数 / Get all like counts | 公开 Public |
| `/api/like` | POST | 点赞/取消点赞 / Like or unlike | 公开（限流）Public (rate-limited) |
| `/api/comments` | GET | 获取评论 / List comments | 公开 Public |
| `/api/comments` | POST | 发表评论 / Create a comment | Supabase access token |
| `/api/profile` | GET/POST | 读取/修改展示名 / Read or update display name | Supabase access token |
| `/api/admin/login` | POST | 管理员登录 / Admin login | 密码 Password |
| `/api/admin/likes` | GET | 列出所有点赞 / List all likes | Bearer token |
| `/api/admin/likes/set` | POST | 设置点赞数 / Set like count | Bearer token |
| `/api/admin/likes/reset` | POST | 重置点赞数 / Reset like count | Bearer token |

---

## 本地开发 / Local Development

```bash
# 预览前端 / Preview frontend
npx serve .

# 启动本地 Worker / Start Worker locally
cd ppt-likes-api && npm run dev

# 部署 Worker / Deploy Worker
npm run deploy

# 类型检查 / Type check
npm run typecheck
```

---

## 版本历史 / Versions

- `5.1` — Profile Zod schema 升级、管理后台 schema 统一、错误信息脱敏、健康检查端点
- `5.0` — Supabase 评论系统、账户页、认证弹窗、用户展示名
