import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('context detail progress uses the local clamp helper', async () => {
  const source = await readFile(new URL('./App.vue', import.meta.url), 'utf8')

  assert.match(source, /function contextCheckProgress\(check\) \{\s+return clampNumber\(/)
  assert.doesNotMatch(source, /function contextCheckProgress\(check\) \{\s+return clamp\(/)
})

test('context and rule details show evidence directly with a single evidence tab', async () => {
  const source = await readFile(new URL('./App.vue', import.meta.url), 'utf8')

  assert.match(source, /function modelInsightView\(model\) \{\s+if \(model\.key === 'context' \|\| model\.key === 'rule'\) \{\s+return 'evidence'/)
  assert.match(source, /function modelInsightTabs\(model\) \{\s+if \(model\.key === 'context' \|\| model\.key === 'rule'\) \{\s+return model\.tabs\.filter\(\(tab\) => tab\.key === 'evidence'\)/)
  assert.match(source, /function modelShowsInsightTabs\(model\) \{\s+return modelInsightTabs\(model\)\.length > 0/)
  assert.match(source, /v-if="modelShowsInsightTabs\(model\)" class="model-insight-tabs"/)
  assert.match(source, /v-for="tab in modelInsightTabs\(model\)"/)
})

test('evaluation summary model names highlight linked fusion cards', async () => {
  const source = await readFile(new URL('./App.vue', import.meta.url), 'utf8')

  assert.match(source, /const highlightedSummaryModelKey = ref\(null\)/)
  assert.match(source, /class="summary-model-link summary-model-link-dominant"/)
  assert.match(source, /'summary-linked': highlightedSummaryModelKey === row\.key/)
  assert.match(source, /@mouseenter="setSummaryModelHighlight\(/)
})

test('evaluation summary keeps original copy while styling dominant and auxiliary models differently', async () => {
  const source = await readFile(new URL('./App.vue', import.meta.url), 'utf8')

  assert.match(source, /const activeRows = weightRows\.value/)
  assert.match(source, /const dominantKey = modelDetailSummary\.value\.dominantModel \|\| activeRows\[0\]\?\.key \|\| null/)
  assert.match(source, /:class="evaluationSummaryParts\.dominant\.key \? `summary-dominant-\$\{evaluationSummaryParts\.dominant\.key\}` : ''"/)
  assert.match(source, /<strong :key="evaluationSummaryParts\.motionKey" class="evaluation-summary-copy">/)
  assert.match(source, /当前由<span/)
  assert.match(source, /<\/span>主导，<template/)
  assert.match(source, /<\/template>作为辅助。/)
  assert.doesNotMatch(source, /阶段，结论仍需结合样本规模判断。/)
  assert.match(source, /summary-model-link summary-model-link-dominant/)
  assert.match(source, /summary-model-link summary-model-link-auxiliary/)
})

test('model detail rows animate when expanded or collapsed', async () => {
  const appSource = await readFile(new URL('./App.vue', import.meta.url), 'utf8')
  const styleSource = await readFile(new URL('./style.css', import.meta.url), 'utf8')

  assert.match(appSource, /const hasManualModelDetailInteraction = ref\(false\)/)
  assert.match(appSource, /if \(hasManualModelDetailInteraction\.value\) \{\s+return null/)
  assert.match(appSource, /function toggleModelDetail\(key\) \{\s+hasManualModelDetailInteraction\.value = true/)
  assert.match(appSource, /function selectModelDetail\(key\) \{\s+hasManualModelDetailInteraction\.value = true/)
  assert.match(appSource, /<Transition name="model-row-detail">/)
  assert.match(appSource, /v-if="expandedModelDetailKey === row\.key" class="model-row-detail"/)
  assert.match(styleSource, /\.model-row-detail-enter-active,\s+\.model-row-detail-leave-active \{/)
  assert.match(styleSource, /\.model-row-detail-enter-from,\s+\.model-row-detail-leave-to \{/)
  assert.match(styleSource, /opacity 220ms ease/)
  assert.match(styleSource, /transform: translateY\(-6px\)/)
})

test('disabled backtest models are de-emphasized and sorted last', async () => {
  const appSource = await readFile(new URL('./App.vue', import.meta.url), 'utf8')
  const styleSource = await readFile(new URL('./style.css', import.meta.url), 'utf8')

  assert.match(appSource, /const disabled = row\.status === 'disabled' \|\| weight <= ACTIVE_MODEL_WEIGHT_EPSILON/)
  assert.match(appSource, /if \(a\.disabled !== b\.disabled\) \{\s+return a\.disabled \? 1 : -1/)
  assert.match(appSource, /const defaultExpandedModelDetailKey = computed\(\(\) => modelEvaluationRows\.value\.find\(\(row\) => !row\.disabled\)\?\.key \|\| null\)/)
  assert.match(appSource, /if \(selectedKey && selectedRow && !collapsedModelDetailKeys\.value\.has\(selectedKey\)\) \{/)
  assert.doesNotMatch(appSource, /selectedRow && !selectedRow\.disabled/)
  assert.match(appSource, /disabled: row\.disabled/)
  assert.match(appSource, /class="disabled-model-badge"/)
  assert.match(appSource, /样本不足，暂未参与融合/)
  assert.match(styleSource, /\.model-bars article\.disabled,/)
  assert.match(styleSource, /\.model-bars article\.disabled \.model-row-progress b \{/)
  assert.match(styleSource, /\.disabled-model-badge/)
})

test('disabled fusion weight cards are dynamically de-emphasized', async () => {
  const appSource = await readFile(new URL('./App.vue', import.meta.url), 'utf8')
  const styleSource = await readFile(new URL('./style.css', import.meta.url), 'utf8')

  assert.match(appSource, /const disabled = weight <= ACTIVE_MODEL_WEIGHT_EPSILON \|\| modelDetailByKey\.value\.get\(key\)\?\.status === 'disabled'/)
  assert.match(appSource, /statusLabel: disabled \? '未启用' : weightDiagnosticText\(\{ weight \}\)/)
  assert.match(appSource, /statusTitle: disabled \? '样本不足，暂未参与融合' : `当前参与融合，权重 \$\{formatPercent\(weight\)\}`/)
  assert.match(appSource, /<em v-if="row\.disabled" class="fusion-disabled-badge">\{\{ row\.statusLabel \}\}<\/em>/)
  assert.match(appSource, /if \(row\.disabled\) \{\s+return `\$\{row\.label\}：\$\{row\.statusTitle\}`/)
  assert.match(appSource, /if \(row\?\.disabled\) \{\s+return 'disabled'/)
  assert.match(styleSource, /\.fusion-weight-card\.disabled,/)
  assert.match(styleSource, /\.fusion-disabled-badge/)
  assert.match(styleSource, /\.fusion-weight-card\.disabled b \{/)
})

test('rule model detail keeps only evidence and does not duplicate statistics charts', async () => {
  const appSource = await readFile(new URL('./App.vue', import.meta.url), 'utf8')
  const styleSource = await readFile(new URL('./style.css', import.meta.url), 'utf8')
  const detailSource = await readFile(new URL('./services/modelDetails.js', import.meta.url), 'utf8')

  assert.doesNotMatch(appSource, /function ruleSummaryMetrics\(model\)/)
  assert.doesNotMatch(appSource, /v-if="model\.key === 'rule'" class="rule-summary-panel"/)
  assert.doesNotMatch(appSource, /完整副词条分布请在统计页查看。/)
  assert.doesNotMatch(appSource, /v-if="model\.key === 'rule'" class="rule-deviation-chart"/)
  assert.doesNotMatch(appSource, /<strong>均衡线<\/strong>/)
  assert.doesNotMatch(detailSource, /均衡线/)
  assert.doesNotMatch(styleSource, /\.rule-summary-panel \{/)
  assert.doesNotMatch(styleSource, /\.rule-summary-metrics \{/)
})

test('evaluation metrics use backend values instead of preview fallbacks', async () => {
  const appSource = await readFile(new URL('./App.vue', import.meta.url), 'utf8')
  const detailSource = await readFile(new URL('./services/modelDetails.js', import.meta.url), 'utf8')

  assert.doesNotMatch(appSource, /preview:\s*(2\.16|0\.86|0\.11|0\.34|0\.52)/)
  assert.match(appSource, /if \(metric\.value == null\) \{\s+return '样本不足'/)
  assert.match(appSource, /const evaluationReady = computed\(\(\) => evaluation\.value\?\.status === 'ready'/)
  assert.doesNotMatch(detailSource, /MODEL_BACKTEST_PREVIEW/)
  assert.ok(detailSource.includes('hitRate: evaluation?.model_scores?.[key]?.hit_rate ?? null'))
  assert.ok(detailSource.includes('loss: evaluation?.model_scores?.[key]?.loss ?? null'))
})

test('evaluation page exposes evaluated sample counts and gates confidence labels', async () => {
  const appSource = await readFile(new URL('./App.vue', import.meta.url), 'utf8')
  const detailSource = await readFile(new URL('./services/modelDetails.js', import.meta.url), 'utf8')

  assert.ok(detailSource.includes('evaluated: evaluation?.model_scores?.[key]?.evaluated ?? 0'))
  assert.match(appSource, /const modelBacktestSummaryText = computed\(\(\) => \(modelBacktestSampleCount\.value \? `回测样本 \$\{modelBacktestSampleCount\.value\} 条` : '等待回测样本'\)\)/)
  assert.match(appSource, /<span :title="modelBacktestSummaryText">\{\{ modelBacktestSummaryText \}\}<\/span>/)
  assert.match(appSource, /:title="row\.evaluated \? `\$\{row\.label\}基于 \$\{row\.evaluated\} 条样本回测` : `\$\{row\.label\}等待回测样本`"/)
  assert.doesNotMatch(appSource, /function modelEvaluatedText/)
  assert.match(appSource, /isBest: !disabled && evaluationReady\.value && bestHitRate != null && row\.hitRate === bestHitRate/)
  assert.match(appSource, /if \(evaluation\.value && evaluation\.value\.status !== 'ready'\) \{\s+return '样本不足'/)
  assert.doesNotMatch(appSource, /<span>\{\{ modelEvaluatedText\(row\) \}\}<\/span>/)
})

test('stats page focuses on analytics charts instead of prediction diagnostics', async () => {
  const appSource = await readFile(new URL('./App.vue', import.meta.url), 'utf8')
  const styleSource = await readFile(new URL('./style.css', import.meta.url), 'utf8')

  assert.doesNotMatch(appSource, /class="product-panel prediction-strip stats-prediction-strip"/)
  assert.doesNotMatch(appSource, /<h2>预测依据<\/h2>/)
  assert.match(appSource, /class="stats-summary-bar"/)
  assert.match(appSource, /:class="item.tone"/)
  assert.match(appSource, /:title="item.title"/)
  assert.doesNotMatch(appSource, /class="stats-diagnostic-pill"/)
  assert.match(appSource, /基于 \$\{stats\.total_rolls \|\| 0\} 条样本/)
  assert.match(appSource, /class="stats-empty-state"/)
  assert.match(appSource, /class="substat-deviation-chart"/)
  assert.match(appSource, /class="deviation-axis-scale"/)
  assert.match(appSource, /class="sample-stage-axis"/)
  assert.match(appSource, /class="sample-stage-marker"/)
  assert.match(appSource, /stage\.current/)
  assert.match(appSource, /<em v-if="stage\.current">当前<\/em>/)
  assert.match(appSource, /class="stats-chart-card sample-stage-card"/)
  assert.doesNotMatch(appSource, /context-progress-list/)
  assert.doesNotMatch(appSource, /最大偏高/)
  assert.doesNotMatch(appSource, /最大偏低/)
  assert.match(appSource, /当前偏高/)
  assert.match(appSource, /当前偏低/)
  assert.doesNotMatch(appSource, /上下文监控/)
  assert.match(appSource, /v-for="row in sortedStatFrequency"/)
  assert.match(appSource, /v-for="stage in sampleStageAxisRows"/)
  assert.doesNotMatch(appSource, /contextProgressRows/)
  assert.match(styleSource, /\.substat-deviation-row \{/)
  assert.match(styleSource, /\.deviation-axis-scale \{/)
  assert.match(styleSource, /\.sample-stage-marker \{/)
  assert.match(styleSource, /\.stats-empty-state \{/)
  assert.match(styleSource, /\.sample-stage-axis article\.current em \{/)
  assert.match(styleSource, /\.sample-stage-axis \{/)
  assert.match(styleSource, /\.sample-stage-card \{/)
  assert.match(styleSource, /grid-template-columns: minmax\(0, 1fr\);/)
  assert.doesNotMatch(styleSource, /\.context-progress-row \{/)
})
