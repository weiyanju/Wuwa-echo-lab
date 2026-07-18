# Evaluation Model Detail Expand Reveal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task in the current branch. Do not create or use a git worktree. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 展开子模型详情时，仅在首屏信息不足的情况下自动调整页面滚动，让摘要行、详情切换项、判断摘要和尽可能多的首屏分析内容同时可见；收起时继续保持摘要行位置稳定。

**Architecture:** 保留 `EvaluationBacktest.vue` 的单项展开结构、原生 disclosure button 和现有 enter-only 动效。扩展 `modelDetailViewportAnchor.js`，把一次交互明确区分为 `expand` 和 `collapse`：`collapse` 沿用页尾临时空间与视口锚定；`expand` 在 Vue DOM 更新及一个浏览器帧后测量摘要行与详情区域，只补偿当前缺失的可视高度，并以桌面 88px、紧凑屏 64px 的顶部安全区为上限。整个方案只操作页面滚动，不创建卡片内滚动区、不修改 API、数据结构或详情布局。

**Tech Stack:** Vue 3 Composition API、原生 DOM geometry、CSS media query 断点、Node.js `node:test`、Vite。

---

## 交互契约

1. **展开且详情已经充分可见：** 页面不滚动。
2. **展开且详情被视口底部裁切：** 页面只向下滚动缺失的距离，不把摘要行滚到顶部安全区以上。
3. **详情高于一屏：** 不追求整张卡片进入一屏；最大化当前视口内的详情首屏，同时保留摘要行。
4. **切换到另一个子模型：** 以新点击的摘要行为锚点，DOM 稳定后揭示新详情。
5. **收起：** 保持当前摘要行的 `getBoundingClientRect().top`，继续使用现有页尾临时空间，不能新增自动滚回。
6. **动效：** 自动揭示使用一次即时 `scrollTop` 补偿，不使用 `smooth`，避免快速切换和减少动态效果模式下出现持续滚动。
7. **滚动所有权：** 页面仍是唯一纵向滚动容器；禁止给 `.model-row-detail`、`.model-insight-card` 或其内部区域增加 `overflow-y: auto`。

## 文件结构

- Modify: `WuwaFrontend/src/features/evaluation/modelDetailViewportAnchor.js`
  - 拥有展开/收起两种视口几何策略和临时页尾空间清理。
- Modify: `WuwaFrontend/src/features/evaluation/modelDetailViewportAnchor.test.js`
  - 覆盖展开揭示算法、视口边界、无需滚动场景和既有收起回归。
- Modify: `WuwaFrontend/src/features/evaluation/EvaluationBacktest.vue`
  - 在点击时判断 `expand` / `collapse`，把意图传给控制器。
- Modify: `WuwaFrontend/src/features/evaluation/EvaluationBacktest.test.js`
  - 锁定组件与控制器的新调用契约，继续保护原生按钮、ARIA 和收起动效规则。
- Create after implementation: `docs/archive/2026-07-19-evaluation-model-detail-expand-reveal-implementation.md`
  - 记录实际改动、自动化结果、浏览器几何数据和已知限制。
- No change planned: `WuwaFrontend/src/styles/features/evaluation.css`
  - 现有详情布局和 enter-only 动效满足方案，不新增滚动容器或位置动画。
- No change planned: `WuwaFrontend/src/styles/features/evaluation-layout.css`
  - 现有页尾 spacer 样式继续复用。

### Task 1: 用纯函数锁定展开后的最小揭示几何

**Files:**
- Modify: `WuwaFrontend/src/features/evaluation/modelDetailViewportAnchor.test.js`
- Modify: `WuwaFrontend/src/features/evaluation/modelDetailViewportAnchor.js`

- [ ] **Step 1: 先写展开几何的失败测试**

把测试文件顶部 import 改为：

```js
import {
  createModelDetailViewportAnchor,
  modelDetailExpandScrollDelta,
} from './modelDetailViewportAnchor.js'
```

在现有 controller 测试之前加入：

