# 评估子模型判断摘要跟随可见父卡片表面设计

## 状态

已批准。本设计取代 `2026-07-19-evaluation-model-judgement-derived-surface-design.md` 中“判断摘要按模型身份色派生”的方案。

## 背景

模型评估页的子模型回测采用嵌套 disclosure 结构：

1. 外层回测行负责模型名称、命中率、Loss、最高命中和展开状态。
2. `.model-row-detail` 是展开后实际可见的详情表面。
3. `.model-insight-card` 位于详情容器内部，但在当前嵌入布局中背景被覆盖为透明。
4. `.model-judgement-summary` 位于透明的内层详情卡片中。

上一版设计把 `--model-surface-accent` 定义在 `.model-insight-card` 上，并按 `model.key` 映射为蓝、紫、琥珀、绿或灰色。该方案在独立模型卡片中成立，但不符合当前生产页面的实际层级：用户看到的是外层回测行和 `.model-row-detail`，不是被设为透明的内层卡片。

这会造成明显冲突。例如“周期规律”内部 key 为 `bayes`，判断摘要因此变为紫色；当它同时是最高命中模型时，外层回测行、进度条和可见详情表面是绿色。用户看到的是绿色卡片里出现一个紫色判断摘要。

此外，`.model-row-detail` 当前直接写死绿色边框和浅绿色背景，无论展开的是哪个模型、是否最高命中都会使用绿色。这进一步混淆了模型身份色、最高命中状态色和展开选择色。

## 根因

问题不是颜色值选错，而是表面色的 owner 放错：

- `--model-surface-accent` 由不可见的内层模型卡片拥有。
- 可见父容器没有稳定的表面 token。
- 外层最高命中状态和展开详情使用独立的硬编码绿色。
- 静态测试只验证孤立 `.model-insight-card`，没有覆盖实际嵌套结构和 CSS 级联。

## 目标

- 判断摘要始终跟随用户实际看到的父卡片表面。
- 外层回测行、展开详情容器和判断摘要使用同一个局部表面 token。
- 颜色优先表达真实 UI 状态，不再让不可见的模型身份表面决定摘要颜色。
- 最高命中模型的展开详情和判断摘要统一为绿色。
- 普通展开模型的展开详情和判断摘要统一为蓝色。
- 未启用模型的展开详情和判断摘要统一为灰色。
- 模型身份色继续用于 Exact/Wildcard、时间序列、窗口图、节点和其他数据图形。
- 保持模型算法、展示名称、命中率、Loss、排序、权重和交互行为不变。

## 非目标

- 不重命名 `bayes`、`cycle` 等内部模型 key。
- 不修改“周期规律”“近期序列”“词条窗口”等展示名称。
- 不改变最高命中、主导、参与中、低权重或未启用的业务判断。
- 不修改图表内部的数据配色。
- 不改变判断摘要的文案、DOM 结构、字号、字重、圆角或内边距。
- 不重构整个评估页或引入全局状态管理。
- 不让摘要颜色响应 hover 等瞬时指针状态。

## 设计决策

### 可见父卡片成为表面 owner

`--model-surface-accent` 应定义在外层 `.model-bars > article`，通过 CSS 继承传递给：

- 外层展开摘要行。
- `.model-row-detail`。
- 透明的 `.model-insight-card`。
- `.model-judgement-summary`。
- `.model-judgement-label`。

内层 `.model-insight-card.model-*` 不再覆盖 `--model-surface-accent`。它只保留 `--model-accent` 和 `--model-accent-soft`，服务模型数据图形。

### 状态优先级

表面色只按稳定的可见卡片状态决定，优先级如下：

1. `disabled`：灰色，覆盖其他状态。
2. `best`：成功绿，表示当前回测最高命中。
3. `expanded`：泰缇斯蓝，表示当前展开和选中。
4. 默认收起：中性表面；此时判断摘要不存在，不需要强调色。

`best` 与 `disabled` 在当前业务逻辑中互斥，因为 `isBest` 会排除未启用模型。即使未来数据异常，CSS 仍以 `disabled` 为最高优先级。

推荐局部 token：

| 状态 | `--model-surface-accent` | 语义 |
|---|---|---|
| 普通展开 | `#1769d2` | 当前选择 / 展开 |
| 最高命中 | `#2c9f70` | 真实最高命中状态 |
| 未启用 | `#677481` | 不可用 / 弱化 |

不新增全局 token；继续使用评估 feature-local token。

### 可见表面派生

`.model-row-detail` 必须移除写死的绿色，改为从父行的 `--model-surface-accent` 派生：

浅色主题：

- 顶部分隔线：表面色 16% 与现有柔边界混合。
- 底部分隔线：表面色 12% 与现有柔边界混合。
- 背景：表面色约 3%–4% 与透明背景混合。

深色主题：

- 分隔线使用相同语义、更高可见度的表面色混合。
- 背景与现有暗色次级表面混合，不新增发光或高饱和渐变。

