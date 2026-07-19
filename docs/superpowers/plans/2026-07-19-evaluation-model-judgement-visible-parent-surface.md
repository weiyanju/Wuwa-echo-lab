# Evaluation Model Judgement Visible Parent Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each model judgement summary inherit the surface color of the visible outer backtest row: green for highest hit rate, blue for a normal expanded row, and gray for a disabled row.

**Architecture:** Move the feature-local `--model-surface-accent` owner from the transparent inner `.model-insight-card` to the visible `.model-bars > article` disclosure row. Let `.model-row-detail`, `.model-judgement-summary`, and `.model-judgement-label` inherit that state token, while keeping `--model-accent` exclusively responsible for model-specific charts and data graphics.

**Tech Stack:** Vue 3 SFC templates, feature-scoped CSS, CSS custom properties and `color-mix()`, Node.js built-in test runner, Vite.

**Approved design:** `docs/superpowers/specs/2026-07-19-evaluation-model-judgement-visible-parent-surface-design.md`

---

## File Structure

- `WuwaFrontend/src/design-state-accent.test.js`
  - Replace the obsolete isolated-card color guard with a real disclosure-row ownership guard.
- `WuwaFrontend/src/styles/features/evaluation.css`
  - Own the state token on the outer row, remove inner model identity surface overrides, and derive the expanded detail and judgement surfaces from the inherited token.
- `WuwaFrontend/src/styles/features/evaluation-layout.css`
  - Derive expanded and best summary-row backgrounds from the same inherited token.
- `WuwaFrontend/src/features/evaluation/EvaluationBacktest.test.js`
  - Preserve the existing outer state-class and transparent inline-detail structure contract.
- `DESIGN.md`
  - Replace the inaccurate model-identity surface rule with the visible-parent state rule.
- `.impeccable/design.json`
  - Mirror the corrected long-term design rule.
- `docs/archive/2026-07-19-evaluation-model-judgement-derived-surface-implementation.md`
  - Mark the earlier delivery record as superseded.
- `docs/archive/2026-07-19-evaluation-model-judgement-visible-parent-surface-implementation.md`
  - Record the corrective implementation and verification evidence.

No API, database, Python, model-label, model-weight, or evaluation-algorithm files change.

---

### Task 1: Add a failing regression guard for the real nested disclosure structure

**Files:**
- Modify: `WuwaFrontend/src/design-state-accent.test.js:125-163`
- Modify: `WuwaFrontend/src/features/evaluation/EvaluationBacktest.test.js:46-63`

- [ ] **Step 1: Replace the isolated-card surface test**

Replace the existing `model judgement surfaces derive from their parent card surface family` test in `WuwaFrontend/src/design-state-accent.test.js` with:

