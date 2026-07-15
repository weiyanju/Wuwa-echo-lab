# Statistics Diagnosis Summary Design

**Date:** 2026-07-15
**Status:** Implemented — [initial layout plan](../plans/2026-07-15-statistics-diagnosis-summary-layout.md) · [combined density plan](../plans/2026-07-15-statistics-summary-chip-and-reliability-header.md) · [latest implementation record](../../archive/2026-07-15-statistics-summary-chip-and-reliability-header-implementation.md)

## Goal

收敛统计页“统计诊断”页头与“样本可信度”卡片的信息层级。页面头负责回答“现在处于什么状态”，可信度卡片负责解释“判断依据是什么、距离下一阶段还有多远”，不再用大号绿色结论占据卡片左侧。

## Scope

本设计调整已有样本时的统计页摘要、样本可信度卡片和模型评估页头摘要的共享视觉契约，不修改：

- 副词条分布偏差卡片及其 `pp` 语义。
- 统计 API、presentation 阶段计算或数据结构。
- 工作台、模型评估正文模块和全局导航。
- 零样本初始化、加载状态或首次使用引导。

## Problem

统计诊断页头已经补上状态摘要，但它与模型评估分别维护同语义胶囊，数值字号、底色、标签颜色、暗色和移动端尺寸发生漂移。“样本可信度”卡片又把判断依据与阶段数字放进独立双列解释区，为了左右等高保留“阶段进度”和“当前阶段的主要解释来源”等重复说明，导致卡片过厚。

## Approved Layout

### Statistics diagnosis header

页头改为左右结构：

- 左侧保留“统计诊断”和区域级样本说明，例如“基于 286 条样本，当前偏差仅作趋势提示。”
- 右侧只放两个摘要胶囊：
  - 状态胶囊：绿点加“起步观察”。文字来自现有 `statsReliabilityText(totalSamples)`，绿色表示当前统计阶段，不表示成功。
  - 阶段胶囊：“阶段 0–500 条”。范围来自现有样本阶段数据。

不得为了填满右侧空间增加第三个胶囊。特别禁止加入“最大偏差 +18.18pp”，因为它与分布偏差卡重复，并且在低样本阶段容易被误读为稳定结论。

页头摘要在桌面端右对齐并与标题顶部对齐；860px 以下移动到标题说明下方并左对齐，允许自然换行。

### Sample reliability card

卡片标题栏承担全部阶段摘要，不再保留独立双列解释行：

- 左侧由“样本可信度”和 28px 轻量阶段驱动标签组成。标签只显示“规则基线主导”等当前驱动文案，不显示“判断依据”前缀。
- 右侧只保留两行：主要值 `286 / 500`，次级摘要 `57.2% · 距「总体偏差」214 条`。
- 可见界面删除“阶段进度”和“当前阶段的主要解释来源”；完整阶段语义继续由 `aria-label` 提供。

标题栏底部保留单条分隔线，完整阶段轴紧随其后。阶段轴的数据、非线性位置和内部滚动行为不变。

### Visual hierarchy

- 页面头状态胶囊与模型评估状态栏使用同一个 `page-summary.css` owner，共享高度、边框、圆角、标签/数值比例、浅深色表面、状态点和响应式规则。
- 卡片内阶段驱动标签高 28px，低于页面头 32px 胶囊；它表达局部解释来源，不与页面状态竞争。
- `286 / 500` 继续使用数据字体和稳定数字宽度，作为标题栏唯一的大号数值。
- 不新增嵌套卡片、阴影、渐变文字或装饰性色条。
- 深色模式保持相同 DOM 和信息顺序，只做现有语义色映射。

## Data and component boundaries

`StatisticsView.vue` 继续作为唯一页面 owner，复用已有：

- `statsReliabilityText(totalSamples)` 生成页头状态。
- `sampleStageRangeText` 生成页头阶段范围。
- `sampleStageDriverText` 生成卡片阶段驱动文案。
- `sampleStageStatus`、`sampleStagePercentText` 和 `sampleStageSummaryText` 生成可见的紧凑阶段摘要；`sampleStageGoalText` 保留完整无障碍说明。

不新增 API、store、持久化状态或跨页面 Vue 组件。跨页面只共享摘要 CSS owner，页面继续自行拥有文案与数据。

## Accessibility

- 页头胶囊组使用“统计摘要”作为可访问名称。
- 绿点设为 `aria-hidden="true"`，状态意义必须由“起步观察”文字完整表达。
- 可见界面省略“阶段进度”后，当前阶段、完成比例、剩余样本和阶段轴继续保留完整可访问说明。
- 窄屏换行不得改变 DOM 阅读顺序：标题、说明、摘要胶囊、卡片标题与阶段驱动、当前/目标样本数、阶段摘要、阶段轴。

## Tests and acceptance criteria

- 统计页头存在仅含“起步观察”和阶段范围的摘要组。
- 页头和卡片均不出现“最大偏差”摘要胶囊。
- “起步观察”不再作为卡片内大号结论出现。
- 阶段范围不在页头和卡片标题栏重复。
- 卡片标题栏包含只显示当前驱动的轻量标签、当前/目标样本数和紧凑剩余样本摘要，不出现“判断依据”前缀、独立解释行或重复说明。
- 统计诊断与模型评估页头都使用共享摘要 class、`group` 语义、13px 数值密度和稳定数字宽度。
- 1280px 浅色与深色模式中，页头摘要和标题对齐；860px、600px、520px 下无页面级横向溢出。
- 完整前端测试、生产构建和 `git diff --check` 通过。

## Out of scope

零样本时是否显示默认阶段、引导动作或占位卡片继续留待后续初始化方案讨论，本设计不提前定义该行为。
