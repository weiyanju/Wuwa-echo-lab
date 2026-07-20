# 工程质量

## 1. 文档定位

本文是 `Wuwa` 的长期工程质量母文档。

它回答的是长期稳定规则，而不是某一轮专项执行计划：

- 工程质量默认包含哪些维度
- 这些维度之间如何排序和取舍
- 哪些优化是鼓励的，哪些会伤害仓库
- 默认验证门槛是什么
- 当前哪些区域需要高警惕

如果临时执行单或局部习惯与本文冲突，以本文和 [`architecture.md`](./architecture.md) 为准。

具体代码落点、命名、文件拆分和注释规则见 [`code-organization-and-style.md`](./code-organization-and-style.md)。

API 字段、持久化和跨端数据契约见 [`api-and-data-contracts.md`](./api-and-data-contracts.md)。账号、截图、OCR、日志和云端边界见 [`security-privacy-and-data-boundaries.md`](./security-privacy-and-data-boundaries.md)。

---

## 2. 三个核心维度

当前仓库长期把工程质量拆成三个核心维度。

### 2.1 可靠性与数据可信

关注系统是否：

- 声骸数据归属正确
- `GameAccount` 隔离可信
- 识别结果可追踪、可去重、可回滚
- 后端持久化稳定
- Web 与外部本地识别客户端消费同一服务端状态

### 2.2 代码质量与 owner 清晰

关注代码是否：

- 易读
- 易改
- 易测
- 文件职责单一
- 不把复杂度推回高吸力层
- 模块边界符合 [`architecture.md`](./architecture.md)

### 2.3 性能与后台占用

关注软件是否：

- 外部本地识别客户端遵守低占用、按需 OCR 和不阻塞 UI 的跨仓库契约
- 服务端对识别准确性、置信度、数据归属和回滚保持保护
- Web 页面统计和预测计算不会无意义重复
- 后端 API 与数据库查询成本可解释

这三个维度不能互相替代：

- 性能优化不能跳过验证
- 代码整理不能破坏识别可信度
- 可靠性保护也不能成为继续堆复杂度的理由

---

## 3. 默认优先级

当前仓库默认优先级是：

1. 可靠性与数据可信
2. 代码质量与 owner 清晰
3. 性能与后台占用
4. UI 体验打磨

原因很简单：Wuwa 的核心价值来自可信的声骸管理和识别数据。如果识别写错、UID 混错、数据归属不可信，UI 再好也没有意义。

默认取舍规则：

- 没有验证保护，不做高风险结构整理
- 没有测量依据，不做高风险性能优化
- 不能为了“更整洁”破坏 owner 边界
- 不能为了“更快”削弱识别、回滚和数据归属可信度
- 不能为了短期开发速度制造大量重复代码或一次性 UI 实现

---

## 4. 当前阶段质量目标

当前阶段最重要的事不是继续堆功能，而是：

1. 把项目管理规范起来
2. 收口代码质量
3. 重构 UI 结构与视觉规范
4. 在规范基础上继续开发截图、OCR 和识别流水线

因此短期内，工程质量判断应主动看重：

- 文件组织是否合理
- 是否符合 [`code-organization-and-style.md`](./code-organization-and-style.md)
- Vue 是否继续堆在 `App.vue`
- 后端 API 是否清楚绑定 `GameAccount`
- UI 是否符合 [`product-interface-principles.md`](./product-interface-principles.md)、根目录 [`DESIGN.md`](../DESIGN.md) 和对应端的 UI 规范
- API 是否符合 [`api-and-data-contracts.md`](./api-and-data-contracts.md)
- 是否改变了 [`security-privacy-and-data-boundaries.md`](./security-privacy-and-data-boundaries.md) 中的隐私边界
- 测试是否覆盖关键契约

---

## 5. 默认验证门槛

### 5.1 后端

后端改动默认至少运行相关 Django 测试。

当前已有测试集中在：

- model 行为
- API views
- statistics
- prediction
- evaluation
- constants
- backend structure

要求：

- 改 `GameAccount`、声骸、识别、统计、预测逻辑时，必须跑命中的后端测试。
- 改 schema 时必须确认 migration。
- 改认证或权限时必须覆盖跨用户访问风险。

### 5.2 Vue 前端

Vue 改动默认至少运行命中的前端测试或构建。

当前已有测试覆盖：

- API helper、错误形状和 `GameAccount` 作用域
- `useAuth`、可恢复注册、UID 初始化与账号切换
- 声骸工作台、识别复核、统计、评估和历史记录工作流
- 跨 feature 的样本成熟度、评估就绪与空指标语义
- 格式化、静态业务数据和展示映射
- 可复用 UI 的状态、键盘交互与无障碍语义
- App 编排、目录 owner、文件体积和样式归属等架构约束
- 字体角色、主题 token、响应式布局和 `prefers-reduced-motion` 等视觉契约

要求：

- 改 API 请求形状时补 API helper 测试。
- 改账号/UID 工作流时补 composable 或 App 测试。
- 改共享样本语义时同时覆盖统计、评估和工作台摘要。
- 改 UI 大结构、共享状态或设计契约时运行命中测试，并至少做构建验证。

### 5.3 跨仓库客户端兼容

API、recognition、认证、`GameAccount` 或稳定响应字段变化必须运行兼容响应测试，并确认外部本地识别客户端仍可消费现有契约。破坏性变化必须同步客户端仓库或提供兼容期。

