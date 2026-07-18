import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('zero-sample statistics uses the approved minimal entry and never renders fake deviation results', async () => {
  const source = await readFile(new URL('./StatisticsView.vue', import.meta.url), 'utf8')
  assert.match(source, /sampleMaturityState\(totalSamples\.value\)/)
  assert.match(source, /sampleStageState\(totalSamples\.value\)/)
  assert.match(source, /v-if="!stats"/)
  assert.match(source, /v-else-if="!hasSamples"/)
  assert.match(source, /class="sample-activation-state statistics-empty-state"/)
  assert.match(source, /这里将显示你的个人副词条分布/)
  assert.match(source, /录入第一条副词条即可开始。/)
  assert.match(source, /class="button-primary sample-activation-action"/)
  assert.doesNotMatch(source, /下一步|statistics-empty-milestones|当前预测仍由规则基线提供|500 条后/)
  assert.equal((source.match(/<SampleStageAxis/g) || []).length, 1)
  assert.doesNotMatch(source, /<SampleReadinessPanel/)
  assert.match(source, /v-else class="stats-task-stack"/)
  assert.ok(source.indexOf('v-else class="stats-task-stack"') < source.indexOf('class="stats-task-card substat-deviation-card"'))
})

test('statistics zero state uses a neutral maturity chip without a green dot', async () => {
  const source = await readFile(new URL('./StatisticsView.vue', import.meta.url), 'utf8')
  assert.match(source, /page-summary-chip--neutral/)
  assert.match(source, /<i v-if="maturity\.hasSamples" aria-hidden="true"><\/i>/)
  assert.match(source, /\{\{ maturity\.label \}\}/)
  assert.match(source, /<span v-if="maturity\.hasSamples" class="page-summary-chip"/)
  assert.match(source, /\{\{ stage\.rangeLabel \}\}/)
})

async function readStatisticsStyles() {
  return readFile(new URL('../../styles/features/statistics.css', import.meta.url), 'utf8')
}

async function readPageSummaryStyles() {
  return readFile(new URL('../../styles/page-summary.css', import.meta.url), 'utf8')
}

function findElementsByClassToken(source, classToken) {
  const elements = []
  const openingTagPattern = /<([a-z][\w-]*)\b(?=[^>]*\sclass\s*=\s*"([^"]*)")[^>]*>/gi

  for (const match of source.matchAll(openingTagPattern)) {
    const classTokens = match[2].split(/\s+/).filter(Boolean)
    if (!classTokens.includes(classToken)) continue

    const closingTag = `</${match[1]}>`
    const closingStart = source.indexOf(closingTag, match.index + match[0].length)
    elements.push({
      tagName: match[1].toLowerCase(),
      classTokens,
      start: match.index,
      end: closingStart,
      section: closingStart >= 0 ? source.slice(match.index, closingStart + closingTag.length) : '',
    })
  }

  return elements
}

