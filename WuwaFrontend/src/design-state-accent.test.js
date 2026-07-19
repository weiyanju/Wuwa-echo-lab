import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

async function read(relativePath) {
  return readFile(new URL(relativePath, import.meta.url), 'utf8')
}

const styleFiles = [
  './styles/base.css',
  './styles/controls.css',
  './styles/shell.css',
  './styles/tokens.css',
  './styles/features/auth.css',
  './styles/features/evaluation.css',
  './styles/features/history.css',
  './styles/features/recognition.css',
  './styles/features/statistics.css',
  './styles/features/uid-setup.css',
  './styles/features/workspace.css',
  './styles/features/workspace-active.css',
]

const functionalSideLineSelectors = new Set([
  '.terminal-title-caret',
  '.terminal-brand-icon::after',
  '.wordmark-symbol::after',
  '.bayes-path-list article::before',
  '.markov-time-legend b::after',
  '.markov-axis-line::after',
  '.rule-deviation-axis b::after',
  '.rule-deviation-chart .warn .rule-deviation-axis b::after',
  '.model-insight-side li::before',
])

function cssRules(source) {
  return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selector: match[1].replace(/\s+/g, ' ').trim(),
    body: match[2],
  }))
}

function selectorParts(selector) {
  return selector.split(',').map((part) => part.trim())
}

function bodiesFor(source, target) {
  return cssRules(source)
    .filter(({ selector }) => selectorParts(selector).includes(target))
    .map(({ body }) => body)
    .join('\n')
}

function hasThickSideBorder(body) {
  return [...body.matchAll(/border-(?:left|right)(?:-width)?:\s*(\d+(?:\.\d+)?)px\b/g)]
    .some((match) => Number(match[1]) > 1)
}

function hasHorizontalInsetStripe(body) {
  return [...body.matchAll(/box-shadow:[^;]*inset\s+(-?\d+(?:\.\d+)?)px\s+0(?:\s+0)?\b/g)]
    .some((match) => Math.abs(Number(match[1])) > 1)
}

function hasPseudoSideStripe(selector, body) {
  const width = body.match(/\bwidth:\s*(\d+(?:\.\d+)?)px\b/)
  return /::(?:before|after)/.test(selector)
    && /\bposition:\s*absolute\b/.test(body)
    && /\b(?:left|right|inset):/.test(body)
    && Boolean(width && Number(width[1]) > 1)
    && /\bbackground(?:-image)?:/.test(body)
}

test('Web styles avoid oversized colored side accents except named functional graphics', async () => {
  const sources = await Promise.all(styleFiles.map(read))
  const rules = sources.flatMap(cssRules)
  const violations = rules.filter(({ selector, body }) => {
    const parts = selectorParts(selector)
    const exempt = parts.length > 0
      && parts.every((part) => functionalSideLineSelectors.has(part))

    return !exempt && (
      hasThickSideBorder(body)
      || hasHorizontalInsetStripe(body)
      || hasPseudoSideStripe(selector, body)
    )
  })

  assert.deepEqual(violations, [])
})

