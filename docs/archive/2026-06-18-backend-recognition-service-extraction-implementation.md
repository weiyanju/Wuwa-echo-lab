# 后端识别 Service 拆分实施记录

## 目标

将识别会话与识别快照工作流从 429 行的单一 `recognition/services.py` 拆分，同时保持所有公开 service 名称、API 行为和数据库事务不变。

## 实际完成内容

- 将 `services.py` 改为稳定兼容 facade。
- 新增 `session_services.py`，承载 session 创建、列表、读取和状态更新。
- 新增 `snapshot_services.py`，承载 snapshot 列表、校验、提交、去重、写入和回滚。
- 新增 `service_support.py`，统一 payload 解析、ownership 查询、时间解析和结果类型。
- 增加后端结构测试，限制 facade 不超过 30 行并校验公开导出身份。

## 修改模块与文件

- `Wuwa/recognition/services.py`
- `Wuwa/recognition/session_services.py`
- `Wuwa/recognition/snapshot_services.py`
- `Wuwa/recognition/service_support.py`
- `Wuwa/api/tests/test_backend_structure.py`
- `docs/architecture.md`
- `docs/code-organization-and-style.md`

## API、数据库与数据边界变化

无。

- API 路径、请求字段、响应字段和状态值保持不变。
- 数据库 schema 和 migration 保持不变。
- `GameAccount` 与用户 ownership 查询仍由后端执行。
- snapshot 写入、detail hash 去重和回滚仍位于原有事务边界内。

## 性能与资源影响

无预期运行时变化。模块导入数量增加，但没有增加查询、网络请求或事务。

## 测试与验收结果

- 新结构测试先因 `recognition.session_services` 不存在而失败，完成拆分后通过。
- 结构与 Recognition API 目标测试：16 个通过。
- `python manage.py test --keepdb`：108 个测试通过。
- Django system check：无问题。

## 与原计划的偏差

原路线把后端重构排在全部 Vue feature 拆分之后。由于模型评估区依赖交互状态较多，为保持小步可验收，本次先完成边界更清楚的后端 recognition service 拆分。

## 遗留问题

- `snapshot_services.py` 仍是较大的单一 workflow 文件；只有在出现第二种独立 snapshot 流程时才继续拆分，当前不为行数制造无意义抽象。
- 通用错误响应可以逐步覆盖其他领域 view，但不能一次性机械替换全部异常处理。

## 长期规范同步

- 已更新 `docs/architecture.md`，记录 recognition workflow owner。
- 已更新 `docs/code-organization-and-style.md`，记录 facade 和 workflow service 规则。

## 下一阶段入口

继续处理 Web 模型评估区域和共享样式；后端下一步只做 ownership 与错误响应的重复收敛，不改变契约。
