# 03 — Component Guidelines

> `main` 分支中真实存在的组件。只写主分支有的，不写实验分支的。

---

## 1. Navigation (Site Header)

### 结构
```
.site-header (sticky, top: 0, z-index: 20)
  .nav.container
    .brand (头像 + "seiya" 文字链接 → GitHub)
    .nav-links (ul → 关于我 / Skills / PPT / Projects)
    .account-nav-link (账户入口)
    .menu-toggle (移动端汉堡按钮)
```

### 规范
- **高度**: min-height: 68px
- **背景**: `rgba(255,255,255,0.86)` + backdrop-filter blur(18px)
- **导航链接**: 10px border-radius, 无 hover 背景色，仅变文字颜色
- **账户按钮**: 无特殊样式 → 使用 account-nav-link
- **汉堡菜单**: 仅在 ≤760px 显示

---

## 2. Hero

### 结构（base 层）
```
.hero.section.container
  .hero-mosaic (3 卡片网格)
    .hero-card.hero-card-intro
      h1.sr-only (SEO 隐藏标题)
      .hero-intro-visual > img + 两个 .hero-image-link 覆盖按钮
    .hero-card.hero-card-project
      ("Featured Project" + Hardware Monitoring 截图 + CTA)
    .hero-card.hero-card-stats
      (38 PPT / 6 Projects 统计)
```

### 结构（polish 层覆盖后）
```
.hero-shell (2 列: 1.15fr + 0.85fr)
  .hero-copy (文字 + meta 网格)
  .hero-aside
    .hero-panel.hero-panel-featured (深色卡片, 展示项目)
    .hero-panel.hero-panel-list (焦点列表)
```

### 关键标记
- Hero 区域的 H1 使用 `.sr-only` 类（视觉隐藏但可供屏幕阅读器）
- 封面图片使用 `fetchpriority="high"` 和 `<link rel="preload">`
- 两个 CTA 按钮覆盖在主视觉图上（`.hero-image-link`）

---

## 3. Showcase

### 结构
```
.section-showcase.reveal
  .showcase-inner
    .showcase-copy
      .showcase-kicker ("Featured Project")
      h2 (项目名称)
      p (项目描述)
      ul.showcase-points (功能列表)
      .btn.btn-primary (CTA)
    img.showcase-image (项目截图)
```

### 规范（polish 层）
- 2 列网格，深色背景（`rgba(19,25,37,0.98)` 渐变）
- 左侧文字白色，右侧截图带亮边框
- 使用 `.showcase-points` 小圆点列表展示功能

---

## 4. PPT Card

### 结构
```
article.card.project-card.ppt-card[.ppt-card-featured]
  .ppt-card-layout (grid: 1.08fr minmax(220px, 292px))
    .ppt-card-top
      p.ppt-kicker ("HTML PPT")
      h3 (标题)
      p (描述, max-width: 34ch)
    figure.ppt-cover
      img (5:4 aspect-ratio, object-fit cover, max-height: 210px, 22px radius)
  div.tags
    span (标签)
  a.btn.btn-small (查看 PPT)
```

### 规范
- **特色卡片（featured）**: grid-column: 1/-1, 更大标题, 更大封面
- **背景**: 径向渐变白底 + 1px 边框 + 阴影
- **封面**: object-fit cover + object-position top center，部分裁剪
- **hover**: 边框加深，无上移动画（仅 `.project-card` 有上移）
- **kicker**: "HTML PPT" 小号 uppercase 标签

### PPT 筛选机制
- 初始显示前 5 张
- 第 6-38 张移到 `.ppt-overflow-grid`（初始 `hidden`）
- 搜索/分类筛选时添加 `is-filtering` class
- 筛选结束后卡片移回 overflow grid

---

## 5. Project Card

### 结构（poster grid）
```
article.card.project-card
  figure.project-poster
    img.project-cover (height: clamp, object-fit cover, 18px radius)
  .project-card-body
    h3 (标题)
    p (描述)
    div.tags
    .card-actions (flex, space-between)
      a.btn.btn-small (查看项目/查看仓库)
      button.like-button (点赞)
```

### 规范
- **封面**: `height: clamp(300px,24vw,380px)`, object-fit cover
- **每项目一张卡片**，共 6 张
- **双按钮情况**: 最后两个项目（Relax-Block-Puzzle / Star Ring Card Battle）有 GitHub + 在线页面两个链接
- **hover**: `translateY(-6px)` + box-shadow 加深
- **点赞**: 通过 `initLikeModule()` 注入 `.like-button`

---

## 6. Button

### 变体
| 变体 | 背景 | 文字 | 边框 | 用途 |
|------|------|------|------|------|
| `btn-primary` | `#0066cc` | 白色 | 无 | 主要 CTA |
| `btn-ghost` | `#ffffff` | `#1d1d1f` | `#e0e0e0` | 次要操作 |
| `btn-small` | `rgba(0,102,204,0.06)` | `#0066cc` | `rgba(0,102,204,0.16)` | 卡片内操作 |
| `ppt-card .btn-small` | `#ffffff` | `#111214` | `rgba(15,23,42,0.08)` | PPT 卡片专用 |

### 规范
- pill 形状（999px radius）
- padding: 11px 22px（btn-small: 10px 16px）
- hover: translateY(-2px)
- active: scale(0.95)
- focus-visible: 3px outline（rgba(0,113,227,0.38)）

---

## 7. Like Button

### 结构
```html
<button class="like-button" aria-pressed="false" data-like-id="ppt-xxx">
  <span class="like-button__icon">♡</span>
  <span class="like-button__count">0</span>
</button>
```

### 规范
- pill 形状，无阴影
- min-width/height: 40px
- hover: 加深文字 + 边框
- aria-pressed="true": 更深的背景 + 边框
- disabled (loading): opacity 0.72
- active: scale(0.95)

---

## 8. Search & Filter（PPT Discovery）

### 结构
```
.ppt-discovery
  .ppt-search > input[type="search"]
  .ppt-categories > button.ppt-category (全部/科技/人物/...)
  p#pptResults (结果计数)
```

### 规范
- 独立卡片容器（border-radius: 22px, 白底, 阴影, backdrop-filter）
- 搜索框: 48px min-height, 15px radius
- 分类按钮: pill 形状, 40px min-height
- active 分类: 蓝色填充 #087bd3

---

## 9. Footer

### 规范
- 浅色 footer，border-top 分隔
- 内容：GitHub 链接 + 版权文字
- 色彩: `#667085`
- padding: 28px 0 40px

---

## 10. Mobile Layout

- 独立页面 `mobile.html`
- 独立样式表 `mobile-legacy.css`
- 桌面端通过 `redirect-mobile.js` 跳转到移动端
- 移动端通过 `redirect-desktop.js` 跳回桌面端
- 移动端布局: 单列网格，简化导航，触摸目标 ≥44px
- 断点: 760px