test('statistics view owns analytics presentation', async () => {
  const source = await readFile(new URL('./StatisticsView.vue', import.meta.url), 'utf8')

  assert.match(source, /defineProps\(\{[\s\S]+stats:/)
  assert.match(source, /class="stats-analytics-panel"/)
  assert.doesNotMatch(source, /class="product-panel full-panel stats-analytics-panel"/)
  assert.match(source, /class="stats-task-stack"/)
  assert.match(source, /class="stats-task-card sample-reliability-card"/)
  assert.match(source, /class="stats-task-card substat-deviation-card"/)
  assert.match(source, /v-for="row in sortedStatFrequency"/)
  assert.match(source, /<SampleStageAxis/)
})

test('statistics task cards keep stage and deviation content with their owners', async () => {
  const source = await readFile(new URL('./StatisticsView.vue', import.meta.url), 'utf8')
  const reliabilityStart = source.indexOf('class="stats-task-card sample-reliability-card"')
  const deviationStart = source.indexOf('class="stats-task-card substat-deviation-card"')

  assert.ok(reliabilityStart >= 0 && reliabilityStart < deviationStart)
  const reliabilitySection = source.slice(reliabilityStart, deviationStart)
  const deviationSection = source.slice(deviationStart)
  assert.match(reliabilitySection, /<h3>样本可信度<\/h3>/)
  assert.match(reliabilitySection, /<SampleStageAxis/)
  assert.match(deviationSection, /<h3>副词条分布偏差<\/h3>/)
  assert.match(deviationSection, /class="stats-diagnostic-deviations"/)
  assert.match(deviationSection, /class="substat-deviation-chart"/)
  assert.match(source, /formatSignedPercentagePoints\(row\.deviation\)/)
  assert.match(source, /sortedStatFrequency\.value\.find\(\(row\) => row\.deviation < 0\)/)
})

test('statistics diagnosis keeps populated context at section level and avoids duplicate empty values', async () => {
  const source = await readFile(new URL('./StatisticsView.vue', import.meta.url), 'utf8')

  assert.match(source, /<h2>统计诊断<\/h2>\s*<p v-if="hasSamples" class="stats-diagnostic-context">\{\{ statisticsContextText \}\}<\/p>/)
  assert.match(source, /<p v-else-if="!stats" class="stats-diagnostic-context">正在读取统计数据。<\/p>/)
  assert.doesNotMatch(source, /class="stats-diagnostic-note"/)
  assert.match(source, /hottestStatRow\?\.label \|\| '暂无明显偏高'/)
  assert.match(source, /coldestStatRow\?\.label \|\| '暂无明显偏低'/)
  assert.doesNotMatch(source, /v-else>暂无<\/em>/)
})

test('statistics diagnostic context uses quiet section-level typography', async () => {
  const styles = await readStatisticsStyles()
  const titleRowRule = styles.match(/^\.stats-diagnostic-title-row \{([^}]+)\}/m)?.[1] || ''
  const stackRule = styles.match(/^\.stats-diagnostic-title-stack \{([^}]+)\}/m)?.[1] || ''
  const contextRule = styles.match(/^\.stats-diagnostic-context \{([^}]+)\}/m)?.[1] || ''

  assert.match(titleRowRule, /align-items: flex-start/)
  assert.match(stackRule, /gap: 6px/)
  assert.match(contextRule, /max-width: 440px/)
  assert.match(contextRule, /margin: 0/)
  assert.match(contextRule, /color: #6f8293/)
  assert.match(contextRule, /font-size: var\(--text-label\)/)
  assert.match(contextRule, /font-weight: var\(--weight-supporting\)/)
  assert.match(contextRule, /line-height: var\(--leading-body\)/)
  assert.doesNotMatch(contextRule, /border|background/)
  assert.match(styles, /\.app-shell\.theme-dark \.stats-diagnostic-head p,\s*\.app-shell\.theme-dark \.stats-diagnostic-context,\s*\.app-shell\.theme-dark \.stats-task-meta\s*\{[^}]*color: var\(--charcoal\)/m)
  assert.doesNotMatch(styles, /\.stats-diagnostic-note/)
})

test('shared page summary labels keep accessible light-theme contrast', async () => {
  const styles = await readPageSummaryStyles()
  const summaryLabelRule = styles.match(/^\.page-summary-chip small \{([^}]+)\}/m)?.[1] || ''

  assert.match(summaryLabelRule, /color: #5f7183/)
})

test('statistics task cards use a transparent page owner and responsive sibling cards', async () => {
  const styles = await readStatisticsStyles()
  const ownerRule = styles.match(/^\.stats-analytics-panel \{([^}]+)\}/m)?.[1] || ''
  const stackRule = styles.match(/^\.stats-task-stack \{([^}]+)\}/m)?.[1] || ''
  const cardRule = styles.match(/^\.stats-task-card \{([^}]+)\}/m)?.[1] || ''

  assert.match(ownerRule, /display: grid/)
  assert.doesNotMatch(ownerRule, /border|box-shadow|background/)
  assert.match(stackRule, /display: grid/)
  assert.match(cardRule, /border: 1px solid/)
  assert.match(cardRule, /border-radius: 12px/)
  assert.match(styles, /@media \(max-width: 860px\)[\s\S]+\.stats-task-header[\s\S]+flex-direction: column/)
  assert.match(styles, /\.app-shell\.theme-dark \.stats-task-card/)
})

test('statistics zero state uses one centered blue action on a quiet task surface', async () => {
  const sharedStyles = await readFile(new URL('../../styles/sample-readiness.css', import.meta.url), 'utf8')
  const styles = await readStatisticsStyles()
  const stateRule = sharedStyles.match(/^\.sample-activation-state \{([^}]+)\}/m)?.[1] || ''
  const emptyOwnerRule = styles.match(/^\.stats-analytics-panel--empty \{([^}]+)\}/m)?.[1] || ''

  assert.match(stateRule, /place-items: center/)
  assert.match(stateRule, /text-align: center/)
  assert.doesNotMatch(stateRule, /border|background|box-shadow/)
  assert.match(sharedStyles, /\.sample-activation-action\s*\{[^}]*background: var\(--primary\);/s)
  assert.match(emptyOwnerRule, /border: 1px solid/)
  assert.match(emptyOwnerRule, /background: #fbfcfe/)
  assert.doesNotMatch(styles, /statistics-empty-milestone/)
})

