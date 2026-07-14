# 剩余 feature 暗色语义 token 迁移实施记录（2026-07-14）

## 结果

统计、识别复核和首次 UID 绑定样式中，仍与全局暗色主题变量完全等值的颜色字面量已改为语义 token 引用。迁移只改变颜色来源，不改变最终计算值、选择器、特异性、组件结构或交互行为。

## 精确映射

| 原值 | 语义 token | 主题源值 |
|---|---|---|
| `#17232d` | `var(--surface-soft)` | `#17232d` |
| `#e7eef4` | `var(--ink-deep)` | `#e7eef4` |
| `#a9bac7` | `var(--charcoal)` | `#a9bac7` |
| `#98aab7` | `var(--steel)` | `#98aab7` |
| `#5da8ff` | `var(--primary)` | `#5da8ff` |
| `#37b37f` | `var(--success)` | `#37b37f` |
| `#8dc3ff` | `var(--primary-deep)` | `#8dc3ff` |

主题源值位于 `WuwaFrontend/src/styles/controls.css` 的 `.app-shell.theme-dark`。未迁移图表、模型、状态透明层或其他不与全局语义 token 完全等值的颜色。

## 修改范围

- `WuwaFrontend/src/styles/features/statistics.css`
- `WuwaFrontend/src/styles/features/recognition.css`
- `WuwaFrontend/src/styles/features/uid-setup.css`
- `WuwaFrontend/src/design-state-accent.test.js`
- `WuwaFrontend/src/features/workspace/UidSetupView.test.js`

## 测试驱动过程

1. 先新增聚焦测试，要求上述 feature 文件不再出现精确等值字面量，并要求各文件消费相应语义 token。
2. RED：测试首先在 `statistics.css` 的 `#17232d` 处失败，证明约束能捕获未迁移状态。
3. GREEN：应用精确映射后，聚焦 token 测试通过，33 个测试文件通过、0 个失败。
4. 首次全量测试得到 225/226：唯一失败是 `UidSetupView.test.js` 仍把 `#98aab7` 和 `#8dc3ff` 字面量当作契约。断言同步为 `var(--steel)` 和 `var(--primary-deep)` 后，标准完整测试复跑为 227/227 通过。

最终生产构建通过：Vite 8.0.10 转换 67 个模块并成功生成 `dist/`；构建产物按仓库规则保持忽略，不纳入提交。

## 浏览器等价检查

已在 `http://127.0.0.1:5173/` 的已登录暗色页面读取最终计算色：

- 统计页：面板背景与 marker 边框为 `rgb(23, 35, 45)`，对应 `--surface-soft: #17232d`；标题为 `rgb(231, 238, 244)`，对应 `--ink-deep: #e7eef4`；辅助文字为 `rgb(169, 186, 199)`，对应 `--charcoal: #a9bac7`；行 metadata 为 `rgb(152, 170, 183)`，对应 `--steel: #98aab7`；偏差轴起点为 `rgb(93, 168, 255)`，对应 `--primary: #5da8ff`。
- 工作台识别复核：live dot 为 `rgb(55, 179, 127)`，对应 `--success: #37b37f`；主要文字与指标标题为 `rgb(231, 238, 244)`；指标标签为 `rgb(169, 186, 199)`。
- 当前已绑定账号无法进入首次 UID 绑定运行态，因此该页面使用主题源值和静态测试证明等价；没有创建或修改账号来绕过业务状态。
