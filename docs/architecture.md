# 架构规范

## 1. 文档定位

本文定义 `Wuwa` 当前阶段的长期架构基线。

它不是某一轮重构清单，也不是 Milestone 8 的执行计划，而是以后新增代码、调整模块边界、评估技术路线时都应默认遵循的母规则。

本文主要回答 5 件事：

- 这套系统当前稳定的长期结构是什么
- Django、Vue 与外部 Windows 本地识别客户端各自负责什么、不负责什么
- 本地端、后端、数据库、未来云端服务的所有权如何划分
- 新增代码默认应该落在哪一层
- 什么行为属于架构回流或越界

如果一次性执行单、阶段计划或局部实现习惯与本文冲突，以本文为准。

阶段执行细节保留在：

- [`superpowers/plans/2026-06-14-wuwa-assistant-modularization-workbench.md`](./superpowers/plans/2026-06-14-wuwa-assistant-modularization-workbench.md)

---

## 2. 系统现实

`Wuwa` 不是单一 Web 应用，而是由三个部署单元协作的系统：

- `Django` 后端工程
- `Vue + Vite` 前端工程
- 外部 Windows 本地识别客户端
- 当前后端运行在本地，后期后端和 Web 前端会迁移到云服务器

长期架构设计优先服务于：

- 用户声骸数据可信
- 本地助手后台低占用
- 本地识别链路可验证
- Web 与外部本地识别客户端共享同一套账号和 `GameAccount`
- 后续云端部署时仍能保持隐私边界

而不是服务于：

- 目录表面整齐
- 把所有逻辑堆进一个窗口或一个页面
- 为抽象而抽象
- 过早切换 UI 技术栈

---

## 3. 架构原则

### 3.1 所有权优先于方便修改

代码应该落在真正拥有该能力的层，而不是当前最顺手修改的文件。

### 3.2 后端数据库拥有重要业务数据

系统账号、`GameAccount`、UID、声骸、识别会话、识别快照、回滚状态都属于后端数据库。

本地可以缓存、加速和保存设置，但不能成为重要业务数据的唯一来源。

### 3.3 外部本地识别客户端是日常助手入口，Web 是深度工作台

理想状态下，用户大多数时间让外部本地识别客户端挂在后台，自动或半自动统计声骸调谐数据。

当用户需要更深入地查看预测、统计、管理和分析时，再打开 Web 前端。

### 3.4 OCR 主路径保持本地离线

未来后端和 Web 可以迁移到云服务器，但这不等于启用云端 OCR。

默认主路径是：

```text
外部客户端本地截图
  -> 本地离线 OCR
  -> 结构化识别结果
  -> 后端 API
  -> 数据库
```

完整截图不进入常规后端上传路径。云端 OCR 如果未来要做，必须单独确认，因为它涉及截图上传、隐私、成本、速度和合规边界。

### 3.5 入口层保持薄

Vue 的 `App.vue` 与 Django 的 view 层都属于本仓库的高吸力入口层。

它们可以编排流程，但不应沉淀厚业务逻辑。

### 3.6 渐进收口优先于大爆炸重构

当前最重要的是把项目管理、代码质量和 UI 边界规范起来。

允许在真实任务中顺手推进一小步边界收敛，但不为了“目录更漂亮”做无收益搬迁。

### 3.7 客户端技术路线由独立仓库负责

桌面 UI 技术栈、安装、更新、截图、OCR 和后台运行实现由独立客户端仓库评估与维护。本仓库只通过公开 API 契约与客户端协作，不以服务端或 Web 改动隐式决定客户端技术路线。

---

## 4. 系统边界与所有权

当前系统存在 3 条明确协作通道。

### 4.1 Django 后端通道

后端负责：

- 认证与 session
- 用户与 `GameAccount` 所有权
- 数据库模型和 migration
- Web 与外部本地识别客户端共用 API 契约
- 声骸创建、更新、统计、预测、评估和回滚
- 识别会话和识别快照持久化
- 未来云端部署后的业务服务能力

后端不负责：

- 常规流程中的完整截图 OCR
- 外部客户端窗口检测
- 外部客户端截图与缓存
- 外部客户端桌面 UI 状态编排

规则：

- 所有业务请求必须绑定认证用户。
- 所有声骸、统计、预测、评估、识别请求必须绑定 `GameAccount`。
- 后端必须拒绝跨用户和跨 `GameAccount` 访问。
- locked `GameAccount` 不能写入正式声骸和识别结果。
- 外部本地识别客户端和 Vue 不能绕过后端直接写数据库。

#### Analytics 派生状态

`EchoRecord` 与 `SubstatRoll` 是统计、预测和评估的事实源；`analytics/` 以每个 `GameAccount` 为 owner 维护可重建的持久化派生状态。ready 的 statistics、prediction 和 evaluation 三类读取只消费该账户 ready state，不回放全量调谐历史。

