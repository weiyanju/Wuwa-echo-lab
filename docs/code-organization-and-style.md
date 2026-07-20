# 代码组织与风格规范

## 1. 文档定位

本文定义 `Wuwa` 长期代码组织、命名、文件落点和局部风格规则。

它不是格式化工具配置，也不是某一次重构清单，而是以后新增功能、拆文件、修 bug、补测试时都应遵守的代码层规范。

本文主要回答：

- 新代码应该放在哪个目录
- 什么情况必须新建文件夹或文件
- `Service`、`Client`、`Dto`、`Model` 等命名如何使用
- 后端与 Vue 各自哪些文件不能继续变厚
- 测试、注释和临时兼容代码应如何处理

如果本文与 [`architecture.md`](./architecture.md) 冲突，以 `architecture.md` 的 owner 判断为准。

---

## 2. 核心原则

### 2.1 先判断 owner，再创建文件

不要先问“放哪里最方便”，而是先判断这段代码属于哪个能力 owner。

默认顺序：

1. 它属于后端、Vue，还是跨仓库 API 契约？
2. 它属于账号、`GameAccount`、识别、截图、OCR、诊断、设置、统计、预测中的哪一个？
3. 它是 UI、状态、API、业务规则、平台能力，还是存储？
4. 它有没有现有目录可以承接？
5. 如果没有，是否应该新建目录，而不是塞进大文件？

### 2.2 功能不同，文件夹必须不同

用户已明确要求：不同功能要创建不同文件夹管理。

因此新增正式能力时，默认应有清晰目录，不应长期散落在入口文件或杂物文件中。

可以接受的短期例外：

- 只是一行样式或文案修复
- 只是在现有 owner 文件中补一个小分支
- 正在迁移旧代码，且有明确退出条件

不能接受：

- 为了快，把识别服务端规则写进 Django view 或 Vue 页面
- 为了少建文件，把多个无关 helper 放进同一个工具类
- 为了目录少，把账号、UID、识别、设置混在一个 service 里

### 2.3 入口层必须薄

以下文件是高吸力入口层：

- `WuwaFrontend/src/App.vue`
- Django `views.py`

它们可以：

- 绑定 UI 事件
- 调用 ViewModel、service、client
- 做少量页面级编排
- 显示错误和状态

它们不能：

- 承接业务规则中心
- 直接实现 OCR、截图、识别 pipeline
- 直接做复杂数据转换
- 直接管理缓存、队列、重试、持久化
- 变成“所有功能都能顺手塞”的文件

---

## 3. 目录拆分与公共资源硬规则

### 3.1 功能目录拆分

前端和后端都必须按功能和 owner 拆分目录。

硬规则：

- 不同业务功能默认进入不同目录或不同 app。
- 不同层职责默认进入不同目录，例如 API、状态、UI、业务规则、平台能力、资源。
- 找不到 owner 时，先补 owner 判断或目录说明，不要塞进入口层。
- 共享能力必须进入明确 shared owner，不要散落在页面或 view。
- 临时放置必须说明退出条件，不能把临时目录当长期事实。

### 3.2 后端目录拆分

后端不同业务 app 不混放。

默认规则：

- `accounts/`：认证、用户、`GameAccount`。
- `echoes/`：声骸数据和调谐记录。
- `recognition/`：识别会话、识别快照、回滚。
- `analytics/`：统计、预测、评估。
- `api/`：共享路由和 HTTP helper，不拥有领域模型或业务 service。

公共逻辑：

- 业务流程进入对应 app 的 `services.py` 或 `services/`。
- 权限和 ownership 校验进入清晰 helper 或 service。
- 常量进入对应 app 的 `constants.py`。
- 测试进入对应 app 的 `tests/`。

### 3.3 Vue 目录拆分

Vue 新功能必须优先保持层次清楚。

当前默认 owner：

- `src/services/`：API 请求、HTTP helper、纯数据调用。
- `src/composables/`：可复用状态和工作流。
- `src/components/`：可复用 UI 组件。
- `src/shared/`：已经稳定并被多个 feature 复用的纯逻辑。
- `src/data/`：稳定静态业务数据。
- `src/features/`：按业务 owner 组织页面、展示映射和 feature 工作流。
- `src/styles/`：设计 token、基础规则、应用壳、共享控件和 feature 样式入口。
- `src/assets/`：源码内引用的图片、图标、视觉资源。
- `public/`：直接静态分发的大资源。

