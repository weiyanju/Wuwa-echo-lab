# Web 声骸工作台 UI 打磨实施记录

## 目标

优化 Web 声骸工作台副词条录入矩阵的默认展示与稳定性：避免长副词条名挤压“预测最高”胶囊，默认隐藏研究指标，按副词条类型显示档位单位，并减少录入后的行高跳动。

## 实际完成内容

- 工作台默认不再展示“预测 xx% / 较基线 xx%”两行研究数据，预测数据仍保留在现有状态和后端响应中。
- “预测最高”从标题伪元素改为显式胶囊，和副词条名固定在同一标题行；长标题优先截断，胶囊不换行。
- 新增副词条档位值格式化：百分比类副词条显示 `%`，固定攻击、固定生命、固定防御不显示 `%`。
- 录入态、预测高亮态和普通态统一保留左侧信息区、行高、边框和高亮占位，降低录入后的上下跳动。
- 增加前端测试覆盖 formatter、工作台默认展示和样式稳定契约。

## 修改模块与文件

- `WuwaFrontend/src/features/workspace/EchoWorkbenchView.vue`
- `WuwaFrontend/src/styles/features/workspace.css`
- `WuwaFrontend/src/services/formatters.js`
- `WuwaFrontend/src/services/formatters.test.js`
- `WuwaFrontend/src/features/workspace/EchoWorkbenchView.test.js`
- `docs/web-workbench-ui-guidelines.md`
- `docs/archive/2026-06-27-web-workbench-ui-polish-implementation.md`

## API、数据库与数据边界变化

无。未修改后端 API、数据库 schema、请求或响应格式；仅调整 Web 工作台默认展示与前端格式化。

## 性能与资源影响

无明显资源影响。样式调整保持在工作台 feature 样式文件内，未新增后台任务、轮询或额外网络请求。

## 测试与验收结果

- 已运行 `cd WuwaFrontend; & '..\.tools\node\npm.cmd' test`，127 项测试通过。
- 已运行 `cd WuwaFrontend; & '..\.tools\node\npm.cmd' run build`，Vite 生产构建通过。
- 已打开 `http://127.0.0.1:5173/` 做浏览器验收：默认工作台未出现“预测 xx% / 较基线 xx%”研究行；“预测最高”胶囊 `white-space: nowrap`；百分比档位如 `6.3%` 显示 `%`，固定攻击档位如 `30` 不显示 `%`，其下预测概率仍显示 `%`；点击录入后首行高度保持 `119.33px`。

## 与原计划的偏差

无。实现范围保持在 Web 工作台 UI、共享 formatter、对应测试和文档闭环内。

## 遗留问题

无。

## 长期规范同步

已更新 `docs/web-workbench-ui-guidelines.md`，新增“声骸工作台副词条录入矩阵”规则，沉淀默认隐藏研究指标、档位单位格式化和录入行稳定性要求。

## 下一阶段入口

后续如果需要重新展示研究指标，应以折叠详情、统计/评估页或显式研究模式承载，不应直接回到默认录入矩阵主流程。
