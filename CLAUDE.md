# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

部署到 GitHub Pages 的个人技术主页 (`seiya058904.github.io`)。包含个人介绍、技能展示、28 个网页 PPT、6 个项目卡片、用户认证、评论系统和点赞功能。

## 技术栈

- **前端**: 纯 HTML + CSS + JavaScript，无框架、无构建步骤
- **后端 API**: Cloudflare Worker (Hono + chanfana + OpenAPI)，数据存储在 Cloudflare KV 和 Supabase
- **认证/评论/用户**: Supabase Auth + PostgreSQL
- **部署**: GitHub Pages (主页); `wrangler deploy` → `ppt-likes-api.seiya-api.workers.dev` (API)

## 项目目录

| 目录/文件 | 内容 |
|---|---|
| `index.html` / `mobile.html` | 桌面端和移动端首页 |
| `account.html` / `admin-likes.html` | 账户页和点赞管理后台 |
| `css/` | 7 个 CSS 文件（`style.css` + `mobile-legacy.css` 主样式，其余为组件样式） |
| `js/` | 14 个 JavaScript 模块（IIFE，通过 `window.*` 共享配置） |
| `assets/` | 运行时图片、图标、项目海报、PPT 封面 |
| `ppt/` | 28 个独立 HTML 演示文稿，由首页卡片链接 |
| `ppt-likes-api/` | Cloudflare Worker 后端（Hono + chanfana + Zod） |
| `supabase/` | SQL 初始化文件（手动执行，无迁移工具） |
| `tests/` | Node + Playwright 端到端测试 |
| `design-system/` | 设计系统笔记（基于 `6f47e72`，先核对再使用） |

## 本地运行

```bash
# 主页预览
npx serve . -l 4173

# API 本地开发 (ppt-likes-api/ 目录下)
npm run dev          # wrangler dev, 默认 http://localhost:8787
npm run cf-typegen   # wrangler types 生成类型定义
npm run typecheck    # tsc --noEmit 类型检查
npm run deploy       # 部署 Worker 到生产环境
```

完整本地测试：先 `npm run dev` 启动 Worker，再 `npx serve . -l 4173` 启动前端。访问 `http://127.0.0.1:4173`。

运行 `npm test` 可执行 `tests/ppt-discovery.test.js` 中的 21 个检查（含 Playwright 浏览器测试）。**前置条件：** 先启动前端预览服务（`npx serve . -l 4173` 或设置 `TEST_BASE_URL` 环境变量），否则浏览器测试会失败。测试涵盖：data-like-id 四源同步、LCP preload 标记、核心页面 SEO/CDN 元数据、账户登出异常处理、评论权限与邮箱保护、密码恢复、管理员配置与 OpenAPI、账户/后台 noindex、桌面端/移动端筛选交互、分类+文本组合筛选、药丸导航动画、ShinyText 文字效果、WebGL 背景暂停/恢复、BFCache 与 reduced-motion 支持。

## 页面结构

多页面结构，共享 `css/` 和 `js/` 目录：

| 页面 | 用途 |
|---|---|
| `index.html` | 桌面端首页：hero、关于我、Skills、28 个 PPT、6 个项目卡片 |
| `mobile.html` | 移动端首页（760px 以下自动重定向） |
| `account.html` | 用户账户页：展示名修改、登出 |
| `admin-likes.html` | 点赞管理后台（密码登录，查看/修改点赞数） |

所有页面均添加了 Content-Security-Policy meta 标签（script-src 无 unsafe-inline，inline 重定向脚本已外置）。

## CSS 架构

有**两个**共享 CSS 文件，修改时两者都需要同步覆盖：

| 文件 | 用途 |
|---|---|
| `css/style.css` | 主样式表，包含三层设计系统（见下方） |
| `css/mobile-legacy.css` | 移动端兼容专用样式表 |

其他组件样式：`auth.css`（登录弹窗）、`comments.css`（评论区）、`account.css`（账户页）、`admin-likes.css`（后台）、`border-glow.css`（卡片边框发光）。

### 设计系统三层叠加

`style.css` 中有三个层叠的设计迭代，从下到上覆盖：

1. **基础层**（顶部）—— `:root` 变量，`.grid`/`.card`/`.ppt-card` 基础规则
2. **Homepage redesign v2**（约 line 1694）—— 引入 `--font-serif-ui` 等变量，Apple 风格调整
3. **Low-risk portfolio polish**（约 line 2727）—— 引入 `--portfolio-display` / `--portfolio-font`，简化 border-radius 和阴影，最新的视觉覆盖

修改 CSS 时，添加规则到**文件末尾**（最新的覆盖层），不要在中间插入，避免被后面的规则意外覆盖。

### 字体策略