`src/shared/` 当前已用于统一样本数量、成熟度、评估就绪和空指标语义。只在逻辑已经稳定且确实被多个 feature 复用时继续扩展该目录，不为目录对称创建空层，也不把页面状态、API 调用或单页展示映射迁入其中。

规则：

- 新大型功能不继续堆进 `App.vue`。
- 页面不能直接复制一套 API 请求和状态管理。
- 公共图标、图片、颜色、间距、状态样式不能散落在单页样式里。

### 3.4 共享资源归属表

| 资源或能力 | 归属 |
| --- | --- |
| Vue API 请求 | `WuwaFrontend/src/services/` |
| Vue 可复用状态 | `WuwaFrontend/src/composables/` |
| Vue 可复用 UI | `WuwaFrontend/src/components/` |
| Vue 静态业务数据 | `WuwaFrontend/src/data/` |
| Vue 源码资源 | `WuwaFrontend/src/assets/` |
| Vue 公开静态资源 | `WuwaFrontend/public/` |
| Django 业务流程 | 对应 app 的 `services.py` 或 `services/` |
| Django 数据模型 | 对应 app 的 `models.py` |
| Django 输入输出转换 | 对应 app 的 `serializers.py` |
| Django 请求入口 | 对应 app 的 `views.py` |
| Django 测试 | 对应 app 的 `tests/` |

如果新增资源不在表中，先判断它是否属于已有 owner；如果属于新的长期资源类型，再扩展本文。

---

## 4. 命名语义

命名必须反映职责，不用一个词包打天下。

### 4.1 `Client`

用于访问外部服务或后端 API。

适合：

- HTTP API 调用
- session 管理
- request / response DTO 映射

不适合：

- 写业务决策
- 管理 UI 状态
- 执行 OCR

示例：

- `WuwaApiClient`
- `AuthApiClient`
- `RecognitionApiClient`

### 4.2 `Service`

用于承载业务流程或领域规则。

适合：

- 识别会话流程
- `GameAccount` 选择规则
- 后端统计/预测逻辑
- 提交前 payload 构建

不适合：

- 包装一个简单函数却叫 service
- 直接访问 UI 控件
- 混入平台 API 细节

### 4.3 `Dto` / `Model`

建议区分：

- `Dto`：API 传输结构，形状跟接口有关。
- `Model`：领域对象或数据库模型，形状跟业务有关。
- 页面状态对象：形状跟 UI 有关。

不要把同一个类同时当作 API DTO、业务模型和页面状态。

---

## 5. 外部桌面客户端边界

本仓库不新增桌面客户端源码。桌面 UI、窗口检测、截图、OCR、缓存、本地设置和客户端运行时由独立客户端仓库维护；跨仓库协作只通过公开 API 契约。

---

## 6. Django 后端代码组织

当前后端长期 owner：

```text
Wuwa/
  accounts/
  echoes/
  recognition/
  analytics/
  api/
  wuwa/
```

默认规则：

- `accounts/`：用户、认证、`GameAccount` 所有权。
- `echoes/`：声骸数据结构、声骸业务规则。
- `recognition/`：识别会话、识别快照、回滚、识别写入。
- `analytics/`：统计、预测、评估。
- `api/`：共享路由、认证装饰器、JSON 请求解析和响应 helper。
- `wuwa/`：Django 项目配置。

### 6.1 Django 文件职责

- `models.py`：数据库模型和模型级约束。
- `serializers.py`：输入输出转换和字段级校验，不负责事务或业务写流程。
- `views.py`：请求入口、权限检查、调用 service。
- `services.py` 或 `services/*`：业务流程。
- `constants.py`：稳定常量，不放动态配置。
- `tests/`：对应行为测试。

当单个领域同时包含多个独立工作流时，可以使用同级 `*_services.py` 或 `services/` 包拆分。当前 `recognition/` 使用：

