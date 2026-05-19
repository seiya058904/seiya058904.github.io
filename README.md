# seiya058904.github.io

我的个人技术主页，用来放学习过程中做的一些东西。

在线地址：[seiya058904.github.io](https://seiya058904.github.io)

---

前端是纯 HTML + CSS + JavaScript，后端用 Cloudflare Worker 做 API，数据库用了 Supabase 和 Cloudflare KV。部署在 GitHub Pages 上。

项目里包含了个人介绍、技能展示、28 个网页 PPT、几个项目卡片，还有评论和点赞功能，需要登录后才能评论。

### 本地跑起来

```bash
# 看页面
npx serve .

# 启动后端 API
cd ppt-likes-api && npm run dev

# 部署 Worker
npm run deploy
```