```js
test('model judgement surfaces inherit the visible disclosure row state', async () => {
  const [evaluationStyle, layoutStyle] = await Promise.all([
    read('./styles/features/evaluation.css'),
    read('./styles/features/evaluation-layout.css'),
  ])
  const row = bodiesFor(evaluationStyle, '.model-bars > article')
  const bestRow = bodiesFor(evaluationStyle, '.model-bars > article.best')
  const disabledRow = bodiesFor(evaluationStyle, '.model-bars > article.disabled')
  const detail = bodiesFor(evaluationStyle, '.model-row-detail')
  const darkDetail = bodiesFor(evaluationStyle, '.app-shell.theme-dark .model-row-detail')
  const bayes = bodiesFor(evaluationStyle, '.model-insight-card.model-bayes')
  const markov = bodiesFor(evaluationStyle, '.model-insight-card.model-markov')
  const cycle = bodiesFor(evaluationStyle, '.model-insight-card.model-cycle')
  const innerDisabled = bodiesFor(evaluationStyle, '.model-insight-card.disabled')
  const summary = bodiesFor(evaluationStyle, '.model-judgement-summary')
  const label = bodiesFor(evaluationStyle, '.model-judgement-label')
  const darkSummary = bodiesFor(evaluationStyle, '.app-shell.theme-dark .model-judgement-summary')
  const darkLabel = bodiesFor(evaluationStyle, '.app-shell.theme-dark .model-judgement-label')
  const expandedSummary = bodiesFor(
    layoutStyle,
    '.evaluation-panel .model-backtest-card .model-bars > article.expanded > .model-bar-summary',
  )
  const bestSummary = bodiesFor(
    layoutStyle,
    '.evaluation-panel .model-backtest-card .model-bars > article.best > .model-bar-summary',
  )

  assert.match(row, /--model-surface-accent:\s*#1769d2;/)
  assert.match(bestRow, /--model-surface-accent:\s*#2c9f70;/)
  assert.match(disabledRow, /--model-surface-accent:\s*#677481;/)

  for (const modelIdentityRule of [bayes, markov, cycle, innerDisabled]) {
    assert.doesNotMatch(modelIdentityRule, /--model-surface-accent/)
    assert.doesNotMatch(modelIdentityRule, /--model-card-tint/)
  }

  assert.match(detail, /var\(--model-surface-accent,\s*#1769d2\)/)
  assert.match(darkDetail, /var\(--model-surface-accent,\s*#5da8ff\)/)
  assert.doesNotMatch(detail, /rgba\(44,\s*159,\s*112/)
  assert.doesNotMatch(darkDetail, /rgba\(55,\s*179,\s*127/)

  assert.match(expandedSummary, /var\(--model-surface-accent,\s*#1769d2\)/)
  assert.match(bestSummary, /var\(--model-surface-accent,\s*#2c9f70\)/)
  assert.match(summary, /var\(--model-surface-accent,\s*#1769d2\) 10%, #d8e2ea/)
  assert.match(summary, /var\(--model-surface-accent,\s*#1769d2\) 4%, #f7f9fb/)
  assert.match(label, /var\(--model-surface-accent,\s*#1769d2\) 46%, #1e2b34/)
  assert.match(darkSummary, /var\(--model-surface-accent,\s*#5da8ff\) 16%, var\(--hairline-soft\)/)
  assert.match(darkSummary, /var\(--model-surface-accent,\s*#5da8ff\) 6%, var\(--surface-soft\)/)
  assert.match(darkLabel, /var\(--model-surface-accent,\s*#5da8ff\) 46%, var\(--ink-deep\)/)

  assert.match(bodiesFor(evaluationStyle, '.model-bars-large b'), /var\(--model-accent\)/)
})
```

- [ ] **Step 2: Strengthen the component ownership contract**

Add this test after `model detail summary uses one native disclosure button without nested controls` in `WuwaFrontend/src/features/evaluation/EvaluationBacktest.test.js`:

```js
test('visible disclosure rows own state while inline model cards only identify data graphics', async () => {
  const source = await readFile(new URL('./EvaluationBacktest.vue', import.meta.url), 'utf8')
  const style = await readFile(new URL('../../styles/features/evaluation.css', import.meta.url), 'utf8')

  assert.match(
    source,
    /:class="\{ best: row\.isBest, expanded: expandedModelDetailKey === row\.key, disabled: row\.disabled \}"/,
  )
  assert.match(source, /class="model-row-detail"/)
  assert.match(source, /class="model-insight-card inline-model-insight"/)
  assert.match(source, /:class="modelInsightClass\(model\)"/)
  assert.match(style, /\.model-row-detail \.model-insight-card \{[^}]*background: transparent;/)
  assert.doesNotMatch(source, /--model-surface-accent/)
})
```

- [ ] **Step 3: Run the focused tests to verify RED**

Run from `WuwaFrontend`:

```powershell
..\.tools\node\node.exe --test src\design-state-accent.test.js src\features\evaluation\EvaluationBacktest.test.js
```

Expected: FAIL. The first meaningful failure reports that `.model-bars > article` does not define `--model-surface-accent: #1769d2`.

