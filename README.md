# seiya058904.github.io

个人技术主页，用于展示我在学习和实践过程中完成的网页作品、项目实验和技术探索。

在线访问：  
https://seiya058904.github.io

## 项目简介

这是一个部署在 GitHub Pages 上的个人网站。前端使用纯 HTML、CSS 和 JavaScript 构建，不依赖大型前端框架。后端统一走 Cloudflare Worker API，数据按用途拆分：

- **Supabase** (PostgreSQL)：用户认证 (Auth)、评论 (comments)、展示名 (profiles)
- **Cloudflare KV**：点赞计数 (likes)、点赞 IP 限流 (rate limit)

网站包含个人介绍、技能展示、网页 PPT 作品、项目展示、评论系统、点赞系统和账户功能。

这个项目最初是一个静态个人主页，后来逐步加入了后端 API、登录注册、评论、公开昵称和互动数据存储，形成了一个轻量级的完整网站系统。

## 主要内容

- 个人介绍与技能展示
- 28 个网页 PPT / HTML 展示作品
- 项目作品展示
- 公共点赞功能
- 登录后评论功能
- Account / 我的 页面
- 昵称 display name 系统
- 移动端适配界面

## 技术栈

前端：

- HTML
- CSS
- JavaScript
- GitHub Pages

后端与数据：

- Cloudflare Worker
- Supabase Auth
- Supabase Database
- Cloudflare KV

当前架构：

```text
GitHub Pages 前端
↓
Cloudflare Worker API
↓
Supabase Auth / Supabase Database / Cloudflare KV
```

### 本地跑起来

```bash
# 看页面
npx serve .

# 启动后端 API
cd ppt-likes-api && npm run dev

# 部署 Worker
npm run deploy
```
