# 04 — Polish Opportunities

> 可做的小范围优化。每个优化应独立可回退，不涉及整站重构。

---

## P1. Hero 文案可更自然

**现状**：
```html
<h1>构建我的<br />数字空间</h1>
<p class="hero-subtitle">网页 PPT、项目展示与个人技术档案</p>
<p class="hero-intro">对计算机、AI 工具与英语感兴趣的个人开发者</p>
```

**方向**：
- 主标题可以更直接（如 "Projects and Web Decks"）
- 副标题可以更具体
- 但需保持中文为主（当前 `main` 全部中文，移动端也是中文）

**风险**：低。纯文案改动，不影响功能。

---

## P2. PPT 封面比例可微调

**现状**：
```css
.ppt-cover img {
  aspect-ratio: 5 / 4;
  max-height: 210px;
  object-fit: cover;  /* 裁切 */
  object-position: top center;
}
```

**问题**：5:4 比例 + cover 裁切导致部分图片顶部被裁（特别是 1536×1024 的图片）。

**方向**：
- 改为 3:2（更贴近源图 1.5~1.55 比例）
- 或改为 contain + 背景填充（v3 实验方案）
- 不能破坏现有卡片整体高度

**风险**：中。需要同步 mobile-legacy.css 和 is-filtering 规则。

---

## P3. 按钮与标签间距可优化

**现状**：PPT 卡片和项目卡片中，`.tags` 与 `.btn-small` 之间的间距由各卡片自行控制。

**方向**：
- 统一 `.tags` 的 margin-bottom
- 确保 `.card-actions` 与标签之间有明确的视觉分隔
- 确保移动端触摸目标 ≥44px

**风险**：低。纯 CSS 微调。

---

## P4. 背景可轻微增强

**现状**：polish 层使用径向渐变背景，但从 `#ffffff` 到 `#eef2f7` 过渡较平。

**方向**：
- 增加极浅的 grid overlay（48px 间距，opacity 0.01）——仅在 hero 区域可见
- 或增加极浅的 radial spotlight 在 hero 顶部
- 不能回到 v2 的吵闹背景

**风险**：低到中。需要评估是否增加页面复杂度。

---

## P5. 移动端适配优化

**现状**：mobile-legacy.css 与 desktop 分开发布，有时出现覆盖率不一致。

**方向**：
- 确保所有 desktop CSS 修改在 mobile-legacy.css 中有镜像
- 移动端按钮 touch target 统一为 44px
- 移动端卡片间距优化

**风险**：低。增量改进。

---

## P6. Section 标题大小写一致性

**现状**：导航栏中 "Skills" / "Projects" 使用英文，section 标题使用"技能 Skills"中英混排。

**方向**：统一策略（全中文或全英文），当前状态已可接受，不是高优先级。

**风险**：低。

---

## 不推荐的改动

以下改动收益低或风险高，不优先考虑：

- ❌ 重写 Hero 布局（当前 mosaic 是品牌特征）
- ❌ 引入新字体（Google Fonts 已加载 Bodoni Moda + Cormorant Garamond）
- ❌ 添加暗色模式（无使用场景）
- ❌ 添加页面过渡动画（多页浏览不需要）
- ❌ 重构 PPT 筛选机制（已通过 6 个 Playwright 测试）
- ❌ 合并 desktop/mobile 样式表（分离策略可独立迭代）
