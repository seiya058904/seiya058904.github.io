# 00 — Current Main Baseline

> `main` 分支（6f47e72）的实际视觉状态。
> 所有设计决策以这里为准，不依据任何实验分支。

## 总览

main 经历了多次 polish 迭代，当前设计是**两轮覆盖的成果**：
- **Base layer**（`:root` → line 947）：Apple 风格的干净卡片 + 毛玻璃 section + 圆角按钮
- **Polish layer**（line 948 → 约 1437）：更深的暗色 showcase、更大胆的标题字距、更精炼的渐变

两层叠加形成最终视觉。

## 首页结构

### 1. Hero（三卡片 Mosaic 布局）

当前 hero 使用 `.hero-mosaic` 网格容器，包含 3 张卡片：

| 卡片 | 内容 |
|------|------|
| 左/主卡片 (`hero-card-intro`) | 首屏主视觉图 + "查看项目"/"浏览 PPT" 两个叠加链接按钮 |
| 中卡片 (`hero-card-project`) | Featured Project：Hardware Monitoring 截图 + CTA |
| 右卡片 (`hero-card-stats`) | 统计：28 PPT / 6 Projects |

**Polish 层覆盖后**：hero 变为 2 列 shell（`.hero-shell`）+ 右侧暗色面板（`.hero-panel-featured`）+ 焦点列表 + 元数据网格。

**关键标记**：hero 页面包含 `<h1 class="sr-only">Seiya 的个人技术作品集</h1>`（视觉隐藏，用于 SEO）。

### 2. About（4 卡片网格 → polish 层改为 2 列）

Base：3 张 about-card（我在做什么 / 现在的重点 / 希望达到的状态）。
Polish 层：改用 `.about-grid`（1.35fr + 0.65fr）+ `.about-note`。

### 3. Skills（4 列卡片网格）

4 张卡片：Web 基础 / 编程学习 / 计算机基础 / 英语学习。
Polish 层：每张卡片使用不同的彩色渐变 tint。

### 4. PPT 展示（28 张卡片，2 列网格 + featured 首张跨列）

- `.section-head-ppt`：左侧标题文字 + 右侧大号衬线数字（28）
- `.ppt-discovery`：搜索 + 分类 pill 按钮
- `.ppt-grid`：2 列卡片网格，首张 `.ppt-card-featured` 跨列
- 初始显示 5 张，overflow 机制显示剩余 23 张
- 卡片内含：kicker（"HTML PPT"）、标题、描述、封面图、标签、操作按钮

### 5. Project（6 张卡片，2 列网格）

- `.project-poster-grid`：6 个项目卡片，每张含封面图、标题、描述、标签、CTA
- 最后两个项目（Relax-Block-Puzzle / Star Ring Card Battle）有双按钮

### 6. Footer

浅色 footer：GitHub 链接 + 版权信息。

## 视觉风格

| 维度 | 描述 |
|------|------|
| 字体 | -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif；显示数字用 Bodoni Moda / Cormorant Garamond（衬线斜体） |
| 主色 | `--primary: #0066cc`（蓝色），`--primary-focus: #0071e3` |
| 中性色 | `--text-main: #1d1d1f`，`--text-sub: #424245`，`--text-muted: #86868b` |
| 圆角 | 卡片 18px（`--radius-md`），按钮 999px（pill），PPT 封面 22px |
| 卡片 | 白色背景 + 1px border + 8-12px box-shadow |
| 按钮 | pill 形状，primary 有渐变，hover 轻微上移 |
| 动效 | hover 上移 translateY(-2~-6px)，transition 0.2-0.25s ease |

## 背景处理

- Base：`page-bg.png` 平铺 + fixed 附件
- Polish 层：径向渐变（`radial-gradient(circle at top center, ...)`），从白到浅灰到更灰色
- Section 交替：奇数/偶数 section 有不同透明度的 backdrop-filter blur
- PPT stat 数字区域：专用渐变 + 阴影

## 移动端

- `<760px` 视口检测后重定向到 `mobile.html`
- 移动端使用 `mobile-legacy.css`（独立样式表，与 style.css 分开发布）
- 移动端布局：单列网格，简化导航

## 有效设计

1. Hero 展示真实作品截图 — 符合"作品优先"
2. PPT 筛选功能完整（搜索 + 分类 + 展开/收起）
3. 点赞乐观更新，无需登录
4. 所有卡片链接到真实页面
5. 纯 HTML+CSS+JS，零框架
6. section 交替背景增加呼吸感
7. 大号 stat 数字作为视觉 anchor

## 可小幅 Polish 的方向

（详见 04-POLISH-OPPORTUNITIES.md）

1. Hero 文案（"构建我的数字空间" → 可以更自然）
2. PPT 封面比例（当前 5/4 裁切较多，可调为 3/2）
3. 按钮和标签之间间距
4. 背景微调（极浅 radial 纹理）
5. 移动端 button min-height 一致性
