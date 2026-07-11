# Code Audit Report

> 本文是修复前基线报告，不代表本轮针对性修复后的最终状态。

审计日期：2026-07-11
审计范围：当前 `main` 分支完整本地仓库，基线为 `fb64a51`，工作区在审计开始时干净。
审计方式：静态代码、配置、资源、Git 历史和本地可执行检查。未运行浏览器、Playwright、页面视觉检查、Worker 线上接口或数据库操作。

整改状态：本轮已在本地代码中完成评论权限收紧、密码恢复、WebGL BFCache/reduced-motion、管理员配置校验和相关文档/测试更新；`supabase/harden_comments_permissions.sql` 仍需人工确认后在生产 Supabase 执行。

## 1. 总体评分

**6.5 / 10：可维护，但存在需要安排修复的架构和安全风险。**

- 稳定性：6/10。点赞 KV 写入不是原子操作；账户登出调用没有本地错误兜底。
- 可维护性：7/10。目录结构清晰，但 CSS 叠加层较长，Agent 文档已出现漂移。
- 性能：5/10。桌面端预初始化三套 WebGL，资源目录 15.1 MiB，8 个图片超过 1 MiB。
- 安全：6/10。Supabase service role 未发现泄露，RLS 基本明确；管理员登录缺少独立限流，CDN 脚本未固定版本。
- 可访问性与 SEO：6/10。图片 alt、主要 landmark 和按钮语义基本存在；桌面端主动忽略 reduced-motion，且缺少 Open Graph / canonical 基础信息。

## 2. Critical 问题

当前没有确认的 Critical 问题。

## 3. High 优先级问题

### H1. 三套 WebGL 在首屏全部初始化，隐藏背景仍保留 GPU 资源和动画循环

- 证据：`js/bg-manager.js:523-557` 将 `initDarkVeil`、`initGrainient`、`initPlasma` 全部执行；每套背景创建 canvas、WebGL context、shader、program、buffer 和 `requestAnimationFrame` 循环。
- `showBg()` 只修改 `display`，隐藏背景停止 `drawArrays`，但没有销毁 context、program、shader、buffer 或 canvas。
- 清理函数被保存到 `cleanups`，但切换背景时从未调用；`canvases`、`cleanupFns` 也没有实际用途。
- 影响：首屏同时占用最多三套 GPU context 和对应资源；低端设备、浏览器 WebGL context 上限、后台切换和长期驻留页面存在风险。
- 建议：保留当前视觉效果，但改为“当前背景立即初始化，其他背景首次切换时 lazy initialization”；切换时保留已初始化实例，页面卸载或明确销毁时释放 WebGL 资源。需要先做浏览器/中低端设备验证。

### H2. KV 点赞计数是读后写，存在并发丢更新

- 证据：`ppt-likes-api/src/kv.ts:28-35` 先 `get` 当前值，再计算，再 `put` 新值。
- 两个请求同时读取相同计数时，后写入的结果会覆盖前一个请求，导致点赞或取消点赞丢失。
- 现有 rate limit 不能解决这个问题，因为它按 IP + itemId 限制请求，不是计数写入锁或原子操作。
- 建议：在接受可接受的架构复杂度范围内引入 Durable Object/外部原子计数方案，或明确把 KV 计数定义为近似值并补充监控；不要仅在前端重试。

### H3. 管理员登录接口没有独立的失败限流，且示例配置使用弱密码

- 证据：`ppt-likes-api/src/endpoints/adminLogin.ts:43-56` 只比较密码并签发 6 小时 token，没有登录失败次数、IP 窗口或锁定策略。
- 已跟踪的 `ppt-likes-api/.dev.vars.example:4` 写有 `ADMIN_PASSWORD=123456`。它不是生产 secret，但容易被直接复制为本地管理员密码。
- 管理员接口部署在公开 Worker 域名上，攻击者可以直接尝试 `/api/admin/login`。
- 建议：为管理员登录增加独立限流；把示例密码改为明显不可用的占位符，并在启动时拒绝占位值。

### H4. 桌面端主动忽略系统 reduced-motion 设置

- 证据：最近提交 `fbc9c1f` 删除了桌面端 `prefers-reduced-motion` 判断；当前 `js/main.js` 始终使用 smooth scroll，`css/style.css` 和 `js/pill-nav.js` 没有对应桌面端降级规则。
- 当前测试 `tests/ppt-discovery.test.js:77-81` 反而要求桌面端忽略 reduced-motion；这与 `PRODUCT.md` 中的 WCAG/reduced-motion 目标不一致。
- 影响：用户明确要求减少动画时，桌面端仍运行滚动、导航、卡片和 WebGL 动画。
- 建议：恢复桌面端 reduced-motion 支持，并把测试改成验证“动画关闭但内容和功能保留”。这属于可访问性修复，不需要改变正常用户的视觉效果。

## 4. Medium 优先级问题

### M1. 图片资源总量较大，移动端静态背景也超过 1 MiB