- 标题 display 字体：`--portfolio-display` 变量，中文优先（Noto Serif SC → Songti SC → SimSun），英文优雅衬线（Cormorant Garamond → Bodoni Moda）
- 正文字体：`--portfolio-font` 变量，系统无衬线 + Noto Sans SC + Microsoft YaHei

### PPT 筛选状态的特殊规则

当用户选择分类或搜索时，JS 给 `.ppt-grid` 和 `.ppt-overflow-grid` 添加 `is-filtering` class。
CSS 中有一组 `.ppt-grid.is-filtering .ppt-card-featured` 规则，用于在筛选状态下把 featured 卡片折叠为普通卡片布局：
- `grid-column: auto`（不跨列）
- 内部 `.ppt-card-layout` 恢复普通两列比例
- 标题字号和封面尺寸恢复普通卡片值

修改筛选相关布局时，必须在 `style.css` **和** `mobile-legacy.css` 中同时添加对应的规则。

## JavaScript 模块

每个 JS 文件是一个 IIFE，通过 `window` 对象（如 `window.MPW_COMMENTS_CONFIG`、`window.PPT_CATALOG`）共享配置。

| 文件 | 职责 |
|---|---|
| `js/main.js` | 桌面端所有交互：菜单、滚动动画、PPT 展开/收起/分类筛选/搜索、点赞 |
| `js/ppt-catalog.js` | PPT 分类目录数据（28 条记录，含 category 和 tags），导出为 `window.PPT_CATALOG` |
| `js/auth.js` | Supabase Auth 客户端：登录/注册/登出/会话管理 |
| `js/comments.js` | 评论区 UI（需登录后才能发评论） |
| `js/profile.js` | 用户展示名验证和修改 |
| `js/account.js` | 账户页交互 |
| `js/admin-likes.js` | 后台点赞管理 |
| `js/comments-config.js` | Supabase URL 和 anon key 配置（Git 已跟踪，只含公开 key）；客户端 CDN 固定为 `@supabase/supabase-js@2.110.1` |
| `js/redirect-mobile.js` | 桌面端 → 移动端重定向 |
| `js/redirect-desktop.js` | 移动端 → 桌面端重定向 |
| `js/bg-manager.js` | 桌面端独有 WebGL 背景管理器（`index.html` 加载，mobile 使用 `assets/page-bg.webp`） |
| `js/pill-nav.js` | 桌面端药丸导航悬停效果 + 滚动监听（仅 ≥761px 激活） |
| `js/border-glow.js` | 卡片边框发光效果（注入 `.edge-light` + `.border-glow-inner`） |

### 脚本加载顺序

前端 JS 文件通过 IIFE + `window.*` 对象共享配置，HTML 中 `<script>` 的加载顺序不可随意调换。`comments-config.js`（Supabase 公钥）必须在 `auth.js`、`comments.js` 之前加载；`ppt-catalog.js` 必须在 `main.js` 之前加载。

### PPT 筛选机制

1. `main.js` 在 DOM 加载后将第 6~28 张 PPT 卡片剪切到独立的 `.ppt-overflow-grid`（初始 `hidden`）
2. 分类点击或搜索输入触发 `updateFilter()`：给 `.ppt-overflow-grid` 和 `.ppt-grid` 添加 `is-filtering` class，将所有卡片从 overflow grid 移回主 grid 实现单一容器排列
3. 筛选结束后卡片移回 overflow grid，`is-filtering` class 移除
4. 初始只显示前 5 张，点击"展开全部"显示全部 28 张

## API 架构 (`ppt-likes-api/`)

Cloudflare Worker + OpenAPI（chanfana 自动生成文档）：

| 端点 | 方法 | 描述 | 认证 |
|---|---|---|---|
| `/api/health` | GET | 健康检查 | 公开 |
| `/api/likes` | GET | 获取所有点赞数 | 公开 |
| `/api/like` | POST | 点赞/取消点赞 | 公开（IP 限流） |
| `/api/comments` | GET | 获取评论列表 | 公开 |
| `/api/comments` | POST | 创建评论 | Supabase access token |
| `/api/profile` | GET | 读取用户展示名 | Supabase access token |
| `/api/profile` | POST | 更新展示名 | Supabase access token |
| `/api/admin/login` | POST | 管理员密码登录 | 密码 |
| `/api/admin/likes` | GET | 列出所有点赞 | Bearer token |
| `/api/admin/likes/set` | POST | 设置单个点赞数 | Bearer token |
| `/api/admin/likes/reset` | POST | 重置点赞数为 0 | Bearer token |

