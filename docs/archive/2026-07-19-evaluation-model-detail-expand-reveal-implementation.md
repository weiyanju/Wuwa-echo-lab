# 评估页子模型详情展开揭示实施记录

## 目标

修复子模型摘要位于视口下半部时，点击展开只能看到详情开头、仍需用户再次滚动的问题。最终行为是：

- 详情已经充分可见时不滚动页面。
- 详情被视口底部裁切时，只向下补偿缺失的距离。
- 长详情尽量展示当前视口可容纳的首屏，同时保留模型摘要行。
- 收起继续沿用现有摘要锚定和页尾临时空间，不自动滚回其他位置。

## 根因

旧控制器只处理收起后的摘要位置稳定，没有在 Vue 完成展开渲染后测量详情区域，因此无法判断详情首屏是否被视口底部裁切。浏览器虽然正确展开了内容，但用户常常只能看到 tabs 或判断摘要，无法一次捕捉主要分析信息。

## 实施方式

- 将单次 disclosure 操作显式区分为 `expand` 和 `collapse`。
- 展开时等待 Vue DOM 更新和一个浏览器动画帧，再读取摘要行与当前详情的真实几何位置。
- 使用纯函数计算最小非负滚动补偿：
  - 桌面端顶部安全区为 88px。
  - 860px 及以下紧凑屏顶部安全区为 64px。
  - 视口底部保留 24px。
  - 短详情只滚动到完整可见；长详情只使用当前安全视口可容纳的首屏空间。
- 使用一次即时 `scrollTop` 更新，不使用 `scrollIntoView`、平滑滚动或卡片内滚动容器。
- 展开操作会清理旧的临时页尾空间；收起操作继续使用既有 spacer、摘要锚定和被动滚动释放机制。
- 快速连续操作使用 operation id，只允许最后一次异步测量补偿页面滚动。

## 修改文件

- `WuwaFrontend/src/features/evaluation/modelDetailViewportAnchor.js`
- `WuwaFrontend/src/features/evaluation/modelDetailViewportAnchor.test.js`
- `WuwaFrontend/src/features/evaluation/EvaluationBacktest.vue`
- `WuwaFrontend/src/features/evaluation/EvaluationBacktest.test.js`
- `docs/superpowers/plans/2026-07-19-evaluation-model-detail-expand-reveal.md`
- `docs/archive/2026-07-19-evaluation-model-detail-expand-reveal-implementation.md`

本次没有修改 API、评估数据结构、模型算法、详情内容结构或 CSS 视觉体系。

## 测试驱动过程

- 纯几何函数 RED：新增测试首先因 `modelDetailExpandScrollDelta` 尚未导出而失败。
- 纯几何函数 GREEN：覆盖无需滚动、视口底部裁切、顶部安全区、短详情和无效几何。
- 控制器 RED：新增展开场景首先因控制器没有 `expand` 分支而失败。
- 控制器 GREEN：覆盖桌面展开、详情已可见和 520px 紧凑屏安全区。
- 组件契约 RED：测试首先因组件没有传递 `action` 而失败。
- 组件契约 GREEN：组件显式传递 `expand` / `collapse`，并锁定不使用 `scrollIntoView` 或 smooth scroll。

## 自动化验证

- 聚焦测试：24/24 通过。
- 完整前端测试：338/338 通过。
- Vite 生产构建：通过，89 个模块完成转换。
- 临时浏览器验收页直接复用生产 `EvaluationBacktest.vue`、生产详情数据构建器和生产 CSS；验收后已删除。

## 浏览器几何验证

| 场景 | 展开前 | 展开后 | 结果 |
|---|---:|---:|---|
| 1440×900 浅色 | `scrollY 0`，摘要 `top 785.70px` | `scrollY 360`，摘要 `top 425.70px`，详情 `493.59–874.43px` | 详情 380.83px 全部可见，无横向溢出 |
| 1180×900 浅色 | `scrollY 0`，摘要 `top 785.70px` | `scrollY 360`，摘要 `top 425.70px`，详情 `493.59–874.43px` | 与桌面几何一致，无横向溢出 |
| 520×900 浅色 | `scrollY 0`，摘要 `top 793.91px` | `scrollY 588.67`，摘要 `top 205.24px`，详情 `261.24–873.92px` | 612.68px 详情全部可见，单列且无横向溢出 |
| 1440×900 深色 | `scrollY 0` | `scrollY 360`，详情 `493.59–874.43px` | 与浅色几何一致，无额外蒙版或内层滚动 |

在 520px 下从“近期序列”切换到“周期规律”后，旧详情关闭、新详情唯一展开，页面仍无横向溢出。

## 限制

- 当前 `127.0.0.1:5174` 的完整业务页没有可复用的已认证评估会话，因此浏览器几何验收使用了临时入口，但入口直接挂载生产组件、生产数据转换和生产样式，不复制交互实现。
- 浏览器插件的 `press` 操作不会触发原生按钮默认 click 行为，因此未用该自动化通道判定键盘默认行为；组件仍使用原生 `<button>`、`aria-expanded` 和动态 `aria-label`，相关结构契约测试保持通过。
- 未单独在浏览器中模拟 `prefers-reduced-motion: reduce`；本次没有改变现有 enter-only CSS 动效，也没有新增平滑滚动。

## 长期规范

本次落实现有页面滚动、响应式安全区、原生可访问 disclosure 和减少动态效果规则。没有新增视觉 token、公共组件规则、API 或数据契约，因此无需修改长期规范文档。