```js
test('expand reveal does not scroll when the whole detail is already visible', () => {
  const delta = modelDetailExpandScrollDelta({
    summaryRect: { top: 120, bottom: 180, height: 60 },
    detailRect: { top: 192, bottom: 492, height: 300 },
    viewportHeight: 720,
    topInset: 88,
    bottomInset: 24,
  })

  assert.equal(delta, 0)
})

test('expand reveal exposes the available first screen near the viewport bottom', () => {
  const delta = modelDetailExpandScrollDelta({
    summaryRect: { top: 435, bottom: 490, height: 55 },
    detailRect: { top: 530, bottom: 1030, height: 500 },
    viewportHeight: 670,
    topInset: 88,
    bottomInset: 24,
  })

  assert.equal(delta, 347)
})

test('expand reveal never moves a summary above the top safe area', () => {
  const delta = modelDetailExpandScrollDelta({
    summaryRect: { top: 76, bottom: 136, height: 60 },
    detailRect: { top: 148, bottom: 648, height: 500 },
    viewportHeight: 670,
    topInset: 88,
    bottomInset: 24,
  })

  assert.equal(delta, 0)
})

test('expand reveal scrolls only enough to expose a short detail', () => {
  const delta = modelDetailExpandScrollDelta({
    summaryRect: { top: 435, bottom: 490, height: 55 },
    detailRect: { top: 530, bottom: 730, height: 200 },
    viewportHeight: 670,
    topInset: 88,
    bottomInset: 24,
  })

  assert.equal(delta, 84)
})

test('expand reveal returns zero for incomplete geometry', () => {
  assert.equal(modelDetailExpandScrollDelta({
    summaryRect: null,
    detailRect: { top: 100, bottom: 300, height: 200 },
    viewportHeight: 720,
  }), 0)
})
```

- [ ] **Step 2: 运行测试并确认 RED**

Run from `WuwaFrontend`:

```powershell
..\.tools\node\npm.cmd test -- src/features/evaluation/modelDetailViewportAnchor.test.js
```

Expected: FAIL，提示 `modelDetailExpandScrollDelta` 尚未导出。

- [ ] **Step 3: 实现纯几何函数**

在 `modelDetailViewportAnchor.js` 的常量后加入：

```js
const DEFAULT_EXPAND_TOP_INSET_PX = 88
const DEFAULT_EXPAND_BOTTOM_INSET_PX = 24

function finiteRectHeight(rect) {
  if (Number.isFinite(rect?.height) && rect.height >= 0) {
    return rect.height
  }
  if (Number.isFinite(rect?.top) && Number.isFinite(rect?.bottom)) {
    return Math.max(0, rect.bottom - rect.top)
  }
  return null
}

export function modelDetailExpandScrollDelta({
  summaryRect,
  detailRect,
  viewportHeight,
  topInset = DEFAULT_EXPAND_TOP_INSET_PX,
  bottomInset = DEFAULT_EXPAND_BOTTOM_INSET_PX,
} = {}) {
  const detailHeight = finiteRectHeight(detailRect)
  if (
    !Number.isFinite(summaryRect?.top)
    || !Number.isFinite(detailRect?.top)
    || detailHeight === null
    || !Number.isFinite(viewportHeight)
  ) {
    return 0
  }

  const summaryTop = summaryRect.top
  if (summaryTop <= topInset || detailHeight === 0) {
    return 0
  }

  const safeBottom = Math.max(topInset, viewportHeight - bottomInset)
  const detailOffsetFromSummary = Math.max(0, detailRect.top - summaryTop)
  const maximumRevealHeight = Math.max(
    0,
    safeBottom - topInset - detailOffsetFromSummary,
  )
  const desiredRevealHeight = Math.min(detailHeight, maximumRevealHeight)
  const currentRevealHeight = Math.min(
    detailHeight,
    Math.max(0, safeBottom - detailRect.top),
  )
  const missingRevealHeight = Math.max(0, desiredRevealHeight - currentRevealHeight)
  const availableSummaryTravel = Math.max(0, summaryTop - topInset)

  return Math.min(missingRevealHeight, availableSummaryTravel)
}
```

该函数只返回非负滚动补偿：

- `0` 表示当前详情已经充分可见，或摘要已经到达顶部安全区。
- 正值表示页面需要增加的 `scrollTop`。
- 短详情只补足到完整可见；长详情最多使用当前视口可提供的首屏空间。

