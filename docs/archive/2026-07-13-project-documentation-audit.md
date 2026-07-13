# 项目全局文档审查记录

## 审查目标

在继续修改界面前，对 Web 前端、Django 后端、WPF 客户端、开发脚本、长期设计规范、专项文档和历史归档进行一次全局对照，优先修正文档缺口，并把仍需代码处理的问题显式记录下来。

## 审查范围

- 根目录开发入口、产品与设计规范
- `WuwaFrontend/` 的依赖、目录、路由壳层、工作台交互、响应式样式与测试
- `Wuwa/` 的 Django 配置、API 路由、数据契约与测试
- `WuwaAssistant/` 的 WPF 项目结构、构建与测试
- `start-dev.bat` 与对应脚本测试
- `.impeccable/design.json`、`docs/`、`docs/superpowers/`、`docs/archive/` 和 `memory/`

## 已确认一致的内容

- Web、Django 与 WPF 的主要目录职责和代码所有权文档与当前仓库结构一致。
- API 与数据契约文档列出的主要路由、账号与 UID 边界与当前后端实现一致。
- README 和开发入门文档中的前端、后端、WPF 启动入口与当前项目结构一致。
- Web 当前使用 Vue 3、Vite 8、IBM Plex 字体包；后端使用 Django 6 和 PostgreSQL；WPF 使用 .NET 10，均已在开发文档中保持准确。
- 当前工作台的吸顶初始化区、配置新建逻辑、预测摘要、保存锁定、响应式断点和历史面板默认状态已同步到长期或专项规范。

## 本次文档更新

- 新增根目录 `AGENTS.md`，明确开发前必读文档、冲突处理、验证与归档要求。
- 新增 `.github/pull_request_template.md`，将设计阅读、测试、文档同步和安全检查纳入 PR 清单。
- 更新 `README.md` 和 `docs/developer-onboarding.md`，建立统一开发入口与文档阅读顺序。
- 更新 `PRODUCT.md`，移除与当前产品不符的 IDE、命令面板优先和极简终端式方向。
- 更新 `DESIGN.md` 与 `.impeccable/design.json`，校正品牌、字体和工作台当前规则。
- 更新产品原则、工程质量、安全边界、首页、Web V2.1 与工作台专项文档。
- 补齐顶部品牌、字体系统和工作台细节优化的实施归档。

## 验证结果

- `cd WuwaFrontend; ..\.tools\node\npm.cmd test`：211 项通过。
- `cd WuwaFrontend; ..\.tools\node\npm.cmd run build`：通过。
- `dotnet run --project WuwaAssistant\WuwaAssistant.Tests\WuwaAssistant.Tests.csproj`：WPF 12 项通过。
- `dotnet build WuwaAssistant\WuwaAssistant.slnx`：0 warning、0 error。
- 声骸套装资源测试：6 项通过。
- `scripts/test-start-dev-script.ps1`：通过。
- Django 测试：131 项中 130 项通过，1 项失败；失败项是数据库密码默认值策略冲突，详见下方遗留问题。
- 文档修改完成后重新检查 79 个 Markdown 文件，相对链接无断链；`.impeccable/design.json` 可正常解析，`git diff --check` 通过。

## 需要后续修改代码的问题

| 优先级 | 问题 | 主要影响 | 状态 |
| --- | --- | --- | --- |
| P0 | 数据库密码默认值与测试策略冲突 | Django 测试无法全绿，凭据边界不明确 | 待修复 |
| P0 | 开发与部署配置未完全外置 | 存在凭据泄露和错误部署风险 | 待修复 |
| P1 | 彩色粗侧边强调违反设计规范 | Web 视觉语言不统一，后续页面容易继续复制 | 待修复 |
| P2 | 根目录存在未归属图片 | 仓库卫生与资产来源不清楚 | 待确认 |

### 1. P0：数据库密码策略与测试互相矛盾

`Wuwa/wuwa/settings.py` 当前为数据库密码提供本地默认值；一个较早的结构测试明确禁止该行为，另一个较新的数据库设置测试又要求这个默认值，导致测试策略互相冲突。长期安全规范已明确：数据库密码必须由环境变量或未跟踪配置显式提供。后续应统一设置和测试，删除默认密码，而不是放宽安全文档。

主要涉及：

- `Wuwa/wuwa/settings.py`
- `Wuwa/api/tests/test_backend_structure.py`
- `Wuwa/wuwa/tests/test_database_settings.py`

验收标准：

- 数据库密码没有代码级默认值，缺少必要配置时给出明确错误。
- 两组数据库设置测试采用同一安全策略，不再互相矛盾。
- Django 全量测试通过。

### 2. P0：开发与部署配置仍包含应外置的信息

Django 设置仍包含硬编码密钥与开发模式默认值；开发启动脚本仍带有真实远端信息、本机绝对密钥路径和数据库默认凭据。后续应改为环境变量、未跟踪的本机配置或示例占位符，并区分开发与生产设置。

主要涉及：

- `Wuwa/wuwa/settings.py`
- `start-dev.bat`
- `README.md` 与本地启动示例

验收标准：

- 受版本控制文件中不再包含真实远端地址、用户本机绝对路径、默认数据库密码或可复用的 Django 密钥。
- 开发默认值与生产必填项边界清楚，缺失生产配置时拒绝启动或明确报错。
- `start-dev.bat --check` 及对应脚本测试通过。

### 3. P1：部分彩色粗侧边强调违反当前设计规范

登录、历史记录、工作台和评估样式中仍能找到超过 1px 的彩色左侧或右侧强调。`DESIGN.md` 明确禁止这种装饰方式。后续应逐项判断状态语义，改用完整 1px 边框、背景、图标或文字，不应修改规范去迁就旧样式。

主要涉及：

- `WuwaFrontend/src/styles/features/auth.css`
- `WuwaFrontend/src/styles/features/history.css`
- `WuwaFrontend/src/styles/features/workspace.css`
- `WuwaFrontend/src/styles/features/evaluation.css`

验收标准：

- 不再使用超过 1px 的彩色左右边框或模拟侧边条的 inset shadow。
- 成功、警告、错误、选中和预测状态不只依赖颜色表达。
- 前端测试、生产构建和桌面/窄屏浏览器检查通过。

### 4. P2：根目录存在未归属的图片文件

根目录有两张未被当前文档引用的 PNG 图片。后续应确认它们是否是正式产品资产；如果只是临时检查或文档截图，应迁入合适目录或删除，避免根目录积累来源不明的文件。

待确认文件：

- `_crop_check.png`
- `translated_probability_formula_cn.png`

验收标准：

- 正式资产迁入明确的产品或文档资产目录并建立引用。
- 临时检查文件删除或加入适当忽略规则。
- 根目录不再保留用途不明的生成文件。

## 本轮边界

本轮只更新文档、设计系统元数据和开发治理入口，没有修改业务代码、数据库、接口、启动脚本或测试策略。上述实现问题将在文档审查确认后单独处理并重新验证。

## 下一步

按风险优先处理数据库与敏感配置问题，再修复彩色粗侧边视觉债务和根目录临时资产；每一类修改均应独立验证并补充对应实施记录。