test('statistics charts enable internal scrolling before their minimum width can overflow the page', async () => {
  const styles = await readStatisticsStyles()

  assert.match(
    styles,
    /@media \(max-width: 680px\) \{[\s\S]*?\.sample-stage-axis,\s*\.substat-deviation-chart \{[\s\S]*?overflow-x: auto;/,
  )
})

test('statistics diagnosis header owns exactly two non-duplicated summary chips', async () => {
  const source = await readFile(new URL('./StatisticsView.vue', import.meta.url), 'utf8')
  const headerElements = findElementsByClassToken(source, 'stats-diagnostic-head')

  assert.equal(headerElements.length, 1)
  assert.equal(headerElements[0].tagName, 'header')
  assert.ok(headerElements[0].start >= 0 && headerElements[0].start < headerElements[0].end)
  const headerSection = headerElements[0].section
  const summaryElements = findElementsByClassToken(headerSection, 'page-summary-chips')
  const headerChipElements = findElementsByClassToken(headerSection, 'page-summary-chip')

  assert.doesNotMatch(headerSection, /最大偏差|formatSignedPercentagePoints/)
  assert.equal(headerChipElements.length, 2)
  assert.equal(summaryElements.length, 1)
  assert.ok(summaryElements[0].start >= 0 && summaryElements[0].start < summaryElements[0].end)
  const summarySection = summaryElements[0].section
  const summaryOpeningTag = summarySection.match(/^<div\b[^>]*>/)?.[0] || ''
  const chipElements = findElementsByClassToken(summarySection, 'page-summary-chip')
  const stateChipElements = chipElements.filter(({ section }) => section.includes('maturity.label'))
  const stageChipElements = chipElements.filter(({ section }) => section.includes('<small>阶段</small>'))

  assert.match(summaryOpeningTag, /\brole\s*=\s*"group"/)
  assert.match(summaryOpeningTag, /\baria-label\s*=\s*"统计摘要"/)
  assert.equal(chipElements.length, 2)
  assert.ok(chipElements.every(({ start, end }) => start >= 0 && start < end))
  assert.equal(stateChipElements.length, 1)
  assert.equal(stageChipElements.length, 1)
  const stateChipSection = stateChipElements[0].section
  assert.match(stateChipSection, /<i v-if="maturity\.hasSamples" aria-hidden="true"><\/i>/)
  assert.match(stateChipSection, /\{\{ maturity\.label \}\}/)
  const stageChipSection = stageChipElements[0].section
  assert.match(stageChipSection, /v-if="maturity\.hasSamples"/)
  assert.match(stageChipSection, /<small>阶段<\/small>/)
  assert.match(stageChipSection, /class="page-summary-chip__value"/)
  assert.match(stageChipSection, /stage\.rangeLabel/)
})

test('sample stage weight guide uses the approved semantic matrix styling', async () => {
  const styles = await readStatisticsStyles()
  const guideRule = styles.match(/^\.sample-stage-guide \{([^}]+)\}/m)?.[1] || ''
  const triggerRule = styles.match(/^\.sample-stage-guide-trigger \{([^}]+)\}/m)?.[1] || ''
  const popoverRule = styles.match(/^\.sample-stage-weight-popover \{([^}]+)\}/m)?.[1] || ''
  const chevronRule = styles.match(/^\.sample-stage-guide-chevron \{([^}]+)\}/m)?.[1] || ''
  const currentRailRule = styles.match(/^\.sample-stage-current-rail \{([^}]+)\}/m)?.[1] || ''
  const valueRule = styles.match(/^\.sample-stage-weight-value \{([^}]+)\}/m)?.[1] || ''
  const noteRule = styles.match(/^\.sample-stage-weight-note \{([^}]+)\}/m)?.[1] || ''
  const stageTrackFillRule = styles.match(/^\.sample-stage-track b \{([^}]+)\}/m)?.[1] || ''

  assert.match(guideRule, /position: relative/)
  assert.match(guideRule, /display: inline-flex/)
  assert.match(triggerRule, /color: #5d6c7b/)
  assert.match(triggerRule, /background: transparent/)
  assert.match(styles, /\.sample-stage-guide-trigger:hover \{[^}]*color: var\(--primary\);[^}]*background: #f4f8ff;/s)
  assert.match(styles, /\.sample-stage-guide-trigger:active \{[^}]*color: var\(--primary-deep\);/s)
  assert.match(styles, /\.sample-stage-guide-trigger\[aria-expanded="true"\] \{[^}]*color: #5d6c7b;[^}]*background: transparent;/s)
  assert.match(chevronRule, /width: 16px/)
  assert.match(chevronRule, /height: 16px/)
  assert.match(chevronRule, /transform: rotate\(-90deg\)/)

  assert.match(popoverRule, /position: fixed/)
  assert.match(popoverRule, /width: 720px/)
  assert.match(popoverRule, /max-height: calc\(100vh - 24px\)/)
  assert.match(popoverRule, /border: 1px solid var\(--hairline-soft\)/)
  assert.match(popoverRule, /border-radius: 12px/)
  assert.match(popoverRule, /background: var\(--canvas\)/)
  assert.doesNotMatch(popoverRule, /box-shadow|linear-gradient|radial-gradient/)

  assert.match(stageTrackFillRule, /background: #2c9f70/)
  assert.doesNotMatch(stageTrackFillRule, /gradient/)
  assert.match(currentRailRule, /width: 2px/)
  assert.match(currentRailRule, /background: #2c9f70/)
  assert.match(styles, /\.sample-stage-weight-table tbody tr\.current \{[^}]*background: #f7f9fb;/s)
  assert.match(styles, /\.sample-stage-weight-table tbody tr\.current th strong \{[^}]*font-weight: var\(--weight-title\);/s)

  assert.match(valueRule, /font-family: var\(--font-data\)/)
  assert.match(valueRule, /font-variant-numeric: tabular-nums/)
  assert.match(valueRule, /font-feature-settings: "tnum"/)
  assert.match(valueRule, /text-align: center/)
  assert.match(noteRule, /font-size: var\(--text-caption\)/)
  assert.match(styles, /\.sample-stage-weight-model-column \{[^}]*width: 96px;/s)
  assert.match(styles, /\.sample-stage-weight-table \{[^}]*table-layout: fixed;/s)

  assert.match(
    styles,
    /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\.sample-stage-guide-enter-active,\s*\.sample-stage-guide-leave-active \{[^}]*transition: none;/,
  )
  assert.doesNotMatch(styles, /sample-reliability-basis-tag/)
  assert.match(styles, /\.app-shell\.theme-dark \.sample-stage-weight-popover \{[^}]*border-color: var\(--hairline\);[^}]*background: var\(--surface-soft\);/s)
  assert.match(styles, /\.app-shell\.theme-dark \.sample-stage-weight-table tbody tr\.current \{[^}]*background: #1b2a35;/s)
  assert.match(styles, /\.app-shell\.theme-dark \.sample-stage-current-rail \{[^}]*background: #38b37f;/s)
  assert.match(styles, /\.app-shell\.theme-dark \.sample-stage-track b \{[^}]*background: #38b37f;/s)
  assert.match(styles, /\.app-shell\.theme-dark \.sample-stage-guide-trigger\[aria-expanded="true"\] \{[^}]*color: var\(--charcoal\);[^}]*background: transparent;/s)
})

test('sample stage weight matrix scrolls as soon as the popover clamps to the viewport', async () => {
  const styles = await readStatisticsStyles()

  assert.match(
    styles,
    /@media \(max-width: 743px\) \{[\s\S]*?\.sample-stage-weight-scroll \{[^}]*overflow-x: auto;[^}]*\}[\s\S]*?\.sample-stage-weight-table \{[^}]*min-width: 688px;/,
  )
})

test('sample reliability card integrates the stage-weight guide with its existing progress summary', async () => {
  const source = await readFile(new URL('./StatisticsView.vue', import.meta.url), 'utf8')
  const reliabilityStart = source.indexOf('class="stats-task-card sample-reliability-card"')
  const deviationStart = source.indexOf('class="stats-task-card substat-deviation-card"')

  assert.ok(reliabilityStart >= 0 && reliabilityStart < deviationStart)
  const reliabilitySection = source.slice(reliabilityStart, deviationStart)
  assert.match(source, /import SampleStageWeightGuide from '\.\/SampleStageWeightGuide\.vue'/)
  assert.match(reliabilitySection, /class="stats-task-header sample-reliability-header"/)
  assert.match(reliabilitySection, /class="sample-reliability-title"/)
  assert.match(reliabilitySection, /<SampleStageWeightGuide/)
  assert.match(reliabilitySection, /:stages="sampleStageAxisRows"/)
  assert.match(reliabilitySection, /:total="sampleStageStatus\.total"/)
  assert.doesNotMatch(reliabilitySection, /sample-reliability-basis-tag/)
  assert.doesNotMatch(source, /sampleStageText|sampleStageDriverText/)
  assert.match(reliabilitySection, /class="sample-stage-summary"/)
  assert.match(reliabilitySection, /class="sample-stage-count-value"/)
  assert.match(reliabilitySection, /sampleStageStatus\.total/)
  assert.match(reliabilitySection, /sampleStageTargetLabel/)
  assert.match(reliabilitySection, /sampleStageSummaryText/)
  assert.doesNotMatch(reliabilitySection, /sample-reliability-overview|阶段进度|当前阶段的主要解释来源/)
  assert.doesNotMatch(reliabilitySection, /当前结论|statsReliabilityText\s*\(\s*totalSamples\s*\)|sampleStageRangeText|stats-diagnostic-stage-meta|stats-diagnostic-stage-chip/)
})
