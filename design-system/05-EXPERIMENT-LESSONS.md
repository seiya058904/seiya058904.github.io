# 05 — Experiment Lessons

> 已关闭的视觉实验分支记录。保留为经验参考，不 merge。

---

## 保留的实验分支

以下分支保留为实验记录，不删除、不 merge：

| 分支 | 基线 | 状态 |
|------|------|------|
| `codex/visual-overhaul-clean-tech` | `6f47e72` | 已关闭 |
| `claude/project-observatory-editorial-v2` | `6f47e72` | 已关闭 |
| `claude/project-observatory-v3-minimal-editorial` | `6f47e72` | 已关闭 |
| `claude/project-observatory-v3-polish` | `6f47e72` | 已关闭 |

---

## 实验 1: codex/visual-overhaul-clean-tech

### 方向
干净技术风格，移除毛玻璃和阴影，使用硬边框 + 纯白色背景。

### 结果
未进入 main。过于模板化，缺少个人网站的温度感。

### 教训
- "Clean tech" 风格容易走向 SaaS Landing Page 模板
- 纯白 + 硬边框 + 无阴影 = 缺少层次感
- 部分局部思路是对的（简化背景），但整体过于激进

---

## 实验 2: claude/project-observatory-editorial-v2

### 方向
"Project Observatory" 概念。杂志编辑风格，深色 header，大标题排版，统计数据 hero。

### 结果
未进入 main。背景太吵闹，概念词过多。

### 教训
- "Observatory" 作为设计概念过于抽象，用户无法直接理解
- 过多装饰性元素（网格背景、统计面板）反而损害内容可读性
- 概念驱动设计（先选概念再做 UI）风险高，容易脱离实际内容
- 深色背景方案不适合以内容展示为主的个人网站

---

## 实验 3: claude/project-observatory-v3-minimal-editorial

### 方向
"Minimal Editorial Observatory"。v2 的克制版本：纯白背景、极简 hairline、无装饰。

### 结果
未进入 main。虽然比 v2 更克制，但仍未明显优于 main。

### 教训
- 纯白背景 + hairline 分隔过于简约，缺少 main 现有的视觉节奏
- 移除 section alternating background 导致页面层次扁平
- "Editorial" 方向不适合以卡片网格为主要内容展示形式的网站
- 独立的 Project Index + Preview Panel 虽然结构合理，但增加了交互复杂度
- 英文 Hero 文案（"Projects and Web Decks"）的方向值得保留

---

## 实验 4: claude/project-observatory-v3-polish

### 方向
在 v3 基础上做的小范围调整：3:2 PPT 封面比例、project preview 垂直节奏、背景微增强。

### 结果
未进入 main。局部修正方向正确，但整体仍基于 v3 结构，不值得 merge。

### 教训
- 3:2 PPT 封面比例优于 5:4，这个方向值得 main 考虑
- project preview panel 的垂直节奏优化有参考价值
- 极小 opacity 的 grid overlay 可以增强背景深度而不吵
- 但因为整个实验基于 v3 结构，无法只提取局部优化到 main

---

## 核心结论

1. **大规模视觉重构风险高**——用户难以一次性评估整站视觉效果
2. **概念驱动设计容易脱离实际**——"Observatory"、"Editorial"、"Clean Tech" 等标签会引入与内容不匹配的视觉语言
3. **main 当前设计更稳定**——经过多次迭代进化，现有基线已经是一个有层次的设计
4. **未来应优先从 main 做小范围 polish**，不再创建全站重做分支
5. **AI 擅长局部精修，不适合整站重设计**
6. **"看起来不同"不等于"更好"**——v3 虽然与 main 不同，但用户验收后认为 main 更协调
