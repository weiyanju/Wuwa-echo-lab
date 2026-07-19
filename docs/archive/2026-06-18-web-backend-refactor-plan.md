# Web 前端与后端规范化重构计划

## 目标

在不改变现有产品流程、API 契约和数据库结构的前提下，逐步拆分 Vue 高吸力入口、统一 Web UI 语义，并收敛 Django view、service 和 ownership 边界。

## 执行顺序

1. 建立代码规模、测试和构建基线。
2. 按识别、统计、评估、声骸工作台、登录与 UID、历史面板的顺序拆分 `App.vue`。
3. 将共享 UI 语义收敛到组件和样式 token，并拆分 `style.css`。
4. 收敛 Django 通用响应、ownership 校验和 recognition service 边界。
5. 执行 Django、Vue、WPF 三端回归。
6. 每个阶段完成后写归档实施记录，并同步受影响的长期规范。

## 边界

- 不改变现有 API 路径、字段和状态值。
- 不修改数据库 schema。
- 不改变系统账号、`GameAccount` 和 UID 的业务模型。
- 不把 WPF 后台识别职责复制到 Web。
- 不在本轮进入截图、本地 OCR 和后台识别循环开发。
- 不为了减少文件行数创建无业务边界的碎片组件。

## 验收

- `App.vue` 只保留全局状态、页面切换和 feature 编排。
- Web 相同按钮、状态、错误和空状态语义可复用。
- Django view 只负责请求入口、权限、参数和响应。
- 重要业务流程和 ownership 继续由对应领域模块负责。
- Vue 测试与生产构建通过。
- Django 全量测试通过。
- WPF 自测和构建通过。
