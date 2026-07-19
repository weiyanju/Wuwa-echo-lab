---
name: Wuwa / Tethys System
description: 冷静、精确、低噪音的声骸数据工作台。
colors:
  primary: "#0064e0"
  primary-deep: "#0457cb"
  primary-soft: "#f4f8ff"
  prediction: "#2c9f70"
  prediction-ink: "#166b4a"
  ink-strong: "#0a1317"
  ink-main: "#1c1e21"
  text-muted: "#5d6c7b"
  decorative-muted: "#8595a4"
  canvas: "#ffffff"
  surface-root: "#f6f8fb"
  surface-soft: "#f1f4f7"
  surface-prediction: "#f7f9fb"
  border-soft: "#dee3e9"
  border-strong: "#ced0d4"
  success: "#31a24c"
  success-ink: "#18723a"
  warning: "#f7b928"
  warning-ink: "#6b4f00"
  critical: "#e41e3f"
  critical-deep: "#bd1730"
  critical-soft: "#fff3f5"
typography:
  display:
    fontFamily: "IBM Plex Sans SC, Noto Sans SC, Microsoft YaHei UI, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "0"
  headline:
    fontFamily: "IBM Plex Sans SC, Noto Sans SC, Microsoft YaHei UI, system-ui, sans-serif"
    fontSize: "1.3125rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "0"
  title:
    fontFamily: "IBM Plex Sans SC, Noto Sans SC, Microsoft YaHei UI, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "0"
  body:
    fontFamily: "IBM Plex Sans SC, Noto Sans SC, Microsoft YaHei UI, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0"
  control:
    fontFamily: "IBM Plex Sans SC, Noto Sans SC, Microsoft YaHei UI, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "0"
  label:
    fontFamily: "IBM Plex Sans SC, Noto Sans SC, Microsoft YaHei UI, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0"
  caption:
    fontFamily: "IBM Plex Sans SC, Noto Sans SC, Microsoft YaHei UI, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: "0"
  data:
    fontFamily: "IBM Plex Sans SC, IBM Plex Sans, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "0"
  mono:
    fontFamily: "IBM Plex Mono, ui-monospace, Consolas, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: "0.02em"
rounded:
  none: "0px"
  dense: "8px"
  compact: "10px"
  control: "12px"
  card: "14px"
  card-large: "16px"
  panel-compact: "18px"
  panel-small: "20px"
  panel: "24px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  xxl: "24px"
  xxxl: "28px"
  display: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.canvas}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "10px 18px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.primary-deep}"
    textColor: "{colors.canvas}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "10px 18px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-strong}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "10px 18px"
    height: "44px"
  button-danger:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.critical-deep}"
    typography: "{typography.control}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
    height: "44px"
  nav-tab-active:
    backgroundColor: "{colors.ink-strong}"
    textColor: "{colors.canvas}"
    typography: "{typography.control}"
    rounded: "{rounded.pill}"
    padding: "8px 18px"
    height: "40px"
  input-field:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-main}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
    height: "44px"
  uid-chip:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.text-muted}"
    typography: "{typography.control}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
    height: "40px"
  product-panel:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-strong}"
    typography: "{typography.body}"
    rounded: "{rounded.panel}"
    padding: "24px"
  prediction-rail:
    backgroundColor: "{colors.surface-prediction}"
    textColor: "{colors.ink-strong}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "16px"
  bayes-path:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-strong}"
    typography: "{typography.body}"
    rounded: "{rounded.card}"
    padding: "16px"
  floating-history-panel:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-strong}"
    typography: "{typography.body}"
    rounded: "{rounded.card-large}"
    padding: "16px"
    width: "320px"
---

# Design System: Wuwa / Tethys System

## 0. 使用方式与审查边界

本文件是 Wuwa Web 当前设计的最高视觉入口，但它不把任何外部工具的通用规则自动升级为项目决策。当前已经被用户确认的页面截图、浏览器渲染结果、稳定实现和明确设计决策共同构成批准基线；后续改动默认在此基础上渐进演进。

Impeccable `audit` 是技术诊断和候选问题清单，不是设计定稿，也不直接授权修改颜色、字体、圆角、阴影、动效或组件结构。Audit 的严重等级、健康分数、命令建议和颜色字面量数量都不能替代项目判断。