- [ ] **Step 4: 运行测试并确认 GREEN**

Run:

```powershell
..\.tools\node\npm.cmd test -- src/features/evaluation/modelDetailViewportAnchor.test.js
```

Expected: 新增 5 个纯函数测试通过，既有收起测试继续通过。

### Task 2: 在视口控制器中加入 `expand` 分支

**Files:**
- Modify: `WuwaFrontend/src/features/evaluation/modelDetailViewportAnchor.test.js`
- Modify: `WuwaFrontend/src/features/evaluation/modelDetailViewportAnchor.js`

- [ ] **Step 1: 先写展开控制器的失败测试 fixture**

在测试文件加入：

```js
function createExpandFixture({
  summaryTop = 435,
  summaryHeight = 55,
  detailTop = 530,
  detailHeight = 500,
  scrollTop = 600,
  viewportHeight = 670,
  viewportWidth = 1440,
} = {}) {
  const scrollingElement = {
    clientHeight: viewportHeight,
    scrollHeight: 2200,
    scrollTop,
  }
  const detailElement = {
    getBoundingClientRect() {
      return {
        top: detailTop,
        bottom: detailTop + detailHeight,
        height: detailHeight,
      }
    },
  }
  const rowElement = {
    querySelector(selector) {
      return selector === ':scope > .model-row-detail' ? detailElement : null
    },
  }
  const ownerDocument = {
    scrollingElement,
    defaultView: {
      innerHeight: viewportHeight,
      innerWidth: viewportWidth,
    },
  }
  const anchorElement = {
    isConnected: true,
    ownerDocument,
    getBoundingClientRect() {
      return {
        top: summaryTop,
        bottom: summaryTop + summaryHeight,
        height: summaryHeight,
      }
    },
    closest(selector) {
      return selector === 'article' ? rowElement : null
    },
  }

  return { anchorElement, scrollingElement }
}
```

再加入：

```js
test('expand near the viewport bottom reveals the first detail screen', async () => {
  const fixture = createExpandFixture()
  let updateFinished = false
  let frameFinished = false
  const preserve = createModelDetailViewportAnchor({
    waitForUpdate: async () => {
      updateFinished = true
    },
    waitForFrame: async () => {
      assert.equal(updateFinished, true)
      frameFinished = true
    },
  })

  await preserve(fixture.anchorElement, () => {}, { action: 'expand' })

  assert.equal(frameFinished, true)
  assert.equal(fixture.scrollingElement.scrollTop, 947)
})

test('expand keeps the page stable when detail is already visible', async () => {
  const fixture = createExpandFixture({
    summaryTop: 120,
    detailTop: 192,
    detailHeight: 300,
    scrollTop: 400,
    viewportHeight: 720,
  })
  const preserve = createModelDetailViewportAnchor({
    waitForUpdate: async () => {},
    waitForFrame: async () => {},
  })

  await preserve(fixture.anchorElement, () => {}, { action: 'expand' })

  assert.equal(fixture.scrollingElement.scrollTop, 400)
})

test('compact expansion uses the narrow-screen top safe area', async () => {
  const fixture = createExpandFixture({
    summaryTop: 300,
    detailTop: 380,
    detailHeight: 500,
    scrollTop: 500,
    viewportHeight: 720,
    viewportWidth: 520,
  })
  const preserve = createModelDetailViewportAnchor({
    waitForUpdate: async () => {},
    waitForFrame: async () => {},
  })

  await preserve(fixture.anchorElement, () => {}, { action: 'expand' })

  assert.equal(fixture.scrollingElement.scrollTop, 684)
})
```

- [ ] **Step 2: 运行测试并确认 RED**

Run:

```powershell
..\.tools\node\npm.cmd test -- src/features/evaluation/modelDetailViewportAnchor.test.js
```

Expected: FAIL；现有控制器不接受 `waitForFrame` 和 `action: 'expand'`，仍只执行收起锚定。

- [ ] **Step 3: 实现帧等待和展开详情查找**

在 `modelDetailViewportAnchor.js` 加入：