外层展开摘要行在普通状态使用蓝色低浓度背景；最高命中使用绿色低浓度背景；未启用保持灰色弱化。hover 只作为临时交互反馈，不改变子级 token，也不驱动判断摘要变色。

### 判断摘要派生

判断摘要继续使用上一版已经降低过的视觉强度，但颜色来源改为外层可见父卡片：

浅色主题：

- 背景：表面色 4% 与 `#f7f9fb` 混合。
- 边框：表面色 10% 与 `#d8e2ea` 混合。
- 标签：表面色 46% 与 `#1e2b34` 混合。

深色主题：

- 背景：表面色 6% 与 `var(--surface-soft)` 混合。
- 边框：表面色 16% 与 `var(--hairline-soft)` 混合。
- 标签：表面色 46% 与 `var(--ink-deep)` 混合。

因此：

- 截图中的“周期规律”是最高命中时，父卡片、详情表面和判断摘要统一为绿色。
- 同一模型不再是最高命中但被展开时，三者统一为蓝色。
- 未启用模型被展开时，三者统一为灰色。

### 模型身份色边界

模型 key 仍决定数据图形：

- `rule`：规则偏差图。
- `bayes`：Exact/Wildcard 路径和比例。
- `markov`：近期序列、重复和冷却图形。
- `cycle`：词条窗口和分组图形。
- `context`：上下文条件图形。

这些颜色继续由 `--model-accent`、`--model-accent-soft` 和图表局部 token 控制，不影响父卡片或判断摘要表面。

权重状态 `dominant`、`active`、`muted` 和 `disabled` 继续由状态标签和局部图形表达。除 `disabled` 外，权重状态不参与父卡片表面色计算。

## 组件与数据流

颜色数据流应变为：

```text
modelEvaluationRows
  ├─ isBest / disabled / expanded
  │    └─ 外层回测行状态 class
  │         └─ --model-surface-accent
  │              ├─ 外层展开背景
  │              ├─ .model-row-detail
  │              └─ .model-judgement-summary
  └─ model.key
       └─ model-* class
            └─ --model-accent / 数据图形
```

表面状态与模型数据身份由两个独立通道表达，不再共享或互相覆盖。

## 实现范围

预计修改：

- `WuwaFrontend/src/styles/features/evaluation.css`
- `WuwaFrontend/src/styles/features/evaluation-layout.css`
- `WuwaFrontend/src/design-state-accent.test.js`
- `WuwaFrontend/src/features/evaluation/EvaluationBacktest.test.js`
- `DESIGN.md`
- `.impeccable/design.json`
- 对应实施记录

Vue 模板当前已有 `best`、`expanded` 和 `disabled` 状态 class，原则上无需修改。只有在测试证明现有选择器无法稳定表达状态时，才允许增加显式语义 class；不得把颜色值写入 Vue 行内样式。

## 测试方案

### 失败优先的回归守卫

新增真实嵌套结构守卫，先证明当前实现存在以下问题：

- `.model-insight-card.model-bayes` 覆盖 `--model-surface-accent`。
- `.model-row-detail` 写死绿色。
- 外层回测行没有拥有 `--model-surface-accent`。
- 当前测试只验证孤立内层卡片。

修复后锁定：

- 外层回测行定义默认表面 token。
- `.best` 覆盖为绿色。
- `.disabled` 覆盖为灰色。
- 内层 `model-*` 选择器不再定义表面 token。
- `.model-row-detail`、判断摘要和标签全部消费继承的表面 token。
- 数据图形仍消费 `--model-accent`。

### 组件与行为回归

- 最高命中仍由 `row.isBest` 决定，未启用模型不能成为最高命中。
- 展开和收起仍只保留一个详情。
- 滚动锚点、键盘语义、响应式布局和减少动态效果行为不变。
- 不修改模型排序、命中率、Loss 或权重状态。

### 浏览器视觉验收

使用真实嵌套结构，而不是孤立 `.model-insight-card` 样张：

1. 最高命中的 Bayes“周期规律”：绿色父表面、绿色判断摘要，Exact/Wildcard 图仍保留数据色。
2. 非最高命中的 Bayes“周期规律”：蓝色展开表面、蓝色判断摘要。
3. 最高命中的 Markov“近期序列”：绿色父表面、绿色判断摘要，时间带仍保留琥珀数据色。
4. 普通展开的 Markov：蓝色父表面、蓝色判断摘要。
5. 未启用模型：灰色父表面和灰色判断摘要。
6. 浅色、深色、桌面和窄屏均无横向溢出、文字裁切或额外布局高度变化。

## 验收标准

- 用户看到的父卡片是什么表面色，判断摘要就使用同一色相。
- 最高命中卡片中的判断摘要为绿色。
- 普通展开卡片中的判断摘要为蓝色。
- 未启用卡片中的判断摘要为灰色。
- 展开详情容器不再无条件写死绿色。
- 模型身份色不再决定判断摘要，只决定数据图形。
- hover 不会导致已展开的判断摘要变色。
- 浅色和深色主题保持相同语义层级。
- API、数据库、模型算法、标签、权重和回测口径均无变化。
