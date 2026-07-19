# Statistics Summary Chip And Reliability Header Implementation

## Result

- 统计诊断与模型评估的页头摘要胶囊迁移到共享的 `page-summary.css` owner，以模型评估的现有密度为基准统一高度、字号、字重、内边距、浅深色表面与响应式规则。
- 统计诊断保留“起步观察”和“阶段 0-500 条”两个胶囊；模型评估保留“观察中”“阶段 0-500 条”“前三命中 19.55%”三个胶囊。两页数值均使用统一的数据字体和稳定数字宽度。
- “样本可信度”卡采用方案 A：只显示当前阶段驱动的轻量标签与标题同行，`286 / 500` 和剩余样本摘要上移到标题栏右侧，阶段轴直接接在分隔线下方。
- 可见界面删除“阶段进度”和“当前阶段的主要解释来源”；完整阶段目标仍通过 `aria-label` 提供，不改变阶段计算、API 或数据结构。
- 没有增加“最大偏差”页头胶囊，也没有实施零样本初始化方案。

## Implementation

- 新增 `WuwaFrontend/src/styles/page-summary.css`，集中拥有 `.page-summary-chips`、`.page-summary-chip`、`.page-summary-chip__value` 和状态变体。
- `StatisticsView.vue` 与 `EvaluationView.vue` 只保留各自的页面文案和数据，均使用带可访问名称的 `role="group"` 摘要组。
- `StatisticsView.vue` 新增紧凑的 `sampleStageSummaryText`，并保留更完整的 `sampleStageGoalText` 供无障碍说明使用。
- 清理统计与评估 feature CSS 中重复的页头胶囊规则，避免两页继续发生视觉漂移。
- `DESIGN.md` 与统计诊断专项设计规范已同步共享 owner、32px/30px 密度和紧凑可信度标题栏规则。

## Verification

### Test-driven checks

- 共享摘要 RED：`node --test --test-isolation=none src/page-summary.test.js src/features/evaluation/EvaluationView.test.js src/architecture.test.js`，14 passed、3 expected failures；失败原因是共享样式和迁移后的结构尚未存在。
- 共享摘要 GREEN：`node --test --test-isolation=none src/page-summary.test.js src/features/evaluation/EvaluationView.test.js src/features/statistics/StatisticsView.test.js src/architecture.test.js src/App.test.js`，58 passed、0 failed。
- 紧凑可信度标题栏 RED：`node --test --test-isolation=none src/features/statistics/StatisticsView.test.js`，8 passed、1 expected failure；失败断言对应旧的双列解释结构。
- 紧凑可信度标题栏 GREEN：同一命令复跑，9 passed、0 failed。

### Regression and build

- 完整前端测试：`npm test`，276 tests、276 passed、0 failed，退出码 0。沙箱内强制 `--test-isolation=none` 会令无关测试共享模块缓存，因此完整套件使用默认文件隔离并在沙箱外原命令验证。
- 生产构建：`npm run build`，Vite 8.0.10 转换 78 个模块并在约 2.00 秒完成，退出码 0。沙箱内首次执行受子进程 `spawn EPERM` 限制，沙箱外原命令验证通过。
- 仓库卫生：`git diff --check` 退出码 0；`git status --short` 只包含本轮统计/评估实现和此前同一统计页面的在途改动，没有覆盖或清理用户工作树。

### Browser QA

使用 Browser 技能连接本地已登录页面 `http://127.0.0.1:5173/`，页面显示 286 条样本；未读取 cookies、localStorage、密码或会话存储。

- 1280 × 720，浅色：统计与评估胶囊均为 32px 高、13px/600、`6px 10px` 内边距；统计有 2 个胶囊，评估有 3 个。统计可信度卡实测高度约 196px，标题旁显示 28px 阶段驱动标签，两行阶段摘要位于右上，阶段轴紧随分隔线。
- 1280 × 720，深色：两页共享相同的状态/普通胶囊背景、边框和文字映射；可信度卡和阶段驱动标签可读，无页面级横向溢出。
- 860 × 900，浅色：页头胶囊左对齐并允许换行；可信度标题、标签和阶段摘要安全堆叠，卡片没有横向溢出。
- 520 × 900，浅色：统计页和评估页均无页面级横向溢出；胶囊高 30px、内边距 `5px 9px`。统计阶段轴容器 `clientWidth` 447px、`scrollWidth` 623px、`overflow-x: auto`，滚动只发生在卡片内部。
- 可见 DOM 不含“阶段进度”或“当前阶段的主要解释来源”；浏览器控制台没有 warning 或 error。

## Follow-up adjustment

- 2026-07-15：按界面复审删除阶段驱动胶囊中的可见“判断依据”前缀，只保留“规则基线主导”等实际驱动文案；同时删除对应的无效 `small` 样式。提示标题仍保留完整语义。
- Follow-up verification：定向测试 9/9 通过，完整前端测试 276/276 通过，生产构建退出码 0；浏览器实测胶囊文本仅为“规则基线主导”、`small` 子元素数量为 0、页面无横向溢出，控制台无 warning 或 error。
