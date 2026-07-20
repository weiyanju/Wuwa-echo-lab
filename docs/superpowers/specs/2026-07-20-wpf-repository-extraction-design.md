# WPF 独立仓库迁移设计

**状态：** Final

**日期：** 2026-07-20

**源仓库：** Wuwa

**目标仓库：** `weiyanju/Wuwa-Assistant`（private）

---

## 1. 设计结论

将当前 `WuwaAssistant/` 从 Wuwa 仓库迁移到独立私有仓库 `Wuwa-Assistant`，继续作为 Wuwa 产品的 Windows 本地识别客户端维护。迁移不代表停止 WPF，也不改变本地离线 OCR、低打扰后台运行或结构化结果提交的产品方向。

迁移采用目录历史拆分：

```text
git subtree split --prefix=WuwaAssistant
```

目标仓库根目录直接对应当前 `WuwaAssistant/` 的内容。先完成历史提取、私有仓库创建、推送、独立文档补齐和 WPF 验证，再从源仓库删除 WPF 工程与当前有效的 WPF 专项文档。任何目标仓库创建、推送或验证失败都必须阻止源仓库删除。

本设计只负责 WPF 仓库迁移与源仓库边界收口。Web token 别名、字体栈清理和暗色视觉例外登记属于后续独立设计与实施单元，不混入本次迁移。

---

## 2. 背景与问题

当前 Wuwa 仓库同时包含：

- Django 后端；
- Vue Web 工作台；
- `WuwaAssistant/` WPF 本地助手；
- 同时约束三端的产品、架构、API、安全、性能和 UI 文档。

WPF 与 Django/Vue 的发布节奏、运行环境、构建工具和长期维护边界不同。继续放在同一仓库会让开发入口、验证范围、文档 owner 和分支管理持续耦合。独立仓库可以让 WPF 保留产品关系和 API 协作，同时独立管理 Windows 构建、桌面 UI、本地设置、截图/OCR 与后台运行规范。

当前还有一个必须在迁移中收口的运行事实：Wuwa 后端和 Web 开发链路使用 `http://127.0.0.1:8001`，WPF 默认值仍为 `http://127.0.0.1:8000`。新仓库必须统一到 `8001`，同时保留可配置能力。

---

## 3. 目标

1. 保留 `WuwaAssistant/` 目录自身的 Git 提交历史。
2. 创建私有目标仓库，并使 WPF 工程成为仓库根目录内容。
3. 让目标仓库具有独立开发所需的 README、协作规则和长期规范。
4. 将默认后端地址统一为 `http://127.0.0.1:8001`。
5. 保持现有 WPF 产品行为、API 契约和本地识别边界。
6. 目标仓库验证成功后，从 Wuwa 删除 WPF 活跃工程与活跃专项文档。
7. 在 Wuwa 中保留 Django `recognition`、识别会话/快照 API、回滚能力和 Web 复核能力。
8. 将 Wuwa 的活跃文档改写为面向“外部本地识别客户端”的仓库边界。

---

## 4. 非目标

- 不停止、废弃或冻结 WPF 产品方向。
- 不在迁移中改用 Tauri、GPUI 或其他桌面技术栈。
- 不顺带重构 `WuwaAssistant.Core` 的目录和 owner。
- 不新增截图、OCR、后台识别或云端能力。
- 不改变认证、session、CSRF、识别快照或回滚协议。
- 不删除 `GameAccount.server` 或 `GameAccount.nickname`。
- 不恢复 `server`、`nickname` 的业务写入。
- 不删除 WPF 的历史 spec、plan 或 archive 记录。
- 不在本计划中修改 Web token、字体或暗色主题渲染。
- 不在源仓库验证完成前合并到 `main` 或清理未合并分支。

---

## 5. 仓库所有权

### 5.1 `Wuwa-Assistant` 拥有

