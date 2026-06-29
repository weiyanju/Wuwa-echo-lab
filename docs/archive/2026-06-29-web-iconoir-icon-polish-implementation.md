# Web 图标风格统一实施记录

## 目标

统一 Web 页面中的通用工具图标风格，改为 Iconoir 官方 24px 细线 SVG；同时恢复历史面板最小化态原有的葫芦图标，保留该图标作为产品记忆符号。

## 实际完成内容

- 恢复历史面板最小化态使用 `rovers-terminal-expand.png` / `pangu-terminal-dark.png` 葫芦图标，并继续跟随深浅主题与悬浮位置旋转。
- 将趋势提升、太阳、月亮、展开箭头、勾选、关闭、刷新、面板、列表、图钉等通用 SVG 替换为 Iconoir 官方素材。
- 将评估页“命中率 / Loss / 关键参数”旁的文字 `?` 替换为 Iconoir 官方 `help-circle` 图标。
- 工作台“预测概率提升”图标采用 Iconoir 官方 `arrow-up-right`，弱化自绘折线图感，强调推荐提升语义。
- 补充测试，约束通用线性图标的基础描边规则，并约束历史面板最小化态继续使用葫芦图标。
- 保持本次修改只影响前端展示资源和样式，不改 API、数据库或后端响应格式。

## 修改模块与文件

- `WuwaFrontend/src/features/history/FloatingHistoryPanel.vue`
- `WuwaFrontend/src/features/evaluation/EvaluationBacktest.vue`
- `WuwaFrontend/src/styles/features/evaluation.css`
- `WuwaFrontend/src/styles/features/history.css`
- `WuwaFrontend/src/assets/icons/`
- `WuwaFrontend/src/App.test.js`
- `WuwaFrontend/src/features/workspace/EchoWorkbenchView.test.js`
- `WuwaFrontend/src/features/history/FloatingHistoryPanel.test.js`
- `WuwaFrontend/src/assets/icons/README.md`
- `docs/web-workbench-ui-guidelines.md`

## API、数据库与数据边界变化

无。未修改后端接口、数据库结构、请求参数或响应格式。

## 性能与资源影响

无明显影响。恢复的葫芦 PNG 为既有前端资源；通用控件图标仍为本地 SVG mask 资源。新增 `help-circle.svg` 为轻量本地 SVG。

## 测试与验收结果

- `cd WuwaFrontend; & '..\.tools\node\npm.cmd' test`：130 项通过。
- `cd WuwaFrontend; & '..\.tools\node\npm.cmd' run build`：通过。
- `git diff --check`：通过，仅出现 Git 在 Windows 下的 LF/CRLF 提示。

## 与原计划的偏差

用户确认历史面板最小化态应恢复葫芦样式，因此该图标不再强制替换为通用 Iconoir 线性图标。后续又确认通用控件图标应使用 Iconoir 官方库素材，因此将此前自绘或近似 Iconoir 的 SVG 统一替换为官方 SVG。这个偏差只影响视觉资产选择，不影响交互和数据契约。

## 遗留问题

仍建议在浏览器中对深色主题、浅色主题、历史面板最小化态、评估页 help 图标和工作台预测提升箭头做一次视觉复核。

## 长期规范同步

本次将通用图标规则写入 `WuwaFrontend/src/assets/icons/README.md` 和 `docs/web-workbench-ui-guidelines.md`：Web 通用工具图标优先使用 Iconoir 官方素材，历史面板葫芦、favicon、声骸效果图等业务或品牌素材例外保留。

## 下一阶段入口

如继续统一图标系统，可优先在浏览器中复核各图标在深浅主题下的视觉重量，并只对尺寸、颜色和容器状态做局部微调。
