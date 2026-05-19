# 评论区接入说明：使用已有 Supabase 项目

这份说明只针对当前个人网站的评论区。不要新建 Supabase 项目，也不要修改与你的网站无关的数据表。

## 1. 在已有 Supabase 项目运行 SQL

1. 打开 Supabase 后台。
2. 进入你已经创建好的项目。
3. 打开左侧的 SQL Editor。
4. 复制本仓库里的 `supabase/comments_init.sql` 内容。
5. 粘贴到 SQL Editor 并运行。

这个 SQL 只会新增 `public.comments` 表、索引、自动更新 `updated_at` 的 trigger/function，以及评论区需要的 RLS policy。

## 2. 复制 Supabase API 信息

在已有 Supabase 项目中打开 Project Settings / API，复制：

- Project URL，作为 `SUPABASE_URL`
- anon / public / publishable key，作为 `SUPABASE_ANON_KEY`
- service_role key，作为 `SUPABASE_SERVICE_ROLE_KEY`

安全规则：

- `SUPABASE_URL` 可以放前端，也要放 Worker。
- `SUPABASE_ANON_KEY` / publishable key 可以放前端，也要放 Worker。
- `SUPABASE_SERVICE_ROLE_KEY` 只能放 Cloudflare Worker secret。
- 不要把 `SUPABASE_SERVICE_ROLE_KEY`、数据库直连字符串、数据库密码写进前端、Git 或文档真实示例。

## 3. 前端配置

前端配置文件是 `js/comments-config.js`。

当前已经写入：

```js
SUPABASE_URL: "https://rqzaidftxbfdwlzqdtep.supabase.co"
SUPABASE_ANON_KEY: "sb_publishable_KENKUZq9ez-vrHXLXcDL9g_tmknacUf"
```

这里不能加入 `SUPABASE_SERVICE_ROLE_KEY`。

## 4. 设置 Supabase Auth URL

在 Supabase 后台进入 Authentication / URL Configuration。

设置 Site URL：

```text
https://seiya058904.github.io
```

设置 Redirect URLs：

```text
https://seiya058904.github.io/**
http://127.0.0.1:4173/**
http://localhost:4173/**
```

这些地址的作用是告诉 Supabase：登录、注册、邮箱验证之后，允许回到你的网站或本地测试页面。

## 5. 设置 Cloudflare Worker secrets

进入 Worker 目录后运行：

```bash
cd "D:\xia zai\AI project\5.13\my-personal-website\ppt-likes-api"
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_ANON_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

命令会逐个提示你粘贴值。

示例只写占位符，不要把真实 service role key 写进文件：

```text
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-or-publishable-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 6. 本地测试

先启动 Worker：

```bash
cd "D:\xia zai\AI project\5.13\my-personal-website\ppt-likes-api"
npm run dev
```

再启动前端静态服务：

```bash
cd "D:\xia zai\AI project\5.13\my-personal-website"
npx serve . -l 4173
```

打开：

```text
http://127.0.0.1:4173
```

检查：

- 不登录也能打开首页。
- 点赞按钮仍然正常。
- PPT 和 Project 卡片旁出现 `💬` 评论按钮。
- 点击 `💬` 可以打开评论浮窗。
- 未登录可以查看评论。
- 未登录发送评论会要求登录或注册。
- 注册后如果需要邮箱验证，会提示“请检查邮箱完成验证”。
- 登录后可以发送评论。

## 7. 部署 Worker

确认本地测试没问题后再部署：

```bash
cd "D:\xia zai\AI project\5.13\my-personal-website\ppt-likes-api"
npm run deploy
```

## 8. 推送 GitHub Pages

等你确认 Supabase SQL、Worker secrets 和本地测试都正常后，再提交并推送：

```bash
cd "D:\xia zai\AI project\5.13\my-personal-website"
git add .
git commit -m "Add Supabase comments"
git push
```

当前要求是不自动 commit / push，所以这些命令需要你确认后再执行。
