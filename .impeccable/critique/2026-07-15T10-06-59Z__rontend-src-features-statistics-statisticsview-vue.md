---
target: 统计诊断与模型评估零样本初始化体验
total_score: 26
p0_count: 0
p1_count: 1
timestamp: 2026-07-15T10-06-59Z
slug: rontend-src-features-statistics-statisticsview-vue
---
Method: dual-agent (A: `/root/visual_assessment` · B: `/root/detector_assessment`)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 3/4 | 导航、待录入、0 与 `--` 清楚，但跨页后如何推进当前目标不够明确。 |
| 2 | Match System / Real World | 3/4 | 玩家术语基本准确，“预测上下文”和“有效回测”仍需解释。 |
| 3 | User Control and Freedom | 2/4 | 只有通用跨页 CTA，没有直接落到当前录入点或保留任务目标。 |
| 4 | Consistency and Standards | 3/4 | 两页颜色与按钮一致，但统计路径和评估步骤的结构语义不一致。 |
| 5 | Error Prevention | 3/4 | 正确隐藏未形成结果，并区分真实 0、未形成指标、loading 与 error。 |
| 6 | Recognition Rather Than Recall | 3/4 | 门槛可见，但跳到工作台后用户需记住为何录入及当前目标。 |
| 7 | Flexibility and Efficiency | 2/4 | 主路径短，但缺少直接录入、继续录入或专家加速路径。 |
| 8 | Aesthetic and Minimalist Design | 2/4 | 低噪音，但超宽桌面构图失衡，留白像未完成而非有意克制。 |
| 9 | Error Recovery | 3/4 | loading、error 和重新加载路径完整。 |
| 10 | Help and Documentation | 2/4 | 未清楚解释有效回测条件及跨页录入如何推进步骤。 |
| **Total** |  | **26/40** | **Acceptable：基础可信，但首次激活体验尚未达到发布级。** |

## Anti-Patterns Verdict

### LLM assessment

整体不像粗糙的 AI Dashboard：字体、主蓝、导航、圆角和真实 `0 / --` 都保持了产品感。但正文使用“kicker + 标题 + 说明 + 孤立 CTA + 步骤”的常见空状态模板，又缺少针对超宽桌面的构图判断，因此仍有明显的模板化痕迹。

### Deterministic scan

Bundled detector 对 `StatisticsView.vue`、`EvaluationReadinessState.vue`、`EvaluationView.vue` 返回 `[]`：0 findings、0 false positives。它没有发现代码级反模式，但也没有捕获运行时比例、留白或统计路径语义不等价的问题。

### Visual overlays

独立检测代理无法取得 Browser binding，未创建 overlay，也没有可靠的 `[Human]` 标注页。证据回退为两张 3840×1906 实机截图、Vue/CSS 源码、静态对比度计算和截图近似坐标。

## Overall Impression

数据语义和操作逻辑比旧版好，但当前视觉不能交付。最大问题不是“太空”，而是零状态没有成为页面主任务：它被压缩在宽壳左上，CTA、说明和步骤之间缺乏共同重心，整体像内容尚未加载完整。

## What's Working

1. `0`、`--`、待录入、loading 和 error 的语义分开，避免了伪数据。
2. 统计页承诺“第 1 条即可看到个人分布”，评估页使用真实的两阶段门槛，业务逻辑是合理的。
3. 主 CTA、正文与摘要文字的抽查对比度均通过 WCAG AA；CTA 保持 44px，评估步骤使用 `ol/li` 和 `aria-current`。

## Priority Issues

### [P1] 超宽桌面构图失衡，页面像未完成

**Why it matters:** 两页共同壳约 2040px 宽，准备态只使用壳内约 63%；统计页内容在约 y=725 已结束，底部仍有约 1180px 空白。用户容易误判为加载不完整或产品功能贫乏。

**Fix:** 不要只把 `max-width: 860px` 改大。将零状态组织为有明确重心的页面级构图：优先采用完整宽度的双栏布局，左侧承载价值和当前门槛，右侧承载与当前步骤绑定的动作；同时设置合理的垂直起点和最小任务区高度。

**Suggested command:** `$impeccable layout`

### [P2] CTA 与当前步骤关系太弱

**Why it matters:** 按钮远离标题、首个里程碑和 `0/20`，看起来像通用导航按钮，而不是当前任务的直接动作。点击后用户还要重新寻找工作台录入点。

**Fix:** 将 CTA 收进当前步骤区域，文案改为更具体的“录入第一条副词条”或“开始积累历史”；跳转后定位首个录入控件并保留来源目标。

**Suggested command:** `$impeccable onboard`

### [P2] 状态信息重复，真正价值反而不突出

**Why it matters:** 全局 `0 / 0 / --`、页头“待录入”、正文“下一步/评估准备”以及“进行中/等待中”重复解释相近状态。内容越少，重复越显眼。

**Fix:** 保留全局成熟度，但正文只讲价值、门槛和动作；编号和高亮已经表达当前步骤时，删除“进行中/等待中”等重复标签。

**Suggested command:** `$impeccable distill`

### [P2] 两页缺少共同的信息骨架

**Why it matters:** 评估页像完整流程，统计页则像删掉一半内容。用户无法快速迁移对零样本状态的理解。

**Fix:** 两页统一为“可获得的价值 → 当前门槛 → 直接动作 → 下一阶段收益”。统计可以更短，但组件骨架、对齐和行动落点应一致。

**Suggested command:** `$impeccable layout`

### [P2] 统计路径与跨页焦点语义不完整

**Why it matters:** 评估使用原生步骤列表；统计只是普通 `div` 和蓝点。屏幕阅读器无法获得等价的当前步骤语义，页面切换后也可能失去焦点上下文。

**Fix:** 统计路径改为列表并标记当前项；跨页后把焦点移到工作台任务标题或首个录入控件，并播报已进入录入流程。

**Suggested command:** `$impeccable harden`

## Persona Red Flags

### Alex（高频用户）

- 每次都要经过通用“去工作台录入”，没有直达首个副词条录入控件的路径。
- 统计和评估重复同一种中间跳转，熟练后仍缺少“继续录入”加速入口。

### Jordan（首次用户）

- 统计收益清楚，但按钮未说明到工作台后具体做什么。
- “预测上下文”“有效回测”容易被理解成同一个 20 条门槛，长脚注承担了过多解释责任。

### Sam（键盘与屏幕阅读器用户）

- 统计当前节点主要依赖蓝色实心圆，没有评估页等价的 `ol/li + aria-current`。
- 跳转后焦点去向不明确；正向证据是 CTA 为原生按钮并有 3px focus outline。

## Minor Observations

- 问候摘要比真正需要操作的零状态更抢视觉重量。
- 页头“待录入”在最右，正文行动块在最左，视线往返过长。
- 统计横线过长，强化了里程碑与 CTA 的割裂。
- 评估脚注太像免责声明，与对应步骤距离过远。
- 截图右下角宠物属于工具界面，不计入产品页面问题。

## Questions to Consider

1. 如果零样本页面的唯一任务是开始录入，为什么开始动作不是整个构图的中心？
2. 用户跳到工作台后，页面如何证明他仍在推进“统计第 1 条”或“评估 0/20”？
3. 全局成熟度、页头待录入、正文准备状态和步骤状态是否都需要同时存在？