正常新增调谐以追加方式更新状态。删除、乱序写入、既有 `SubstatRoll` 移动到另一声骸/账户，以及影响上下文的 Echo 变更，必须只将相关的旧/新账户标为 dirty；下一次读取只对该账户流式重建。此机制不能放宽认证或 `GameAccount` ownership。

Redis 可以在将来作为可选加速或分布式协调层，但不是业务事实，也不能替代数据库中的原始记录或该可重建状态。

### 4.2 Vue Web 工作台通道

Vue 前端负责：

- 完整数据管理体验
- 声骸列表、编辑、统计、预测和分析
- Web 端账号状态与 UID 状态展示
- 更深入的可视化和管理工作流

Vue 前端不负责：

- 后台挂载识别主链
- 游戏窗口检测
- 本地截图
- 本地 OCR 引擎运行
- 外部客户端本地设置

规则：

- Vue 必须通过 `/api/...` 调用后端。
- Vue 必须把 `GameAccount` 作为业务数据边界。
- Vue 不应为新正式声骸记录本地分配持久 ID，如果后端已经拥有分配能力。
- Vue 可以做更完整的数据管理，但不能创造另一套账号或 UID 模型。
- 工作台初始 refresh 只等待统计，并在后台启动 active prediction；评估只在进入评估页或用户重试时请求，以保持评估页自己的 loading、error 与 retry 状态。

### 4.3 外部客户端协作边界

独立客户端仓库拥有桌面 UI、窗口检测、截图、本地离线 OCR、缓存、本地运行时、诊断和客户端 API 消费实现。本仓库只拥有公开 API、服务端业务事实与向后兼容。

规则：

- OCR 默认本地离线运行，常规流程不上传完整截图。
- 客户端只能通过公开 API 读取或写入服务端数据，不能直接访问数据库。
- 认证、`GameAccount` ownership、recognition 幂等与回滚由 Django 后端强制执行。
- 客户端不得读取游戏内存、注入游戏进程、修改游戏文件或自动操作游戏。
- API 或稳定响应字段变化必须评估外部客户端兼容性，并同步客户端仓库或提供兼容期。

---

## 5. 长期目录结构

### 5.1 后端结构

当前后端长期结构为：

```text
Wuwa/
  accounts/
  api/
  echoes/
  recognition/
  analytics/
  wuwa/
```

默认 owner：

- `accounts/`：认证、用户、`GameAccount`
- `api/`：共享路由、认证装饰器、JSON 请求解析和响应 helper；不拥有领域模型或业务 service
- `echoes/`：声骸数据
- `recognition/`：识别会话与识别快照
- `analytics/`：统计、预测、评估
- `wuwa/`：Django 项目配置

`recognition/` 当前业务流程按职责拆分：

- `services.py`：稳定兼容 facade，只导出公开 service API。
- `session_services.py`：识别会话创建、读取、列表和状态更新。
- `snapshot_services.py`：识别快照校验、提交、去重和回滚。
- `service_support.py`：payload 解析、ownership 查询和 service 结果类型。

新增识别业务应进入对应 workflow 文件，不再回填到 facade。

### 5.2 Vue 前端结构

当前前端长期结构为：

```text
WuwaFrontend/src/
  components/
  features/
    auth/
    evaluation/
    history/
    recognition/
    statistics/
    workspace/
  composables/
  data/
  shared/
  services/
  styles/
  assets/
  App.vue
```

当前 feature owner：

- `features/workspace/`：声骸工作台视图与 `useEchoWorkspace` 核心工作流。
- `features/recognition/`：识别复核视图、展示映射与 `useRecognitionReview` 工作流。
- `features/statistics/`：统计页面与统计展示映射。
- `features/evaluation/EvaluationView.vue`：模型评估页组合 owner，负责页面状态摘要和结果优先的模块顺序。
- `features/evaluation/EvaluationCoreBacktest.vue`：核心命中范围与概率校准摘要。
- `features/evaluation/EvaluationOverview.vue`：当前融合权重与融合结论。
- `features/evaluation/EvaluationBacktest.vue`：子模型列表、展开诊断和模型专属交互。
- `features/history/`：浮动历史面板及其交互状态。
- `features/auth/`：登录与注册表单视图。
- `components/`：跨 feature 复用的 UI；当前按 `controls/`、`shell/` 和 `states/` 等明确职责组织。
- `composables/`：跨 feature 的认证和 `GameAccount` 状态。
- `shared/sampleExperience.js`：统计、评估与工作台摘要共享的样本数量、成熟度、评估就绪和空指标语义。
- `styles/tokens.css`：全局设计 token。
- `styles/base.css`：浏览器基础元素和应用根节点规则。
- `styles/controls.css`：跨 feature 复用的主题、按钮、表单、卡片和标题语义。
- `styles/shell.css`：应用导航、账号、Hero 和页面壳。
- `styles/features/*.css`：由单个业务 feature 独占的样式。
- `App.vue`：页面、主题及跨 feature 刷新编排。

新增代码默认规则：