`src/` 结构：
- `index.ts` — Hono 路由注册 + CORS/认证中间件 + OpenAPI 挂载
- `allowedLikeIds.ts` — 允许的 `data-like-id` 白名单（需与 HTML、ppt-catalog.js 同步）
- `auth.ts` — 管理后台 HMAC-SHA256 token（6h 过期）
- `cors.ts` — `ALLOWED_ORIGIN` / `ALLOWED_DEV_ORIGINS` 白名单
- `kv.ts` — KV 读写操作（`likes:` 前缀 key）
- `rateLimit.ts` — 点赞 IP 限流（15s 窗口，按 IP+itemId，KV 近似）
- `supabase.ts` — Supabase REST API 封装（评论 CRUD、用户展示名）
- `types.ts` — Zod schema 和类型定义
- `endpoints/` — 每个 API 端点一个独立 class（10 个文件）

## 数据流要点

- **点赞**: 乐观更新 UI → `POST /api/like` → 同步服务端计数。`localStorage`（key 前缀 `mpw-like-v1:`）只读当前浏览器是否点过赞，不用于公共计数
- **评论**: Supabase Auth 登录 → 获取 access token → Bearer 传给 Worker → Worker 用 service role key 写入 Supabase；公开查询不得暴露 `user_email`，评论写入只允许经 Worker 完成
- **展示名**: 首次访问账户页或发表评论时通过 `ensureUserProfile` 自动创建（`User-{UUID 前 4 位}`）。用户可在账户页修改

## 数据同步红线

**`data-like-id` 值必须在以下 4 个文件中保持完全一致**（增删改任何一个都需要同步更新其他全部）：

| 文件 | 作用 |
|---|---|
| `index.html` 和 `mobile.html` | 前端卡片标记 `data-like-id` 属性 |
| `js/ppt-catalog.js` | PPT 分类目录数据的 key |
| `ppt-likes-api/src/allowedLikeIds.ts` | API 白名单校验 |

格式：`ppt-{slug}` 或 `project-{slug}`，仅允许小写字母、数字、连字符。

## 数据库（Supabase PostgreSQL）

`supabase/` 目录包含 SQL 初始化文件和迁移：

| 文件 | 内容 |
|---|---|
| `comments_init.sql` | 建 `comments` 表、索引、RLS 策略 |
| `profiles_init.sql` | 建 `profiles` 表、RLS 策略 |
| `fix_search_path.sql` | 修复 Security Advisor 警告：为 trigger 函数显式设置 `search_path = public` |

纯 SQL 变更只需提交 SQL 文件，手动在 Supabase Dashboard 执行；本轮权限修复使用 `supabase/harden_comments_permissions.sql`，不会由本地脚本自动执行。

## 安全约定

- Supabase service role key **禁止**写入前端文件或 Git，仅通过 `wrangler secret put` 设置
- Worker 机密（ADMIN_PASSWORD, ADMIN_TOKEN_SECRET, SUPABASE_SERVICE_ROLE_KEY）仅通过 `c.env.*` 引用
- API base URL 根据 `window.location.hostname` 自动切换：`github.io` → 生产 Worker URL，否则 → `http://localhost:8787`
- `.dev.vars` 和 `.wrangler/` 已加入 `.gitignore`

## 编码风格

- **前端（HTML/CSS/JS）**：2 空格缩进，`camelCase` 命名
- **Worker（TypeScript）**：Tab 缩进，严格类型（`strict: true`），`PascalCase` 路由类名
- API 响应结构、`<script>` 加载顺序和 CSP/CORS 配置不可随意变更；Supabase CDN 版本变更需同步三页并运行测试
- `ppt-likes-api/worker-configuration.d.ts` 由 `wrangler types` 自动生成，**禁止手动编辑**；绑定性变更后通过 `npm run cf-typegen` 再生
- comments 公共查询禁止暴露邮箱，comments 只能经 Worker 写入；WebGL 必须兼容 BFCache 和 reduced-motion
- 无前端构建/打包/lint/格式化步骤，无 CI 配置

## 预提交检查清单

- 运行 `git status`、`git diff`、`git diff --stat` 确认只包含目标文件
- 排除 secrets、日志、缓存、调试输出和生成文件（`.dev.vars`、`.wrangler/`、`.claude/`、`*.log`）
- 运行 `npm test` 并说明任何跳过项的原因
- 受影响时重新检查：desktop/mobile 对等性、CSP/CORS、API 合约、data-like-id 四源同步
- 确认已获得明确的 commit/push 授权

## Git 约定

- 提交消息用英文，首字母大写
- Worker 代码改动需要 `npm run deploy` + commit + push
- 纯前端改动（HTML/JS/CSS）只需 commit + push，不部署 Worker
- 纯 SQL 变更只需提交 SQL 文件，手动在 Supabase Dashboard 执行
- 不要提交 `.dev.vars`、`.wrangler/`、`.claude/`、`*.log`、`参考图片/`、`design-md/`