当本文件、`.impeccable/design.json` 与实现冲突时，不自动修改代码迎合文档，也不自动降低文档迎合代码。先将冲突标记为待决策项，用户批准具体方案后再同步文档、实现和测试。

每项审查发现必须先归入以下类型：

- **无视觉修复**：语义 HTML、ARIA 关联、焦点管理和内容默认可见等；可以在保持截图稳定的前提下实施。
- **实测后决定**：动画性能、CSS 与字体加载、响应式溢出和点击目标；先取得浏览器或性能数据。
- **视觉提案**：配色、字体层级、圆角、阴影、按钮造型和动效语言；必须提供局部前后对比并获得用户批准。
- **项目例外**：真实表达路径、进度、数据结构或品牌交互的功能图形；记录后不再按装饰性反模式反复整改。

颜色 token 化、主题变量收敛和 CSS ownership 整理的第一阶段必须保持零视觉漂移：只能改变命名和引用方式，不能改变最终计算颜色、字体角色、字号、字重、间距或组件几何。

## 1. Overview

**Creative North Star: "泰缇斯研究台"**

Wuwa 是玩家在普通室内光线下长时间录入、核对和分析声骸数据的桌面工作台。视觉系统服务于可信数据、稳定账号与 UID 上下文以及高频录入效率；游戏语境来自术语、数据模型和工作流程，而不是装饰性特效。

界面必须清晰、克制、专业、低噪音。浅色模式是首要设计基准，暗色模式只做同等语义映射。首页可以保留受控的终端语气，但登录后的工作台、统计和评估必须回到熟悉、稳定的生产力工具语言。

本文件是 Web 视觉 token、字体、组件语言和交互状态的规范入口。跨端行为遵循 `docs/product-interface-principles.md`，Web 长期方向遵循 `docs/web-ui-design-system-v2.md`，页面规范在不冲突时补充本文件。实现与本文件冲突时先确认预期，再同步代码、测试和长期文档；不得静默降低规范来迁就历史样式。

**Key Characteristics:**

- 浅色优先，蓝色只承担关键动作、当前选择、焦点和高价值状态。
- 冷灰边框与近白表面建立结构，阴影只解释真实悬浮层级。
- 页面容器柔和，中型卡片克制，密集数据单元保持紧凑。
- 数字稳定对齐，概率、UID、样本量、权重和分数便于纵向比较。
- 顶部导航明确，历史记录和识别复核辅助主任务但不压迫主流程。
- 桌面端优先维持信息密度，窄屏通过结构重排而不是缩小可读文字解决空间问题。

**The Task Surface Rule.** 每一个面板必须对应真实任务；没有业务意义的 chrome、卡片、状态条和装饰层一律删除。

**The Empty Metric Rule.** 真实计数显示 `0`，尚未形成的指标显示半角 `--`，语义状态显示文字；`--` 不承担 loading、error 或单位。

**The Readiness Gate Rule.** 无真实数据的分析模块整体隐藏并由可操作的准备状态替代；统计和评估共享样本成熟度，评估准备度独立呈现。

**The Approved Baseline Rule.** 当前已经被用户确认的页面截图、浏览器渲染结果、稳定实现和明确设计决策共同构成批准基线；Impeccable 或其他通用工具的规则只能提供候选问题，不能自动覆盖该基线。

**The Audit Triage Rule.** Audit 发现必须先归类为无视觉修复、实测后决定、视觉提案或项目例外；只有无视觉修复可以在保持渲染稳定的前提下直接实施，视觉提案必须获得用户批准。

**The No Visual Drift Rule.** Token 化、主题收敛和样式重构默认只改变命名与引用，不改变最终色值、字体、间距或几何；任何视觉变化必须限定范围、说明用户价值并提供前后截图。

## 2. Colors

调色板采用冷白表面、深墨文字和一个受控蓝色强调。预测色与成功色虽然同属绿色家族，但语义必须分开：预测表示模型输出，成功表示已经发生的正向结果。

### Primary

- **泰缇斯蓝** (`colors.primary`)：唯一主强调色，用于主操作、当前选择、焦点和高价值状态。
- **深泰缇斯蓝** (`colors.primary-deep`)：主操作 hover、active 及需要更强对比的选中状态。
- **浅泰缇斯蓝** (`colors.primary-soft`)：主操作的低权重 hover 背景、选中行和焦点附近的轻量表面。