```js
const COMPACT_VIEWPORT_MAX_PX = 860
const COMPACT_EXPAND_TOP_INSET_PX = 64

function defaultWaitForFrame(anchorElement) {
  return new Promise((resolve) => {
    const requestFrame = anchorElement?.ownerDocument?.defaultView?.requestAnimationFrame
    if (typeof requestFrame === 'function') {
      requestFrame(() => resolve())
      return
    }
    resolve()
  })
}

function expandedDetailElement(anchorElement) {
  const rowElement = anchorElement?.closest?.('article')
  return rowElement?.querySelector?.(':scope > .model-row-detail') || null
}

function viewportMetrics(anchorElement, scrollingElement) {
  const view = anchorElement?.ownerDocument?.defaultView
  const viewportHeight = Number.isFinite(view?.innerHeight)
    ? view.innerHeight
    : scrollingElement?.clientHeight
  const viewportWidth = Number.isFinite(view?.innerWidth)
    ? view.innerWidth
    : Number.POSITIVE_INFINITY

  return {
    viewportHeight,
    topInset: viewportWidth <= COMPACT_VIEWPORT_MAX_PX
      ? COMPACT_EXPAND_TOP_INSET_PX
      : DEFAULT_EXPAND_TOP_INSET_PX,
    bottomInset: DEFAULT_EXPAND_BOTTOM_INSET_PX,
  }
}
```

把 controller 参数扩展为：

```js
export function createModelDetailViewportAnchor({
  waitForUpdate,
  waitForFrame = defaultWaitForFrame,
  positionTolerance = DEFAULT_POSITION_TOLERANCE_PX,
} = {}) {
```

并在 `waitForUpdate` 校验后加入：

```js
if (typeof waitForFrame !== 'function') {
  throw new TypeError('waitForFrame must be a function')
}
```

- [ ] **Step 4: 将一次操作分流为展开与收起**

把 `preserveModelDetailViewportAnchor` 改为接受 action：

```js
async function preserveModelDetailViewportAnchor(
  anchorElement,
  applyStateChange,
  { action = 'collapse' } = {},
) {
  const operationId = ++latestOperationId
  const beforeTop = anchorTop(anchorElement)

  if (action === 'collapse') {
    reserveViewportTail(anchorElement)
  }

  applyStateChange()

  if (action === 'expand') {
    await waitForUpdate()

    if (operationId !== latestOperationId || !anchorElement?.isConnected) {
      return
    }

    clearViewportTail()
    await waitForFrame(anchorElement)

    if (operationId !== latestOperationId || !anchorElement?.isConnected) {
      return
    }

    const scrollingElement = anchorElement.ownerDocument?.scrollingElement
    const detailElement = expandedDetailElement(anchorElement)
    if (!scrollingElement || !detailElement) {
      return
    }

    const delta = modelDetailExpandScrollDelta({
      summaryRect: anchorElement.getBoundingClientRect(),
      detailRect: detailElement.getBoundingClientRect(),
      ...viewportMetrics(anchorElement, scrollingElement),
    })

    if (delta >= positionTolerance) {
      scrollingElement.scrollTop += delta
    }
    return
  }

  if (beforeTop === null) {
    releaseViewportTail()
    listenForTailRelease()
    return
  }

  await waitForUpdate()

  if (operationId !== latestOperationId || !anchorElement?.isConnected) {
    releaseViewportTail()
    listenForTailRelease()
    return
  }

  const scrollingElement = anchorElement.ownerDocument?.scrollingElement
  const afterTop = anchorTop(anchorElement)
  if (scrollingElement && afterTop !== null) {
    const positionDelta = afterTop - beforeTop
    if (Math.abs(positionDelta) >= positionTolerance) {
      scrollingElement.scrollTop += positionDelta
    }
  }

  releaseViewportTail()
  listenForTailRelease()
}
```

保留现有 `dispose()`、临时 spacer、被动 scroll listener 和所有收起测试，不重写这部分实现。

- [ ] **Step 5: 运行 controller 测试并确认 GREEN**

Run:

```powershell
..\.tools\node\npm.cmd test -- src/features/evaluation/modelDetailViewportAnchor.test.js
```