- WPF 应用、窗口、页面和共享 XAML 样式；
- ViewModel 与桌面交互编排；
- `WuwaAssistant.Core`；
- 后端 API Client、DTO、cookie/session 与 CSRF 客户端处理；
- 本地设置与后端地址配置；
- 游戏窗口检测；
- 本地截图、截图 hash 与缓存；
- 本地离线 OCR、解析与识别流水线；
- 后台运行状态机、队列和诊断日志；
- Windows/.NET 构建与 WPF 测试；
- 本地助手自己的产品、架构、API 依赖、安全、性能和 UI 规范。

### 5.2 Wuwa 保留

- Django 认证、用户和 `GameAccount` 所有权；
- 声骸、统计、预测和评估；
- `recognition` app；
- 识别会话和识别快照持久化；
- 幂等、重复 hash、冲突、拒绝和回滚；
- Vue Web 工作台与识别复核；
- 后端 API 契约的服务端定义；
- Web 设计系统和源仓库长期规范。

### 5.3 依赖方向

```text
Wuwa-Assistant
  -> 通过公开 API 消费 Wuwa 后端
  -> 不直接访问 Wuwa 数据库

Wuwa Web
  -> 通过公开 API 消费 Wuwa 后端

Wuwa 后端
  -> 拥有认证、GameAccount、声骸和识别持久化
  -> 不依赖 WPF 工程或 WPF 发布物
```

仓库拆分后，两边通过 API 契约协作，不通过源码引用或共享本地文件耦合。

---

## 6. 目标仓库历史与初始化

### 6.1 历史提取

从已确认的源分支提交执行 `git subtree split --prefix=WuwaAssistant`，生成只包含该目录历史的临时迁移分支。

目标私有仓库必须以空仓库创建，不预生成 README、`.gitignore` 或 license，避免出现与提取历史无关的初始提交。随后将拆分分支推送为目标仓库 `main`。

### 6.2 内容映射

迁移前：

```text
Wuwa/
  WuwaAssistant/
    WuwaAssistant.slnx
    WuwaAssistant/
    WuwaAssistant.Core/
    WuwaAssistant.Tests/
```

迁移后：

```text
Wuwa-Assistant/
  WuwaAssistant.slnx
  WuwaAssistant/
  WuwaAssistant.Core/
  WuwaAssistant.Tests/
```

`.vs/`、`bin/`、`obj/`、日志、缓存和本地私有配置不进入目标仓库。

### 6.3 独立仓库基线提交

历史导入后，在目标仓库追加一个独立迁移提交，至少包含：

- 根目录 `.gitignore`；
- 独立 `README.md`；
- 独立 `AGENTS.md`；
- `docs/developer-onboarding.md`；
- `docs/product-principles-and-scope.md`；
- `docs/architecture.md`；
- `docs/engineering-quality.md`；
- `docs/api-and-data-contracts.md`；
- `docs/security-privacy-and-data-boundaries.md`；
- `docs/performance-and-background-runtime.md`；
- `docs/wpf-assistant-ui-guidelines.md`；
- 后端默认地址从 `8000` 到 `8001` 的代码与测试同步。

这些文档从现有长期规范中提取客户端真正拥有的规则并重写，不能整份复制 Django/Vue 的仓库治理内容。目标仓库的 API 文档描述“客户端消费契约”，Wuwa 的 API 文档仍是服务端语义 owner。

---

## 7. 跨仓库 API 契约

### 7.1 后端地址

目标仓库的默认开发后端地址固定为：

```text
http://127.0.0.1:8001
```

本地设置仍允许覆盖该地址，但普通主路径不要求用户理解后端拓扑。迁移完成时，目标仓库的活跃代码、测试和文档不应再把 `8000` 表述为默认后端端口。

### 7.2 认证与数据流

WPF 继续：

1. 通过 Wuwa API 登录或注册；
2. 使用现有 session/cookie 与 CSRF 处理；
3. 读取后端拥有的 `GameAccount`；
4. 在 unlocked `GameAccount` 下创建识别会话；
5. 在本地完成截图和 OCR；
6. 只向后端提交结构化结果、hash、置信度、耗时和必要诊断信息；
7. 由后端执行 ownership、幂等、冲突和回滚保护。

