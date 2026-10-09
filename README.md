<div align="center">

# Seiya — Personal Web Space

**Projects, visual experiments and the ideas behind them.**

一个持续更新的个人技术主页：展示软件作品、网页 PPT、设计实验，也提供轻量互动功能。

[**Visit the website ↗**](https://seiya058904.github.io/) · [Browse the projects](https://github.com/seiya058904?tab=repositories) · [Digital Journal](https://seiya058904.github.io/seiya-digital-journal/)

![Frontend](https://img.shields.io/badge/frontend-HTML%20%C2%B7%20CSS%20%C2%B7%20JavaScript-3b82f6?style=flat-square) ![Hosting](https://img.shields.io/badge/site-GitHub%20Pages-57606a?style=flat-square)

<img width="680" alt="Seiya personal website artwork" src="https://github.com/user-attachments/assets/4ecea310-3921-467f-9c54-444adb64174b" />

</div>

## ✦ What you'll find / 这里有什么

| Area | Experience |
| --- | --- |
| **About & skills** | 个人介绍、技术方向和阶段性探索 |
| **Project gallery** | 独立 Web、软件工具、游戏与技术实验 |
| **Visual presentations** | 网页 PPT / HTML 可视化演示作品；具体数量以当前 `ppt/` 文件为准 |
| **Community interaction** | 点赞、登录后的评论、账户与公开展示名 |
| **Responsive interface** | 桌面和移动端分别适配的页面入口 |

这个仓库既是个人首页，也是一个持续扩展的作品入口。内容从静态项目展示起步，逐步增加了身份、互动和数据存储；并不是将所有作品代码合并到单个应用中。

## 🧩 How the site works / 技术结构

```text
                    GitHub Pages
          HTML · CSS · browser JavaScript
                          │
                          ▼
                 Cloudflare Worker API
                     ┌────┴────┐
                     ▼         ▼
               Supabase    Cloudflare KV
           Auth · comments   Likes · rate limits
                · profiles
```

- **Frontend:** 原生 HTML / CSS / JavaScript；无需前端构建框架。
- **API:** `ppt-likes-api/` 下的 Cloudflare Worker；接口层使用 TypeScript。
- **Storage:** Supabase 处理账户、评论及展示名；Cloudflare KV 处理点赞及其限流数据。
- **Deployment:** 前端由 GitHub Pages 发布；Worker 与数据库采用独立配置和部署流程。

前端与 Worker 分离，不能把 Worker 密钥、Supabase 服务端凭据或者开发用环境变量提交到 Git。

## 🚀 Run locally / 本地预览

前端可在仓库根目录启动静态服务器：

```powershell
npx serve . -l 4173
```

访问 `http://127.0.0.1:4173/`。以下入口属于同一前端站点：[`index.html`](index.html)、[`mobile.html`](mobile.html)、[`account.html`](account.html)。涉及账户、评论、点赞的完整本地联调还需要可用的 Worker / 后端配置。

Worker 的开发与部署命令需在其**独立子项目目录**执行：

```powershell
cd ppt-likes-api
npm ci
npm run dev
# 手动发布 Worker 前先核对环境配置与部署权限
# npm run deploy
```

仓库前端测试从根目录运行：

```powershell
npm test
```

## 📁 Explore the repository

| Location | Content |
| --- | --- |
| [`ppt/`](ppt/) | 独立网页演示与视觉讲解 |
| [`assets/`](assets/) | 项目图像、展示资源与站点素材 |
| [`css/`](css/), [`js/`](js/) | 前端样式和行为 |
| [`ppt-likes-api/`](ppt-likes-api/) | Cloudflare Worker 与 API 接口 |
| [`supabase/`](supabase/) | 数据库结构与相关 SQL |
| [`tests/`](tests/) | 前端与项目发现回归 |

更多维护细节见 [`AGENTS.md`](AGENTS.md)、[`PRODUCT.md`](PRODUCT.md) 与 [`DESIGN.md`](DESIGN.md)。

## Notes

这是个人项目与实验的展示空间，不代表所有项目都具有同样的授权或开源许可。使用其他仓库中的作品时，请分别查看它们的来源和许可声明。
