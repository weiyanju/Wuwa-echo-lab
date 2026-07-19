# Django、Vue、WPF 三端回归实施记录

## 范围

- 完成阶段 5 的 Django、Vue、WPF 三端回归。
- 不新增功能，不改变 API、数据库或页面行为。
- 只处理回归发现的问题。

## 验收结果

### Django

- `manage.py test --keepdb`：115 项全部通过。
- `manage.py check`：通过。
- `manage.py makemigrations --check --dry-run`：无变更。
- 接口测试覆盖登录、UID、声骸增删改、副词条、统计、预测、评估、识别快照和回滚主链路。

### Vue

- `npm test`：93 项全部通过。
- `npm run build`：生产构建通过，共转换 51 个模块。
- 生产 CSS 为 146.72 kB / gzip 26.21 kB。
- 生产 JS 为 165.84 kB / gzip 57.56 kB。

### WPF

- `dotnet run --project WuwaAssistant\\WuwaAssistant.Tests\\WuwaAssistant.Tests.csproj`：12 项自测全部通过。
- 自测覆盖登录、注册、GameAccount、UID 初始化、识别会话、快照提交与回滚，以及窗口职责和项目结构。
- `dotnet build WuwaAssistant\\WuwaAssistant.slnx`：0 个警告，0 个错误。

## 浏览器验收限制

- Django 与 Vite 临时服务在主机侧均返回 HTTP 200。
- 应用内浏览器隔离环境对 `127.0.0.1:5173` 和 `localhost:5173` 均返回连接拒绝，因此本轮未将浏览器手工主链路记录为通过。
- 该限制不影响上述 Vue 构建、Django 接口回归或 WPF 端到端自测结果。
- 临时服务、测试进程和日志已经清理。

## 阶段结论

阶段 5 的三端自动化回归已完成，没有发现需要修复的产品回归。下一步进入阶段 6 文档闭环，汇总本轮实施记录并核对长期文档与最终代码状态。
