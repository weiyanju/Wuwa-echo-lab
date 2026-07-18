# 评估页子模型详情收起方向修复实施记录

## 目标

修复模型评估页子模型详情收起时“上边界向下折叠”的视觉错觉，使摘要行和详情顶边保持稳定，详情从底部向上退出文档流；同时遵守现有动效规范，不再通过布局属性模拟连续高度动画。

## 根因复核

展开状态、原生 disclosure button、`aria-expanded`、动态 `aria-label` 和箭头方向均正确，问题不在交互状态或图标语义。

实际根因位于详情面板的 CSS 过渡：

- 使用固定的 `max-height: 980px` 在展开高度与 `0` 之间过渡。真实内容高度通常远小于 980px，收起初段的 `max-height` 变化不会立即影响实际布局，造成停顿后突然折叠。
- 同时过渡 `margin`、`padding`、边框和透明度，使详情顶边及相邻模型行参与多组布局变化，放大了“向下回收”及先跳后移的错觉。
- 深色模式将详情面板覆盖为 `overflow: visible`，破坏了面板应有的裁切边界。
- 2026-06-30 的实现只取消了收起时的负向位移，没有移除固定 `max-height` 和布局属性动画，因此没有消除根因。

2026-07-19 在真实“页尾 + 滚轮”场景复核后，确认还存在第二层根因：

- 子模型回测位于评估页末尾。详情展开后用户可以继续向下滚动；收起时文档总高度骤减，当前 `scrollTop` 可能超过收起后的最大滚动值，浏览器只能把页面钳回底部，导致摘要行整体向下移动。
- 旧的 `nextTick` 视口补偿无法处理该场景。一方面，Vue `<Transition>` 即使没有 CSS leave 动画，也会让离场元素继续停留到后续帧；另一方面，详情真正移除后页面已经没有足够高度，直接写回旧 `scrollTop` 仍会被最大值钳制。
- 该位移不是滚动锚定配色或 hover 遮罩问题，也不是自动化点击造成的假象。最终复现使用真实滚轮和坐标点击，排除了 Playwright locator 自动滚动的干扰。

## 实施方式

采用设计规范允许的降级策略：

- 删除 `max-height: 980px` 及所有详情面板的离场布局过渡。
- 收起时由 Vue 条件渲染立即完成文档流更新，不播放详情面板离场动画。摘要行不参与布局变化，后续模型行只向上到达最终位置。
- 展开时保留 140ms 的 `opacity` 与 `transform: translateY(6px)` 短促反馈，时长在 120–160ms 规范范围内。
- 保留既有箭头 160ms 旋转作为收起状态反馈；箭头展开朝上、折叠朝下的语义不变。
- 浅色和深色详情面板均使用 `overflow: hidden`。
- `prefers-reduced-motion: reduce` 下关闭详情进入和箭头旋转过渡，直接呈现最终状态。
- 通过显式 Vue leave 钩子立即完成详情离场，使 `nextTick` 后的文档高度可被可靠测量。
- 收起前在评估面板末尾同步加入透明临时尾部空间，避免页尾最大滚动值突然缩小；收起后将空间缩到仅够保持当前视口的高度。
- 用户向上滚动时使用被动 scroll 监听同步释放临时空间；回到自然滚动范围后立即删除 spacer 和监听，不保留永久空白。
- 组件卸载时清理临时节点和监听，避免跨页面残留。

没有修改 `EvaluationBacktest.vue` 的业务结构、单项展开逻辑、原生按钮、ARIA 语义或图标状态；仅补充立即 leave 钩子和卸载清理。

## 测试驱动过程

先补充并修改回归测试，再实施 CSS 修复：

1. RED：目标测试在旧实现上出现 3 个预期失败，分别命中旧的 enter/leave 联合过渡、减少动态效果离场规则和固定 `max-height`/布局动画。
2. GREEN：修改 CSS 后，目标测试 40/40 通过。

新增的结构回归约束包括：

- 详情面板不存在固定 `max-height`。
- 详情面板没有 leave transition 或延迟收起目标态。
- enter transition 仅包含 140ms 的 `opacity` 和 `transform`，不包含 height、max-height、margin、padding 或 position 动画。
- 浅色与深色规则都保持裁切。
- 既有 disclosure 按钮、`aria-expanded`、动态 `aria-label` 和箭头状态继续受测试保护。

