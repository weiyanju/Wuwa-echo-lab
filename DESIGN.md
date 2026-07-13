---
name: Wuwa / Tethys System
description: 冷静、精确、低噪音的声骸数据工作台。
colors:
  primary: "#0064e0"
  primary-deep: "#0457cb"
  prediction: "#2c9f70"
  ink-strong: "#0a1317"
  ink-main: "#1c1e21"
  text-muted: "#5d6c7b"
  text-subtle: "#8595a4"
  canvas: "#ffffff"
  surface-root: "#f6f8fb"
  surface-soft: "#f1f4f7"
  surface-prediction: "#f7f9fb"
  border-soft: "#dee3e9"
  border-strong: "#ced0d4"
  success: "#31a24c"
  warning: "#f7b928"
  critical: "#e41e3f"
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
  label:
    fontFamily: "IBM Plex Sans SC, Noto Sans SC, Microsoft YaHei UI, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0"
  data:
    fontFamily: "IBM Plex Sans SC, IBM Plex Sans, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "0"
  latin:
    fontFamily: "IBM Plex Sans SC, IBM Plex Sans, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.25
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
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  3xl: "28px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.canvas}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "7px 12px"
    height: "46px"
  button-primary-hover:
    backgroundColor: "{colors.primary-deep}"
    textColor: "{colors.canvas}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "7px 12px"
    height: "46px"
  button-secondary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-strong}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "7px 12px"
    height: "40px"
  button-danger:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.critical}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "7px 12px"
    height: "40px"
  nav-tab-active:
    backgroundColor: "{colors.ink-strong}"
    textColor: "{colors.canvas}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "7px 18px"
    height: "36px"
  input-field:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-main}"
    typography: "{typography.body}"
    rounded: "{rounded.dense}"
    padding: "12px"
    height: "44px"
  uid-chip:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.text-muted}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "8px 14px"
    height: "40px"
  product-panel:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink-strong}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "28px"
  prediction-rail:
    backgroundColor: "{colors.surface-prediction}"
    textColor: "{colors.ink-strong}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "16px"
---

# Design System: Wuwa / Tethys System

## 0. Usage and precedence

本文件是 Web 当前视觉实现的总入口，负责颜色、字体、圆角、间距、阴影、组件语言和交互状态。跨端产品行为与账号、UID、数据可信边界遵循 `docs/product-interface-principles.md`；Web 长期方向遵循 `docs/web-ui-design-system-v2.md`；页面专项规则在不冲突的前提下补充本文件。

开发前必须先读 `PRODUCT.md` 与本文件。`docs/superpowers/`、`docs/archive/` 和 `memory/` 只提供专项背景或历史决策。文档与实现冲突时，先确认预期并同步两者，禁止静默降低规范来迁就现有代码。

## 1. Overview

**Creative North Star: "泰缇斯研究台"**

Wuwa 是玩家在普通室内光线下长时间录入、核对和分析声骸数据的桌面工作台。浅色表面、稳定对齐和有限强调色让界面在高密度下保持冷静，游戏语境通过术语、数据模型和流程出现，不依赖装饰性视觉效果。

系统气质必须清晰、克制、专业、低噪音。Web 是深度工作台，优先保证账号与 UID 上下文、数据可信和高频录入效率；首页可以保留轻量终端感，但登录后的界面必须回到熟悉、稳定的生产力工具语言。

界面明确拒绝营销落地页、视觉特效展示、通用企业后台、调试控制台和另一套账号或 UID 心智。外部参考只提供视觉词汇，绝不替代 Wuwa 自己的业务结构。

**Key Characteristics:**

- 浅色优先，蓝色只承担关键动作、当前选择和重要状态。
- 冷灰边框与近白表面建立结构，阴影只服务真实层级。
- 圆角现代但不软萌，数据区紧凑但不拥挤。
- 数字稳定对齐，概率、UID、样本量和分数易于纵向比较。
- 顶部导航保持清楚，历史记录和识别复核不得压迫主任务。

**The Task Surface Rule.** 每一个面板必须对应真实任务；没有业务意义的 chrome、卡片和状态条一律删除。

## 2. Colors

