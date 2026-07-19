# Evaluation Model Judgement Derived Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every child-model judgement summary derive its hue from the containing model card while preserving existing model data colors, status semantics, layout, and interaction.

**Architecture:** Add evaluation-local surface tokens to `.model-insight-card` and use them as the single source for card backgrounds and nested judgement surfaces. Keep the existing `--model-accent` data-graphics channel unchanged, lock the separation with a static design test, then synchronize the approved rule into the design-system documents.

**Tech Stack:** Vue 3, feature-owned CSS, Node.js built-in test runner, Vite, Markdown, JSON.

---

## File map

- Modify `WuwaFrontend/src/design-state-accent.test.js`: lock the new surface-token mapping, exact light/dark mix strengths, and separation from `--model-accent`.
- Modify `WuwaFrontend/src/styles/features/evaluation.css`: define per-card surface tokens and derive card/judgement surfaces from them.
- Modify `DESIGN.md`: record the long-term model-card surface derivation rule.
- Modify `.impeccable/design.json`: mirror the new named rule in the structured design system.
- Create `docs/archive/2026-07-19-evaluation-model-judgement-derived-surface-implementation.md`: record delivered behavior and verification evidence.

### Task 1: Lock the surface derivation contract

**Files:**
- Modify: `WuwaFrontend/src/design-state-accent.test.js:149-161`
- Test: `WuwaFrontend/src/design-state-accent.test.js`

- [ ] **Step 1: Add a failing static design test**

Insert this test after `evaluation cards use restrained perimeters while Bayes paths retain semantic markers`:

```js
test('model judgement surfaces derive from their parent card surface family', async () => {
  const evaluationStyle = await read('./styles/features/evaluation.css')
  const card = bodiesFor(evaluationStyle, '.model-insight-card')
  const bayes = bodiesFor(evaluationStyle, '.model-insight-card.model-bayes')
  const markov = bodiesFor(evaluationStyle, '.model-insight-card.model-markov')
  const cycle = bodiesFor(evaluationStyle, '.model-insight-card.model-cycle')
  const disabled = bodiesFor(evaluationStyle, '.model-insight-card.disabled')
  const summary = bodiesFor(evaluationStyle, '.model-judgement-summary')
  const label = bodiesFor(evaluationStyle, '.model-judgement-label')
  const darkCard = bodiesFor(evaluationStyle, '.app-shell.theme-dark .model-insight-card')
  const darkSummary = bodiesFor(evaluationStyle, '.app-shell.theme-dark .model-judgement-summary')
  const darkLabel = bodiesFor(evaluationStyle, '.app-shell.theme-dark .model-judgement-label')

  assert.match(card, /--model-surface-accent:\s*#1769d2;/)
  assert.match(card, /--model-card-tint:\s*7%;/)
  assert.match(card, /color-mix\(in srgb, var\(--model-surface-accent\) var\(--model-card-tint\), transparent\)/)
  assert.match(bayes, /--model-surface-accent:\s*#7156be;/)
  assert.match(bayes, /--model-card-tint:\s*9%;/)
  assert.match(markov, /--model-surface-accent:\s*#ffb020;/)
  assert.match(markov, /--model-card-tint:\s*11%;/)
  assert.match(cycle, /--model-surface-accent:\s*#30a46c;/)
  assert.match(cycle, /--model-card-tint:\s*10%;/)
  assert.match(disabled, /--model-surface-accent:\s*#677481;/)
  assert.match(disabled, /--model-card-tint:\s*8%;/)

  assert.match(summary, /var\(--model-surface-accent\) 10%, #d8e2ea/)
  assert.match(summary, /var\(--model-surface-accent\) 4%, #f7f9fb/)
  assert.match(label, /var\(--model-surface-accent\) 46%, #1e2b34/)
  assert.doesNotMatch(summary, /var\(--model-accent\)/)
  assert.doesNotMatch(label, /var\(--model-accent\)/)

  assert.match(darkCard, /var\(--model-surface-accent\) 13%, transparent/)
  assert.match(darkSummary, /var\(--model-surface-accent\) 16%, var\(--hairline-soft\)/)
  assert.match(darkSummary, /var\(--model-surface-accent\) 6%, var\(--surface-soft\)/)
  assert.match(darkLabel, /var\(--model-surface-accent\) 46%, var\(--ink-deep\)/)

  assert.match(bodiesFor(evaluationStyle, '.model-bars-large b'), /var\(--model-accent\)/)
})
```

- [ ] **Step 2: Run the targeted test and verify the red state**

Run:

```powershell
cd WuwaFrontend
..\.tools\node\node.exe --test src/design-state-accent.test.js
```

Expected: FAIL in `model judgement surfaces derive from their parent card surface family` because `--model-surface-accent` and `--model-card-tint` do not exist yet.

- [ ] **Step 3: Commit the failing contract test**

```powershell
git add -- WuwaFrontend/src/design-state-accent.test.js
git commit -m "test: define model judgement surface derivation"
```