- [ ] **Step 4: Commit the failing regression guard**

```powershell
git add -- WuwaFrontend/src/design-state-accent.test.js WuwaFrontend/src/features/evaluation/EvaluationBacktest.test.js
git commit -m "test: expose judgement surface ownership bug"
```

---

### Task 2: Move surface ownership to the visible disclosure row

**Files:**
- Modify: `WuwaFrontend/src/styles/features/evaluation.css:318-330`
- Modify: `WuwaFrontend/src/styles/features/evaluation.css:362-395`
- Modify: `WuwaFrontend/src/styles/features/evaluation.css:1278-1332`
- Modify: `WuwaFrontend/src/styles/features/evaluation.css:1491-1515`
- Modify: `WuwaFrontend/src/styles/features/evaluation.css:3161-3187`
- Modify: `WuwaFrontend/src/styles/features/evaluation.css:3406-3440`
- Modify: `WuwaFrontend/src/styles/features/evaluation-layout.css:135-143`
- Modify: `WuwaFrontend/src/styles/features/evaluation-layout.css:177-185`
- Test: `WuwaFrontend/src/design-state-accent.test.js`
- Test: `WuwaFrontend/src/features/evaluation/EvaluationBacktest.test.js`

- [ ] **Step 1: Define the state token on the outer row**

Add direct-child state-token blocks immediately before the existing `.model-bars article` geometry rule:

```css
.model-bars > article {
  --model-surface-accent: #1769d2;
}

.model-bars > article.best {
  --model-surface-accent: #2c9f70;
}

.model-bars > article.disabled,
.model-bars > article.disabled.expanded {
  --model-surface-accent: #677481;
}

.model-bars article {
  position: relative;
  display: grid;
  gap: 7px;
  padding: 10px 0;
  --model-row-top: 0px;
}

.model-bars article.best {
  --model-row-top: 9px;
  padding: 10px 0;
}

.model-bars article.disabled,
.model-bars article.disabled.expanded {
  box-shadow: none;
}
```

Keep the existing `.expanded` and `.best.expanded` geometry unchanged. The direct-child combinator is mandatory: the broad existing `.model-bars article` selector also matches nested chart articles and the transparent `.model-insight-card`; assigning the token there would overwrite the inherited green or gray state with the default blue. Place the direct-child disabled override after the direct-child best override so disabled remains the defensive highest-priority state.

- [ ] **Step 2: Remove model identity surface ownership from the transparent inner card**

Change the base card and model-specific rules to:

```css
.model-insight-card {
  --model-accent: #31a872;
  --model-accent-soft: rgba(44, 159, 112, 0.1);
  --model-chart-col: minmax(620px, 860px);
  position: relative;
  overflow: hidden;
  border: 1px solid #dce5ec;
  border-radius: 14px;
  padding: 20px;
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--model-surface-accent, #1769d2) 7%, transparent),
      transparent 34%
    ),
    #fbfcfe;
  box-shadow: 0 12px 30px rgba(26, 39, 52, 0.05);
}

.model-insight-card.model-rule {
  --model-accent: #1769d2;
  --model-accent-soft: rgba(23, 105, 210, 0.09);
}

.model-insight-card.model-markov {
  --model-accent: #d99a1b;
  --model-accent-soft: rgba(217, 154, 27, 0.11);
}

.model-insight-card.model-cycle {
  --model-accent: #2c9f70;
  --model-accent-soft: rgba(44, 159, 112, 0.1);
}

.model-insight-card.model-context {
  --model-accent: #6f7f8e;
  --model-accent-soft: rgba(103, 116, 129, 0.08);
}

.model-insight-card.disabled {
  --model-accent: #7d8b98;
  --model-accent-soft: rgba(103, 116, 129, 0.08);
}
```

Delete the now-empty `.model-insight-card.model-bayes` rule. Do not change Bayes path colors; they are owned by the existing Bayes chart selectors.