这是一套受控的浅色工具型调色板：泰缇斯蓝负责行动，深墨负责层级，冷白与雾灰负责长时间工作的安静背景。

### Primary

- **泰缇斯蓝** (`colors.primary`)：唯一主强调色，用于主操作、当前选择、焦点和高价值状态。
- **深泰缇斯蓝** (`colors.primary-deep`)：用于主操作的 hover、active 以及需要更强对比的选中状态。

### Neutral

- **深墨文字** (`colors.ink-strong`)：页面标题、关键数值和最高层级文本。
- **正文墨色** (`colors.ink-main`)：正文、表单值和常规操作文本。
- **钢灰说明** (`colors.text-muted`)：辅助信息、caption 和次级状态。
- **雾灰提示** (`colors.text-subtle`)：占位、弱提示和非关键 metadata，禁止承载关键操作信息。
- **冷白画布** (`colors.canvas`)：主要内容表面。
- **冰雾底色** (`colors.surface-root`)：页面背景与大区域分隔。
- **柔灰表面** (`colors.surface-soft`)：次级面板、禁用背景和低权重分组。
- **预测雾面** (`colors.surface-prediction`)：预测摘要与紧凑的算法结果区域。
- **柔边界** (`colors.border-soft`)：默认容器、卡片和行分隔。
- **强边界** (`colors.border-strong`)：输入框和需要更清楚轮廓的控件。

### Secondary

- **预测绿** (`colors.prediction`)：贯穿右侧预测摘要和下方“预测概率提升”行，表示模型当前聚焦结果，不等同于成功状态。
- **成功绿** (`colors.success`)：仅用于保存成功、识别成功、已记录和真实正向状态。
- **确认琥珀** (`colors.warning`)：仅用于低置信度、待确认和可恢复风险。
- **错误红** (`colors.critical`)：仅用于失败、不可提交、冲突和破坏性操作。

### Named Rules

**The One Voice Rule.** 蓝色只出现在关键动作、当前选择和状态指示中；同一屏幕不得让多个区域同时争夺主强调色。

**The Semantic Color Rule.** 绿色、琥珀色和红色必须对应真实状态，绝不用于装饰；状态还必须配合文字、图标或形状表达。

**The Light-First Rule.** 浅色模式是基准。暗色模式只能做等价语义映射，不能成为霓虹化或开发者控制台风格的另一套产品。

## 3. Typography

**Display/Body Font:** IBM Plex Sans SC（Noto Sans SC、Microsoft YaHei UI 与 system-ui 兜底）

**Label Font:** IBM Plex Sans SC

**Technical Mono Font:** IBM Plex Mono；只用于协议、状态码和短技术 metadata

**Character:** IBM Plex 超级家族承担完整产品层级，气质理性、清晰、有轻微未来技术感但不机械。中文、普通拉丁文本、可比较数字与短技术文本使用独立语义入口；数据通过字号、真实字重和稳定数字宽度获得力量。

完整规则以 [Wuwa / Tethys Web 字体设计系统](docs/superpowers/specs/2026-07-13-wuwa-typography-system-design.md) 为准。正式 Sans 字重仅使用 400 / 500 / 600 / 700，Mono 仅使用 500 / 600。

### Hierarchy

- **Display** (`typography.display`)：页面标题和工作台问候语；固定字号，不随视口缩放。
- **Headline** (`typography.headline`)：大区块标题；与正文形成明确但克制的层级。
- **Title** (`typography.title`)：卡片、图表和面板标题；适合高密度区域。
- **Body** (`typography.body`)：说明、表单和一般内容；长段落限制在 65–75ch。
- **Label** (`typography.label`)：按钮、badge、字段标签和短状态；中文不增加字距。
- **Data** (`typography.data`)：UID、声骸编号、概率、百分比、样本量、排名和分数；必须使用 `tabular-nums`。

### Named Rules

**The Stable Number Rule.** 所有可比较数字必须启用等宽数字，数值和单位分层，但单位不得淡到影响识别。

**The Semantic Entry Rule.** 中文、普通拉丁文本、品牌、数据与 Mono 技术文本分别使用 `--font-cjk`、`--font-latin`、`--font-data` 和 `--font-mono`；不得为单页临时引入新的字体家族。