### Secondary

- **预测绿** (`colors.prediction`)：图形、进度和模型聚焦结果；作为普通文字时改用 `colors.prediction-ink`。
- **预测深绿** (`colors.prediction-ink`)：预测标签和说明文字，在白色背景上保持 WCAG AA 对比度。

### Neutral

- **深墨文字** (`colors.ink-strong`)：页面标题、关键数值和最高层级文本。
- **正文墨色** (`colors.ink-main`)：正文、表单值和常规操作文本。
- **钢灰说明** (`colors.text-muted`)：辅助信息、caption、placeholder 和次级状态；它是在浅色表面上允许使用的最低文本对比色。
- **雾灰装饰** (`colors.decorative-muted`)：仅用于非文字图形、刻度线和禁用装饰；禁止承载 placeholder、正文或操作信息。
- **冷白画布** (`colors.canvas`)：主要内容表面。
- **冰雾底色** (`colors.surface-root`)：页面背景与大区域分隔。
- **柔灰表面** (`colors.surface-soft`)：次级面板、禁用背景和低权重分组。
- **预测雾面** (`colors.surface-prediction`)：紧凑预测摘要和算法结果区域。
- **柔边界** (`colors.border-soft`)：默认容器、卡片和行分隔。
- **强边界** (`colors.border-strong`)：输入框及需要更清楚轮廓的控件。

### Semantic states

- **成功绿** (`colors.success`)：图标、状态点和图形填充；成功文字使用 `colors.success-ink`。
- **成功深绿** (`colors.success-ink`)：保存成功、识别成功和已记录文字。
- **确认琥珀** (`colors.warning`)：低置信度、待确认和可恢复风险的图形或浅底；文字使用 `colors.warning-ink`。
- **警告深琥珀** (`colors.warning-ink`)：警告文字和边界标签。
- **错误红** (`colors.critical`)：错误图标、边框和状态填充。
- **错误深红** (`colors.critical-deep`)：错误文字和破坏性操作文字。
- **错误浅红** (`colors.critical-soft`)：错误说明和破坏性操作 hover 的低权重背景。

### Dark equivalence

暗色模式使用 `#0f1720` 画布、`#17232d` 次级表面、`#e7eef4` 主文字、`#a9bac7` 次级文字、`#2c3c48` 强边界和 `#243542` 柔边界。主蓝映射为 `#5da8ff`，但视觉权重、状态含义和组件结构必须与浅色模式相同；禁止添加霓虹发光、装饰渐变或另一套终端产品语言。

### Named Rules

**The One Voice Rule.** 蓝色只出现在关键动作、当前选择和状态指示中；同一局部区域只能有一个最高权重主操作。

**The Semantic Color Rule.** 预测、成功、警告和错误必须对应真实含义，并配合文字、图标或形状表达，绝不只靠颜色区分。

**The Readability Guardrail Rule.** 关键正文、表单值、操作标签、错误信息和焦点状态必须清楚可读；对比度用于发现文字过灰和状态不可辨等真实回归，不用于按 audit 分数批量重映射项目色板。禁用内容、装饰线、非文字图形和低权重图表刻度按实际语义判断。

**The Light-First Rule.** 浅色模式是基准，暗色模式只能做等价语义映射，不能成为霓虹化或开发者控制台风格的另一套产品。

### Token layering

- 全局语义 token 只承载主色、文字、表面、边框、成功、警告和错误。
- 评估模型、Bayes 路径、覆盖范围、识别和工作台专属语义使用 feature token。
- 数据图形内部允许保留表达具体数据含义的局部颜色，但必须提供需要的主题映射。
- 颜色字面量数量不等于设计缺陷数量；不得为了减少统计数字而改变现有视觉，也不得把全部图表颜色提升为全局 token。

### Approved functional graphic exceptions

- Bayes Exact / Wildcard 路径左侧的实线与虚线路径标记属于推理结构图形。
- 登录标题的 4px 打字光标及其已批准间距属于品牌交互图形。
- 真实表达进度、概率分布、模型路径或状态结构的线条属于功能图形。
- 例外只保护功能语义，不豁免溢出、遮挡、错误交互或不可读文字。