- `services.py`：公开 facade，不承载具体流程。
- `session_services.py`：session 工作流。
- `snapshot_services.py`：snapshot、去重和回滚工作流。
- `service_support.py`：跨 workflow 的 payload helper、ownership helper 和结果类型。

facade 的职责是保持稳定导入路径，不允许重新增长为业务实现中心。

### 6.2 后端约束

- view 层不能变成业务中心。
- view 只负责请求解析、权限、调用 service 和返回响应。
- 成功与错误 JSON 响应统一通过 `api.responses` 构造。
- 用户与 `GameAccount` ownership 统一由 `accounts/ownership.py` 判定。
- 领域事务、创建、更新、删除和回滚流程进入对应 app 的 service。
- 跨用户、跨 `GameAccount` 的访问控制必须靠后端保证。
- migration 必须跟随 schema 变化。
- 后端不能默认接收完整截图做常规 OCR。
- 识别写入必须可追踪、可去重、可回滚。

---

## 7. Vue 前端代码组织

当前 Vue 结构：

```text
WuwaFrontend/src/
  assets/
  components/
  composables/
  data/
  features/
  shared/
  services/
  styles/
  App.vue
```

默认规则：

- `services/`：API 调用、格式化、纯工具函数。
- `composables/`：可复用状态和工作流。
- `components/`：可复用 UI 组件。
- `data/`：静态数据。
- `features/`：按业务 owner 组织的页面级视图、展示映射和 feature composable。
- `shared/`：稳定的跨 feature 纯逻辑；当前 `sampleExperience.js` 统一样本成熟度、评估就绪和空指标语义。
- `assets/`：图片、图标和视觉资源。
- `styles/tokens.css`：共享设计 token。
- `styles/base.css`：全局基础元素规则。
- `styles/controls.css`：跨 feature 复用的按钮、表单、卡片、标题和主题状态。
- `styles/shell.css`：应用壳、导航、账号和 Hero。
- `styles/features/*.css`：单个 feature 独占的基础、深色和响应式规则。
- `App.vue`：只保留全局页面、主题和跨 feature 编排。

### 7.1 Vue 新代码落点

| 功能 | 默认落点 |
| --- | --- |
| API 请求 | `src/services/*Api.js` |
| 跨 feature 状态 | `src/composables/use*.js` |
| feature 状态与工作流 | `src/features/<owner>/use*.js` |
| 纯格式化 | `src/services/formatters.js` 或独立 formatter 文件 |
| 共享 Web 控件样式 | `src/styles/controls.css` |
| feature 专属样式 | `src/styles/features/<owner>.css` |
| 静态鸣潮数据 | `src/data/` |
| 可复用 UI | `src/components/` |
| 稳定跨 feature 纯逻辑 | `src/shared/` |
| 页面级大模块 | `src/features/<owner>/`，不要回填到 `App.vue` |

### 7.2 Vue 约束

- 组件不能直接拼接复杂 API 细节。
- `App.vue` 不继续承接新业务主路径。
- `GameAccount` 状态应通过 composable 或服务统一处理。
- 统计、预测、识别等功能应保持清晰模块边界。

---

## 8. 测试组织

测试必须跟风险匹配。

### 8.1 Django

默认规则：

- model、serializer、view、service 的关键行为都应有测试。
- 认证、权限、`GameAccount` 隔离必须覆盖。
- schema 变化必须确认 migration。

测试位置：

```text
Wuwa/<app>/tests/
```

### 8.2 Vue

默认规则：

- services 和 composables 优先补测试。
- API 请求形状变化必须补测试。
- 账号、UID、识别工作流变化必须补测试。
- 大 UI 结构变化至少跑构建。

---

## 9. 注释规则

注释应该解释“为什么”，不重复代码“做了什么”。

推荐注释：

- 解释非显而易见的业务约束
- 解释 OCR、截图、缓存、退避策略的原因
- 解释临时兼容代码的退出条件
- 标明与隐私、数据归属、性能有关的关键保护

不推荐注释：

- `// 设置变量`
- `// 调用方法`
- 与代码明显重复的注释
- 已过期的 TODO

TODO 必须包含原因或后续动作。不要留下无法追踪的模糊 TODO。

---

