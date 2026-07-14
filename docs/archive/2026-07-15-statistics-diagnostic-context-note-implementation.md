# 统计诊断上下文说明实施记录

## 实施结果

统计诊断的样本量说明已从“样本可信度”单元移到“统计诊断”标题下，成为适用于整个诊断区域的辅助说明。说明会显示实际样本数，并随五个可信度阶段更新；三列诊断条现在只保留标签和数据，视觉密度更均衡。

无正向或负向偏差时分别只显示“暂无明显偏高”或“暂无明显偏低”，不再重复渲染第二个“暂无”百分比占位。

## 文案与排版

- `< 500`：`基于 {total} 条样本，当前偏差仅作趋势提示。`
- `500–2999`：`基于 {total} 条样本，偏差可作初步参考。`
- `3000–9999`：`基于 {total} 条样本，偏差可辅助判断，极端值仍需保守看待。`
- `10000–49999`：`基于 {total} 条样本，偏差趋势可作为长期观察依据。`
- `≥ 50000`：`基于 {total} 条样本，可进入长期权重优化。`

标题区改为顶部对齐，说明使用最大宽度 440px、Label 字号、500 字重和中性次级文字色；暗色主题沿用现有 `--charcoal` 次级文字色。没有新增图标、边框、底色、胶囊或 tooltip。

## 变更文件

- `WuwaFrontend/src/features/statistics/presentation.js`
- `WuwaFrontend/src/features/statistics/presentation.test.js`
- `WuwaFrontend/src/features/statistics/StatisticsView.vue`
- `WuwaFrontend/src/features/statistics/StatisticsView.test.js`
- `WuwaFrontend/src/styles/features/statistics.css`
- `WuwaFrontend/src/App.test.js`
- `DESIGN.md`
- `docs/superpowers/specs/2026-07-15-statistics-diagnostic-context-note-design.md`
- `docs/superpowers/plans/2026-07-15-statistics-diagnostic-context-note.md`

## 测试先行记录

- 文案 RED：3 项中 2 通过、1 失败，旧帮助文案与新动态样本数契约不一致。
- 文案 GREEN：3 / 3 通过。
- 视图 RED：2 项中 1 通过、1 失败，确认旧说明位置和重复“暂无”仍存在。
- 视图 GREEN：2 / 2 通过。
- 样式 RED：3 项中 2 通过、1 失败，确认标题行仍为居中对齐且新说明样式不存在。
- 聚焦与架构测试：18 / 18 通过。
- 首次完整测试：258 / 259 通过。唯一失败来自 `App.test.js` 仍要求旧 `.stats-diagnostic-note`；同步跨页面契约并明确禁止旧类后，目标用例 1 / 1 通过。
- 最终完整前端测试：259 / 259 通过，0 失败。
- Vite 生产构建：通过。
- `StatisticsView.vue` 203 行；`statistics.css` 923 行；未调整任何架构限制。

## 视觉验证限制

应用内浏览器中的 `http://localhost:55098/` 与两个 `http://127.0.0.1:5174/visual-uid-menu-fixture.html` 标签均显示“无法访问此站点”。因此本次没有声称完成浅色、暗色、各样本阶段和 860px 窄屏状态的截图验收；本地服务恢复后仍应补做视觉 QA。

## 仓库状态

实施位于现有功能分支 `codex/workbench-terminal-ui`，并保留工作区中此前的连续 UI 修改。未执行暂存、提交、推送、合并或创建 PR。