- [ ] **Step 3: Make the visible detail surface consume the inherited token**

Replace the light `.model-row-detail` colors with:

```css
.model-row-detail {
  box-sizing: border-box;
  overflow: hidden;
  border-top: 1px solid color-mix(
    in srgb,
    var(--model-surface-accent, #1769d2) 16%,
    #dce5ec
  );
  margin: 7px 0 0;
  border-bottom: 1px solid color-mix(
    in srgb,
    var(--model-surface-accent, #1769d2) 12%,
    #dce5ec
  );
  padding: 8px calc(var(--model-action-col) + var(--model-col-gap) + 10px) 12px 18px;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--model-surface-accent, #1769d2) 4%, transparent),
    transparent
  );
}
```

Replace the dark `.app-shell.theme-dark .model-row-detail` colors with:

```css
.app-shell.theme-dark .model-row-detail {
  overflow: hidden;
  border-top-color: color-mix(
    in srgb,
    var(--model-surface-accent, #5da8ff) 24%,
    var(--hairline-soft)
  );
  border-bottom-color: color-mix(
    in srgb,
    var(--model-surface-accent, #5da8ff) 18%,
    var(--hairline-soft)
  );
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--model-surface-accent, #5da8ff) 8%, rgba(18, 30, 40, 0.24)),
      rgba(18, 30, 40, 0.24)
    );
}
```

- [ ] **Step 4: Give every consumer an explicit theme fallback**

Update the dark standalone card and judgement rules:

```css
.app-shell.theme-dark .model-insight-card {
  color: #cbd8e2;
  background:
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--model-surface-accent, #5da8ff) 13%, transparent),
      transparent 36%
    ),
    linear-gradient(180deg, rgba(29, 44, 56, 0.94), rgba(22, 35, 45, 0.96)),
    var(--surface-soft);
}

.app-shell.theme-dark .model-judgement-summary {
  border-color: color-mix(
    in srgb,
    var(--model-surface-accent, #5da8ff) 16%,
    var(--hairline-soft)
  );
  color: #b9cad6;
  background: color-mix(
    in srgb,
    var(--model-surface-accent, #5da8ff) 6%,
    var(--surface-soft)
  );
}

.app-shell.theme-dark .model-judgement-label {
  color: color-mix(
    in srgb,
    var(--model-surface-accent, #5da8ff) 46%,
    var(--ink-deep)
  );
}
```

Update the light judgement rules without changing geometry:

```css
.model-judgement-summary {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  gap: 8px;
  margin: 0;
  border: 1px solid color-mix(
    in srgb,
    var(--model-surface-accent, #1769d2) 10%,
    #d8e2ea
  );
  border-radius: 10px;
  padding: 8px 10px;
  color: #334d60;
  background: color-mix(
    in srgb,
    var(--model-surface-accent, #1769d2) 4%,
    #f7f9fb
  );
  font-size: var(--text-label);
  font-weight: var(--weight-supporting);
  line-height: var(--leading-body);
}

.model-judgement-label {
  margin-top: 1px;
  color: color-mix(
    in srgb,
    var(--model-surface-accent, #1769d2) 46%,
    #1e2b34
  );
  font-size: var(--text-caption);
  font-weight: var(--weight-control);
  line-height: var(--leading-label);
  letter-spacing: var(--tracking-cjk);
  white-space: nowrap;
}
```

- [ ] **Step 5: Derive the visible summary-row background from the same token**

In `evaluation-layout.css`, replace the light hover/expanded/best backgrounds with:

```css
.evaluation-panel .model-backtest-card .model-bars > article > .model-bar-summary:hover,
.evaluation-panel .model-backtest-card .model-bars > article.expanded > .model-bar-summary {
  background: color-mix(
    in srgb,
    var(--model-surface-accent, #1769d2) 3.5%,
    transparent
  );
}

.evaluation-panel .model-backtest-card .model-bars > article.best > .model-bar-summary {
  background: color-mix(
    in srgb,
    var(--model-surface-accent, #2c9f70) 3.5%,
    transparent
  );
}
```