## 10. 复用与反冗余规则

代码必须规范、可复用，不能靠大量复制粘贴推进功能。

### 10.1 全端规则

- 同一业务规则只保留一个 owner。
- 同一 API 调用只保留一个 client/helper。
- 同一状态转换只保留一个 service 或状态编排点。
- 同一 UI 语义优先复用现有组件、样式或 token。
- 第三次出现相似代码时，必须判断是否需要抽取复用。

允许少量重复的情况：

- 两段代码只是表面相似，但业务语义不同。
- 抽象会让代码更难读、更难测。
- 处于迁移期，并且有明确退出条件。

不允许：

- 多个页面各写一套相同 API 请求。
- 多个页面各写一套按钮、状态标签、错误提示样式。
- 后端多个 view 重复写相同 ownership 校验或业务流程。
- 为了少建文件把无关逻辑堆到一个 helper 里。

### 10.2 后端复用

- 共享业务流程进入 service。
- 共享权限和 ownership 判断应有统一 helper 或清晰调用点。
- serializer 负责输入输出转换，不在多个 view 复制字段清洗。
- 统计、预测、评估逻辑不在 view 中重复实现。

### 10.3 Vue 复用

- API 请求进入 `services/`。
- 可复用状态进入 `composables/`。
- 重复 UI 进入 `components/`。
- 重复格式化进入 formatter 或 shared helper。
- 页面级样式不能复制成多个相似 class 后长期保留。

复用不是为了“抽象好看”，而是为了减少重复错误、降低维护成本，并让后续开发者能找到唯一规则来源。

---

## 11. 临时代码与兼容壳

允许临时代码，但必须可识别、可退出。

临时代码必须说明：

- 为什么现在需要它
- 真实 owner 是哪里
- 什么条件下可以删除

兼容壳只能做：

- 旧接口转发
- 类型适配
- 过渡期调用桥接

兼容壳不能：

- 长期承接新业务
- 混入多个 owner
- 把边界重新弄脏

---

## 12. 新代码检查清单

提交或完成一项代码改动前，默认检查：

- 新代码是否放在真实 owner 目录？
- 是否为了省事把逻辑塞进入口层？
- 是否需要新建 feature 文件夹？
- 是否遵守目录拆分与公共资源归属表？
- 公共资源是否进入统一 owner，而不是散落在页面中？
- 类名是否准确表达职责？
- UI、业务、平台能力是否分开？
- 是否复制了已有 API、业务规则、样式或组件？
- 是否可以复用现有 service、component、状态模块、样式或 helper？
- 重要逻辑是否可脱离 UI 测试？
- 是否影响 `GameAccount`、OCR、截图、后台性能或持久化？
- 是否有与风险匹配的测试或验证？
- 是否新增了需要回写到长期文档的规则？

---

## 13. 与其他长期文档的关系

- 产品边界见 [`product-principles-and-scope.md`](./product-principles-and-scope.md)。
- 系统 owner 见 [`architecture.md`](./architecture.md)。
- 工程质量与验证见 [`engineering-quality.md`](./engineering-quality.md)。
- API 与数据契约见 [`api-and-data-contracts.md`](./api-and-data-contracts.md)。
- 安全、隐私与数据边界见 [`security-privacy-and-data-boundaries.md`](./security-privacy-and-data-boundaries.md)。
- 后台性能与 OCR 运行时见 [`performance-and-background-runtime.md`](./performance-and-background-runtime.md)。
- 问题修复边界见 [`issue-fix-boundary-guardrails.md`](./issue-fix-boundary-guardrails.md)。

---

## 14. 给 Codex 与后续协作者的默认约束

- 不把“能跑”当成“代码放对了”。
- 新功能默认先找 owner，再写文件。
- 不同功能默认拆进不同目录。
- 公共资源必须统一管理。
- 入口层只做薄编排。
- 本仓库不新增桌面客户端源码；跨仓库协作只通过公开 API 契约。
- 不为了目录漂亮做无收益大搬迁。
- 当文件开始变厚，应优先按 owner 拆，而不是继续补小块。
- 不用复制粘贴制造多个相似实现。
- UI 相同效果优先复用共享样式或组件。
