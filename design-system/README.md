# Seiya Personal Website — Design Notes v1

> 轻量设计参考，服务于 `main` 分支（seiya058904.github.io）。
> 不是强制重构蓝图，而是防止 AI 乱改的护栏。

## 定位

本目录记录网站的视觉现状和可遵循的设计规则，供 AI 工具（Claude、Codex 等）在修改时参考。

- **不**要求 AI 重做网站
- **不**定义不存在于 `main` 的组件
- **不**强制未来视觉方向

## 文档索引

| # | 文件 | 内容 |
|---|------|------|
| 00 | [CURRENT-MAIN-BASELINE](00-CURRENT-MAIN-BASELINE.md) | `main` 分支当前真实设计状态 |
| 01 | [DESIGN-PRINCIPLES](01-DESIGN-PRINCIPLES.md) | 适合 `main` 的修改原则 |
| 02 | [AI-GUARDRAILS](02-AI-GUARDRAILS.md) | 硬禁止和允许清单 |
| 03 | [COMPONENT-GUIDELINES](03-COMPONENT-GUIDELINES.md) | `main` 中真实存在的组件指南 |
| 04 | [POLISH-OPPORTUNITIES](04-POLISH-OPPORTUNITIES.md) | 未来可做的小范围优化 |
| 05 | [EXPERIMENT-LESSONS](05-EXPERIMENT-LESSONS.md) | 已关闭的视觉实验分支记录 |

## 使用方式

1. **开始修改前**，读 00 了解当前设计，读 02 了解禁止项
2. **修改已有组件**时，对照 03 确保不偏离现有结构
3. **想做优化**时，参照 04 的范围，不做整站重构
4. **不确定方向**时，读 05 了解之前实验为什么没有被合并

## 版本

- 当前版本：v1（基于 6f47e72）
- 最后更新：2026-06-30
- 适用分支：main