Expected: 所有纯函数、展开控制器和既有收起场景通过。

### Task 3: 在组件中传递明确的展开/收起意图

**Files:**
- Modify: `WuwaFrontend/src/features/evaluation/EvaluationBacktest.test.js`
- Modify: `WuwaFrontend/src/features/evaluation/EvaluationBacktest.vue`

- [ ] **Step 1: 先修改组件契约测试**

把测试名改为：

```js
test('submodel disclosure reveals expansion and preserves collapse position', async () => {
```

保留 import、controller 创建和事件转发断言，并把调用断言替换为：

```js
assert.match(source, /const action = expandedModelDetailKey\.value === key \? 'collapse' : 'expand'/)
assert.match(source, /preserveModelDetailViewportAnchor\(event\?\.currentTarget, \(\) => \{[\s\S]+selectedModelDetailKey\.value = expandedModelDetailKey\.value === key \? null : key[\s\S]+\}, \{ action \}\)/)
assert.doesNotMatch(source, /scrollIntoView/)
assert.doesNotMatch(source, /behavior:\s*['"]smooth['"]/)
```

- [ ] **Step 2: 运行组件测试并确认 RED**

Run:

```powershell
..\.tools\node\npm.cmd test -- src/features/evaluation/EvaluationBacktest.test.js
```

Expected: FAIL，因为组件尚未传递 `action`。

- [ ] **Step 3: 更新 `toggleModelDetail`**

在 `EvaluationBacktest.vue` 中替换函数：

```js
function toggleModelDetail(key, event) {
  const action = expandedModelDetailKey.value === key ? 'collapse' : 'expand'
  void preserveModelDetailViewportAnchor(event?.currentTarget, () => {
    selectedModelDetailKey.value = expandedModelDetailKey.value === key ? null : key
  }, { action })
}
```

模板、`aria-expanded`、动态 `aria-label`、`Transition` 和 `finishModelDetailLeave` 保持不变。

- [ ] **Step 4: 运行聚焦测试**

Run:

```powershell
..\.tools\node\npm.cmd test -- src/features/evaluation/modelDetailViewportAnchor.test.js src/features/evaluation/EvaluationBacktest.test.js
```

Expected: controller 与组件测试全部通过；既有收起、暗色详情、hover、focus 和无 leave layout animation 断言无回归。

### Task 4: 浏览器几何验收与完整回归

**Files:**
- Verify: `WuwaFrontend/src/features/evaluation/EvaluationBacktest.vue`
- Verify: `WuwaFrontend/src/features/evaluation/modelDetailViewportAnchor.js`
- Verify: `WuwaFrontend/src/styles/features/evaluation.css`
- Verify: `WuwaFrontend/src/styles/features/evaluation-layout.css`

- [ ] **Step 1: 运行完整前端测试**

Run from `WuwaFrontend`:

```powershell
..\.tools\node\npm.cmd test
```

Expected: exit code `0`，全部前端测试通过。

- [ ] **Step 2: 运行生产构建**

Run:

```powershell
..\.tools\node\npm.cmd run build
```

Expected: exit code `0`，Vite 构建成功，无新增依赖或 bundle 错误。

- [ ] **Step 3: 在真实评估页面验证桌面行为**

使用当前本地开发地址和真实评估数据，在 `1440×900` 与 `1180×800`、浅色与深色模式分别执行：

1. 把“近期序列”摘要行滚到视口下半部。
2. 记录展开前：

```js
const summary = document.querySelector('article:not(.expanded) .model-bar-summary')
const before = {
  scrollY: window.scrollY,
  summaryTop: summary.getBoundingClientRect().top,
}
```

3. 点击展开，在一个动画帧后记录：

```js
const detail = summary.closest('article').querySelector(':scope > .model-row-detail')
const after = {
  scrollY: window.scrollY,
  summaryTop: summary.getBoundingClientRect().top,
  detailTop: detail.getBoundingClientRect().top,
  detailBottom: detail.getBoundingClientRect().bottom,
  viewportBottom: window.innerHeight - 24,
}
```

验收：