Replace the dark hover/expanded/best backgrounds with:

```css
.app-shell.theme-dark .evaluation-panel .model-backtest-card .model-bars > article > .model-bar-summary:hover,
.app-shell.theme-dark .evaluation-panel .model-backtest-card .model-bars > article.expanded > .model-bar-summary {
  background: color-mix(
    in srgb,
    var(--model-surface-accent, #5da8ff) 10%,
    transparent
  );
}

.app-shell.theme-dark .evaluation-panel .model-backtest-card .model-bars > article.best > .model-bar-summary {
  background: color-mix(
    in srgb,
    var(--model-surface-accent, #35ad7b) 10%,
    transparent
  );
}
```

Hover uses the row’s existing token but does not mutate it, so hovering cannot recolor an already rendered judgement summary.

- [ ] **Step 6: Run the focused tests to verify GREEN**

Run from `WuwaFrontend`:

```powershell
..\.tools\node\node.exe --test src\design-state-accent.test.js src\features\evaluation\EvaluationBacktest.test.js
```

Expected:

```text
tests 22
pass 22
fail 0
```

- [ ] **Step 7: Commit the CSS ownership fix**

```powershell
git add -- WuwaFrontend/src/styles/features/evaluation.css WuwaFrontend/src/styles/features/evaluation-layout.css
git commit -m "fix: follow visible model row surface"
```

---

### Task 3: Synchronize the corrected long-term design rule

**Files:**
- Modify: `DESIGN.md:403`
- Modify: `.impeccable/design.json`

- [ ] **Step 1: Replace the inaccurate `DESIGN.md` rule**

Replace the existing evaluation model surface bullet with:

```markdown
- 评估子模型回测的 feature-local `--model-surface-accent` 由用户实际看到的外层 disclosure 行状态拥有：普通展开为蓝色、最高命中为绿色、未启用为灰色；展开详情与内部判断摘要继承同一表面色。`--model-accent` 继续只承担模型数据图形语义，模型身份色不得覆盖可见父卡片的状态表面。
```

- [ ] **Step 2: Replace the structured narrative rule**

In `.impeccable/design.json`, replace `The Model Surface Derivation Rule` with:

```json
{
  "name": "The Visible Model Surface Rule",
  "body": "评估子模型回测的 feature-local --model-surface-accent 由用户实际看到的外层 disclosure 行状态拥有：普通展开为蓝色、最高命中为绿色、未启用为灰色；展开详情与内部判断摘要继承同一表面色。--model-accent 继续只承担模型数据图形语义，模型身份色不得覆盖可见父卡片的状态表面。",
  "section": "components"
}
```

- [ ] **Step 3: Validate documentation and structured JSON**

Run from the repository root:

```powershell
.\.tools\node\node.exe -e "JSON.parse(require('fs').readFileSync('.impeccable/design.json','utf8')); console.log('DESIGN_JSON_OK')"
git diff --check -- DESIGN.md .impeccable/design.json
```

Expected:

```text
DESIGN_JSON_OK
```

`git diff --check` exits with code `0`.

- [ ] **Step 4: Commit the corrected long-term rule**

```powershell
git add -- DESIGN.md .impeccable/design.json
git commit -m "docs: align judgement surfaces with visible rows"
```

---

### Task 4: Run full verification and perform nested visual QA

**Files:**
- Temporarily create and delete: `WuwaFrontend/visual-qa-model-parent-surface.html`
- Verify: `WuwaFrontend/src/styles/features/evaluation.css`
- Verify: `WuwaFrontend/src/styles/features/evaluation-layout.css`

- [ ] **Step 1: Run the full frontend suite**

Run from `WuwaFrontend`:

```powershell
..\.tools\node\npm.cmd test
```

