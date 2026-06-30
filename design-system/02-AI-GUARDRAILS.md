# 02 — AI Guardrails

> 硬禁止和允许清单。任何 AI 工具修改本网站时不得越过这些边界。

## 规则

1. **禁止列表**中的项是硬性约束，没有例外
2. **允许列表**中的项是优先采用方案
3. **守卫列表**中的项是边界提醒，AI 需要检查自己的输出

---

## 🚫 禁止 (Hard Ban)

### 设计模式

- ❌ 渐变文字（`background-clip: text + gradient`）
- ❌ 毛玻璃作为默认卡片背景（backdrop-filter: blur）
- ❌ Hero 指标模板（大数字 + 小标签 + 统计，覆盖现有 hero 结构）
- ❌ 相同卡片网格重复（icon + heading + text 无限重复的三列网格）
- ❌ 嵌套卡片（卡片内放卡片）
- ❌ Bento 网格（碎片化的不同大小盒子拼贴）
- ❌ Hero 全屏模式（大标题 + 背景图/视频 的 landing page hero）
- ❌ Dashboard 模拟（纯前端伪造的后台仪表盘）
- ❌ AI 插画（手绘风格 SVG、doodle、feTurbulence 滤镜）
- ❌ 侧边彩色条装饰（border-left/border-right > 1px 作为装饰）
- ❌ 卡片 border-radius ≥ 32px（pill 只用于标签和按钮）

### 颜色

- ❌ AI 色板（purple-violet gradients + cyan-on-dark）
- ❌ Cream / Beige / Sand 背景
- ❌ 紫色/青色渐变为默认
- ❌ 渐变作为装饰（非语义用途）

### 排版

- ❌ Display heading letter-spacing < -0.04em
- ❌ 过大的 H1（占满整个视口）
- ❌ 斜体衬线作为 hero 标题默认（Fraunces / Recoleta / Playfair Display）
- ❌ AI 过度使用字体（Inter / Roboto / Geist / Plus Jakarta Sans / Space Grotesk）
- ❌ 扁平层次（字号差距过小，如 14/15/16px）
- ❌ 正文全大写
- ❌ 正文行宽 > 80 字符
- ❌ 正文 < 14px
- ❌ 用户缩放禁止（user-scalable=no）

### 动效

- ❌ Bounce / Elastic 缓动
- ❌ Layout 属性动画（width/height/top/left/margin）
- ❌ 每次滚动触发的重复 fade-rise 动画
- ❌ 忽略 prefers-reduced-motion
- ❌ 交互反馈时长 > 500ms（入场动效除外）

### 按钮

- ❌ 1px border 同时 + 宽阴影（≥16px blur）——两者择一
- ❌ > 2 种按钮变体在同一页面（btn-primary / btn-ghost / btn-small 已覆盖）

### 文案

- ❌ 营销用词（streamline / empower / supercharge / world-class / cutting-edge）
- ❌ AI 腔调（"Herding pixels" / "Teaching robots to dance" / "Consulting the magic 8-ball"）
- ❌ 警句式节奏（"Not a feature. A platform." 等对比句式出现 ≥ 3 次）
- ❌ Em-dash 过度使用（一段中超过 2 个 em-dash）
- ❌ Emoji 作为结构性图标（导航、设置、系统控制中）

### 技术

- ❌ Fake/Mock 数据（伪统计、伪仪表盘）
- ❌ 断裂的图片引用（empty src / 占位 src / 404 图片）
- ❌ 硬编码颜色值（必须使用 `:root` token）
- ❌ px 作为正文字号单位（使用 rem）
- ❌ CSS z-index: 999 或 9999
- ❌ 覆盖已测试的筛选/搜索/点赞功能

---

## ✅ 允许 (Always Allow)

### 设计模式

- ✅ 真实截图（产品截图、项目截图、PPT 封面）
- ✅ Hairline 分隔线（1px border 作为内容边界）
- ✅ 白色卡片 + 1px 边框
- ✅ Grid 布局
- ✅ 不对称布局（网格比例不对称）
- ✅ Section 之间使用 border-block 分隔
- ✅ sticky header
- ✅ card-actions 放 CTA + like-button

### 颜色

- ✅ 主题蓝 #0066cc / #0071e3 作为主色
- ✅ 浅色渐变背景（如 `.ppt-head-stat` 的 radial-gradient）
- ✅ 极轻的纯色 tint（如 rgba(0,102,204,0.06)）
- ✅ hover 加深边框 + 轻微上移

### 排版

- ✅ text-wrap: balance 用于标题
- ✅ text-wrap: pretty 用于段落
- ✅ clamp() fluid sizing 用于标题
- ✅ rem 用于正文字号
- ✅ 系统字体（-apple-system, Segoe UI, Noto Sans SC）
- ✅ 正文 line-height 1.6-1.75
- ✅ 标题 max-width 限制
- ✅ 衬线字体用于装饰性数字（Bodoni Moda / Cormorant Garamond）

### 动效

- ✅ ease-out 缓动
- ✅ 160ms 按钮反馈
- ✅ 240ms 卡片 hover（上移 + 阴影加深）
- ✅ 200ms 筛选/搜索过渡
- ✅ transform 和 opacity 动画
- ✅ prefers-reduced-motion 支持

### 布局

- ✅ 4pt base 间距系统
- ✅ min(100% - 3rem, max-width) 容器宽度
- ✅ clamp() 间距
- ✅ auto-fill/minmax 自适应网格
- ✅ 44px 触摸目标

### 技术

- ✅ 纯 HTML + CSS + JavaScript
- ✅ Cloudflare Worker API
- ✅ Supabase Auth + PostgreSQL
- ✅ Optimistic UI 更新（点赞）
- ✅ CSS Grid Layout
- ✅ Intersection Observer（reveal 动画）
- ✅ data-* 属性用于 JavaScript 选择

---

## ⚠️ 守卫 (Watch List)

以下模式不是绝对禁止，但 AI 需要检查自己的输出：

- **Section 交替背景** — 需要确认有明确的节奏逻辑
- **Kicker 使用频率** — 页面中 kicker 出现 1-2 次是品牌，每个 section 都用是 AI 模板
- **卡片阴影** — 如果使用 box-shadow，不能同时使用 1px border
- **卡片半径** — 如果使用 16px+ 的半径，需要确认与现有组件一致
- **Grid gap** — 所有 gap 值必须来自间距系统
- **Hover 动效** — 不能导致布局抖动
- **自定义字体** — 如需引入新字体，需要 FOUT/CLS 影响评估