**The Tracking Rule.** 中文默认字距为 0；普通拉丁与数字也保持 0，缩写、全大写状态和 TETHYS 品牌只使用对应 tracking token。禁止负字距和任意裸字距。

**The Real Weight Rule.** 只声明已经加载的 400 / 500 / 600 / 700 字重；标题和最高级数据最多使用 700，不允许 650、720、800、900 等无效或合成字重。

**The Minimum Size Rule.** 交互文字不得小于 12px；仅空间受限的非交互图表 metadata 可使用 11px。禁止 10px 和半像素字号。

## 4. Elevation

系统采用结构化扁平策略。静态表面依靠背景色和 1px 冷灰边框分层，常规卡片没有阴影；顶部粘性导航使用低对比环境阴影，菜单、浮层和可拖动历史面板使用更明确但柔和的阴影。焦点环属于可访问性反馈，不是装饰。

### Shadow Vocabulary

- **Sticky Ambient** (`0 10px 32px rgba(39, 55, 71, 0.06)`)：仅用于粘性顶部导航等需要与滚动内容分离的表面。
- **Floating Panel** (`0 18px 42px rgba(0, 0, 0, 0.24)`)：仅用于菜单、浮层和真正脱离文档流的面板。
- **Focus Halo** (`0 0 0 2px rgba(24, 118, 242, 0.10)`)：输入与控件聚焦时的辅助轮廓，必须同时保留清晰边框。

### Named Rules

**The Flat-by-Default Rule.** 静态面板必须保持平坦；如果移除阴影后层级仍然清楚，就不允许添加阴影。

**The Structural Shadow Rule.** 阴影只能说明悬浮、粘性或聚焦关系，禁止用重阴影、发光边缘和多层阴影制造“高级感”。

## 5. Components

组件应精确而克制。所有高频控件必须拥有 default、hover、focus、active、disabled、loading 和 error 中适用的完整状态，并保持同一套形状、颜色和排版词汇。

### Buttons

- **Shape:** 常规按钮使用轻柔矩形圆角（`rounded.sm`）；只有导航筛选、状态胶囊和紧凑上下文控件使用 `rounded.pill`。
- **Primary:** 泰缇斯蓝实底、冷白文字，局部区域只允许一个最高权重主按钮。
- **Hover / Focus:** hover 只改变背景、边框或文字色；focus 使用清晰蓝色轮廓；禁止上浮、缩放、弹跳或造成布局移动。
- **Secondary:** 冷白底、冷灰边框和深墨文字，用于辅助动作。
- **Danger:** 冷白底、错误红文字和弱红边框，用于弃置、删除和不可逆操作；文案必须明确动作对象。

### Chips

- **Style:** 只在状态、筛选、UID 上下文或短 metadata 需要紧凑包裹时使用胶囊形；默认浅底、细边框、稳定行高。
- **State:** selected 使用深墨或泰缇斯蓝强化；success、warning、critical 必须带文字语义，禁止只换颜色。

### Cards / Containers

- **Corner Style:** 页面级面板使用 `rounded.lg` 或 `rounded.xl`，中型卡片使用 `rounded.md`，密集矩阵使用 `rounded.dense` 或 `rounded.sm`。
- **Background:** 主表面使用冷白画布，次级分组使用冰雾或柔灰表面。
- **Shadow Strategy:** 静态卡片无阴影，浮层遵循 Elevation 章节。
- **Border:** 默认 1px 柔边界；selected、focus 和 active 才提高边框对比。
- **Internal Padding:** 大面板使用 24–28px，中型面板使用 16–20px，密集数据区域使用 8–12px。

### Inputs / Fields

- **Style:** 44px 高、1px 强边界、冷白背景和紧凑圆角（`rounded.dense`）。
- **Focus:** 边框切换为泰缇斯蓝，并出现可见 Focus Halo；不得仅依赖阴影。
- **Error / Disabled:** 错误信息贴近字段并说明下一步；disabled 使用柔灰背景、降低对比并保留可理解标签。

### Navigation