## 3. Typography

**Display/Body Font:** IBM Plex Sans SC（Noto Sans SC、Microsoft YaHei UI 与 system-ui 兜底）

**Data/Latin Font:** IBM Plex Sans SC 的配套拉丁字形；通过独立语义入口启用稳定数字特性

**Technical Mono Font:** IBM Plex Mono；只用于协议、状态码和短技术 metadata

**Character:** IBM Plex 超级家族让中文、拉丁文本、数据与短技术信息保持同一工程气质。层级来自固定字阶、真实字重、清楚行高和稳定数字宽度，不依赖任意字距、夸张大字或临时字体。

完整规则以 `docs/superpowers/specs/2026-07-13-wuwa-typography-system-design.md` 为准。Sans 只加载并使用 400 / 500 / 600 / 700，Mono 只使用 500 / 600；`font-synthesis: none` 必须保留。

### Hierarchy

- **Display** (`typography.display`)：页面标题和工作台问候语；固定 28px，不随视口连续缩放。
- **Headline** (`typography.headline`)：大区块标题，21px / 700。
- **Title** (`typography.title`)：卡片、图表和面板标题，16px / 700。
- **Body** (`typography.body`)：说明、表单和一般内容，15px / 400；长段落控制在 65–75ch。
- **Control** (`typography.control`)：按钮、选项和主要列表文字，14px / 600。
- **Label** (`typography.label`)：字段、状态和图表类别，13px / 600。
- **Caption** (`typography.caption`)：说明、来源和辅助 metadata，12px / 500。
- **Data** (`typography.data`)：UID、声骸编号、概率、样本量、权重、排名和分数；必须使用 `tabular-nums`。
- **Micro**：仅空间受限的非交互图表 metadata 可以使用 11px / 500，不进入交互控件。

### Named Rules

**The Stable Number Rule.** 所有可比较数字必须启用等宽数字，数值和单位分层，但单位不得淡到影响识别。

**The Semantic Entry Rule.** 中文、普通拉丁、品牌、数据与 Mono 技术文本分别使用 `--font-cjk`、`--font-latin`、`--font-data` 和 `--font-mono`；中文字段标签和正文不得使用 Mono。

**The Tracking Rule.** 中文、普通拉丁和数字字距为 0；缩写、全大写短状态和 TETHYS 品牌只使用已有 tracking token。禁止负字距和裸非零字距。

**The Real Weight Rule.** 只声明已经加载的字重；标题和最高级数据最多使用 700，禁止 650、720、800、900 等无效或合成字重。

**The Minimum Size Rule.** 交互文字不得小于 12px；禁止 10px、半像素字号和为了塞入容器而缩小文字。

## 4. Elevation

系统采用结构化扁平策略。静态表面通过背景色和 1px 冷灰边框分层；顶部粘性导航、菜单和可拖动历史面板才使用阴影。焦点轮廓属于可访问性反馈，不是装饰阴影。

### Shadow Vocabulary

- **Sticky Ambient** (`0 10px 32px rgba(39, 55, 71, 0.06)`)：用于粘性顶部导航；使用阴影时不再叠加装饰性强边框。
- **Overlay Compact** (`0 4px 8px rgba(15, 23, 42, 0.12)`)：用于菜单和短浮层，可与 1px 边框配合。
- **Floating Panel** (`0 22px 60px rgba(15, 23, 42, 0.18)`)：仅用于真正脱离文档流的可拖动面板；使用该阴影时不叠加 1px 装饰边框。
- **Focus Ring** (`3px solid rgba(0, 100, 224, 0.26)`)：键盘焦点轮廓，偏移 3px；不得仅依赖 box-shadow。

### Named Rules

**The Flat-by-Default Rule.** 静态面板和卡片保持平坦；如果移除阴影后层级仍清楚，就不允许添加阴影。

**The One Depth Cue Rule.** 同一个元素只能选择清晰边框或宽柔阴影作为主要层级线索，禁止 1px 边框与 16px 以上模糊阴影的 ghost-card 组合。

**The Structural Shadow Rule.** 阴影只能说明粘性、悬浮、拖动或聚焦关系，禁止用重阴影、发光边缘和多层阴影制造“高级感”。

## 5. Components

