# Web 前端与 Django 后端规范化重构总实施记录

## 目标

在不改变产品主流程、API 契约和数据库结构的前提下，拆分 Vue 高吸力入口、统一 Web UI 语义、收敛 Django 领域边界，并完成 Django、Vue、WPF 三端回归。

## 实际完成内容

### 阶段 0：基线与规则

- 建立入口文件规模、测试、构建和三端验收基线。
- 固化文档归档规则与长期规范优先级。

### 阶段 1-2：Vue feature 与工作流拆分

- 将登录、UID、声骸工作台、识别、统计、评估和历史面板拆入对应 feature。
- 将核心声骸与识别工作流迁入 feature composable。
- `App.vue` 从基线 2848 行收敛为 316 行，只保留全局页面、主题和跨 feature 编排。
- 修复账号切换后的旧异步响应回写，补充真实并发行为测试。

### 阶段 3：Web UI 样式收口

- 建立 `tokens.css`、`base.css`、`shell.css`、`controls.css` 和 `styles/features/*.css` 的明确所有权。
- `style.css` 从基线 8843 行收敛为 10 行 import-only 入口。
- 统一按钮、表单、卡片、标题、错误、空状态、亮色、深色和响应式语义。
- 生产 CSS 从阶段收口前 153.30 kB / gzip 27.47 kB 降至 146.72 kB / gzip 26.21 kB。

### 阶段 4：Django 边界收口

- 统一成功与错误 JSON 响应 helper。
- 将 `GameAccount` ownership 集中到 `accounts.ownership`。
- 将账户与声骸写流程迁入对应领域 service。
- 删除 `api.models` 领域模型转发和 `api.services` 统计、预测、评估兼容出口。
- view 收敛为请求解析、权限、service 调用与响应；serializer 不再持有事务和业务写流程。

### 阶段 5：三端回归

- Django 全量测试 115 项通过，系统检查通过，无 migration 变化。
- Vue 测试 93 项通过，生产构建转换 51 个模块。
- WPF 自测 12 项通过，完整构建 0 个警告、0 个错误。
- Django 接口与 WPF 自测覆盖登录、UID、声骸、统计、预测、评估、识别快照和回滚主链路。

## API、数据库与数据边界变化

- API 路径、请求字段、响应字段和状态值无变化。
- 数据库 schema 与 migration 无变化。
- 系统账号、`GameAccount`、UID、声骸和识别数据的所有权模型无变化。
- WPF 本地截图、离线 OCR 和后台识别职责没有复制到 Web 或后端。

## 性能与资源影响

- Vue 未新增轮询、网络请求或持久化状态。
- 账号切换和 reset 会主动使旧请求失效并清理未触发计时器。
- 最终生产 JS 为 165.84 kB / gzip 57.56 kB。
- 最终生产 CSS 为 146.72 kB / gzip 26.21 kB。

## 验收与偏差

- 各拆分与边界迁移均通过对应结构、行为或接口测试后提交。
- 阶段 3 已完成评估页 1280px 亮色、1280px 深色和 860px 深色浏览器视觉验收。
- 阶段 5 复验时主机侧 Django 与 Vite 均返回 HTTP 200，但应用内浏览器隔离环境拒绝访问 localhost，因此未重复记录完整浏览器主链路为通过。
- 没有遗留的代码或 migration 修复项。

## 长期规范同步

- `docs/architecture.md` 已同步当前 Vue feature、样式 owner 与 Django 领域边界。
- `docs/code-organization-and-style.md` 已同步当前文件落点、view/service/serializer 职责和共享样式规则。
- `docs/web-workbench-ui-guidelines.md` 的产品定位、响应式、主题与可访问性规则保持有效，无需因本轮实现改写。
- `docs/api-and-data-contracts.md` 无需更新，因为本轮没有 API 或数据契约变化。

## 阶段结论

原 `2026-06-18-web-backend-refactor-plan.md` 的六个执行阶段已经闭环。后续新增功能应直接遵循顶层长期规范，不再向 `App.vue`、`style.css`、Django view 或 `api/` 共享入口回填领域逻辑。