- `assets/` 共 41 个文件，总大小约 **15.10 MiB**。
- 8 个文件超过 1 MiB，最大为 `ChatGPT Image 2026年5月17日 23_42_09.png`，约 1.85 MiB；`page-bg.png` 约 1.64 MiB。
- 项目海报 PNG 包括约 1.28–1.74 MiB 的多张文件；这些资源虽然大多设置了 `loading="lazy"`，但会增加滚动加载流量和解码成本。
- `index.html` 的两个 hero 图片不 lazy，属于首屏必要资源；移动端 `page-bg.png` 作为背景资源没有进一步压缩证据。
- 未安装图像元数据/压缩检查工具，因此无法仅凭本地工具确认每张图片的压缩率或是否存在可无损优化空间。
- 建议：优先将项目海报和 `page-bg.png` 转为合适尺寸的 WebP/AVIF，并保留视觉等价回退；先测量 LCP/页面流量，再决定是否继续处理小图。

### M2. Supabase CDN 脚本未固定版本，也没有 SRI

- 证据：`index.html:881`、`mobile.html:806`、`account.html:76` 使用 `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`。
- `@2` 会跟随 major 版本下的更新；没有精确版本，也没有 `integrity` 校验。
- CSP 允许 `https://cdn.jsdelivr.net` 下的脚本，而不是一个精确资源。
- 建议：固定经过验证的具体版本并添加 SRI；升级时由测试和人工确认行为变化。

### M3. CSP 仍然偏宽，且页面依赖 `unsafe-inline`

- 四个页面的 `style-src` 都包含 `unsafe-inline`；主页和账户页的 `script-src` 允许整个 jsDelivr origin。
- `img-src https:` 允许任意 HTTPS 图片来源，当前页面实际使用的图片主要是同源资源。
- 这不是已确认的 XSS，但会降低 CSP 对未来误加外部资源或注入内容的约束能力。
- 建议：在不破坏动态样式的前提下逐步收紧来源；先固定 CDN，再评估 nonce/hash 或移除不必要的内联样式。

### M4. 管理员自定义 token 没有服务端撤销机制

- `ppt-likes-api/src/auth.ts:31-63` 使用自定义 HMAC token，过期时间 6 小时；前端存入 `sessionStorage`。
- 没有 token ID、撤销列表或管理员密码变更后的立即失效机制。
- 当前风险主要是 token 被盗后的有效窗口，不是 token 可伪造问题。
- 建议：在管理员使用频率增加、需要强制登出或密码轮换时，再引入 token 版本/撤销策略，避免当前阶段过度设计。

### M5. 异步登出失败可能产生未处理 Promise rejection

- `js/account.js:237-240` 的 click listener 是 async，直接等待 `window.MPWAuth.signOut()`，没有 `try/catch`。
- 网络异常或 Supabase 返回错误时，页面不会给出账户页内的失败状态。
- 建议：补充最小错误处理和用户可见状态，不需要重构账户状态流。

### M6. 对话框可访问性仍不完整

- 动态登录、评论、资料对话框设置了 `role="dialog"` 和 `aria-modal`，但未发现焦点陷阱、关闭后焦点恢复或 `aria-describedby` 的完整处理。
- 键盘 Escape 可以关闭，但键盘用户可能继续移动到背景页面元素。
- 建议：优先补焦点进入/恢复和 Tab 循环；保持现有对话框结构。

### M7. Agent 文档与实际代码存在漂移

- `AGENTS.md:23` 仍描述背景按钮切换“两套” WebGL，当前实际是三套。
- `CLAUDE.md:23` 写“13 个 JavaScript 模块”，当前 `js/` 有 14 个 JS 文件。
- `CLAUDE.md:46` 写测试有 9 个检查，当前 `tests/ppt-discovery.test.js` 有 8 个顶层 `test()`。
- `CLAUDE.md` 的测试描述仍把 reduced-motion 忽略策略列为预期行为，但产品文档要求 reduced-motion 支持。
- 建议：修复选定问题后统一更新 `AGENTS.md`、`CLAUDE.md` 和测试说明，避免只改一份。

## 5. Low 优先级建议

### L1. SEO 基础信息不完整

主页、移动页、账户页和后台页都有 title/description 的部分基础信息，但未发现 Open Graph、Twitter Card 或 canonical link。主页分享预览和搜索引擎规范化 URL 会受影响。

### L2. 返回顶部按钮缺少显式 `type="button"`

`index.html:874` 和 `mobile.html:801` 的 `#backToTop` 不在当前 form 内，因此现在通常不会造成提交问题；仍建议补上类型，避免未来 DOM 调整后变成默认 submit。

### L3. WebGL 管理器存在可删除的未使用状态

`js/bg-manager.js:17` 的 `cleanupFns`、`js/bg-manager.js:524` 的 `cleanups` 保存逻辑和 `canvases` 变量没有完成资源生命周期管理。要么实现统一清理，要么删除这些未使用状态，避免误导维护者。

### L4. CSS 叠加层较长，修改成本偏高

`css/style.css` 约 4093 行，`css/mobile-legacy.css` 约 1599 行，并包含多轮 chronological overrides。现有规则不应在没有视觉回归测试的情况下大规模合并；只在明确修复时添加最小末尾覆盖。

## 6. Git 历史与遗留问题