组件应精确而克制。所有高频控件必须拥有适用的 default、hover、focus-visible、active、disabled、loading、saving 和 error 状态，并保持同一套形状、颜色和排版词汇。

### Buttons

- **Shape:** 常规按钮为 12px 圆角、至少 44px 点击高度；胶囊只用于导航筛选、状态和紧凑上下文控件。
- **Primary:** 泰缇斯蓝实底、冷白文字，局部区域只有一个最高权重主按钮。
- **Secondary:** 冷白底、1px 冷灰边框和深墨文字。
- **Danger:** 冷白底、错误深红文字和弱红边框，文案必须说明动作对象。
- **Compact action dock:** 高频工作流可将明确的撤销、弃置等辅助工具动作统一为 44px 纯图标按钮，并通过 `title`、`aria-label`、hover/focus 语义色和防误触反馈说明动作；主流程动作仍保留可见文字且是区域内唯一实底按钮。
- **Hover / Focus:** hover 只改变背景、边框或文字色；focus-visible 使用清晰蓝色轮廓。禁止上浮、缩放、弹跳、发光和布局移动。
- **State:** disabled 保留可理解标签；loading 和 saving 不改变按钮尺寸。

### Chips and navigation pills

- 胶囊只用于顶部导航、UID 上下文、筛选、短 metadata 和真实状态。
- 默认状态透明或浅底，active 使用深墨或泰缇斯蓝；选中状态必须同时提供文字、图标或形状线索。
- 主导航点击目标至少 44px，视觉胶囊可以保持 40px。

### Cards and containers

- 页面级容器使用 20–24px；中型面板和卡片使用 14–18px；密集矩阵使用 8–12px。
- 主表面使用冷白画布，次级分组使用冰雾或柔灰表面。
- 默认 1px 柔边界；selected、focus 和 active 才提高边框对比。
- 静态卡片无阴影，不允许卡片套卡片。大面板内边距 24–28px，中型面板 16–20px，密集区域 8–12px。

### Inputs and fields

- 字段高度 44px、圆角 12px、1px 强边界、冷白背景；字段标签使用产品 Sans。
- placeholder 使用 `colors.text-muted`，不得使用更浅的装饰灰。
- focus-visible 同时强化蓝色边框和外部轮廓；错误信息紧贴字段并说明下一步。

### Global navigation and UID

- 顶部导航左侧使用紧凑 `TETHYS` 字标，中部模块相对整条导航视觉居中，右侧承载 UID、主题和账号操作。
- 登录、加载和 UID 首次绑定可以使用完整 `Tethys System / 泰缇斯枢纽`；登录后的全局导航只显示短字标 `TETHYS`。
- Web 登录入口遵循 [`docs/web-homepage-terminal-design.md`](./docs/web-homepage-terminal-design.md) 的页面专项规范。该入口可以保留已经批准的 2–4px 硬朗终端边角；它与工作台通过字体角色、Tethys 蓝、1px 边界、信息层级和克制动效保持同源，不要求与工作台使用完全相同的圆角。该例外只适用于登录页及其登录框内部的首次 UID 绑定页面。
- UID 必须持续可见；切换菜单显示真实账号状态并在关闭后恢复焦点。
- UID 菜单中的账号值与新增输入内容统一使用 Data SM（15px / 600、等宽数字）；字段标签使用 Label（13px / 600），操作按钮使用 Control（14px / 600）。账号行、输入框、确认按钮和新增入口统一为至少 44px 高、12px 圆角；当前账号使用纯色浅蓝选中面、蓝色边框与勾选图标，不使用渐变。
- UID 菜单锚定 UID 胶囊本身。默认操作区使用非等权同行布局：左列 `minmax(0, 1fr)` 承载“添加 UID”，右列固定 88px 承载低频“退出登录”，列间距 8px；两项均保持至少 44px 高，但通过宽度、颜色、填充和字号区分权重，不使用 50/50 等分、独立退出行、分隔线或图标。进入新增状态后，左侧切换为单色主蓝“确认添加”，右侧切换为中性“取消”；退出登录默认透明且只在 hover / focus-visible 进入弱危险态。

### Workbench configuration and entry matrix