### Task 2: Derive card and judgement surfaces from one local token

**Files:**
- Modify: `WuwaFrontend/src/styles/features/evaluation.css:362-396`
- Modify: `WuwaFrontend/src/styles/features/evaluation.css:1278-1331`
- Modify: `WuwaFrontend/src/styles/features/evaluation.css:1489-1513`
- Test: `WuwaFrontend/src/design-state-accent.test.js`

- [ ] **Step 1: Add the default surface token and consume it in the card background**

Replace the opening of `.model-insight-card` with:

```css
.model-insight-card {
  --model-accent: #31a872;
  --model-accent-soft: rgba(44, 159, 112, 0.1);
  --model-surface-accent: #1769d2;
  --model-card-tint: 7%;
  --model-chart-col: minmax(620px, 860px);
  position: relative;
  overflow: hidden;
  border: 1px solid #dce5ec;
  border-radius: 14px;
  padding: 20px;
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--model-surface-accent) var(--model-card-tint), transparent),
      transparent 34%
    ),
    #fbfcfe;
  box-shadow: 0 12px 30px rgba(26, 39, 52, 0.05);
}
```

- [ ] **Step 2: Replace per-model background declarations with surface tokens**

Use these model selectors:

```css
.model-insight-card.model-bayes {
  --model-surface-accent: #7156be;
  --model-card-tint: 9%;
}

.model-insight-card.model-rule {
  --model-accent: #1769d2;
  --model-accent-soft: rgba(23, 105, 210, 0.09);
}

.model-insight-card.model-markov {
  --model-accent: #d99a1b;
  --model-accent-soft: rgba(217, 154, 27, 0.11);
  --model-surface-accent: #ffb020;
  --model-card-tint: 11%;
}

.model-insight-card.model-cycle {
  --model-accent: #2c9f70;
  --model-accent-soft: rgba(44, 159, 112, 0.1);
  --model-surface-accent: #30a46c;
  --model-card-tint: 10%;
}

.model-insight-card.model-context {
  --model-accent: #6f7f8e;
  --model-accent-soft: rgba(103, 116, 129, 0.08);
}

.model-insight-card.disabled {
  --model-accent: #7d8b98;
  --model-accent-soft: rgba(103, 116, 129, 0.08);
  --model-surface-accent: #677481;
  --model-card-tint: 8%;
}
```

This preserves the existing light card hue and strength while removing duplicate background formulas. Context continues to inherit the current default blue card surface; disabled overrides every model with gray.

- [ ] **Step 3: Derive light judgement surfaces from the parent surface token**

Keep the existing geometry in `.model-judgement-summary` and replace only the color declarations:

```css
  border: 1px solid color-mix(in srgb, var(--model-surface-accent) 10%, #d8e2ea);
  color: #334d60;
  background: color-mix(in srgb, var(--model-surface-accent) 4%, #f7f9fb);
```

Replace the `.model-judgement-label` color with:

```css
  color: color-mix(in srgb, var(--model-surface-accent) 46%, #1e2b34);
```

- [ ] **Step 4: Align dark card and judgement surfaces**

In `.app-shell.theme-dark .model-insight-card`, replace the first gradient color source with:

```css
color-mix(in srgb, var(--model-surface-accent) 13%, transparent)
```

Replace the dark judgement rules with:

```css
.app-shell.theme-dark .model-judgement-summary {
  border-color: color-mix(in srgb, var(--model-surface-accent) 16%, var(--hairline-soft));
  color: #b9cad6;
  background: color-mix(in srgb, var(--model-surface-accent) 6%, var(--surface-soft));
}

.app-shell.theme-dark .model-judgement-label {
  color: color-mix(in srgb, var(--model-surface-accent) 46%, var(--ink-deep));
}
```

- [ ] **Step 5: Run targeted tests and verify the green state**

Run:

```powershell
cd WuwaFrontend
..\.tools\node\node.exe --test src/design-state-accent.test.js src/features/evaluation/EvaluationBacktest.test.js
```

Expected: PASS for both test files, including the new surface derivation contract and existing disclosure/layout guards.

- [ ] **Step 6: Commit the CSS implementation**

```powershell
git add -- WuwaFrontend/src/styles/features/evaluation.css
git commit -m "style: derive model judgement surfaces from cards"
```

### Task 3: Synchronize the long-term design rule

**Files:**
- Modify: `DESIGN.md:398-403`
- Modify: `.impeccable/design.json`

- [ ] **Step 1: Add the rule to `DESIGN.md`**

Under `### Prediction and evaluation graphics`, add:

```markdown
- 评估子模型卡片使用 feature-local `--model-surface-accent` 作为卡片与内部判断摘要的共同表面色来源；不同模型保留不同色相，但背景、边框和标签必须使用同一派生公式与视觉强度。`--model-accent` 继续只承担数据图形语义，不能与卡片表面色混为同一颜色表。
```