- 顶部导航是 Web 的全局导航，左侧使用紧凑 `TETHYS` 字标，中部主要模块相对整条导航视觉居中，右侧承载 UID、主题和账号操作。
- 登录、加载与 UID 首次绑定等入口场景可以使用完整 `Tethys System / 泰缇斯枢纽`；登录后的全局导航只显示短字标 `TETHYS`。
- 默认 tab 透明或浅底，active 使用高对比深墨底；触控目标至少 44px，紧凑视觉高度可通过外层点击区实现。
- 窄屏允许换行或结构化堆叠，禁止恢复 Activity Bar、Status Bar 或文件标签隐喻。

### Prediction Summary

- 预测摘要直接融入浅灰操作轨道，不再使用独立外框或嵌套卡片；轨道宽度在 192–240px 之间随可用空间调整。
- 使用预测绿连接右侧摘要和下方“预测概率提升”行，将最高显示概率的并列预测与其他可能建立一致层级。
- 预测名称左对齐，概率右对齐并使用稳定数字宽度；显示为相同概率的结果必须归入同一个“预测”分组。
- 文案采用“预测 / 其他可能”，强调模型输出而非替用户作决策。

### Workbench Configuration

- 桌面端使用左侧配置区与右侧主录入区。左侧外层参与页面网格，内部配置内容在可用视口内吸顶并独立滚动，不能被右侧词条矩阵总高度无限拉长。
- 套装列表提供搜索。搜索只过滤可见选项，不改变当前已选套装。
- 当前声骸为 0/5 时，套装、COST 或主词条变化直接修改空白草稿；已经录入至少一个副词条时，选择不同配置立即新建并切换到使用该配置的声骸。
- 配置变化会新建声骸时，界面必须提前显示“选择其他配置将新建声骸”，创建成功后提供就地反馈。
- 档位保存期间锁定整组矩阵并标记保存目标；已录入行只强化实际档位，其他候选保持安静。

## 6. Do's and Don'ts

### Do:

- **Do** 先展示当前系统账号、当前游戏 UID 和数据状态，再展示数据操作。
- **Do** 使用泰缇斯蓝表达主操作、当前选择和焦点，并控制同屏强调数量。
- **Do** 使用 1px 冷灰边框、近白表面和少量真实阴影建立层级。
- **Do** 为概率、UID、声骸编号、样本数、排名和分数启用 `tabular-nums`。
- **Do** 保持顶部导航、圆角工作台和短路径录入流程，桌面端优先保证信息密度与稳定布局。
- **Do** 让错误、不可用和低置信度状态说明用户下一步能做什么。
- **Do** 保留可见键盘焦点，并在可行处提供至少 44px 的点击目标。
- **Do** 让历史记录与本地识别复核默认安静，只在待处理、冲突或低置信度时提高权重。

### Don't:

- **Don't** 让界面感觉像营销落地页、视觉特效展示、通用企业后台、调试控制台，或拥有另一套账号与 UID 心智的独立产品。
- **Don't** 使用假数据预览、重玻璃效果、装饰性卡片堆叠、超大 hero，或暴露后端地址等开发者概念。
- **Don't** 恢复左侧 Activity Bar、底部 Status Bar、文件标签式导航、完整 IDE Shell 或暗色编辑器优先的视觉体系。
- **Don't** 使用大面积紫色、蓝紫色 AI 渐变、渐变文字、发光边缘或赛博朋克霓虹字体。
- **Don't** 使用超过 1px 的彩色左侧或右侧条纹装饰卡片、列表项、提示和状态；改用完整边框、背景色、图标或文字。
- **Don't** 使用卡片套卡片、相同卡片网格或没有业务意义的面板来制造视觉节奏。
- **Don't** 把 modal 当作默认解决方案；先使用内联、渐进展开、侧栏或就地反馈。
- **Don't** 让 hover 上浮、缩放、弹跳，或动画改变布局；常规反馈保持在 80–160ms 并尊重 `prefers-reduced-motion`。
- **Don't** 只靠颜色表达成功、警告、错误、选中或禁用状态。
- **Don't** 为单个页面临时引入字体栈、配色体系、组件语法、UI 框架或全局状态管理方案。