外部客户端自身的窗口检测、截图、OCR、缓存、桌面性能和启动验证由独立客户端仓库负责。本仓库不以服务端测试替代客户端验收。

---

## 6. 性能优化规则

服务端与 Web 的性能优化必须服务真实场景；外部客户端还必须满足跨仓库运行契约。

后端、Web 与外部客户端的责任边界见 [`performance-and-background-runtime.md`](./performance-and-background-runtime.md)。本文只保留工程质量层面的默认约束。

允许的优化：

- 避免无界列表和重复数据库访问
- 避免 Web 重复请求与重复计算
- 保持加载、错误、过期和刷新状态可见
- 后台错误可恢复

不允许的“优化”：

- 为了降低占用破坏识别正确性
- 为了减少代码量取消必要缓存或去重
- 没有测量依据就引入复杂多线程或复杂调度
- 为了追求任务管理器数字牺牲用户主路径响应

性能优化必须说明：

- 优化场景
- 优化前后的可比依据
- 增加的复杂度
- 回退策略

改变外部客户端契约时，必须同步独立客户端仓库或提供兼容期，并由客户端仓库执行截图、OCR、缓存、队列和桌面性能验收。

---

## 7. 长期关注热点

当前需要持续高警惕的质量热点：

- 后端 `GameAccount` 隔离
- 后端 recognition snapshot 写入和回滚
- Vue `App.vue`
- Vue `useGameAccount`
- 前端统计和预测视图

这些区域发生变化时，默认要先补验证或明确风险。

---

## 8. 文档与归档规则

工程质量文档长期采用两层结构：

- 顶层 `docs/`：只保留当前有效的长期规则
- `docs/archive/`：保留已经完成使命的阶段专项文档、执行清单与历史背景

新增阶段性或历史性资料应优先放入 `docs/archive/`。

当前 `docs/superpowers/plans/` 和 `docs/superpowers/specs/` 中的既有文档仍作为阶段执行记录保留，不作为长期母规则的默认入口。后续整理历史资料时，应逐步迁移或索引到 `docs/archive/`。

如果未来出现新的工程质量专项，应先写在阶段计划或 working 文档中。专项完成后，把长期事实回写到本文。

### 8.1 功能开发文档闭环

每个可以独立验收的功能、阶段或重构单元，必须遵循以下闭环：

1. 开发前阅读顶层总规范。
2. 阅读该功能对应的专项规范、接口契约和既有设计记录。
3. 明确模块归属、数据边界、性能目标、测试范围和验收标准。
4. 实施过程中遇到会改变产品流程、API、数据库、OCR 引擎、第三方依赖、隐私边界或长期架构的问题时，先确认再实现。
5. 功能完成后运行与风险相匹配的验证。
6. 在 `docs/archive/` 写入本次功能的实施与验收记录。
7. 只把已经成为长期事实的变化同步回顶层规范。

开发前默认阅读顺序：

1. 根目录 [`PRODUCT.md`](../PRODUCT.md) 与 [`product-principles-and-scope.md`](./product-principles-and-scope.md)
2. [`architecture.md`](./architecture.md)
3. 本文与 [`code-organization-and-style.md`](./code-organization-and-style.md)
4. [`api-and-data-contracts.md`](./api-and-data-contracts.md)
5. [`security-privacy-and-data-boundaries.md`](./security-privacy-and-data-boundaries.md)
6. [`performance-and-background-runtime.md`](./performance-and-background-runtime.md)
7. UI 任务阅读 [`product-interface-principles.md`](./product-interface-principles.md)、根目录 [`DESIGN.md`](../DESIGN.md) 与对应端 UI 规范
8. 当前功能对应的阶段计划、专项设计或历史决策记录

不要求每次开发机械地修改全部文档。同步范围按实际变化确定：

- 架构 owner、模块边界或依赖方向变化：更新 `architecture.md`。
- 目录、命名、复用方式或代码职责变化：更新 `code-organization-and-style.md`。
- API、字段、状态、持久化或数据库关系变化：更新 `api-and-data-contracts.md`。
- UI 长期原则或公共组件规则变化：更新统一界面原则、根目录 `DESIGN.md`、结构化设计文件和对应端 UI 规范。
- 后台运行、OCR、缓存、资源占用策略变化：更新 `performance-and-background-runtime.md`。
- 权限、截图、日志、账号或云端数据边界变化：更新 `security-privacy-and-data-boundaries.md`。
- 产品优先级或阶段顺序变化：更新 `roadmap-and-prioritization.md`。
- 仅按既有规范完成实现：只写归档记录，不重复修改顶层规范。

归档记录是“本次实际做了什么”的证据，不是新的长期规则来源。归档内容与顶层规范冲突时，以当前顶层规范为准。

---

## 9. 给 Codex 与后续协作者的默认约束

- 先解决真实工程问题，再回写文档
- 不把一次局部成功夸大成“整体问题已解决”
- 不把阶段性收口误写成长期完成
- 不把代码质量问题伪装成 UI 小修
- 不把 UI 问题伪装成架构重构
- 改完必须按风险跑对应验证
- 下一部分功能开始前，先按第 8.1 节重新读取总规范和对应专项文档
- 每个独立验收单元完成后，必须补充 `docs/archive/` 实施记录并同步受影响的长期规范
