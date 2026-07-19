# Django 后端边界收口实施记录

## 范围

- 完成阶段 4 的 Django 后端边界重构。
- 保持 API 路径、字段、状态码、数据库契约和页面行为不变。
- 不进入 WPF OCR、截图或后台识别开发。

## 实施结果

- 新增 `api.responses` 共享成功与错误响应 helper，领域 view 不再直接构造 `JsonResponse`。
- 新增 `accounts.ownership`，统一默认账号、指定账号和跨用户 `GameAccount` 校验。
- 新增 `accounts.services`，承接注册、账号创建和账号更新事务。
- `echoes.services` 承接声骸查询、创建、更新、删除、副词条创建与撤回流程。
- `recognition` 与 `analytics` 改用共享 ownership 和响应入口，不再跨域导入 view。
- 删除 `api.models` 的领域模型转发，以及 `api.services` 下统计、预测、评估兼容模块；测试改为直接引用真实 domain owner。
- serializer 收敛为输入输出转换，不再持有领域对象创建或事务。
- 增加响应、ownership、service 和兼容层退出的结构守卫。

## 验证

- TDD：结构测试先对缺少 service owner 和遗留兼容导入失败，迁移后转绿。
- Django 定向结构与接口回归：50 项全部通过。
- 评估服务回归：10 项全部通过。
- Django 全量测试：115 项全部通过。
- `manage.py check`：通过。
- `manage.py makemigrations --check --dry-run`：无变更。
- `git diff --check`：通过。

## 阶段结论

阶段 4 已完成。Django view、serializer、ownership、service 和共享 HTTP 基础设施的职责边界已经明确，旧 `api` 领域兼容出口已经退出。下一步进入阶段 5 三端回归，不继续混入新的结构重构。