- 桌面端使用左侧配置区与右侧主录入区。左侧内部内容在可用视口内吸顶并独立滚动，不能被右侧矩阵无限拉长。
- 套装搜索只过滤可见选项；0/5 时配置变化修改空白草稿，已有录入时立即新建并切换对应声骸。
- 档位保存期间锁定整组矩阵并标记保存目标；已录入行只强化实际档位。
- 1180–1440px 保持八档数值单行；1179px 以下切换单列并取消左侧吸顶与强制高度。

### Prediction and evaluation graphics

- 预测摘要使用“预测 / 其他可能”，相同显示概率归入同一预测分组；名称左对齐，概率右对齐。
- 预测绿表示模型输出，不代表成功。模型、概率和置信度必须使用文本语义和稳定数字宽度。
- 彩色左右侧边条不得作为卡片、列表、提示或状态的装饰强调。1px 结构分隔线可以使用；Bayes 路径卡片左侧的路径线属于表达推理结构的功能图形，可以保留，并必须与路径节点、线型或标签共同表达含义。
- 评估子模型回测的 feature-local `--model-surface-accent` 由用户实际看到的外层 disclosure 行状态拥有：普通展开为蓝色、最高命中为绿色、未启用为灰色；展开详情与内部判断摘要继承同一表面色。`--model-accent` 继续只承担模型数据图形语义，模型身份色不得覆盖可见父卡片的状态表面。

### Statistics diagnosis

- 样本量说明约束整个统计诊断区域，必须放在“统计诊断”标题下作为区域级辅助说明，不放进单个可信度或偏差单元。说明使用实际样本数、Label（13px / 500）和中性次级文字色，不添加图标、边框、底色或胶囊；诊断单元只保留标签与数据。无偏高或偏低项时只显示一次“暂无明显偏高 / 暂无明显偏低”，不重复渲染百分比占位。
- 统计页使用“样本可信度”和“副词条分布偏差”两张同级任务卡片；页面容器不再提供第三层巨型卡片边界。样本阶段轴属于可信度卡片，高低偏差摘要属于分布偏差卡片。
- 观察率和理论率使用 `%`；两个比例的差值也使用带正负号的 `%`，例如 `+18.18%`。差值语义由“偏差”“相对某项新增”等业务标签表达，不写成相对增长率。
- 统计诊断页头在已有样本时只显示两个摘要胶囊：当前可信度状态与样本阶段。不得为了填满空间增加“最大偏差”或其他与任务卡重复的第三项。
- 统计诊断与模型评估的页头摘要组共用 `page-summary` 视觉 owner，并以模型评估的紧凑密度为基准：桌面胶囊高 32px，标签使用 Micro（11px / 500）和满足 WCAG AA 的 `#5f7183`，值使用 Label（13px / 600）、数据字体和稳定数字宽度；窄屏尺寸、浅深色表面和状态点语言必须同步。
- “起步观察”等可信度结论只在页头状态胶囊出现。样本可信度卡只将当前驱动文案作为 28px 轻量标签放在卡片标题旁，不显示“判断依据”前缀；当前/目标样本数与阶段摘要组成右侧两行，不得显示“阶段进度”或“当前阶段的主要解释来源”等重复标签，阶段轴紧随标题栏分隔线之后。
- 页头摘要组使用带可访问名称的 `group` 语义；视觉上省略的阶段说明继续通过标题和 `aria-label` 提供完整上下文。

### Zero sample and insight readiness

- 统计诊断与模型评估共享同一套样本成熟度：`0` 为“待录入”，`1–499` 为“起步观察”，`500–2999` 为“初步观察”，`3000–9999` 为“可作参考”，`10000–49999` 为“稳定观察”，`50000+` 为“可优化权重”。零样本状态使用中性胶囊且不显示绿色状态点。
- 真实计数显示 `0`；请求成功但尚未形成的指标显示半角 `--`；语义状态显示短文案。`--` 不附带 `%` 或其他单位，不表达 loading 或 error。全局置信度在零样本时固定显示 `--`。
- 零样本列表和图表整体隐藏，由一张行动导向的准备面板替代，不渲染成排的 `0.00%`、`+0.00%` 或“样本不足”。
- 模型评估的样本成熟度与回测准备度分开表达：页头显示统一成熟度，正文显示 `evaluated_count / 20`；只有后端状态为 `ready` 时渲染完整回测模块。
- loading 使用骨架，error 使用可理解说明和重新加载动作；二者不得复用零样本或 `--`。