- 最近 8 次提交均集中在 2026-06-30 至 2026-07-01，主题是视觉效果、背景、导航、hero 资源和卡片发光。
- `641a3b4` 引入 Plasma 后，相关测试已更新为三 canvas，但 `AGENTS.md` 未同步更新。
- `fbc9c1f` 删除 desktop reduced-motion 支持，是当前可访问性风险的来源提交之一。
- `f9d934c` 修复了 WebGL 时间暂停和搜索 debounce，但修复方式仍保留了“三套预初始化、隐藏不释放”的整体架构。
- `1cf987c` 删除 hero 按钮，随后 `fb64a51` 给 hero intro 卡片增加 glow；这些提交未发现直接破坏数据属性或 API 合约的证据。
- 当前工作区与 `origin/main` 同步，无遗留未提交修改。

## 7. Supabase 与输入安全结论

- 前端使用 Supabase Auth 客户端和公开 publishable/anon key。该 key 出现在 `js/comments-config.js`，按 Supabase 公共客户端模型属于可暴露配置，不等同于 service role key。
- 未发现真实 Supabase service role key、数据库密码或 Worker secret 被提交；仓库内示例只包含 placeholder。
- `supabase/comments_init.sql`：评论表启用 RLS；匿名/登录用户只能读取 visible 评论，登录用户只能插入自己的评论，service role 具有后台权限。
- `supabase/profiles_init.sql`：资料表启用 RLS；公开读取资料，用户只能插入/更新自己的资料，service role 具有后台权限。
- Worker 先通过 Supabase Auth `/auth/v1/user` 验证 access token，再使用 service role 执行评论/资料操作，当前用户 ID 来自验证后的用户信息，授权链条逻辑一致。
- 前后端显示名规则基本一致，但 SQL 的 `[一-龥]` 字符范围比 JS/TypeScript 使用的 `\u4e00-\u9fff` 更窄，属于边界兼容风险。

## 8. Worker CORS、Rate Limit 与输入校验结论

- CORS 使用精确 origin 集合，生产和本地开发来源来自 `ALLOWED_ORIGIN` / `ALLOWED_DEV_ORIGINS`；未发现 wildcard `*`。
- `OPTIONS` 处理、允许方法和请求头已实现；没有配置 `Access-Control-Max-Age`，主要是性能优化项。
- likes/comments/admin itemId 都经过小写字母、数字、连字符正则和 allowlist 双重校验。
- 评论长度、显示名长度/字符集、管理员点赞数范围都有前后端校验。
- rate limit 使用 Cloudflare KV 的 `get` + `put`，按 `IP + itemId`、15 秒窗口限制；KV 的最终一致性和读后写竞争意味着它是近似防刷，不是严格限流器。
- 生产优先使用 `CF-Connecting-IP`；fallback 使用 `X-Forwarded-For` 首个值，在非 Cloudflare 代理环境下可被客户端伪造，应仅作为开发/受信代理 fallback。

## 9. 推荐修复顺序

1. 修复管理员登录失败限流，并把 `.dev.vars.example` 的 `123456` 改成不可用占位符。
2. 设计并验证 WebGL lazy initialization；保持当前背景视觉和切换体验不变。
3. 处理 KV 点赞并发一致性，先明确“精确计数”还是“近似计数”的产品要求。
4. 恢复 desktop reduced-motion 支持，并同步修改测试预期。
5. 固定 Supabase CDN 版本并收紧 CSP。
6. 优化 8 个大图，优先处理移动端 `page-bg.png` 和项目海报。
7. 补账户登出错误处理、对话框焦点管理和基础 SEO 元数据。
8. 最后统一更新 `AGENTS.md`、`CLAUDE.md`、README 与测试说明。

## 10. 验证记录

- `node --check`：通过，所有根目录 JavaScript 文件语法有效。
- `npm run typecheck`（`ppt-likes-api/`）：通过。
- `git status --short --branch`：审计前后均为 `main...origin/main`，无业务文件修改。
- `git diff --check`：通过；报告生成前没有业务 diff。
- 浏览器控制台、Playwright、截图、视觉检查：未执行，遵循项目 `AGENTS.md` 的限制。
- `npm test`：未执行，因为该测试会启动/连接 Playwright 浏览器，违反本项目本轮只读审计中的浏览器检查限制。
- `npm run build`：未执行；根目录没有 build script，Worker package 也没有 build script。

## 附录：复杂度审计

- `delete:` 删除 `js/bg-manager.js` 中未使用的 `canvases` / `cleanupFns` 状态，或让它们承担真实生命周期职责。
- `native:` 用浏览器原生 `loading="lazy"`、响应式图片和静态 CSS fallback 承担非首屏资源加载，避免把所有视觉资源交给首屏 WebGL/JS。
- `shrink:` 背景切换的实例管理可以收敛为“初始化一次、缓存一次、显示/隐藏一次”的最小状态机；当前三个初始化函数各自维护重复的 resize/RAF/暂停逻辑。

净复杂度削减潜力：未估算行数；不建议在修复并发、安全和可访问性问题前进行 CSS 或 WebGL 大规模重构。
