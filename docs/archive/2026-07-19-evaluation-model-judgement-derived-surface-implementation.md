# 评估子模型判断摘要同源表面实施记录

> 已被 `2026-07-19-evaluation-model-judgement-visible-parent-surface-implementation.md` 修正。原实现把表面色 owner 放在生产页面中背景透明的内层模型卡片，导致判断摘要不能稳定跟随用户实际看到的外层回测卡片；以下内容保留为历史实施记录。

## 目标

调整评估页子模型详情中的“判断”摘要，使它不再直接复用模型数据图形的强调色，而是与所在子模型卡片使用同一个表面色来源：

- 不同子模型继续保留可识别的卡片色相。
- 卡片背景、判断摘要背景、边框和“判断”标签使用统一派生公式。
- 数据图表、节点和权重状态继续使用原有 `--model-accent`，不改变业务语义。
- 浅色和深色主题保持一致的父子层级关系。

## 根因

旧实现中，子模型卡片和判断摘要都直接从 `--model-accent` 混色。马尔可夫模型的强调色是琥珀色，因此判断摘要呈现为明显的黄色块；但页面没有把它定义为警告、冷却触发或权重变化状态，容易让用户误读颜色语义。

同时，直接把所有判断摘要改成同一套中性色，会削弱摘要与所在子模型卡片的归属关系。因此最终采用“同一派生规则、不同模型色相”的表面体系。

## 实施方式

- 在评估 feature 内新增 `--model-surface-accent` 和 `--model-card-tint`：
  - 规则与上下文：蓝色 `#1769d2`，卡片浓度 7%。
  - 贝叶斯：紫色 `#7156be`，卡片浓度 9%。
  - 马尔可夫：琥珀色 `#ffb020`，卡片浓度 11%。
  - 周期：绿色 `#30a46c`，卡片浓度 10%。
  - 禁用状态：灰色 `#677481`，卡片浓度 8%。
- 浅色主题中的判断摘要统一使用：
  - 背景：表面色 4% 与 `#f7f9fb` 混合。
  - 边框：表面色 10% 与 `#d8e2ea` 混合。
  - 标签：表面色 46% 与 `#1e2b34` 混合。
- 深色主题中的判断摘要统一使用：
  - 背景：表面色 6% 与 `var(--surface-soft)` 混合。
  - 边框：表面色 16% 与 `var(--hairline-soft)` 混合。
  - 标签：表面色 46% 与 `var(--ink-deep)` 混合。
- 深色卡片顶部色相也改为从 `--model-surface-accent` 派生。
- 保留各模型原有 `--model-accent`，图表和数据状态不受影响。

## 修改文件

- `WuwaFrontend/src/styles/features/evaluation.css`
- `WuwaFrontend/src/design-state-accent.test.js`
- `DESIGN.md`
- `.impeccable/design.json`
- `docs/superpowers/specs/2026-07-19-evaluation-model-judgement-derived-surface-design.md`
- `docs/superpowers/plans/2026-07-19-evaluation-model-judgement-derived-surface.md`
- `docs/archive/2026-07-19-evaluation-model-judgement-derived-surface-implementation.md`

## 测试驱动过程

- RED：先新增模型表面派生守卫，因样式尚未定义 `--model-surface-accent` 而失败。
- GREEN：实现卡片与判断摘要的同源表面 token 后，评估样式和组件聚焦测试 21/21 通过。
- 守卫同时锁定 `--model-accent` 仍由数据图形消费，避免后续把表面色与数据色重新合并。

## 自动化验证

- 聚焦测试：21/21 通过。
- 完整前端测试：339/339 通过。
- Vite 生产构建：通过。
- `.impeccable/design.json` 解析校验：通过。
- `git diff --check`：通过。

## 浏览器视觉验收

本地前端、后端和仓库开发数据库启动成功。由于浏览器没有可复用的已认证业务会话，没有创建测试账号或改动业务数据；视觉验收使用了验收后即删除的临时样张，直接加载生产 `src/style.css` 和生产组件类名。

- 浅色主题：规则蓝、贝叶斯紫、马尔可夫琥珀和周期绿均能看出父卡片与判断摘要属于同一色相家族。
- 深色主题：四种模型保持同样的归属关系，摘要层级清楚，没有额外高亮或发光效果。
- 马尔可夫判断摘要仍保留温和的琥珀识别度，但不再表现为独立警告块。
- 浏览器计算样式确认卡片和摘要读取同一个 `--model-surface-accent`，各模型浓度符合设计方案。
- 临时验收页没有控制台 warning 或 error，验收后已删除；本次启动的本地服务也已关闭。

## API、数据与业务边界

无变化。没有修改 API、数据库结构、评估算法、模型权重、冷却判断、状态映射或文案内容；本次只调整模型详情的视觉表面派生规则。

## 长期规范同步

- `DESIGN.md` 已明确：子模型卡片和内部判断摘要共用 `--model-surface-accent`，`--model-accent` 只承担数据图形语义。
- `.impeccable/design.json` 已同步相同的结构化设计规则。