Node 测试栈不提供浏览器布局与动画帧，因此结构测试不能单独证明真实几何方向；本次另外进行了浏览器几何验证。

## 浏览器视觉与几何验证

使用导入生产 `evaluation.css` 的临时 Vue 验证页，在浏览器中点击真实 disclosure button 并采集收起前、点击后首帧和稳定后的 DOM 几何。临时验证页及本地 Vite 服务在验证后已删除和停止。

验证结果：

| 场景 | 摘要行顶部（收起前 / 首帧 / 稳定后） | 后续模型行顶部（收起前 → 首帧） | 结果 |
|---|---:|---:|---|
| 桌面浅色，1440×900 | 256.740 / 256.740 / 256.740 px | 568.333 → 321.302 px | 摘要稳定，后续行只向上 |
| 桌面深色，1440×900 | 256.740 / 256.740 / 256.740 px | 568.333 → 321.302 px | 与浅色一致；详情 `overflow` 为 `hidden` |
| 窄屏浅色，520×900 | 254.740 / 254.740 / 254.740 px | 737.813 → 307.406 px | 摘要稳定，无横向溢出 |

详情在点击收起后的首帧已退出文档流，因此不存在固定 `max-height` 导致的停顿，也没有后续模型行先向下跳再上移。

验证限制：

- 本次没有可直接复用的已认证真实评估数据会话，因此浏览器验证使用了最小 Vue 验证页；它复用了生产 CSS、Vue transition 和原生 disclosure button，但不是完整业务页面。
- 浏览器未模拟操作系统的 `prefers-reduced-motion: reduce`。该模式通过最终级联规则和自动化结构测试验证为 `transition: none`。
- 已覆盖桌面浅色、桌面深色和窄屏浅色；窄屏深色未单独人工截图。深色裁切规则与响应式规则相互独立，桌面深色和窄屏浅色分别覆盖了这两个风险面。

## 修改文件

- `WuwaFrontend/src/styles/features/evaluation.css`
- `WuwaFrontend/src/styles/features/evaluation-layout.css`
- `WuwaFrontend/src/App.test.js`
- `WuwaFrontend/src/features/evaluation/EvaluationBacktest.test.js`
- `WuwaFrontend/src/features/evaluation/EvaluationBacktest.vue`
- `WuwaFrontend/src/features/evaluation/modelDetailViewportAnchor.js`
- `WuwaFrontend/src/features/evaluation/modelDetailViewportAnchor.test.js`
- `docs/superpowers/plans/2026-07-18-evaluation-detail-collapse-direction.md`
- `docs/archive/2026-07-18-evaluation-detail-collapse-direction-implementation.md`

## API、数据与性能影响

没有修改 API、数据库、数据模型、评估算法、页面业务结构或全局状态，也没有引入新依赖。

性能上移除了 `max-height`、margin 和 padding 等会触发布局重排的逐帧动画。展开仅使用可合成的 opacity/transform 过渡。收起时新增一次行高和文档高度测量，以及仅在页尾确实需要补偿时存在的被动 scroll 监听；监听会随向上滚动逐步释放并在临时空间归零后删除，没有持续 JavaScript 动画。

## 验证结果

- 目标测试：16/16 通过。
- 完整前端测试：330/330 通过。
- Vite 生产构建：通过。
- `git diff --check`：通过。
- 页尾浏览器几何复验：收起前后摘要行顶部均为 `237.906px`，`scrollY` 均为 `582.667`；临时尾部空间为 `301px`。
- 向上滚动 `120px` 后临时空间由 `301px` 缩至 `181px`；继续进入自然滚动范围后降为 `0` 且节点删除。
- 临时浏览器验证文件已删除；当前分支的 Vite 开发服务保留在 `http://127.0.0.1:5174/` 供人工复验。
- `git status --short` 已检查；任务开始前已有的 `.gitignore` 和 `docs/superpowers/plans/2026-07-18-sample-stage-weight-guide.md` 改动保持未修改。

## 长期规范

本次实现落实 `DESIGN.md` 已有的动效时长、可动画属性和减少动态效果规则，不新增或改变长期产品规范，因此未修改长期规范文档。
