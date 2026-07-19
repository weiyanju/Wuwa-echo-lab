# 阶段 0–2 系统验收修复实施记录

## 目标

修复阶段 0–2 系统验收发现的异步账号隔离、真实工作流测试不足和长期 Vue 架构文档滞后问题，并重新执行三端回归。

## 实际完成内容

- workspace 全量刷新绑定账号 ID、生命周期 generation 和请求序号，旧账号响应不再回写当前状态。
- workspace reset 使预测请求失效，并清理统计、评估和预测后台刷新计时器。
- 后台统计与评估请求在完成时重新校验账号和 generation，旧请求错误也不会污染新账号页面。
- recognition 刷新绑定账号 ID、生命周期 generation 和请求序号。
- recognition reset 清理刷新反馈、刷新状态和回滚状态。
- recognition 回滚完成后校验账号和 generation，旧回滚不会触发新账号全局刷新。
- 为两个 composable 的本地 ESM import 补充 `.js` 扩展，使 Node 测试能够加载并实际执行模块。
- 新增 5 项真实异步行为测试，覆盖旧账号刷新、后台洞察刷新、声骸创建和快照回滚。
- 更新 `architecture.md` 与 `code-organization-and-style.md`，将 `features/*` 和 feature composable 记录为当前结构。

## 修改模块与文件

- `WuwaFrontend/src/features/workspace/useEchoWorkspace.js`
- `WuwaFrontend/src/features/workspace/useEchoWorkspace.test.js`
- `WuwaFrontend/src/features/recognition/useRecognitionReview.js`
- `WuwaFrontend/src/features/recognition/useRecognitionReview.test.js`
- `WuwaFrontend/src/App.test.js`
- `WuwaFrontend/src/architecture.test.js`
- `docs/architecture.md`
- `docs/code-organization-and-style.md`

## API、数据库与数据边界变化

无 API 或数据库契约变化。客户端现在明确拒绝将旧账号的异步响应写入当前账号状态。

## 性能与资源影响

- 没有新增网络请求、轮询或持久化状态。
- reset 会主动取消尚未触发的后台刷新计时器。
- 生产构建仍转换 51 个模块，主 JS gzip 为 57.56 kB，较验收前增加 0.24 kB。

## 测试与验收结果

- 新增测试均先复现旧账号数据回写或旧回滚返回成功，再通过 generation 修复转绿。
- `npm test`：86 个测试通过。
- `npm run build`：生产构建通过。
- `python manage.py check`：无问题。
- `python manage.py makemigrations --check --dry-run`：无迁移变化。
- `python manage.py test --keepdb`：108 个测试通过。
- `dotnet run --project WuwaAssistant\\WuwaAssistant.Tests\\WuwaAssistant.Tests.csproj`：12 项自测通过。
- `dotnet build WuwaAssistant\\WuwaAssistant.slnx`：0 个警告，0 个错误。
- 浏览器运行时复试仍被 Windows 沙箱以 `CreateProcessAsUserW failed: 5` 拒绝启动。

## 与原计划的偏差

浏览器视觉与交互验收仍受 Windows 沙箱环境限制；其余系统验收发现均在本阶段处理。

## 遗留问题

- 浏览器运行时恢复后，仍需执行浅色、深色、860px 断点及登录、UID、工作台和回滚主链路验证。
- 前端仍有一批源码结构断言；后续修改对应工作流时应优先补充真实行为测试，而不是增加新的正则断言。

## 长期规范同步

- 更新 `docs/architecture.md` 的当前 Vue 结构与 feature owner。
- 更新 `docs/code-organization-and-style.md` 的 Vue 文件落点规则。

## 下一阶段入口

完成本次三端回归并提交后，再进入阶段 3 的 Web UI token、控件状态和 feature 样式统一。
