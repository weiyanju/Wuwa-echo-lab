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
- Web 与 WPF 看到的是同一套业务状态

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

- WPF 长时间后台运行低 CPU、低内存
- WPF 用户操作低延迟、快速响应
- 截图和 OCR 按需触发
- OCR 缓存和截图 hash 能减少重复工作
- OCR 准确性、置信度和回滚路径可验证
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
- WPF 是否继续变厚
- Vue 是否继续堆在 `App.vue`
- 后端 API 是否清楚绑定 `GameAccount`
- UI 是否符合 [`product-interface-principles.md`](./product-interface-principles.md) 和对应端的 UI 规范
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

- API helper
- `useAuth`
- `useGameAccount`
- 格式化
- player UID
- echo workflow
- App 静态结构

要求：

- 改 API 请求形状时补 API helper 测试。
- 改账号/UID 工作流时补 composable 或 App 测试。
- 改 UI 大结构时至少做构建验证。

### 5.3 WPF 本地助手

WPF 改动默认至少运行：

```powershell
dotnet run --project WuwaAssistant\WuwaAssistant.Tests\WuwaAssistant.Tests.csproj
dotnet build WuwaAssistant\WuwaAssistant.slnx
```

触及 XAML resource、窗口启动、登录窗口、主窗口结构时，还应执行启动探针。

要求：

- 新增 API client 方法必须有 fake HTTP handler 测试。
- 新增重要 shell 规则时，至少有静态 XAML/code 测试锁住。
- 改识别、截图、OCR pipeline 时，应补可脱离 WPF UI 的 core 测试。

### 5.4 OCR 与截图

OCR/截图改动默认要求：

- parser 单元测试
- normalize 单元测试
- screenshot hash 测试
- cache key 测试
- 重复截图抑制测试
- 代表性截图手动或自动验证

---

## 6. 性能优化规则

WPF 本地助手大部分时间会在后台运行，因此性能优化必须服务真实场景。

后台运行、窗口检测、截图、OCR、缓存和队列的长期规则见 [`performance-and-background-runtime.md`](./performance-and-background-runtime.md)。本文只保留工程质量层面的默认约束。

允许的优化：

- 低频窗口检测
- 触发候选后短时间提高检测频率
- 截图 hash 去重
- OCR 结果缓存
- OCR 引擎按需加载
- 长时间空闲释放重资源
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

涉及后台识别、截图、OCR、缓存、诊断的改动，默认还必须满足性能文档中的验收门槛。尤其是：

- 自动识别关闭时不触发 OCR
- 未找到游戏窗口时不触发 OCR
- 相同截图 hash 不重复 OCR
- OCR 不阻塞 UI 线程
- 同一时间最多运行 1 个 OCR worker
- OCR 耗时和缓存命中情况可观测

---

## 7. 长期关注热点

当前需要持续高警惕的质量热点：

- WPF 登录和 UID 初始化流程
- WPF `MainWindow.xaml.cs`
- WPF 样式资源字典
- WPF 未来截图/OCR pipeline
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

---

## 9. 给 Codex 与后续协作者的默认约束

- 先解决真实工程问题，再回写文档
- 不把一次局部成功夸大成“整体问题已解决”
- 不把阶段性收口误写成长期完成
- 不把代码质量问题伪装成 UI 小修
- 不把 UI 问题伪装成架构重构
- 改完必须按风险跑对应验证
