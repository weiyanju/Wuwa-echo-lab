# Web 视觉基线与 token 收尾实施记录（2026-07-14）

## 结果

截图验收范围中的三项工作已完成：建立四个页面的浅色/暗色基线，完成剩余 feature 暗色 token 精确映射，并按卡片、摘要色、动效三个家族依次审查和独立审批。

## 四页面视觉基线

`docs/design-baselines/web/2026-07-14/` 保存 1280 × 720 的固定首屏基线：

- 登录：`login-light.png`、`login-dark.png`；
- 工作台：`workspace-light.png`、`workspace-dark.png`；
- 统计：`statistics-light.png`、`statistics-dark.png`；
- 评估：`evaluation-light.png`、`evaluation-dark.png`。

八个文件均为非空真实 PNG。基线是比较证据，不能覆盖 `DESIGN.md` 的长期规范。

## 剩余 feature token 映射

统计、识别复核和首次 UID 绑定中的暗色等值字面量已映射到现有语义 token：

- `#17232d` → `var(--surface-soft)`；
- `#e7eef4` → `var(--ink-deep)`；
- `#a9bac7` → `var(--charcoal)`；
- `#98aab7` → `var(--steel)`；
- `#5da8ff` → `var(--primary)`；
- `#37b37f` → `var(--success)`；
- `#8dc3ff` → `var(--primary-deep)`。

浏览器暗色计算值与迁移前完全一致；未改动图表色、模型色、透明状态层或仅视觉相似但语义不同的颜色。

## 组件家族审批结果

- 卡片：用户认为工作台暗色面板阴影不明显，选择保留现状；无卡片 CSS 修改。
- 摘要色：绿色允许表达预测/阶段进度，样本可信度同时有文字说明；选择保留现状，无摘要色 CSS 修改。
- 动效：只批准评估页减少动态效果的级联修复。最终覆盖移动到动画声明之后；正常模式动效不变，`reduce` 模式关闭摘要闪烁、卡片联动和详情展开过渡。

## 最终验证

- `..\.tools\node\npm.cmd test`：227/227 通过，0 失败；
- `..\.tools\node\npm.cmd run build`：Vite 8.0.10 构建通过，转换 67 个模块；
- `git diff --check`：通过；
- 仓库范围检查：修改只涉及本计划的 feature CSS、对应测试、审查/实施记录和计划状态；`dist/` 保持忽略；
- 完成前审查：未发现 CSS 或测试代码缺陷，旧验证记录已更新为本次标准测试与构建结果。

## 后续边界

动效清单中仍记录了工作台布局属性过渡、历史浮层图标过渡和识别刷新降级等未来候选。本次没有获得这些视觉改动的单独批准，因此未将它们与当前批次合并修改。