- [ ] **Step 2: Mirror the rule in `.impeccable/design.json`**

Add this object to `narrative.rules` immediately after `The Token Layering Rule`:

```json
{
  "name": "The Model Surface Derivation Rule",
  "body": "评估子模型卡片使用 feature-local --model-surface-accent 作为卡片与内部判断摘要的共同表面色来源；不同模型保留不同色相，但背景、边框和标签必须使用同一派生公式与视觉强度。--model-accent 继续只承担数据图形语义，不能与卡片表面色混为同一颜色表。",
  "section": "components"
}
```

- [ ] **Step 3: Validate structured design JSON and documentation diff**

Run:

```powershell
.\.tools\node\node.exe -e "JSON.parse(require('fs').readFileSync('.impeccable/design.json','utf8')); console.log('DESIGN_JSON_OK')"
git diff --check -- DESIGN.md .impeccable/design.json
```

Expected:

```text
DESIGN_JSON_OK
```

`git diff --check` exits with code `0`.

- [ ] **Step 4: Commit the synchronized design rule**

```powershell
git add -- DESIGN.md .impeccable/design.json
git commit -m "docs: define model surface derivation rule"
```

### Task 4: Run full verification and record delivery

**Files:**
- Create: `docs/archive/2026-07-19-evaluation-model-judgement-derived-surface-implementation.md`

- [ ] **Step 1: Run the full frontend test suite**

Run:

```powershell
cd WuwaFrontend
..\.tools\node\npm.cmd test
```

Expected: all frontend tests pass with `0` failures.

- [ ] **Step 2: Run the production build**

Run:

```powershell
cd WuwaFrontend
..\.tools\node\npm.cmd run build
```

Expected: Vite production build completes successfully.

- [ ] **Step 3: Perform visual verification**

Use the existing authenticated local evaluation page if available. Verify:

- Rule judgement surface follows the blue card.
- Bayes judgement surface follows the purple card.
- Markov judgement surface follows the amber card without reading as a warning.
- Cycle judgement surface follows the green card.
- Context judgement surface follows the existing blue card.
- Disabled details derive gray surfaces.
- Dark mode preserves the same model hue relationship.
- Markov timeline, Bayes paths, rule deviation, cycle window, and status chips retain their existing colors.
- Expanding/collapsing details does not shift the preserved viewport anchor.
- No horizontal overflow appears at the existing desktop and narrow breakpoints.

If no authenticated evaluation session is available, do not create accounts or fake PostgreSQL data. Record that limitation and rely on the static contract, component regression tests, and production build.

- [ ] **Step 4: Create the implementation record**

Create `docs/archive/2026-07-19-evaluation-model-judgement-derived-surface-implementation.md` with:

```markdown
# 评估子模型判断摘要同源表面实施记录

## 目标

让每个子模型判断摘要从所属卡片的表面色派生，同时保持数据图形色、状态语义、布局和交互不变。

## 实际完成内容

- 新增评估 feature-local `--model-surface-accent` 与 `--model-card-tint`。
- 卡片背景和判断摘要改为消费同一个表面身份色。
- Bayes 判断摘要与紫色卡片统一，Markov 判断摘要保留更克制的琥珀关系。
- `--model-accent` 继续服务数据图形，没有改变模型计算或图表语义。
- 浅色与深色主题使用等价派生规则。

## 修改范围

- `WuwaFrontend/src/styles/features/evaluation.css`
- `WuwaFrontend/src/design-state-accent.test.js`
- `DESIGN.md`
- `.impeccable/design.json`

## API、数据库与业务逻辑

无变化。未修改 API、数据库、模型权重、命中率、Loss、排序、状态判断或滚动锚点逻辑。

## 验证

- `..\.tools\node\node.exe --test src/design-state-accent.test.js src/features/evaluation/EvaluationBacktest.test.js`：通过。
- `..\.tools\node\npm.cmd test`：通过，0 项失败。
- `..\.tools\node\npm.cmd run build`：通过。
- `git diff --check`：通过。

## 视觉验证

按执行时可用的已认证评估会话记录实际检查结果；如果没有可用会话，明确记录未创建账号或伪造业务数据，并说明静态守卫、组件回归和生产构建已经覆盖的范围。
```

- [ ] **Step 5: Run repository hygiene checks**

Run:

```powershell
git status --short
git diff --check
```

Expected: only the implementation record is uncommitted and `git diff --check` exits with code `0`.

- [ ] **Step 6: Commit the implementation record**

```powershell
git add -- docs/archive/2026-07-19-evaluation-model-judgement-derived-surface-implementation.md
git commit -m "docs: record model judgement surface delivery"
```

- [ ] **Step 7: Confirm the final branch state**

Run:

```powershell
git status --short --branch
git log -5 --oneline
```

Expected: clean working tree on `codex/sample-stage-weight-guide`, with the test, CSS, design-system, and implementation-record commits visible in recent history.