### History and recognition overlays

- 历史记录是可拖动、可收起的辅助面板，默认在右下安全区最小化；不得遮挡主录入和关键操作。
- 本地识别复核默认安静，只在冲突、低置信度或待确认时提高权重。
- 浮层必须有明确层级、键盘焦点和关闭路径，不得用大面积阴影替代结构。

### Authentication surface

- 首页可以使用轻量终端语气和短协议文本，但中文表单标签、正文和按钮说明仍使用产品 Sans。
- 打字光标是标题的功能性动画，不属于彩色侧边条；它必须停在文字末端，并在 `prefers-reduced-motion` 下关闭。
- 主要内容默认可见，进入动画只能增强呈现，不能依赖 `opacity: 0` 或宽度动画才能显示内容。

### Responsive and motion

- `1440px` 是宽桌面上界参考；`1180–1440px` 使用紧凑桌面布局；`1179px` 以下工作台单列；`980px` 处理全局导航；`860px` 处理主要组件堆叠；`520px` 处理窄屏间距和触控。
- 常规状态反馈为 80–120ms，面板显隐为 120–160ms；只动画 opacity、transform 或颜色等不会触发布局重排的属性。
- 每一项非必要动画都必须提供 `prefers-reduced-motion` 替代。内容在无动画、后台标签页和自动化渲染中仍须完整可见。

## 6. Do's and Don'ts

### Do

- **Do** 使用真实账号、UID、保存、预测、识别和冲突状态组织界面。
- **Do** 使用 1px 冷灰边框、近白表面和单一明确层级线索建立结构。
- **Do** 为所有可比较数字启用 `tabular-nums`，让概率、样本量、UID 和分数稳定对齐。
- **Do** 同时使用文字、图标或形状表达 selected、success、warning、critical 和 disabled。
- **Do** 在窄屏重排结构并保持文字可读，不通过缩小到 12px 以下解决空间问题。
- **Do** 让错误、空状态和不可用状态说明用户下一步可以做什么。
- **Do** 将纯视觉改动限制在现有 Vue、公共样式和 feature CSS ownership 内。
- **Do** 把当前批准渲染作为视觉改动的默认比较基线。
- **Do** 在修改颜色、字体、圆角、阴影或动效前提供局部前后截图并获得批准。
- **Do** 先以相同最终值完成全局 token、feature token 和局部数据可视化颜色的分层。

### Don't

- **Don't** 把产品做成营销落地页、视觉特效展示、通用企业后台、调试控制台或另一套账号 / UID 心智。
- **Don't** 暴露后端地址、开发配置、内部状态码或虚构数据预览。
- **Don't** 恢复 Activity Bar、Status Bar、文件标签式导航、完整 IDE Shell 或暗色编辑器优先方向。
- **Don't** 使用大面积紫色、蓝紫 AI 渐变、渐变文字、玻璃拟态、发光边缘、装饰性卡片堆叠或超大 hero。
- **Don't** 在卡片、列表、callout 或 alert 左右使用超过 1px 的彩色侧边强调；功能图形必须真实表达路径、进度或结构。
- **Don't** 组合 1px 边框和 16px 以上模糊阴影制造 ghost card，也不要使用嵌套卡片。
- **Don't** 把所有按钮、字段和卡片做成胶囊；胶囊必须有导航、筛选、状态或上下文语义。
- **Don't** 让 hover 上浮、缩放、弹跳或改变布局，也不要动画 width、height、margin、padding 和位置属性。
- **Don't** 让内容依赖进入动画才可见；每项非必要动画都必须尊重 `prefers-reduced-motion`。
- **Don't** 为提高 audit 分数、减少颜色字面量或满足通用偏好而批量替换现有配色、字体或组件造型。
- **Don't** 让关键正文、表单值、操作标签和错误信息使用不可读的浅灰色，也不要让 `colors.decorative-muted` 承载这些内容。
- **Don't** 把已登记的 Bayes 路径、登录打字光标或其他功能图形当作装饰性侧边条删除。
- **Don't** 为单页引入新字体栈、无效字重、负字距、10px 文字或大面积 Mono 中文。
- **Don't** 新增没有业务意义的组件、全局状态管理、UI 框架或视觉 chrome。