完整截图仍不进入常规后端上传路径。

### 7.3 `GameAccount.server` 与 `nickname`

`server` 和 `nickname` 保留为预留可选字段：

- 后端数据库字段保留；
- API 响应字段保留；
- WPF DTO 和兼容调用形状保留；
- 当前返回空值的兼容行为可以继续；
- 当前不恢复业务写入；
- 文档不标记为 deprecated；
- 客户端不能依赖这两个字段具有非空业务含义。

未来真正启用时，需要另行确认字段语义、写入权限、校验、迁移与两端 UI。

### 7.4 兼容责任

Wuwa 修改 WPF 消费的稳定 API、字段或状态前，必须把外部本地识别客户端视为调用方。破坏性变更需要同步目标仓库或提供过渡期。

WPF 不能通过复制服务端规则成为 `GameAccount` 权限、locked 状态或识别写入合法性的最终判断者。客户端校验只改善体验，后端仍负责最终保护。

---

## 8. 源仓库清理

只有目标仓库完成远端验证和 WPF 验证后，才执行源仓库清理。

### 8.1 删除内容

- 删除 `WuwaAssistant/` 活跃工程目录。
- 删除 `docs/wpf-assistant-ui-guidelines.md` 活跃专项规范。
- 删除只服务仓库内 WPF 构建或目录结构的配置与说明。
- 删除源仓库 `.gitignore` 中不再有 owner 的 WPF 专项规则；通用 .NET 忽略规则仅在仍有其他 .NET owner 时保留。

### 8.2 更新内容

更新所有受影响的活跃入口和长期规范，包括但不限于：

- `AGENTS.md`；
- `README.md`；
- `PRODUCT.md`；
- `docs/developer-onboarding.md`；
- `docs/product-principles-and-scope.md`；
- `docs/architecture.md`；
- `docs/engineering-quality.md`；
- `docs/code-organization-and-style.md`；
- `docs/api-and-data-contracts.md`；
- `docs/security-privacy-and-data-boundaries.md`；
- `docs/performance-and-background-runtime.md`；
- `docs/product-interface-principles.md`；
- 其他通过全仓检索发现、仍被当作当前有效规则的文档。

更新原则：

- 不再把 WPF 描述成 Wuwa 仓库内目录或构建目标；
- 产品仍包含独立维护的 Windows 本地识别客户端；
- “WPF 本地助手”在服务端与 Web 规范中改为技术中立的“外部本地识别客户端”；
- 本地离线 OCR、低打扰后台运行、截图隐私和结构化结果提交仍是产品长期边界；
- 后端 `recognition` 和 Web 复核能力不删除、不降级；
- Wuwa 的后端测试和前端测试不依赖目标仓库源码。

### 8.3 历史保留

`docs/archive/`、`docs/superpowers/specs/`、`docs/superpowers/plans/` 和 `memory/` 中的既有 WPF 内容保留，作为历史证据，不做批量改写。

迁移完成后新增一份 `docs/archive/` 实施记录，说明：

- 迁移日期；
- 历史提取方式；
- 目标仓库已验证；
- 源仓库删除范围；
- 后端与 Web 保留范围；
- 未执行或失败的验证。

历史文档出现的旧路径和旧架构只代表当时事实，不再覆盖当前长期规范。

---

## 9. 安全顺序与失败处理

迁移必须按以下顺序执行：

1. 确认源分支干净、已提交且已推送。
2. 记录源提交 SHA 和 `WuwaAssistant/` 文件清单。
3. 提取 `WuwaAssistant/` 目录历史。
4. 确认目标仓库不存在；如已存在且状态不明，停止并报告，不覆盖。
5. 创建空的私有目标仓库。
6. 推送拆分历史到目标 `main`。
7. 在目标仓库补充独立文档、`.gitignore` 和 `8001` 默认值。
8. 运行目标仓库测试与构建。
9. 验证目标远端分支、可见性和提交历史。
10. 回到源仓库删除 WPF 活跃内容并更新长期文档。
11. 运行源仓库验证。
12. 提交并推送源仓库迁移结果。