Expected:

```text
tests 340
pass 340
fail 0
```

- [ ] **Step 2: Run the production build**

Run from `WuwaFrontend`:

```powershell
..\.tools\node\npm.cmd run build
```

Expected: Vite exits with code `0` and prints `✓ built`.

- [ ] **Step 3: Create a temporary real-hierarchy visual fixture**

Use `apply_patch` to create `WuwaFrontend/visual-qa-model-parent-surface.html` with this exact structure:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Visible parent model surface QA</title>
    <link rel="stylesheet" href="/src/style.css" />
    <style>
      body { margin: 0; }
      .qa-shell { padding: 28px; }
      .qa-shell + .qa-shell { margin-top: 24px; }
      .qa-shell h1 { margin: 0 0 16px; font: 600 20px/1.3 var(--font-title); }
      .qa-stack { display: grid; gap: 14px; }
      .qa-shell .model-bars { display: grid; }
      .qa-shell .model-bars > article { border: 1px solid #e1e9ef; border-radius: 10px; }
      .qa-shell.theme-dark { background: var(--page-bg); color: var(--ink-deep); }
    </style>
  </head>
  <body>
    <main class="evaluation-panel">
      <section class="app-shell qa-shell">
        <h1>浅色主题</h1>
        <div class="model-backtest-card">
          <div class="model-bars qa-stack">
            <article class="best expanded">
              <button class="model-bar-summary" type="button">
                <strong>周期规律 <em>最高命中</em></strong>
                <small><span>历史片段匹配</span></small>
                <span class="model-hit-rate">41.58%</span>
                <span class="model-loss">2.06</span>
                <span class="model-expand-state"></span>
              </button>
              <div class="model-row-detail">
                <article class="model-insight-card inline-model-insight cool model-bayes active">
                  <p class="model-judgement-summary">
                    <span class="model-judgement-label">判断</span>
                    <span>若当前走势和历史完整片段接近，则判断更有把握。</span>
                  </p>
                </article>
              </div>
            </article>
            <article class="expanded">
              <button class="model-bar-summary" type="button">
                <strong>近期序列</strong>
                <small><span>近期重复冷却</span></small>
                <span class="model-hit-rate">15.84%</span>
                <span class="model-loss">2.55</span>
                <span class="model-expand-state"></span>
              </button>
              <div class="model-row-detail">
                <article class="model-insight-card inline-model-insight cool model-markov active">
                  <p class="model-judgement-summary">
                    <span class="model-judgement-label">判断</span>
                    <span>按录入顺序查看最近 12 条，重复越密集，冷却越强。</span>
                  </p>
                </article>
              </div>
            </article>
            <article class="disabled expanded">
              <button class="model-bar-summary" type="button">
                <strong>上下文监测 <em class="disabled-model-badge">未启用</em></strong>
                <small><span>样本不足</span></small>
                <span class="model-hit-rate">--</span>
                <span class="model-loss">--</span>
                <span class="model-expand-state"></span>
              </button>
              <div class="model-row-detail">
                <article class="model-insight-card inline-model-insight disabled model-context">
                  <p class="model-judgement-summary">
                    <span class="model-judgement-label">判断</span>
                    <span>样本满足启用条件后再参与判断。</span>
                  </p>
                </article>
              </div>
            </article>
          </div>
        </div>
      </section>
      <section class="app-shell theme-dark qa-shell">
        <h1>深色主题</h1>
        <div class="model-backtest-card">
          <div class="model-bars qa-stack">
            <article class="best expanded">
              <button class="model-bar-summary" type="button">
                <strong>周期规律 <em>最高命中</em></strong>
                <small><span>历史片段匹配</span></small>
                <span class="model-hit-rate">41.58%</span>
                <span class="model-loss">2.06</span>
                <span class="model-expand-state"></span>
              </button>
              <div class="model-row-detail">
                <article class="model-insight-card inline-model-insight cool model-bayes active">
                  <p class="model-judgement-summary">
                    <span class="model-judgement-label">判断</span>
                    <span>若当前走势和历史完整片段接近，则判断更有把握。</span>
                  </p>
                </article>
              </div>
            </article>
            <article class="expanded">
              <button class="model-bar-summary" type="button">
                <strong>近期序列</strong>
                <small><span>近期重复冷却</span></small>
                <span class="model-hit-rate">15.84%</span>
                <span class="model-loss">2.55</span>
                <span class="model-expand-state"></span>
              </button>
              <div class="model-row-detail">
                <article class="model-insight-card inline-model-insight cool model-markov active">
                  <p class="model-judgement-summary">
                    <span class="model-judgement-label">判断</span>
                    <span>按录入顺序查看最近 12 条，重复越密集，冷却越强。</span>
                  </p>
                </article>
              </div>
            </article>
            <article class="disabled expanded">
              <button class="model-bar-summary" type="button">
                <strong>上下文监测 <em class="disabled-model-badge">未启用</em></strong>
                <small><span>样本不足</span></small>
                <span class="model-hit-rate">--</span>
                <span class="model-loss">--</span>
                <span class="model-expand-state"></span>
              </button>
              <div class="model-row-detail">
                <article class="model-insight-card inline-model-insight disabled model-context">
                  <p class="model-judgement-summary">
                    <span class="model-judgement-label">判断</span>
                    <span>样本满足启用条件后再参与判断。</span>
                  </p>
                </article>
              </div>
            </article>
          </div>
        </div>
      </section>
    </main>
  </body>
</html>
```

- [ ] **Step 4: Inspect computed inheritance and screenshots**

Start the existing Vite development command in a hidden background process, open:

```text
http://127.0.0.1:5173/visual-qa-model-parent-surface.html
```

Using the Browser skill, inspect each outer row, its inner `.model-insight-card`, and its `.model-judgement-summary`. Expected computed `--model-surface-accent` values:

```text
best expanded:     #2c9f70
normal expanded:   #1769d2
disabled expanded: #677481
```

The inner Bayes card must inherit green in the best row rather than overriding it with purple. The inner Markov card must inherit blue in the normal expanded row rather than overriding it with amber. Repeat in the dark section and confirm the same semantic mapping.

Visually confirm:

- Best Bayes row, detail surface, judgement border, and judgement label read as one restrained green family.
- Normal Markov row, detail surface, judgement border, and judgement label read as one restrained blue family.
- Disabled context row and judgement read as one gray family.
- No judgement summary changes color when the pointer hovers the summary button.
- Data graphics remain outside this fixture and are protected by the automated `--model-accent` assertion.
- No horizontal overflow occurs at desktop width or 520px.
- Browser console contains no warning or error.

- [ ] **Step 5: Delete the temporary visual fixture and stop local services**

Use `apply_patch` to delete:

```text
WuwaFrontend/visual-qa-model-parent-surface.html
```

Stop only the Vite, Django, and local PostgreSQL processes started for this verification. Confirm ports `5173`, `8001`, and the selected local PostgreSQL port are no longer listening.

---

### Task 5: Record the corrective delivery and run final verification

**Files:**
- Modify: `docs/archive/2026-07-19-evaluation-model-judgement-derived-surface-implementation.md:1`
- Create: `docs/archive/2026-07-19-evaluation-model-judgement-visible-parent-surface-implementation.md`

- [ ] **Step 1: Mark the earlier implementation record as superseded**

Insert immediately after its title:

```markdown
> 已被 `2026-07-19-evaluation-model-judgement-visible-parent-surface-implementation.md` 修正。原实现把表面色 owner 放在生产页面中背景透明的内层模型卡片，导致判断摘要不能稳定跟随用户实际看到的外层回测卡片；以下内容保留为历史实施记录。
```

- [ ] **Step 2: Write the corrective implementation record**

Create `docs/archive/2026-07-19-evaluation-model-judgement-visible-parent-surface-implementation.md` with:

```markdown
# 评估子模型判断摘要跟随可见父卡片实施记录

## 目标

修正判断摘要表面色 owner，使外层回测行、展开详情和判断摘要使用同一个可见状态色：

- 最高命中为绿色。
- 普通展开为蓝色。
- 未启用为灰色。
- 模型身份色只用于数据图形。

## 根因

上一版 `--model-surface-accent` 定义在 `.model-insight-card`，但生产页面中的该卡片背景被 `.model-row-detail .model-insight-card` 覆盖为透明。用户实际看到的父表面来自外层回测行和 `.model-row-detail`；后者还写死了绿色。因此最高命中的 Bayes“周期规律”出现了绿色父卡片和紫色判断摘要。

原静态测试只验证孤立 `.model-insight-card`，没有覆盖真实嵌套层级和 CSS 级联。

## 实施内容

- 将 `--model-surface-accent` 移到外层 `.model-bars > article`。
- 普通状态使用蓝色，`.best` 覆盖为绿色，`.disabled` 覆盖为灰色。
- `.model-row-detail`、判断摘要和判断标签继承外层 token。
- 删除 `model-bayes`、`model-markov`、`model-cycle` 和内层 disabled 对表面 token 的覆盖。
- 保留 `--model-accent` 和现有图表局部颜色，模型数据图形未改变。
- hover 只消费已有 token，不修改 token，因此不会驱动摘要变色。

## 自动化验证

- 聚焦测试：22/22 通过。
- 完整前端测试：340/340 通过。
- Vite 生产构建：通过。
- `.impeccable/design.json` 解析：通过。
- `git diff --check`：通过。

## 浏览器视觉验收

临时验收页使用生产 `src/style.css` 和真实嵌套层级，验收后已删除：

- 最高命中 Bayes：外层、详情和判断摘要统一为绿色。
- 普通展开 Markov：外层、详情和判断摘要统一为蓝色。
- 未启用 Context：外层、详情和判断摘要统一为灰色。
- 浅色和深色主题语义一致。
- 520px 无横向溢出或文字裁切。
- hover 不改变判断摘要颜色。
- 控制台无 warning 或 error。

## API、数据与业务边界

无变化。没有修改 API、数据库、模型算法、内部 key、展示名称、权重、命中率、Loss、排序或回测口径。

## 长期规则

`DESIGN.md` 与 `.impeccable/design.json` 已改为“可见父卡片状态拥有表面 token”；上一版模型身份表面规则已被取代。
```

- [ ] **Step 3: Run final fresh verification**

Run from `WuwaFrontend`:

```powershell
..\.tools\node\node.exe --test src\design-state-accent.test.js src\features\evaluation\EvaluationBacktest.test.js
..\.tools\node\npm.cmd test
..\.tools\node\npm.cmd run build
```

Expected:

```text
focused tests: 22 passed, 0 failed
full tests: 340 passed, 0 failed
build: success
```

Run from the repository root:

```powershell
.\.tools\node\node.exe -e "JSON.parse(require('fs').readFileSync('.impeccable/design.json','utf8')); console.log('DESIGN_JSON_OK')"
git diff --check
git status --short
```

Expected:

```text
DESIGN_JSON_OK
```

`git diff --check` exits with code `0`. `git status --short` lists only the two intended archive documentation changes.

- [ ] **Step 4: Commit the delivery record**

```powershell
git add -- docs/archive/2026-07-19-evaluation-model-judgement-derived-surface-implementation.md docs/archive/2026-07-19-evaluation-model-judgement-visible-parent-surface-implementation.md
git commit -m "docs: record visible judgement surface fix"
```

- [ ] **Step 5: Confirm a clean branch**

```powershell
git status --short --branch
```

Expected: the branch is clean and contains the planned commits. Do not push, merge, or create a pull request without an explicit user choice.
