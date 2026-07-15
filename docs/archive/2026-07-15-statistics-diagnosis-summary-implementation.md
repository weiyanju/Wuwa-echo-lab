# Statistics Diagnosis Summary Implementation

## Result

- 统计诊断页头在已有样本时只保留当前可信度状态与样本阶段两个摘要胶囊，没有加入“最大偏差”或其他第三项。
- “样本可信度”卡片移除大号可信度结论和重复阶段胶囊，改为依次解释判断依据、当前/目标样本进度与完整阶段轴。
- 页头摘要组使用带“统计摘要”可访问名称的 `group` 语义；浅色主题的小字号标签调整到满足 WCAG AA 的文字对比度。
- `DESIGN.md` 已同步上述双胶囊、信息去重与可访问性长期规则，并保留此前的两张同级任务卡和百分点语义规则。
- 本轮没有实施“最大偏差”页头摘要、零样本初始化或跨页面组件抽取。

## Verification

### Automated verification

以下定向测试、完整测试与构建命令均在 `WuwaFrontend` 目录执行。

- 定向组合测试：`..\.tools\node\node.exe --test src\App.test.js src\architecture.test.js src\features\statistics\StatisticsView.test.js`，53 tests、53 passed、0 failed，退出码 0。
- 完整前端测试：`..\.tools\node\npm.cmd test`。沙箱内首次运行因 `node:test` 无法派生进程而出现 `spawn EPERM`，38 个测试文件均未实际执行；在沙箱外原命令复跑后为 273 tests、273 passed、0 failed，退出码 0。
- 生产构建：`..\.tools\node\npm.cmd run build -- --logLevel error`。沙箱内首次运行在 Vite 依赖解析阶段因 `spawn EPERM` 中止；在沙箱外原命令复跑后退出码 0，构建输出没有错误。

### Browser verification

使用 Browser 技能连接现有已登录的本地页面 `http://127.0.0.1:5173/`，页面实际显示 286 条样本；没有读取 cookies、localStorage、密码或会话存储。每个视口均取得页面截图，并以可见 DOM、元素边界和 `scrollWidth` 测量交叉验证。

- 1280 × 720，浅色：标题与说明位于左侧，两个摘要胶囊位于右侧；摘要组含 2 个胶囊。样本可信度卡不含“起步观察”，判断依据与阶段进度为双列。页面 `clientWidth` 与 `scrollWidth` 均为 1265px，没有页面级横向溢出。阶段胶囊小标签对背景的对比度为 4.81:1，可信度卡标签对背景的对比度为 4.90:1，均满足普通文字的 WCAG AA 门槛。
- 1280 × 720，暗色：两个胶囊、判断依据、“286 / 500”、剩余 214 条说明和阶段轴均可读；摘要胶囊与任务卡计算样式的 `box-shadow` 均为 `none`，可信度卡保持单一边界且没有新增嵌套卡片或发光层。页面 `clientWidth` 与 `scrollWidth` 均为 1265px。
- 860 × 900，浅色：摘要组位于标题说明下方，摘要组与标题说明的左边缘差为 0px，`justify-content` 为 `flex-start`；可信度解释区计算为单列，阶段进度位于判断依据下方且左边缘差为 0px。页面 `clientWidth` 与 `scrollWidth` 均为 845px。
- 600 × 900，浅色：页面 `clientWidth`、`scrollWidth` 与 `body.scrollWidth` 均为 585px，没有页面级横向溢出。阶段轴容器为 `clientWidth` 515px、`scrollWidth` 623px、`overflow-x: auto`，横向滚动只发生在阶段轴自身容器内。
- 520 × 900，浅色：页面 `clientWidth` 与 `scrollWidth` 均为 505px，没有页面级横向溢出。摘要容器为 `flex-wrap: wrap`；当前两个胶囊总宽约 207px，在可用宽度内保持同一行，二者边界均完整落在摘要容器内，需要更窄空间时可自然换行。两个解释标签、`286 / 500` 数值和“57.2% 完成，距「总体偏差」还差 214 条”均完整落在可信度卡内，测得 `scrollWidth` 未超过各自 `clientWidth`。阶段轴继续只在自身容器内滚动，容器 `clientWidth` 447px、`scrollWidth` 623px。
- DOM：`.stats-diagnostic-summary-chip` 数量为 2；摘要容器为 `role="group"` 且 `aria-label="统计摘要"`；页头可见文本不含“最大偏差”；样本可信度卡可见文本不含“起步观察”。