- API 调用进入 `services/`
- feature 内页面状态和工作流进入对应 `features/*/use*.js`
- 跨 feature 状态进入 `composables/`
- 可复用 UI 进入 `components/`；页面级 UI 进入对应 `features/*`
- 稳定的跨 feature 纯逻辑进入 `shared/`；页面状态、API 调用和 feature 展示映射不进入该目录
- 业务数据常量进入 `data/`
- 静态资源进入 `assets/` 或 `public/`
- 不继续把大型功能堆进 `App.vue`

## 6. GameAccount 与 UID 规则

`GameAccount` 是游戏 UID 的数据边界。一个系统账号可以拥有多个 `GameAccount`。

默认选择规则：

1. 优先选择 `is_default=true` 且 `workspace_locked=false` 的账号。
2. 如果默认账号 locked，则选择第一个 unlocked 账号。
3. 如果没有 unlocked 账号，客户端进入初始化 UID 流程。
4. 从外部本地识别客户端初始化 UID 时，通过 `PATCH /api/game-accounts/{id}/` 保存，并传入 `is_default=true`。

规则：

- 空 UID 表示 `GameAccount` locked。
- locked `GameAccount` 禁止识别写入。
- UI 可以进入 locked 状态首页，但识别操作必须禁用。
- UID 修改必须走后端 API。
- Web 与外部本地识别客户端必须共享同一套 `GameAccount`。

---

## 7. 新增代码决策顺序

新增代码时，先不要问“放哪里最方便”，而是按下面顺序判断 owner。

### 7.1 后端 owner 判断

1. 是否属于认证、用户、`GameAccount`？
2. 是否属于声骸写入、查询、回滚？
3. 是否属于识别会话或识别快照？
4. 是否属于统计、预测、评估？
5. 是否只是 Django 项目配置？

默认映射：

- 账号与 UID：`accounts/`
- 声骸：`echoes/`
- 识别：`recognition/`
- 统计预测：`analytics/`
- 项目配置：`wuwa/`

### 7.2 Vue owner 判断

1. 是否是 API 请求？
2. 是否是页面状态组合？
3. 是否是纯展示格式化？
4. 是否是业务常量或声骸数据？
5. 是否是页面 UI？

默认映射：

- API 请求：`services/`
- 状态组合：`composables/`
- 共享格式化：`shared/` 或现有服务模块
- 业务常量：`data/`
- 页面 UI：对应 `features/<owner>/`
- 全局页面、主题与跨 feature 编排：`App.vue`

---

## 8. 禁止事项

- 不把 Vue 新大型能力继续堆进 `App.vue`
- 不让外部本地识别客户端或 Vue 直接写数据库
- 不上传完整截图作为常规 OCR 流程
- 不在普通用户 UI 显示后端地址
- 不把本地缓存当作业务真实来源
- 不为了目录整齐做无收益大搬迁
- 不读游戏内存、不注入游戏进程、不修改游戏文件

---

## 9. 当前重点防守区

当前最容易回流变厚的区域：

- `WuwaFrontend/src/App.vue`
- 后端共享入口 `api/`，防止领域模型或业务流程回流

这些区域不是不能改，而是默认应带着更强警惕：

- 先确认真实 owner
- 再确认是否只是薄编排
- 如果开始承接新业务，应拆到模块 owner

---

## 10. 与其他长期文档的关系

- 产品边界见 [`product-principles-and-scope.md`](./product-principles-and-scope.md)
- 质量与验证见 [`engineering-quality.md`](./engineering-quality.md)
- 代码组织与风格见 [`code-organization-and-style.md`](./code-organization-and-style.md)
- API 与数据契约见 [`api-and-data-contracts.md`](./api-and-data-contracts.md)
- 安全、隐私与数据边界见 [`security-privacy-and-data-boundaries.md`](./security-privacy-and-data-boundaries.md)
- 后台运行与性能见 [`performance-and-background-runtime.md`](./performance-and-background-runtime.md)
- 问题修复分流见 [`issue-fix-boundary-guardrails.md`](./issue-fix-boundary-guardrails.md)
- 产品界面原则见 [`product-interface-principles.md`](./product-interface-principles.md)
- Web UI 规范见 [`web-workbench-ui-guidelines.md`](./web-workbench-ui-guidelines.md)
- 路线图与优先级见 [`roadmap-and-prioritization.md`](./roadmap-and-prioritization.md)
- 版本与发布见 [`versioning-and-release-policy.md`](./versioning-and-release-policy.md)

---

## 11. 给 Codex 与后续协作者的执行约束

- 先按本文判断 owner，再实现
- 不做一次性全仓库大重构
- 当前阶段优先规范项目管理、代码质量和 UI 边界
- 本仓库不新增桌面客户端源码；跨仓库协作只通过公开 API 契约
- 新增 OCR、截图或云端能力时，先确认隐私和数据边界
- 如果需要引入临时兼容壳，必须说明真实 owner 和退出条件
