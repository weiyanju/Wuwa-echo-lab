# Web 与后端重构基线实施记录

## 目标

在开始结构拆分前记录代码规模和三端验证结果，并增加入口文件增长守卫。

## 实际完成内容

- 统计 Vue 与 Django 主要高吸力文件规模。
- 执行 Vue 全量测试和生产构建。
- 执行 Django 全量测试。
- 执行 WPF 自测和完整构建。
- 增加 Vue 入口文件规模守卫，防止重构期间继续向大文件堆功能。
- 尝试建立浏览器视觉基线，但浏览器运行时被 Windows 沙箱拒绝启动。

## 修改模块与文件

- `WuwaFrontend/src/architecture.test.js`
- `docs/archive/2026-06-18-web-backend-refactor-plan.md`
- `docs/archive/2026-06-18-refactor-baseline-implementation.md`

## 代码规模基线

| 文件 | 行数 | 字节数 |
| --- | ---: | ---: |
| `WuwaFrontend/src/App.vue` | 2848 | 110419 |
| `WuwaFrontend/src/style.css` | 8843 | 192099 |
| `Wuwa/recognition/services.py` | 429 | 16415 |
| `Wuwa/echoes/views.py` | 122 | 4688 |
| `Wuwa/accounts/views.py` | 104 | 3851 |
| `Wuwa/recognition/views.py` | 94 | 4067 |

## API、数据库与数据边界变化

无。

## 性能与资源影响

无运行时影响。新增测试只读取两个前端源码文件并统计行数。

## 测试与验收结果

- `npm test`：52 个测试通过。
- `npm run build`：Vite 生产构建通过。
- `python manage.py test --keepdb`：107 个测试通过。
- `dotnet run --project WuwaAssistant\\WuwaAssistant.Tests\\WuwaAssistant.Tests.csproj`：12 项自测通过。
- `dotnet build WuwaAssistant\\WuwaAssistant.slnx`：0 个警告，0 个错误。
- 浏览器视觉基线：未完成。浏览器运行时两次被 Windows 沙箱拒绝启动，不能把该项记录为通过。
- 架构守卫首次运行时发现 PowerShell `Measure-Object -Line` 未统计空行；随后改用物理行数修正基线并重新验证。

## 与原计划的偏差

- 视觉基线因本地浏览器运行时权限问题未生成截图；不影响结构拆分和自动化验证，但在 UI 样式阶段完成前必须补做。
- Django 首次全量测试因上一次中断遗留测试库而等待交互，随后使用 `--keepdb` 安全复用测试库并通过全部测试。

## 遗留问题

- UI 样式阶段需要恢复浏览器视觉验证。
- `App.vue` 和 `style.css` 的守卫阈值应在每次成功拆分后逐步降低。

## 长期规范同步

本阶段只落实既有工程质量和代码组织规则，不修改长期规范。

## 下一阶段入口

从识别结果与复核区域开始拆分 `App.vue`，为该 feature 增加独立组件测试，并在验证通过后降低 `App.vue` 行数阈值。