失败策略：

- 历史提取失败：删除或放弃临时迁移分支，不改变源目录。
- 目标仓库创建失败：停止，不删除源文件。
- 推送失败：停止，不删除源文件。
- 目标仓库测试或构建失败：先在目标仓库修复；未通过前不删除源文件。
- 目标仓库意外已存在：不强推、不覆盖，报告实际状态并等待确认。
- 源仓库验证失败：保留两个仓库现状，修复或报告失败，不宣称迁移完成。

临时分支和临时 clone 只在远端与两个工作区均验证后清理。

---

## 10. 验证设计

### 10.1 历史完整性

- `git subtree split` 成功生成可解析提交。
- 目标 `main` 的导入基线与源提交中的 `WuwaAssistant/` 文件树一致。
- 目标历史中不包含 Django、Vue 或源仓库其他目录的文件。
- WPF 关键历史提交在目标仓库仍可追踪。

### 10.2 目标仓库

在目标仓库根目录运行：

```powershell
dotnet run --project WuwaAssistant.Tests\WuwaAssistant.Tests.csproj
dotnet build WuwaAssistant.slnx
git diff --check
```

同时确认：

- 默认后端地址为 `http://127.0.0.1:8001`；
- 活跃代码、测试和文档没有把 `8000` 作为默认端口；
- `.vs/`、`bin/`、`obj/`、日志和私有配置未被跟踪；
- README 的安装、启动、测试和后端依赖说明可以独立理解；
- 长期文档中的内部链接有效；
- 远端仓库为 private；
- 远端 `main` 指向已验证提交。

### 10.3 源仓库

源仓库清理后确认：

- `WuwaAssistant/` 不再被跟踪；
- 活跃 WPF 专项规范已移除；
- 活跃入口和长期规范不再声明仓库内存在 WPF 工程；
- `recognition` 后端、识别会话/快照、回滚和 Web 复核仍存在；
- `GameAccount.server` 与 `nickname` 仍存在于数据库和稳定响应形状；
- 历史 spec、plan、archive 和 memory 未被批量删除；
- 全仓检索到的 WPF 旧路径只存在于明确的历史资料或本迁移记录中。

运行与风险匹配的验证：

```powershell
git status --short
git diff --check
```

并运行完整 Django 测试、Vue 测试与 Vue 构建。若仓库已有文档链接或结构检查，也必须运行。未执行的检查需要在实施记录中写明原因。

---

## 11. 提交与审查边界

为保持可审查与可回退，实施至少分为以下提交：

### 目标仓库

1. 由目录拆分产生的历史基线。
2. 独立仓库文档、忽略规则、默认端口与对应测试的迁移提交。

### 源仓库

1. 本设计规范。
2. 删除 WPF 活跃工程、同步当前长期文档和新增归档记录的迁移提交。

不要把后续 Web 设计 token、字体或暗色例外同步混入 WPF 迁移提交。它们使用独立规范、实施计划和提交。

---

## 12. 完成标准

只有同时满足以下条件，才可以宣称 WPF 仓库迁移完成：

- 私有目标仓库已创建；
- 目标 `main` 包含 WPF 目录历史；
- 目标仓库可以独立阅读、构建和测试；
- 默认后端地址已统一到 `8001`；
- 目标测试与构建通过；
- WPF 产品、安全、隐私和后台性能边界已写入目标长期规范；
- 源仓库已删除 WPF 活跃工程和活跃专项规范；
- 源仓库仍保留外部识别客户端所需的后端/API/Web 能力；
- `server`、`nickname` 保留为未废弃的预留可选字段；
- 源仓库长期文档已反映新的仓库边界；
- 历史资料和实施记录完整；
- 源仓库验证通过；
- 两个仓库的远端提交状态均已确认。
