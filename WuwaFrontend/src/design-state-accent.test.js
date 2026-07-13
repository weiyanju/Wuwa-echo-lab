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
  '.terminal-title',
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

test('selected Sonata and history filters expose a non-color check marker', async () => {
  const [workbench, history, workspaceStyle, historyStyle] = await Promise.all([
    read('./features/workspace/EchoWorkbenchView.vue'),
    read('./features/history/FloatingHistoryPanel.vue'),
    read('./styles/features/workspace.css'),
    read('./styles/features/history.css'),
  ])

  assert.match(workbench, /import selectedCheckIcon from '\.\.\/\.\.\/assets\/icons\/check\.svg'/)
  assert.match(workbench, /v-if="config\.sonata === effect\.name" class="ui-line-icon sonata-selected-indicator"/)
  assert.match(workspaceStyle, /\.sonata-selected-indicator \{[\s\S]+width: 18px;[\s\S]+height: 18px;/)

  assert.match(history, /import historySelectedIcon from '\.\.\/\.\.\/assets\/icons\/check\.svg'/)
  assert.match(history, /class="ui-line-icon history-filter-selected-icon"/)
  assert.doesNotMatch(history, /v-if="historyFilter === option\.key" class="ui-line-icon history-filter-selected-icon"/)
  assert.match(historyStyle, /\.history-filter-selected-icon \{[\s\S]+width: 14px;[\s\S]+height: 14px;[\s\S]+opacity: 0;/)
  assert.match(historyStyle, /\.history-filter-chip\.active \.history-filter-selected-icon \{\s+opacity: 1;/)
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

test('the functional login caret finishes beside the title instead of at the column edge', async () => {
  const authStyle = await read('./styles/features/auth.css')

  assert.match(authStyle, /\.terminal-title \{[\s\S]+--terminal-title-width: 8em;/)
  assert.match(authStyle, /@keyframes terminal-typing \{ to \{ width: var\(--terminal-title-width\); \} \}/)
  assert.doesNotMatch(authStyle, /@keyframes terminal-typing \{ to \{ width: 100%; \} \}/)
})