- 如果展开前详情首屏空间不足，`after.scrollY > before.scrollY`。
- 桌面端 `after.summaryTop >= 87px`；不得被固定导航遮挡。
- 详情已使用当前安全视口能提供的最大首屏空间，或详情本身已全部可见。
- 不出现第二层纵向滚动条。
- 暗色模式与浅色模式的几何结果一致。

- [ ] **Step 4: 验证无需滚动、切换和收起回归**

继续验证：

1. 在页面上方展开一个本来就完整可见的短详情：`scrollY` 变化小于 `1px`。
2. 展开一个模型后点击另一个模型：最终锚定新点击的摘要行，旧详情不会决定滚动位置。
3. 展开后手动向下滚动再收起：摘要行收起前后的 `top` 差小于 `1px`。
4. 在页面底部收起：现有临时 spacer 正常释放，不留下永久空白。
5. 使用 Enter 和 Space 展开/收起：行为与指针点击一致，焦点保留在 disclosure button。
6. 快速连续点击两个模型：只有最后一次操作可以补偿滚动。

- [ ] **Step 5: 验证紧凑屏和减少动态效果**

在 `520×900` 验证：

- 展开后摘要行顶部不低于 `63px`。
- 模型详情保持单列，无横向页面溢出。
- 页面是唯一纵向滚动容器。

启用 `prefers-reduced-motion: reduce` 后验证：

- enter transition 关闭。
- 展开揭示仍然立即完成。
- 不出现平滑滚动或持续位置动画。

- [ ] **Step 6: 检查差异和仓库卫生**

Run from repository root:

```powershell
git diff --check
git status --short
git diff --stat
```

Expected:

- `git diff --check` 无输出。
- 本任务只新增控制器、控制器测试、组件调用、组件测试和实施记录相关变化。
- 不新增 `dist/`、日志、本地数据库、缓存或运行态文件。
- 保留任务开始前已经存在的未提交修改，不覆盖或回退。

### Task 5: 写入实际实施与验收记录

**Files:**
- Create: `docs/archive/2026-07-19-evaluation-model-detail-expand-reveal-implementation.md`

- [ ] **Step 1: 按实际结果写归档记录**

归档必须包含以下已核实内容，不填写预估值：

```markdown
# 评估页子模型详情展开揭示实施记录

## 目标

说明展开时条件式最小滚动、收起时摘要锚定不变的最终行为。

## 根因

记录旧实现只保护点击摘要位置，没有在 DOM 展开后检查详情首屏是否被视口底部裁切。

## 实施方式

记录 expand / collapse 分流、几何计算、桌面与紧凑屏顶部安全区、即时滚动和临时 spacer 的关系。

## 修改文件

列出实际修改文件。

## 自动化验证

写入实际测试命令、通过数量、构建结果和 git diff 检查结果。

## 浏览器几何验证

写入实际视口、主题、展开前后 scrollY、摘要 top、详情可见高度及收起前后 top 差值。

## 限制

只记录实际未覆盖的环境或场景；全部覆盖时明确写“无已知未覆盖项”。

## 长期规范

说明本次落实既有滚动、响应式和减少动态效果规则，未改变 API、数据契约或长期视觉体系。
```

- [ ] **Step 2: 最终复查**

Run:

```powershell
git diff --check
git status --short
```

Expected: 无 whitespace 错误，归档中的测试数量和浏览器数据与实际输出一致。

## 最终验收清单

- [ ] 展开后至少能看到摘要行、tabs、判断摘要和当前视口可容纳的详情首屏。
- [ ] 详情完整可见时不产生多余滚动。
- [ ] 长详情不会把摘要行推到固定导航下方。
- [ ] 收起行为与现有已验证版本一致。
- [ ] 快速切换只响应最后一次操作。
- [ ] 键盘和指针交互一致。
- [ ] 浅色、深色具有相同信息结构和几何行为。
- [ ] 1440、1180、520 宽度无新增溢出。
- [ ] 没有卡片内部纵向滚动。
- [ ] 没有 `scrollIntoView` 的不可控跳转，也没有 smooth scroll。
- [ ] 没有修改 API、评估数据、模型算法或子模型详情内容结构。
- [ ] 聚焦测试、完整测试、生产构建和 `git diff --check` 全部通过。