test('evaluation cards use restrained perimeters while Bayes paths retain semantic markers', async () => {
  const evaluationStyle = await read('./styles/features/evaluation.css')

  assert.doesNotMatch(evaluationStyle, /\.model-detail-thumb::before\s*\{/)
  assert.match(bodiesFor(evaluationStyle, '.bayes-path-list article::before'), /width:\s*3px/)
  assert.match(
    bodiesFor(evaluationStyle, '.bayes-path-list article.secondary::before'),
    /repeating-linear-gradient/,
  )

  for (const selector of [
    '.cycle-window-grid article',
    '.model-group-bars div',
    '.model-bars-large div',
    '.markov-penalty-grid article',
    '.model-bars article.expanded',
    '.model-bars article.best',
    '.model-bars article.best.expanded',
  ]) {
    const bodies = bodiesFor(evaluationStyle, selector)
    const thickTopBorders = [...bodies.matchAll(/border-top:\s*(\d+(?:\.\d+)?)px/g)]
      .filter((match) => Number(match[1]) > 1)
    const thickTopInsets = [...bodies.matchAll(/box-shadow:\s*inset\s+0\s+(-?\d+(?:\.\d+)?)px/g)]
      .filter((match) => Math.abs(Number(match[1])) > 1)

    assert.deepEqual(thickTopBorders, [], `${selector} should not use a thick top border`)
    assert.deepEqual(thickTopInsets, [], `${selector} should not use a thick top inset rail`)
  }

  assert.doesNotMatch(
    evaluationStyle,
    /border-top-color:\s*color-mix\(in srgb, var\(--window-accent, var\(--model-accent\)\)/,
  )
})

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

test('selected Sonata keeps its check while history filters use solid active pills', async () => {
  const [workbench, history, workspaceStyle, historyStyle] = await Promise.all([
    read('./features/workspace/EchoWorkbenchView.vue'),
    read('./features/history/FloatingHistoryPanel.vue'),
    read('./styles/features/workspace.css'),
    read('./styles/features/history.css'),
  ])

  assert.match(workbench, /import selectedCheckIcon from '\.\.\/\.\.\/assets\/icons\/check\.svg'/)
  assert.match(workbench, /v-if="config\.sonata === effect\.name" class="ui-line-icon sonata-selected-indicator"/)
  assert.match(workspaceStyle, /\.sonata-selected-indicator \{[\s\S]+width: 18px;[\s\S]+height: 18px;/)

  assert.doesNotMatch(history, /historySelectedIcon|history-filter-selected-icon/)
  assert.match(history, /:aria-pressed="historyFilter === option\.key"/)
  assert.doesNotMatch(historyStyle, /\.history-filter-selected-icon/)
  assert.match(bodiesFor(historyStyle, '.history-filter-chip.active'), /border-color:\s*var\(--history-filter-active-bg\);/)
  assert.match(bodiesFor(historyStyle, '.history-filter-chip.active'), /color:\s*var\(--history-filter-active-ink\);/)
  assert.match(bodiesFor(historyStyle, '.history-filter-chip.active'), /background:\s*var\(--history-filter-active-bg\);/)
  assert.match(bodiesFor(historyStyle, '.history-filter-chip.active'), /box-shadow:\s*none;/)
  assert.match(bodiesFor(historyStyle, '.history-filter-chip.active strong'), /color:\s*var\(--history-filter-active-count-ink\);/)
  assert.match(bodiesFor(historyStyle, '.history-filter-chip.active strong'), /background:\s*var\(--history-filter-active-count-bg\);/)
})

test('polished states stay flat and model summaries use an explicit reading label', async () => {
  const [historyStyle, evaluation, evaluationStyle] = await Promise.all([
    read('./styles/features/history.css'),
    read('./features/evaluation/EvaluationBacktest.vue'),
    read('./styles/features/evaluation.css'),
  ])

  assert.doesNotMatch(historyStyle, /\.history-filter-chip:(?:hover|active)[^{]*\{[^}]*transform:\s*translateY/)
  assert.doesNotMatch(historyStyle, /\.echo-item:hover\s*\{[^}]*transform:\s*translateY/)
  assert.equal((evaluation.match(/class="model-judgement-label"/g) || []).length, 2)
  assert.match(evaluationStyle, /\.model-judgement-summary \{[\s\S]+grid-template-columns: auto minmax\(0, 1fr\);/)
  assert.match(evaluationStyle, /\.model-judgement-label \{/)
})

test('the functional login caret follows complete glyphs without width clipping', async () => {
  const authStyle = await read('./styles/features/auth.css')

  assert.match(authStyle, /\.terminal-title \{[\s\S]+display: inline-flex;[\s\S]+align-items: baseline;/)
  assert.match(authStyle, /\.terminal-title-caret \{[\s\S]+width: 4px;[\s\S]+margin-inline-start: 0\.14em;[\s\S]+animation: terminal-blink/)
  assert.match(authStyle, /\.terminal-auth-enter-active \{[\s\S]+160ms/)
  assert.match(authStyle, /\.terminal-auth-enter-from \{[\s\S]+opacity: 0;[\s\S]+translateY\(12px\)/)
  assert.doesNotMatch(authStyle, /@keyframes terminal-typing/)
  assert.doesNotMatch(authStyle, /\.terminal-title \{[^}]+(?:width: 0|overflow: hidden|border-right:)/)
})

test('evaluation dark theme consumes existing semantic theme tokens without remapping values', async () => {
  const controls = await read('./styles/controls.css')
  const evaluation = await read('./styles/features/evaluation.css')

  assert.match(controls, /\.app-shell\.theme-dark \{[\s\S]+--primary-deep: #8dc3ff;[\s\S]+--ink-deep: #e7eef4;[\s\S]+--charcoal: #a9bac7;[\s\S]+--steel: #98aab7;[\s\S]+--surface-soft: #17232d;/)
  assert.doesNotMatch(evaluation, /#(?:e7eef4|a9bac7|98aab7|17232d|8dc3ff)\b/i)
  assert.match(evaluation, /color: var\(--ink-deep\);/)
  assert.match(evaluation, /color: var\(--charcoal\);/)
  assert.match(evaluation, /color: var\(--steel\);/)
  assert.match(evaluation, /var\(--surface-soft\)/)
  assert.match(evaluation, /color: var\(--primary-deep\);/)
})

test('workspace dark theme consumes the same semantic theme tokens without visual remapping', async () => {
  const controls = await read('./styles/controls.css')
  const workspace = await read('./styles/features/workspace.css')

  assert.match(controls, /\.app-shell\.theme-dark \{[\s\S]+--primary-deep: #8dc3ff;[\s\S]+--ink-deep: #e7eef4;[\s\S]+--charcoal: #a9bac7;[\s\S]+--steel: #98aab7;[\s\S]+--surface-soft: #17232d;/)
  assert.doesNotMatch(workspace, /#(?:e7eef4|a9bac7|98aab7|17232d|8dc3ff)\b/i)
  assert.match(workspace, /color: var\(--ink-deep\);/)
  assert.match(workspace, /color: var\(--charcoal\);/)
  assert.match(workspace, /color: var\(--steel\);/)
  assert.match(workspace, /var\(--surface-soft\)/)
  assert.match(workspace, /(?:color|background): var\(--primary-deep\);/)
})

test('history dark theme reuses surface, text, and primary theme tokens without remapping', async () => {
  const controls = await read('./styles/controls.css')
  const history = await read('./styles/features/history.css')

  assert.match(controls, /\.app-shell\.theme-dark \{[\s\S]+--primary-deep: #8dc3ff;[\s\S]+--ink-deep: #e7eef4;[\s\S]+--steel: #98aab7;[\s\S]+--surface-soft: #17232d;/)
  assert.doesNotMatch(history, /#(?:e7eef4|98aab7|17232d|8dc3ff)\b/i)
  assert.match(history, /color: var\(--ink-deep\);/)
  assert.match(history, /color: var\(--steel\);/)
  assert.match(history, /var\(--surface-soft\)/)
  assert.match(history, /color: var\(--primary-deep\);/)
})

test('remaining feature dark themes reuse exact semantic tokens without remapping feature colors', async () => {
  const statistics = await read('./styles/features/statistics.css')
  const recognition = await read('./styles/features/recognition.css')
  const uidSetup = await read('./styles/features/uid-setup.css')

  for (const value of ['#17232d', '#e7eef4', '#a9bac7', '#98aab7', '#5da8ff']) {
    assert.doesNotMatch(statistics, new RegExp(value, 'i'))
  }
  for (const value of ['#37b37f', '#e7eef4', '#a9bac7']) {
    assert.doesNotMatch(recognition, new RegExp(value, 'i'))
  }
  for (const value of ['#98aab7', '#8dc3ff']) {
    assert.doesNotMatch(uidSetup, new RegExp(value, 'i'))
  }
  assert.match(statistics, /var\(--surface-soft\)/)
  assert.match(recognition, /var\(--success\)/)
  assert.match(uidSetup, /var\(--primary-deep\)/)
})

test('shell and shared controls consume dark theme tokens while keeping one source definition', async () => {
  const controls = await read('./styles/controls.css')
  const shell = await read('./styles/shell.css')

  assert.doesNotMatch(shell, /#(?:e7eef4|a9bac7|98aab7|17232d|8dc3ff)\b/i)
  for (const value of ['#5da8ff', '#8dc3ff', '#e7eef4', '#a9bac7', '#98aab7', '#17232d']) {
    assert.equal((controls.match(new RegExp(value, 'gi')) ?? []).length, 1, `${value} should exist only in the theme token definition`)
  }
  assert.match(shell, /color: var\(--ink-deep\);/)
  assert.match(shell, /color: var\(--charcoal\);/)
  assert.match(shell, /color: var\(--steel\);/)
  assert.match(shell, /var\(--surface-soft\)/)
  assert.match(shell, /color: var\(--primary-deep\);/)
  assert.match(controls, /background: linear-gradient\(180deg, #7cbcff, var\(--primary\)\);/)
  assert.match(controls, /accent-color: var\(--primary\);/)
})

test('shared action buttons use stable control geometry while navigation remains pill-shaped', async () => {
  const controls = await read('./styles/controls.css')
  const shell = await read('./styles/shell.css')

  assert.match(controls, /\.button-primary,[\s\S]+\.button-next \{[\s\S]+min-height: 44px;[\s\S]+border-radius: 12px;/)
  assert.doesNotMatch(controls, /\.button-primary,[\s\S]+\.button-next \{[^}]+transition:[^}]+transform/)
  assert.doesNotMatch(controls, /\.button-(?:primary|buy|danger|next):hover[^{]*\{[^}]*transform:/)
  assert.match(controls, /\.button-danger,[\s\S]+\.button-next \{[\s\S]+min-height: 44px;/)
  assert.doesNotMatch(controls, /\.button-(?:danger|next):hover[^{]*\{[^}]*box-shadow:\s*0\s+8px\s+18px/)
  assert.match(shell, /\.pill-tabs button \{[\s\S]+border-radius: 100px;/)
  assert.match(shell, /\.uid-chip \{[\s\S]+border-radius: 100px;/)
})
