<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  addSubstat,
  createEcho,
  getMe,
  getModelEvaluation,
  getPrediction,
  getStats,
  listEchoes,
  login,
  logout,
  register,
  undoLastSubstat,
  updateEcho,
} from './services/api'
import { displayEchoNumericId, generateNumericEchoUid, nextEchoSequence } from './services/echoId'
import { buildNextEchoConfig, isReusableDraft, sortVisibleEchoHistory, statusBadge } from './services/echoWorkflow'
import { confidenceText, formatPercent, formatSignedPercent, modelWeightLabel, sampleStageText, statusText } from './services/formatters'
import { ACTIVE_MODEL_WEIGHT_EPSILON, buildModelDetailCards } from './services/modelDetails'
import { mainStatLabels, mainStatsByCost, substatLabels, substatOrder, tierTables } from './data/substats'
import { sonataEffects } from './data/sonataEffects'
import historyMinimizeIcon from './assets/icons/window-minimize.svg'
import historyPinnedIcon from './assets/icons/pinned.svg'
import historyShowcaseIcon from './assets/icons/layout-list.svg'
import historyTerminalIcon from './assets/icons/rovers-terminal-expand.png'

const user = ref(null)
const page = ref('workspace')
const authUid = ref(localStorage.getItem('wuwa-player-uid') || '')
const saveLogin = ref(localStorage.getItem('wuwa-save-login') === 'true')
const error = ref('')
const loading = ref(true)
const saving = ref(false)

const echoes = ref([])
const activeEchoId = ref(null)
const prediction = ref(null)
const stats = ref(null)
const evaluation = ref(null)
const playerUid = ref(localStorage.getItem('wuwa-player-uid') || '')
const createPanelRef = ref(null)
const galleryPanelRef = ref(null)
const setupPanelHeight = ref(null)
const floatingHistoryRef = ref(null)
const floatingHistoryPosition = ref(readFloatingHistoryPosition())
const floatingHistoryExpandedSize = ref(readFloatingHistoryExpandedSize())
const floatingHistoryRestoreMinimizedPosition = ref(null)
const floatingHistoryRestoreShowcasePosition = ref(null)
const isHistoryMinimized = ref(localStorage.getItem('wuwa-floating-history-minimized') === 'true')
const isHistoryPinned = ref(localStorage.getItem('wuwa-floating-history-pinned') === 'true')
const isHistoryShowcase = ref(false)
const historyFilter = ref('all')
const historyDrag = ref(null)
const modelInsightViews = ref({})
const selectedModelDetailKey = ref(null)
const collapsedModelDetailKeys = ref(new Set())
const hasManualModelDetailInteraction = ref(false)
const highlightedSummaryModelKey = ref(null)
const markovAxisDrag = ref(null)
let historyPanelAnimationTimer = null
let suppressNextHistoryToggle = false
let suppressNextHistoryToggleTimer = null
const FLOATING_HISTORY_MINIMIZED_SIZE = 76
const TERMINAL_ICON_BASE_ANGLE = 350

const echoForm = ref({
  sonata: sonataEffects.at(-1).name,
  cost: 1,
  main_stat: 'atk_percent',
  is_continuous_tuning: false,
})

const activeEcho = computed(() => echoes.value.find((echo) => echo.id === activeEchoId.value) || null)
const sortedEchoes = computed(() => sortVisibleEchoHistory(echoes.value))
const historyFilterOptions = computed(() => {
  const visibleEchoes = sortedEchoes.value
  const counts = visibleEchoes.reduce(
    (nextCounts, echo) => {
      nextCounts.all += 1
      if (echo.id === activeEchoId.value) {
        nextCounts.current += 1
      }
      if (echo.status === 'archived') {
        nextCounts.discarded += 1
      } else if (echo.substats.length >= 5) {
        nextCounts.completed += 1
      } else if (echo.substats.length > 0) {
        nextCounts.pending += 1
      }
      return nextCounts
    },
    { all: 0, current: 0, pending: 0, completed: 0, discarded: 0 },
  )
  return [
    { key: 'all', label: '全部', count: counts.all },
    { key: 'current', label: '当前', count: counts.current },
    { key: 'pending', label: '待强化', count: counts.pending },
    { key: 'completed', label: '已强化', count: counts.completed },
    { key: 'discarded', label: '弃置', count: counts.discarded },
  ]
})
const filteredHistoryEchoes = computed(() => sortedEchoes.value.filter((echo) => {
  if (historyFilter.value === 'current') {
    return echo.id === activeEchoId.value
  }
  if (historyFilter.value === 'pending') {
    return echo.status !== 'archived' && echo.substats.length > 0 && echo.substats.length < 5
  }
  if (historyFilter.value === 'completed') {
    return echo.status !== 'archived' && echo.substats.length >= 5
  }
  if (historyFilter.value === 'discarded') {
    return echo.status === 'archived'
  }
  return true
}))
const activeSubstatTypes = computed(() => new Set((activeEcho.value?.substats || []).map((roll) => roll.substat_type)))
const candidateByType = computed(() => {
  const pairs = (prediction.value?.candidates || []).map((candidate) => [candidate.substat_type, candidate])
  return new Map(pairs)
})
const matrixRows = computed(() =>
  substatOrder.map((substatType) => ({
    substat_type: substatType,
    label: substatLabels[substatType],
    candidate: candidateByType.value.get(substatType) || null,
    tier_table: tierTables[substatType],
    recorded: activeEcho.value?.substats.find((roll) => roll.substat_type === substatType) || null,
    topPredicted: topCandidate.value?.substat_type === substatType,
  })),
)
const legalMainStats = computed(() => mainStatsByCost[echoForm.value.cost] || [])
const progressPercent = computed(() => Math.min(((activeEcho.value?.substats.length || 0) / 5) * 100, 100))
const topCandidate = computed(() => prediction.value?.candidates?.[0] || null)
const selectedSonata = computed(() => sonataEffects.find((effect) => effect.name === echoForm.value.sonata) || sonataEffects.at(-1))
const canonicalModelLabels = {
  rule: '规则均衡',
  bayes: '周期规律',
  markov: '近期序列',
  cycle: '词条窗口',
  context: '上下文监测',
}

function canonicalModelLabel(key, fallback) {
  return canonicalModelLabels[key] || fallback || modelWeightLabel(key)
}

const modelDetailCards = computed(() =>
  buildModelDetailCards({
    prediction: prediction.value,
    stats: stats.value,
    evaluation: evaluation.value,
    echoes: echoes.value,
    labels: substatLabels,
  }),
)
const modelDetailSummary = computed(() => modelDetailCards.value.summary || {})
const modelDetailByKey = computed(() => new Map((modelDetailCards.value || []).map((model) => [model.key, model])))
const weightRows = computed(() =>
  Object.entries(prediction.value?.weights || {}).map(([key, weight]) => {
    const disabled = weight <= ACTIVE_MODEL_WEIGHT_EPSILON || modelDetailByKey.value.get(key)?.status === 'disabled'
    return {
      key,
      label: canonicalModelLabel(key, prediction.value?.model_labels?.[key]),
      weight,
      baseWeight: prediction.value?.base_weights?.[key],
      adjustment: prediction.value?.weight_adjustments?.[key] || null,
      disabled,
      statusLabel: disabled ? '未启用' : weightDiagnosticText({ weight }),
      statusTitle: disabled ? '样本不足，暂未参与融合' : `当前参与融合，权重 ${formatPercent(weight)}`,
    }
  }),
)
const evaluationMetrics = computed(() => [
  {
    label: 'Log Loss',
    value: evaluation.value?.log_loss,
    target: '越低越好',
    description: '概率分布是否把真实词条放在高概率区间',
  },
  {
    label: 'Brier Score',
    value: evaluation.value?.brier_score,
    target: '越低越好',
    description: '预测概率和真实结果的平方误差',
  },
  {
    label: 'Top 1 命中率',
    value: evaluation.value?.top_1_hit_rate,
    target: '越高越好',
    description: '概率第一名是否命中真实词条',
  },
  {
    label: 'Top 3 命中率',
    value: evaluation.value?.top_3_hit_rate,
    target: '越高越好',
    description: '前三名候选是否覆盖真实词条',
  },
  {
    label: 'Top 5 命中率',
    value: evaluation.value?.top_5_hit_rate,
    target: '越高越好',
    description: '前五名候选是否覆盖真实词条',
  },
])
const hitRateMetrics = computed(() => evaluationMetrics.value.filter((metric) => metric.label.includes('命中率')))
const technicalEvaluationMetrics = computed(() => evaluationMetrics.value.filter((metric) => !metric.label.includes('命中率')))
const evaluationReady = computed(() => evaluation.value?.status === 'ready')
const modelBacktestSampleCount = computed(() => Math.max(...modelEvaluationRows.value.map((row) => row.evaluated || 0), 0))
const modelBacktestSummaryText = computed(() => (modelBacktestSampleCount.value ? `回测样本 ${modelBacktestSampleCount.value} 条` : '等待回测样本'))
const modelBacktestNotes = {
  rule: '全局分布修正',
  bayes: '历史片段匹配',
  markov: '近期重复冷却',
  cycle: '窗口信号监测',
  context: '样本不足，暂未参与融合',
}
const modelEvaluationRows = computed(() => {
  const rows = (modelDetailCards.value || []).filter((model) => model?.key)
  const hitRates = rows.map((row) => row.hitRate).filter((value) => value != null)
  const bestHitRate = hitRates.length ? Math.max(...hitRates) : null
  const modelOrder = new Map(['rule', 'bayes', 'markov', 'cycle', 'context'].map((key, index) => [key, index]))
  return rows
    .map((row) => {
      const weight = prediction.value?.weights?.[row.key] ?? { rule: 0.7, bayes: 0.1, markov: 0.1, cycle: 0.1, context: 0 }[row.key]
      const disabled = row.status === 'disabled' || weight <= ACTIVE_MODEL_WEIGHT_EPSILON
      return {
        key: row.key,
        label: row.title,
        hitRate: row.hitRate,
        loss: row.loss,
        evaluated: row.evaluated,
        note: modelBacktestNotes[row.key] || row.role,
        weight,
        disabled,
        statusLabel: row.statusLabel,
        modelOrder: modelOrder.get(row.key) ?? 999,
        relativeHitRate: bestHitRate > 0 && row.hitRate != null ? row.hitRate / bestHitRate : 0,
        isBest: !disabled && evaluationReady.value && bestHitRate != null && row.hitRate === bestHitRate,
      }
    })
    .sort((a, b) => {
      if (a.disabled !== b.disabled) {
        return a.disabled ? 1 : -1
      }
      if (a.disabled && b.disabled) {
        return a.modelOrder - b.modelOrder
      }
      return (b.hitRate ?? -1) - (a.hitRate ?? -1)
    })
})
const defaultExpandedModelDetailKey = computed(() => modelEvaluationRows.value.find((row) => !row.disabled)?.key || null)
const expandedModelDetailKey = computed(() => {
  const selectedKey = selectedModelDetailKey.value
  const selectedRow = modelEvaluationRows.value.find((row) => row.key === selectedKey)
  if (selectedKey && selectedRow && !collapsedModelDetailKeys.value.has(selectedKey)) {
    return selectedKey
  }
  if (hasManualModelDetailInteraction.value) {
    return null
  }
  const defaultKey = defaultExpandedModelDetailKey.value
  if (defaultKey && !collapsedModelDetailKeys.value.has(defaultKey)) {
    return defaultKey
  }
  return null
})
const sampleStageRows = computed(() => [
  { label: '0-500', text: '规则基线', active: (stats.value?.total_rolls || 0) < 500 },
  { label: '500-3000', text: '总体偏差', active: (stats.value?.total_rolls || 0) >= 500 && (stats.value?.total_rolls || 0) < 3000 },
  { label: '3000-10000', text: '上下文检验', active: (stats.value?.total_rolls || 0) >= 3000 && (stats.value?.total_rolls || 0) < 10000 },
  { label: '10000-50000', text: '顺序依赖', active: (stats.value?.total_rolls || 0) >= 10000 && (stats.value?.total_rolls || 0) < 50000 },
  { label: '50000+', text: '权重优化', active: (stats.value?.total_rolls || 0) >= 50000 },
])
const sortedStatFrequency = computed(() => {
  const rows = Object.values(stats.value?.substat_frequency || {})
  return rows
    .map((row) => ({
      ...row,
      deviation: statDeviation(row),
      absDeviation: Math.abs(statDeviation(row)),
    }))
    .sort((left, right) => right.absDeviation - left.absDeviation)
})
const maxAbsStatDeviation = computed(() => Math.max(...sortedStatFrequency.value.map((row) => row.absDeviation), 0.01))
const hottestStatRow = computed(() => sortedStatFrequency.value.filter((row) => row.deviation > 0).sort((left, right) => right.deviation - left.deviation)[0] || null)
const coldestStatRow = computed(() => sortedStatFrequency.value.filter((row) => row.deviation < 0).sort((left, right) => left.deviation - right.deviation)[0] || null)
const sampleStageProgress = computed(() => clampNumber((stats.value?.total_rolls || 0) / 50000))
const visualSampleStageProgress = computed(() => {
  const progress = sampleStageProgress.value
  return progress > 0 ? Math.max(progress, 0.012) : 0
})
const statsReliabilityText = computed(() => {
  const total = stats.value?.total_rolls || 0
  if (total >= 50000) {
    return '可优化权重'
  }
  if (total >= 10000) {
    return '稳定观察'
  }
  if (total >= 3000) {
    return '可作参考'
  }
  if (total >= 500) {
    return '初步观察'
  }
  return '起步观察'
})
const statsSummaryItems = computed(() => [
  {
    label: '样本可信度',
    value: stats.value ? statsReliabilityText.value : '等待样本',
    tone: 'primary',
    title: `基于 ${stats.value?.total_rolls || 0} 条样本判断当前统计可信度`,
  },
  {
    label: '总样本',
    value: `${stats.value?.total_rolls || 0} 条`,
    title: `基于 ${stats.value?.total_rolls || 0} 条已录入副词条样本`,
  },
  {
    label: '当前偏高',
    value: hottestStatRow.value ? `${hottestStatRow.value.label} ${formatSignedPercent(hottestStatRow.value.deviation)}` : '暂无',
    title: hottestStatRow.value ? `基于 ${stats.value?.total_rolls || 0} 条样本，${hottestStatRow.value.label} 当前观察值高于基线 ${formatSignedPercent(hottestStatRow.value.deviation)}` : `基于 ${stats.value?.total_rolls || 0} 条样本，暂无偏高项`,
  },
  {
    label: '当前偏低',
    value: coldestStatRow.value ? `${coldestStatRow.value.label} ${formatSignedPercent(coldestStatRow.value.deviation)}` : '暂无',
    title: coldestStatRow.value ? `基于 ${stats.value?.total_rolls || 0} 条样本，${coldestStatRow.value.label} 当前观察值低于基线 ${formatSignedPercent(coldestStatRow.value.deviation)}` : `基于 ${stats.value?.total_rolls || 0} 条样本，暂无偏低项`,
  },
])
const sampleStageAxisRows = computed(() => {
  const total = stats.value?.total_rolls || 0
  return [
    { label: '0', caption: '规则基线', threshold: 0, active: total >= 0, current: total < 500 },
    { label: '500', caption: '总体偏差', threshold: 500, active: total >= 500, current: total >= 500 && total < 3000 },
    { label: '3000', caption: '上下文检验', threshold: 3000, active: total >= 3000, current: total >= 3000 && total < 10000 },
    { label: '10000', caption: '顺序依赖', threshold: 10000, active: total >= 10000, current: total >= 10000 && total < 50000 },
    { label: '50000+', caption: '权重优化', threshold: 50000, active: total >= 50000, current: total >= 50000 },
  ]
})
const setupPanelStyle = computed(() => (setupPanelHeight.value ? { height: `${setupPanelHeight.value}px` } : {}))
const terminalIconRotation = ref(0)
const terminalExpandIconStyle = computed(() => ({
  '--terminal-angle': `${terminalIconRotation.value}deg`,
}))
const floatingHistoryStyle = computed(() => {
  if (typeof window !== 'undefined' && window.matchMedia('(max-width: 860px)').matches) {
    return {}
  }
  return {
    left: `${floatingHistoryPosition.value.x}px`,
    top: `${floatingHistoryPosition.value.y}px`,
  }
})

function readFloatingHistoryPosition() {
  try {
    const stored = JSON.parse(localStorage.getItem('wuwa-floating-history-position') || 'null')
    if (Number.isFinite(stored?.x) && Number.isFinite(stored?.y)) {
      return stored
    }
  } catch {
    // Ignore invalid saved panel coordinates.
  }
  return { x: 32, y: 150 }
}

function readFloatingHistoryExpandedSize() {
  try {
    const stored = JSON.parse(localStorage.getItem('wuwa-floating-history-expanded-size') || 'null')
    if (Number.isFinite(stored?.width) && Number.isFinite(stored?.height)) {
      return stored
    }
  } catch {
    // Ignore invalid saved panel size.
  }
  return { width: 360, height: 501 }
}

function waitForFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve())
  })
}

async function syncSetupPanelHeight() {
  await nextTick()
  await waitForFrame()
  if (!createPanelRef.value || !galleryPanelRef.value || window.matchMedia('(max-width: 860px)').matches) {
    setupPanelHeight.value = null
    return
  }
  setupPanelHeight.value = Math.ceil(galleryPanelRef.value.getBoundingClientRect().height)
}

function setCost(cost) {
  echoForm.value.cost = cost
  if (!legalMainStats.value.includes(echoForm.value.main_stat)) {
    echoForm.value.main_stat = legalMainStats.value[0]
  }
}

function resetEchoForm() {
  echoForm.value.is_continuous_tuning = false
}

function setPlayerUid(value) {
  playerUid.value = value.trim()
  localStorage.setItem('wuwa-player-uid', playerUid.value)
}

function generateEchoUid() {
  return generateNumericEchoUid({
    playerUid: playerUid.value,
    sonataId: selectedSonata.value.id,
    cost: echoForm.value.cost,
    mainStat: echoForm.value.main_stat,
    sequence: nextEchoSequence(playerUid.value),
  })
}

function evaluationMetricText(metric) {
  if (metric.value == null) {
    return '样本不足'
  }
  const value = metric.value
  if (metric.label.includes('命中率')) {
    return formatPercent(value)
  }
  return value.toFixed(2)
}

function evaluationMetricFill(metric) {
  if (metric.value == null) {
    return '0%'
  }
  const value = metric.value
  if (metric.label.includes('命中率')) {
    return `${Math.min(value * 100, 100)}%`
  }
  return `${Math.max(8, Math.min((1 - value / 3) * 100, 100))}%`
}

function evaluationStatusText() {
  if (evaluation.value && evaluation.value.status !== 'ready') {
    return '样本不足'
  }
  const total = stats.value?.total_rolls || 0
  if (total >= 3000) {
    return '稳定'
  }
  if (total >= 500) {
    return '可参考'
  }
  return '观察中'
}

function percentPosition(value) {
  return `${Math.min(Math.max((value ?? 0) * 100, 0), 100)}%`
}

function fusionWeightTooltip(row) {
  if (row.disabled) {
    return `${row.label}：${row.statusTitle}`
  }
  const baseText = `基础 ${formatPercent(row.baseWeight)}`
  const hitText = row.adjustment?.hit_rate == null ? 'Top1 回测暂无' : `Top1 回测 ${formatPercent(row.adjustment.hit_rate)}`
  const directionText = row.adjustment?.direction === 'up'
    ? '上调'
    : row.adjustment?.direction === 'down'
      ? '下调'
      : '持平'
  return `${baseText} · ${hitText} · ${directionText}至 ${formatPercent(row.weight)}`
}

function evaluationSummaryText() {
  const dominant = modelDetailSummary.value.dominantLabel || '暂无主导模型'
  const auxiliaries = modelDetailSummary.value.auxiliaryLabels?.length
    ? modelDetailSummary.value.auxiliaryLabels.join(' / ')
    : '暂无辅助信号'
  return `当前由${dominant}主导，${auxiliaries}作为辅助。`
}

const evaluationSummaryParts = computed(() => {
  const activeRows = weightRows.value
    .filter((row) => (row.weight ?? 0) > ACTIVE_MODEL_WEIGHT_EPSILON)
    .sort((left, right) => (right.weight ?? 0) - (left.weight ?? 0))
  const dominantKey = modelDetailSummary.value.dominantModel || activeRows[0]?.key || null
  const diagnosticAuxiliaryKeys = modelDetailSummary.value.auxiliaryModels || []
  const auxiliaryKeys = diagnosticAuxiliaryKeys.length
    ? diagnosticAuxiliaryKeys
    : activeRows
      .filter((row) => row.key !== dominantKey)
      .slice(0, 2)
      .map((row) => row.key)
  const dominantLabel = dominantKey
    ? canonicalModelLabel(dominantKey, modelDetailSummary.value.dominantLabel)
    : modelDetailSummary.value.dominantLabel || '暂无主导模型'
  const auxiliaries = auxiliaryKeys.length
    ? auxiliaryKeys.map((key, index) => ({
      key,
      label: canonicalModelLabel(key, modelDetailSummary.value.auxiliaryLabels?.[index]),
      weight: prediction.value?.weights?.[key] ?? null,
    }))
    : [{ key: null, label: modelDetailSummary.value.auxiliaryLabels?.[0] || '暂无辅助信号', weight: null }]
  return {
    dominant: {
      key: dominantKey,
      label: dominantLabel,
      weight: prediction.value?.weights?.[dominantKey] ?? null,
    },
    auxiliaries,
    motionKey: [
      dominantKey || 'none',
      ...auxiliaries.map((model) => model.key || model.label),
      evaluationStatusText(),
    ].join(':'),
  }
})

function setSummaryModelHighlight(key) {
  highlightedSummaryModelKey.value = key
}

function clearSummaryModelHighlight() {
  highlightedSummaryModelKey.value = null
}

function coverageNodePosition(index) {
  return [10, 50, 90][index] ?? 50
}

function coverageNodeClass(index) {
  return ['start', 'middle', 'end'][index] || ''
}

function coverageGainText(metrics) {
  const first = metrics[0]
  const last = metrics.at(-1)
  if (!first || !last || first.value == null || last.value == null) {
    return '回测样本不足'
  }
  const gain = last.value - first.value
  return `Top5 相比 Top1 命中率提升 ${formatSignedPercent(gain)}，`
}

function coverageMetricLabel(metric) {
  if (metric.label.includes('Top 1')) {
    return 'Top 1 · 首选预测'
  }
  if (metric.label.includes('Top 3')) {
    return 'Top 3 · 推荐参考'
  }
  return 'Top 5 · 补充检查'
}

function calibrationSummaryText() {
  const logLoss = technicalEvaluationMetrics.value.find((metric) => metric.label === 'Log Loss')
  const brier = technicalEvaluationMetrics.value.find((metric) => metric.label === 'Brier Score')
  return `概率校准：Log Loss ${evaluationMetricText(logLoss)} · Brier ${evaluationMetricText(brier)}`
}

function modelMetricText(metric) {
  if (metric.type === 'percent') {
    return formatPercent(metric.value)
  }
  if (metric.type === 'signedPercent') {
    return formatSignedPercent(metric.value)
  }
  if (metric.type === 'decimal') {
    return Number(metric.value || 0).toFixed(2)
  }
  return `${Math.round(metric.value || 0)}`
}

function modelHitRateText(row) {
  return row.hitRate == null ? '样本不足' : formatPercent(row.hitRate)
}

function modelLossText(row) {
  return row.loss == null ? '样本不足' : row.loss.toFixed(2)
}

function modelProgressTitle(row) {
  if (row.hitRate == null || !modelEvaluationRows.value[0]?.hitRate) {
    return '回测样本不足，暂不显示相对命中率。'
  }
  return `仅表示相对命中率：${formatPercent(row.hitRate)} / ${formatPercent(modelEvaluationRows.value[0].hitRate)}`
}

function modelBarText(bar) {
  if (bar.type === 'percent') {
    return formatPercent(bar.value)
  }
  if (bar.type === 'signedPercent') {
    return formatSignedPercent(bar.value)
  }
  return `${Math.round(bar.value || 0)}`
}

function modelBarStyle(bar) {
  const width = Math.max(bar.value ? 5 : 0, Math.min((bar.width || 0) * 100, 100))
  return { width: `${width}%` }
}

function ruleDeviationStyle(bar) {
  const width = Math.max(bar.value ? 4 : 0, Math.min((bar.width || 0) * 50, 50))
  return bar.value < 0
    ? { width: `${width}%`, right: '50%' }
    : { width: `${width}%`, left: '50%' }
}

function ruleDeviationTitle(bar) {
  const observed = bar.observedRate == null ? null : formatPercent(bar.observedRate)
  const base = bar.baseRate == null ? null : formatPercent(bar.baseRate)
  return observed && base
    ? `${bar.label}: 观察 ${observed}，基线 ${base}，偏差 ${modelBarText(bar)}`
    : `${bar.label}: 偏差 ${modelBarText(bar)}`
}

function modelSegmentStyle(segment) {
  return { width: formatPercent(segment.value) }
}

function bayesContributionStyle(segment) {
  return { width: formatPercent(segment.value) }
}

function bayesSegmentRole(segment) {
  return segment.label === 'Exact' ? '主路径' : '泛化补充'
}

function bayesSegmentDescription(segment) {
  return segment.label === 'Exact'
    ? '历史里出现过同样走势，当前判断更有底。'
    : '完整片段不够时，用相似走势补充参考。'
}

function modelJudgementSummary(model) {
  if (model.key === 'bayes') {
    const exact = model.segments.find((segment) => segment.label === 'Exact')?.value ?? 0
    const wildcard = model.segments.find((segment) => segment.label === 'Wildcard')?.value ?? 0
    return exact >= wildcard
      ? `若当前走势和历史完整片段接近，则判断更有把握。`
      : `当前完整片段不够明显，会更多参考相似走势。`
  }
  if (model.key === 'rule') {
    return '副词条分布越偏离基线，修正力度越强。'
  }
  if (model.key === 'markov') {
    return '按录入顺序查看最近 12 条，重复越密集，冷却越强。'
  }
  if (model.key === 'cycle') {
    return '实时观察双爆窗口和普通副词条组的当前倾向。'
  }
  return '观察套装、COST、主词条类型和副词条位置是否会对副词条出词倾向产生影响。'
}

function modelInsightClass(model) {
  return [weightDiagnosticClass(model), `model-${model.key}`, model.status]
}

function selectModelDetail(key) {
  hasManualModelDetailInteraction.value = true
  selectedModelDetailKey.value = key
  const nextCollapsed = new Set(collapsedModelDetailKeys.value)
  nextCollapsed.delete(key)
  collapsedModelDetailKeys.value = nextCollapsed
}

function toggleModelDetail(key) {
  hasManualModelDetailInteraction.value = true
  const nextCollapsed = new Set(collapsedModelDetailKeys.value)
  if (expandedModelDetailKey.value === key) {
    nextCollapsed.add(key)
    if (selectedModelDetailKey.value === key) {
      selectedModelDetailKey.value = null
    }
  } else {
    selectedModelDetailKey.value = key
    nextCollapsed.delete(key)
  }
  collapsedModelDetailKeys.value = nextCollapsed
}

function modelDetailForKey(key) {
  return modelDetailByKey.value.get(key) || null
}

function modelDetailListForKey(key) {
  const model = modelDetailForKey(key)
  return model ? [model] : []
}

function sequenceItemClass(item) {
  const type = item?.type || ''
  const typeClass = type ? `seq-type-${type.replaceAll('_', '-')}` : ''
  return {
    [typeClass]: Boolean(typeClass),
    'seq-crit': type.includes('crit'),
    'seq-attack': type.includes('atk') || type.includes('attack'),
    'seq-hp': type.includes('hp'),
    'seq-defense': type.includes('def'),
    'seq-energy': type.includes('energy'),
    'seq-damage': type.includes('damage') && !type.includes('crit'),
    overheated: item?.overheated,
  }
}

function markovAxisTrackStyle(model) {
  const nodeCount = model?.timelineNodes?.length || 1
  const nodeWidth = 184
  return {
    '--node-count': nodeCount,
    minWidth: `max(${nodeCount * nodeWidth + 112}px, 100%)`,
  }
}

function markovAxisKey(model) {
  return model?.timelineNodes?.map((item) => `${item.index}:${item.type}`).join('|') || 'empty'
}

function contextCheckProgress(check) {
  return clampNumber((check?.sampleSize || 0) / Math.max(check?.recommended || 1, 1))
}

function contextOverallCheck(model) {
  return model?.contextChecks?.[0] || { sampleSize: 0, recommended: 3000 }
}

function contextOverallProgress(model) {
  return contextCheckProgress(contextOverallCheck(model))
}

function moveMarkovAxis(event) {
  if (!markovAxisDrag.value) {
    return
  }
  const drag = markovAxisDrag.value
  const deltaX = event.clientX - drag.startX
  drag.element.scrollLeft = drag.startScrollLeft - deltaX
  if (Math.abs(deltaX) > 3) {
    drag.moved = true
  }
}

function endMarkovAxisDrag() {
  if (!markovAxisDrag.value) {
    return
  }
  markovAxisDrag.value.element.classList.remove('dragging')
  markovAxisDrag.value = null
  document.removeEventListener('pointermove', moveMarkovAxis)
  document.removeEventListener('pointerup', endMarkovAxisDrag)
  document.removeEventListener('pointercancel', endMarkovAxisDrag)
}

function startMarkovAxisDrag(event) {
  if (event.button !== 0) {
    return
  }
  const element = event.currentTarget
  if (!element || element.scrollWidth <= element.clientWidth) {
    return
  }
  markovAxisDrag.value = {
    element,
    startX: event.clientX,
    startScrollLeft: element.scrollLeft,
    moved: false,
  }
  element.classList.add('dragging')
  element.setPointerCapture?.(event.pointerId)
  document.addEventListener('pointermove', moveMarkovAxis)
  document.addEventListener('pointerup', endMarkovAxisDrag)
  document.addEventListener('pointercancel', endMarkovAxisDrag)
  event.preventDefault()
}

function modelInsightView(model) {
  if (model.key === 'context' || model.key === 'rule') {
    return 'evidence'
  }
  return modelInsightViews.value[model.key] || 'distribution'
}

function setModelInsightView(model, view) {
  modelInsightViews.value = {
    ...modelInsightViews.value,
    [model.key]: view,
  }
}

function modelInsightTabLabel(tab) {
  return tab.label
}

function modelInsightTabs(model) {
  if (model.key === 'context' || model.key === 'rule') {
    return model.tabs.filter((tab) => tab.key === 'evidence')
  }
  return model.tabs
}

function modelShowsInsightTabs(model) {
  return modelInsightTabs(model).length > 0
}

function modelEvidenceNote(model, index) {
  if (model.key === 'bayes') {
    return [
      '历史里出现过同样片段，说明这条走势更可靠。',
      '完整片段不够时，允许中间一步不同来找相似走势。',
      '样本少时会放缓判断，避免少量记录把结果带偏。',
    ][index] || model.chartNote
  }
  if (model.key === 'rule') {
    return [
      '比较实际出词和理论均分，判断哪些词条偏热或偏冷。',
      '只统计当前声骸真的可能出的副词条，避免无效选项干扰判断。',
      '偏离基线越远，修正力度越强。',
    ][index] || model.chartNote
  }
  if (model.key === 'markov') {
    return [
      '按录入顺序查看最近 12 条副词条。',
      '同一候选短时间内重复越多，越容易触发冷却。',
      '该子模型只负责降温，不会把冷门项主动抬高。',
    ][index] || model.chartNote
  }
  if (model.key === 'cycle') {
    return [
      '判断双爆现在是继续升温、单边偏向，还是进入冷却。',
      '观察普通副词条大类谁更可能接棒。',
      '在更可能接棒的大类里，进一步细分到具体词条。',
    ][index] || model.chartNote
  }
  if (model.key === 'context') {
    return [
      '记录声骸套装效果，如凝夜白霜、熔山裂谷、啸谷长风等。',
      '区分声骸 COST：COST 4 / COST 3 / COST 1。',
      '识别主词条类型，如暴击率、暴击伤害、攻击力、属性伤害等。',
      '标记副词条出现位置：第 1 / 2 / 3 / 4 / 5 条。',
    ][index] || model.chartNote
  }
  return model.chartNote
}

function statDeviation(row) {
  return (row?.observed_rate ?? 0) - (row?.baseline_rate ?? 0)
}

function statDiagnosticClass(row) {
  const deviation = statDeviation(row)
  if (deviation >= 0.03) {
    return 'hot'
  }
  if (deviation <= -0.03) {
    return 'warn'
  }
  return 'cool'
}

function statDiagnosticText(row) {
  const deviation = statDeviation(row)
  if (deviation >= 0.03) {
    return '偏高'
  }
  if (deviation <= -0.03) {
    return '偏低'
  }
  return '稳定'
}

function weightDiagnosticClass(row) {
  if (row?.disabled) {
    return 'disabled'
  }
  if ((row?.weight ?? 0) >= 0.35) {
    return 'hot'
  }
  if ((row?.weight ?? 0) <= 0.05) {
    return 'warn'
  }
  return 'cool'
}

function weightDiagnosticText(row) {
  if ((row?.weight ?? 0) <= ACTIVE_MODEL_WEIGHT_EPSILON) {
    return '未启用'
  }
  if ((row?.weight ?? 0) >= 0.35) {
    return '主导'
  }
  if ((row?.weight ?? 0) <= 0.05) {
    return '低权重'
  }
  return '参与'
}

function candidateDiagnosticClass(candidate, index) {
  if (index === 0) {
    return 'hot'
  }
  if ((candidate?.baseline_deviation ?? 0) < -0.03) {
    return 'warn'
  }
  return 'cool'
}

function constrainFloatingHistoryPosition(position, size = {}) {
  if (typeof window === 'undefined') {
    return position
  }
  const panel = floatingHistoryRef.value
  const width = size.width || panel?.offsetWidth || 360
  const height = size.height || panel?.offsetHeight || 520
  const padding = 12
  return {
    x: Math.min(Math.max(position.x, padding), Math.max(padding, window.innerWidth - width - padding)),
    y: Math.min(Math.max(position.y, padding), Math.max(padding, window.innerHeight - height - padding)),
  }
}

function getFloatingHistoryCorner(rect) {
  if (typeof window === 'undefined' || !rect) {
    return { horizontal: 'left', vertical: 'bottom' }
  }
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2
  return {
    horizontal: centerX < window.innerWidth / 2 ? 'left' : 'right',
    vertical: centerY < window.innerHeight / 2 ? 'top' : 'bottom',
  }
}

function getFloatingHistoryPositionForCorner(basePosition, baseSize, targetSize, corner) {
  return constrainFloatingHistoryPosition(
    {
      x: corner.horizontal === 'right'
        ? basePosition.x + baseSize.width - targetSize.width
        : basePosition.x,
      y: corner.vertical === 'bottom'
        ? basePosition.y + baseSize.height - targetSize.height
        : basePosition.y,
    },
    targetSize,
  )
}

function getFloatingHistoryPositionForCenter(basePosition, baseSize, targetSize) {
  return constrainFloatingHistoryPosition(
    {
      x: basePosition.x + baseSize.width / 2 - targetSize.width / 2,
      y: basePosition.y + baseSize.height / 2 - targetSize.height / 2,
    },
    targetSize,
  )
}

function getFloatingHistoryCornerMotion(corner, distance = 10) {
  const x = corner.horizontal === 'right' ? distance : -distance
  const y = corner.vertical === 'bottom' ? distance : -distance
  return `translate3d(${x}px, ${y}px, 0)`
}

function clampNumber(value, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max)
}

function angleToVector(angle) {
  const radians = (angle * Math.PI) / 180
  return { x: Math.sin(radians), y: -Math.cos(radians) }
}

function vectorToAngle(vector) {
  const angle = (Math.atan2(vector.x, -vector.y) * 180) / Math.PI
  return (angle + 360) % 360
}

function getClosestEquivalentAngle(targetAngle, currentAngle) {
  let nextAngle = targetAngle
  while (nextAngle - currentAngle > 180) {
    nextAngle -= 360
  }
  while (nextAngle - currentAngle < -180) {
    nextAngle += 360
  }
  return nextAngle
}

function getFloatingHistoryTerminalAngle(position = floatingHistoryPosition.value) {
  if (typeof window === 'undefined') {
    return 25
  }
  const size = isHistoryMinimized.value
    ? { width: FLOATING_HISTORY_MINIMIZED_SIZE, height: FLOATING_HISTORY_MINIMIZED_SIZE }
    : floatingHistoryExpandedSize.value
  const edgePadding = 24
  const xRatio = clampNumber((position.x - edgePadding) / Math.max(window.innerWidth - size.width - edgePadding * 2, 1))
  const yRatio = clampNumber((position.y - edgePadding) / Math.max(window.innerHeight - size.height - edgePadding * 2, 1))
  const cornerWeights = [
    { angle: 135, weight: (1 - xRatio) * (1 - yRatio) },
    { angle: 225, weight: xRatio * (1 - yRatio) },
    { angle: 45, weight: (1 - xRatio) * yRatio },
    { angle: 315, weight: xRatio * yRatio },
  ]
  const vector = cornerWeights.reduce(
    (sum, corner) => {
      const unit = angleToVector(corner.angle)
      return {
        x: sum.x + unit.x * corner.weight,
        y: sum.y + unit.y * corner.weight,
      }
    },
    { x: 0, y: 0 },
  )
  return vectorToAngle(vector)
}

function syncTerminalIconRotation(position = floatingHistoryPosition.value) {
  const targetRotation = getFloatingHistoryTerminalAngle(position) - TERMINAL_ICON_BASE_ANGLE
  terminalIconRotation.value = getClosestEquivalentAngle(targetRotation, terminalIconRotation.value)
}

function saveFloatingHistoryPosition(position = floatingHistoryPosition.value) {
  localStorage.setItem('wuwa-floating-history-position', JSON.stringify(position))
}

function saveFloatingHistoryExpandedSize(size = floatingHistoryExpandedSize.value) {
  localStorage.setItem('wuwa-floating-history-expanded-size', JSON.stringify(size))
}

function resetFloatingHistoryPanelAnimation(panel) {
  if (!panel) {
    return
  }
  panel.style.transition = ''
  panel.style.transform = ''
  panel.style.transformOrigin = ''
  panel.style.opacity = ''
  panel.style.filter = ''
  panel.style.borderRadius = ''
  panel.style.visibility = ''
}

function animateFloatingHistoryFade(panel, fromStyle, toStyle, duration = 220) {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!panel || prefersReducedMotion) {
    resetFloatingHistoryPanelAnimation(panel)
    return Promise.resolve()
  }

  clearTimeout(historyPanelAnimationTimer)
  historyPanelAnimationTimer = null

  panel.style.transition = 'none'
  Object.assign(panel.style, fromStyle)
  panel.getBoundingClientRect()

  requestAnimationFrame(() => {
    panel.style.transition = `opacity ${duration}ms ease-out, transform ${duration}ms cubic-bezier(0.2, 0.9, 0.18, 1), filter ${duration}ms ease-out, box-shadow 220ms ease-out`
    Object.assign(panel.style, toStyle)
  })

  return new Promise((resolve) => {
    const finish = () => {
      resetFloatingHistoryPanelAnimation(panel)
      historyPanelAnimationTimer = null
      resolve()
    }
    historyPanelAnimationTimer = window.setTimeout(finish, duration + 60)
  })
}

async function toggleFloatingHistorySize() {
  if (suppressNextHistoryToggle) {
    suppressNextHistoryToggle = false
    return
  }
  const panel = floatingHistoryRef.value
  if (historyPanelAnimationTimer && panel) {
    clearTimeout(historyPanelAnimationTimer)
    historyPanelAnimationTimer = null
    resetFloatingHistoryPanelAnimation(panel)
  }
  const startRect = panel?.getBoundingClientRect()
  const startPosition = { ...floatingHistoryPosition.value }
  const willMinimize = !isHistoryMinimized.value
  const restoreMinimizedPosition = floatingHistoryRestoreMinimizedPosition.value
  const historyCorner = getFloatingHistoryCorner(startRect)
  const cornerMotion = getFloatingHistoryCornerMotion(historyCorner)
  const inverseCornerMotion = getFloatingHistoryCornerMotion(historyCorner, -8)
  if (willMinimize && startRect) {
    floatingHistoryExpandedSize.value = { width: startRect.width, height: startRect.height }
    saveFloatingHistoryExpandedSize()
    isHistoryShowcase.value = false
    floatingHistoryRestoreShowcasePosition.value = null
  }
  const nextMinimizedPosition =
    willMinimize && startRect
      ? restoreMinimizedPosition
        ? constrainFloatingHistoryPosition(restoreMinimizedPosition, {
            width: FLOATING_HISTORY_MINIMIZED_SIZE,
            height: FLOATING_HISTORY_MINIMIZED_SIZE,
          })
        : getFloatingHistoryPositionForCorner(
            startPosition,
            { width: startRect.width, height: startRect.height },
            { width: FLOATING_HISTORY_MINIMIZED_SIZE, height: FLOATING_HISTORY_MINIMIZED_SIZE },
            historyCorner,
          )
      : null
  if (willMinimize && nextMinimizedPosition) {
    await animateFloatingHistoryFade(
      panel,
      { opacity: '1', transform: 'translate3d(0, 0, 0)', transformOrigin: `${historyCorner.horizontal} ${historyCorner.vertical}`, filter: 'blur(0)' },
      { opacity: '0', transform: cornerMotion, transformOrigin: `${historyCorner.horizontal} ${historyCorner.vertical}`, filter: 'blur(8px)' },
      180,
    )
    panel.style.transition = 'none'
    panel.style.opacity = '0'
    panel.style.transform = 'translate3d(0, 0, 0)'
    panel.style.filter = 'blur(6px)'
    isHistoryMinimized.value = true
    floatingHistoryRestoreMinimizedPosition.value = null
    localStorage.setItem('wuwa-floating-history-minimized', String(isHistoryMinimized.value))
    floatingHistoryPosition.value = nextMinimizedPosition
    syncTerminalIconRotation(nextMinimizedPosition)
    saveFloatingHistoryPosition(nextMinimizedPosition)
    await nextTick()
    await animateFloatingHistoryFade(
      panel,
      { opacity: '0', transform: inverseCornerMotion, transformOrigin: `${historyCorner.horizontal} ${historyCorner.vertical}`, filter: 'blur(6px)' },
      { opacity: '1', transform: 'translate3d(0, 0, 0)', transformOrigin: `${historyCorner.horizontal} ${historyCorner.vertical}`, filter: 'blur(0)' },
      200,
    )
    constrainSavedFloatingHistoryPosition()
    return
  }

  if (!willMinimize && startRect) {
    floatingHistoryRestoreMinimizedPosition.value = startPosition
    await animateFloatingHistoryFade(
      panel,
      { opacity: '1', transform: 'translate3d(0, 0, 0)', transformOrigin: `${historyCorner.horizontal} ${historyCorner.vertical}`, filter: 'blur(0)' },
      { opacity: '0', transform: cornerMotion, transformOrigin: `${historyCorner.horizontal} ${historyCorner.vertical}`, filter: 'blur(6px)' },
      150,
    )
    panel.style.transition = 'none'
    panel.style.opacity = '0'
    panel.style.transform = 'translate3d(0, 0, 0)'
    panel.style.filter = 'blur(8px)'
    panel.style.visibility = 'hidden'
  }

  isHistoryMinimized.value = willMinimize
  localStorage.setItem('wuwa-floating-history-minimized', String(isHistoryMinimized.value))
  await nextTick()
  if (nextMinimizedPosition) {
    floatingHistoryPosition.value = nextMinimizedPosition
    syncTerminalIconRotation(nextMinimizedPosition)
    saveFloatingHistoryPosition(nextMinimizedPosition)
    await nextTick()
  } else if (!willMinimize && startRect) {
    const expandedRect = panel?.getBoundingClientRect()
    if (expandedRect) {
      floatingHistoryExpandedSize.value = { width: expandedRect.width, height: expandedRect.height }
      saveFloatingHistoryExpandedSize()
      const correctedExpandedPosition = getFloatingHistoryPositionForCenter(
        startPosition,
        { width: startRect.width, height: startRect.height },
        { width: expandedRect.width, height: expandedRect.height },
      )
      floatingHistoryPosition.value = correctedExpandedPosition
      syncTerminalIconRotation(correctedExpandedPosition)
      saveFloatingHistoryPosition(correctedExpandedPosition)
      await nextTick()
    }
  }
  if (!willMinimize && panel) {
    panel.style.visibility = 'visible'
  }
  await animateFloatingHistoryFade(
    panel,
    { opacity: '0', transform: inverseCornerMotion, transformOrigin: `${historyCorner.horizontal} ${historyCorner.vertical}`, filter: 'blur(8px)' },
    { opacity: '1', transform: 'translate3d(0, 0, 0)', transformOrigin: `${historyCorner.horizontal} ${historyCorner.vertical}`, filter: 'blur(0)' },
    240,
  )
  constrainSavedFloatingHistoryPosition()
}

function toggleFloatingHistoryPin() {
  isHistoryPinned.value = !isHistoryPinned.value
  localStorage.setItem('wuwa-floating-history-pinned', String(isHistoryPinned.value))
  if (isHistoryPinned.value) {
    endFloatingHistoryDrag()
  }
}

async function toggleFloatingHistoryShowcase() {
  const panel = floatingHistoryRef.value
  if (historyPanelAnimationTimer && panel) {
    clearTimeout(historyPanelAnimationTimer)
    historyPanelAnimationTimer = null
    resetFloatingHistoryPanelAnimation(panel)
  }
  const willShowcase = !isHistoryShowcase.value
  const restorePosition = floatingHistoryRestoreShowcasePosition.value
  const startRect = panel?.getBoundingClientRect()
  const historyCorner = getFloatingHistoryCorner(startRect)
  const cornerMotion = getFloatingHistoryCornerMotion(historyCorner, willShowcase ? -6 : 6)
  const inverseCornerMotion = getFloatingHistoryCornerMotion(historyCorner, willShowcase ? 6 : -6)
  if (startRect) {
    await animateFloatingHistoryFade(
      panel,
      { opacity: '1', transform: 'translate3d(0, 0, 0)', transformOrigin: `${historyCorner.horizontal} ${historyCorner.vertical}`, filter: 'blur(0)' },
      { opacity: '0', transform: cornerMotion, transformOrigin: `${historyCorner.horizontal} ${historyCorner.vertical}`, filter: 'blur(6px)' },
      160,
    )
    panel.style.transition = 'none'
    panel.style.opacity = '0'
    panel.style.transform = 'translate3d(0, 0, 0)'
    panel.style.filter = 'blur(6px)'
    panel.style.visibility = 'hidden'
  }
  if (willShowcase) {
    floatingHistoryRestoreShowcasePosition.value = { ...floatingHistoryPosition.value }
  }
  isHistoryShowcase.value = willShowcase
  await nextTick()
  if (!willShowcase && restorePosition) {
    const nextPosition = constrainFloatingHistoryPosition(restorePosition)
    floatingHistoryPosition.value = nextPosition
    syncTerminalIconRotation(nextPosition)
    saveFloatingHistoryPosition(nextPosition)
    floatingHistoryRestoreShowcasePosition.value = null
  } else {
    constrainSavedFloatingHistoryPosition()
  }
  if (panel) {
    panel.style.visibility = 'visible'
  }
  await animateFloatingHistoryFade(
    panel,
    { opacity: '0', transform: inverseCornerMotion, transformOrigin: `${historyCorner.horizontal} ${historyCorner.vertical}`, filter: 'blur(6px)' },
    { opacity: '1', transform: 'translate3d(0, 0, 0)', transformOrigin: `${historyCorner.horizontal} ${historyCorner.vertical}`, filter: 'blur(0)' },
    220,
  )
  constrainSavedFloatingHistoryPosition()
}

function moveFloatingHistory(event) {
  if (!historyDrag.value) {
    return
  }
  const nextPosition = constrainFloatingHistoryPosition({
    x: event.clientX - historyDrag.value.offsetX,
    y: event.clientY - historyDrag.value.offsetY,
  })
  if (Math.abs(event.clientX - historyDrag.value.startX) > 4 || Math.abs(event.clientY - historyDrag.value.startY) > 4) {
    historyDrag.value.moved = true
  }
  floatingHistoryPosition.value = nextPosition
  syncTerminalIconRotation(nextPosition)
}

function endFloatingHistoryDrag() {
  if (!historyDrag.value) {
    return
  }
  const drag = historyDrag.value
  historyDrag.value = null
  if (drag.moved && drag.startedMinimized) {
    suppressNextHistoryToggle = true
    clearTimeout(suppressNextHistoryToggleTimer)
    suppressNextHistoryToggleTimer = window.setTimeout(() => {
      suppressNextHistoryToggle = false
      suppressNextHistoryToggleTimer = null
    }, 180)
  }
  if (drag.moved && !drag.startedMinimized) {
    floatingHistoryRestoreMinimizedPosition.value = null
    if (drag.startedShowcase) {
      floatingHistoryRestoreShowcasePosition.value = null
    }
  }
  saveFloatingHistoryPosition()
  document.removeEventListener('pointermove', moveFloatingHistory)
  document.removeEventListener('pointerup', endFloatingHistoryDrag)
  document.removeEventListener('pointercancel', endFloatingHistoryDrag)
}

function startFloatingHistoryDrag(event) {
  if (event.button !== 0 || (!isHistoryMinimized.value && isHistoryPinned.value) || window.matchMedia('(max-width: 860px)').matches) {
    return
  }
  const panel = floatingHistoryRef.value
  if (!panel) {
    return
  }
  const rect = panel.getBoundingClientRect()
  historyDrag.value = {
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
    startX: event.clientX,
    startY: event.clientY,
    startedMinimized: isHistoryMinimized.value,
    startedShowcase: isHistoryShowcase.value,
    moved: false,
  }
  event.currentTarget.setPointerCapture?.(event.pointerId)
  document.addEventListener('pointermove', moveFloatingHistory)
  document.addEventListener('pointerup', endFloatingHistoryDrag)
  document.addEventListener('pointercancel', endFloatingHistoryDrag)
}

function constrainSavedFloatingHistoryPosition() {
  if (window.matchMedia('(max-width: 860px)').matches) {
    return
  }
  const nextPosition = constrainFloatingHistoryPosition(floatingHistoryPosition.value)
  floatingHistoryPosition.value = nextPosition
  syncTerminalIconRotation(nextPosition)
  saveFloatingHistoryPosition(nextPosition)
}

async function bootstrap() {
  try {
    user.value = await getMe()
    await refreshAll()
  } catch {
    user.value = null
    if (saveLogin.value && authUid.value) {
      await submitUidLogin()
    }
  } finally {
    loading.value = false
  }
}

function uidCredentials(uid) {
  const normalizedUid = uid.trim()
  return {
    username: `wuwa_${normalizedUid}`,
    password: `wuwa_uid_${normalizedUid}`,
  }
}

async function submitUidLogin() {
  error.value = ''
  const uid = authUid.value.trim()
  if (!uid) {
    error.value = '请填写游戏 UID。'
    return
  }
  try {
    const credentials = uidCredentials(uid)
    try {
      await login(credentials)
    } catch {
      await register(credentials)
      await login(credentials)
    }
    setPlayerUid(uid)
    localStorage.setItem('wuwa-save-login', saveLogin.value ? 'true' : 'false')
    user.value = await getMe()
    await refreshAll()
  } catch (err) {
    error.value = err.message
  }
}

async function signOut() {
  await logout()
  user.value = null
  echoes.value = []
  activeEchoId.value = null
  prediction.value = null
  stats.value = null
  evaluation.value = null
  if (!saveLogin.value) {
    authUid.value = ''
    setPlayerUid('')
  }
}

async function refreshAll() {
  const echoData = await listEchoes()
  echoes.value = echoData.results || []
  if (!echoes.value.length && playerUid.value) {
    const draftEcho = await createEchoWithConfig()
    if (draftEcho) {
      echoes.value = [draftEcho]
    }
  }
  if (!activeEchoId.value && echoes.value.length) {
    activeEchoId.value = echoes.value.find((echo) => echo.status !== 'archived' && echo.substats.length < 5)?.id || echoes.value[0].id
  }
  if (activeEchoId.value && !echoes.value.some((echo) => echo.id === activeEchoId.value)) {
    activeEchoId.value = echoes.value[0]?.id || null
  }
  const currentEcho = echoes.value.find((echo) => echo.id === activeEchoId.value)
  if (currentEcho) {
    echoForm.value.sonata = currentEcho.set_name
    echoForm.value.cost = currentEcho.cost
    echoForm.value.main_stat = currentEcho.main_stat
    echoForm.value.is_continuous_tuning = currentEcho.is_continuous_tuning
  }
  await refreshActive()
  stats.value = await getStats()
  evaluation.value = await getModelEvaluation()
}

async function refreshActive() {
  if (!activeEchoId.value) {
    prediction.value = null
    return
  }
  prediction.value = await getPrediction(activeEchoId.value)
}

async function createEchoWithConfig(config = echoForm.value) {
  if (!playerUid.value) {
    error.value = '请先填写你的游戏 UID。'
    return null
  }
  const previousForm = { ...echoForm.value }
  echoForm.value.sonata = config.sonata
  echoForm.value.cost = config.cost
  echoForm.value.main_stat = config.main_stat
  echoForm.value.is_continuous_tuning = config.is_continuous_tuning ?? true
  try {
    const echo = await createEcho({
      echo_uid: generateEchoUid(),
      display_name: '',
      cost: echoForm.value.cost,
      set_name: echoForm.value.sonata,
      main_stat: echoForm.value.main_stat,
      source: '',
      tuning_batch_id: '',
      is_continuous_tuning: echoForm.value.is_continuous_tuning,
    })
    echoes.value = [echo, ...echoes.value]
    activeEchoId.value = echo.id
    return echo
  } catch (err) {
    echoForm.value = previousForm
    error.value = err.message
    return null
  }
}

async function ensureActiveEcho() {
  if (activeEcho.value && activeEcho.value.status !== 'archived' && activeEcho.value.substats.length < 5) {
    return activeEcho.value
  }
  const echo = await createEchoWithConfig()
  if (echo) {
    await refreshAll()
  }
  return echo
}

async function createNextEchoFromActive() {
  if (!activeEcho.value) {
    return
  }
  const echo = await createEchoWithConfig(buildNextEchoConfig(activeEcho.value))
  if (echo) {
    await refreshAll()
  }
}

async function applyEchoConfig(partialConfig) {
  error.value = ''
  const nextConfig = {
    sonata: echoForm.value.sonata,
    cost: echoForm.value.cost,
    main_stat: echoForm.value.main_stat,
    is_continuous_tuning: echoForm.value.is_continuous_tuning,
    ...partialConfig,
  }
  if (!mainStatsByCost[nextConfig.cost]?.includes(nextConfig.main_stat)) {
    nextConfig.main_stat = mainStatsByCost[nextConfig.cost][0]
  }
  echoForm.value = nextConfig

  if (!activeEcho.value) {
    await createEchoWithConfig(nextConfig)
    await refreshAll()
    return
  }

  if (isReusableDraft(activeEcho.value)) {
    try {
      const updated = await updateEcho(activeEcho.value.id, {
        echo_uid: generateEchoUid(),
        cost: nextConfig.cost,
        set_name: nextConfig.sonata,
        main_stat: nextConfig.main_stat,
        is_continuous_tuning: nextConfig.is_continuous_tuning,
      })
      echoes.value = echoes.value.map((echo) => (echo.id === updated.id ? updated : echo))
      await refreshActive()
    } catch (err) {
      error.value = err.message
    }
    return
  }

  await createEchoWithConfig(nextConfig)
  await refreshAll()
}

async function discardActiveEcho() {
  if (!activeEcho.value || saving.value) {
    return
  }
  saving.value = true
  error.value = ''
  const discardedEchoId = activeEcho.value.id
  const nextConfig = buildNextEchoConfig(activeEcho.value)
  try {
    await updateEcho(discardedEchoId, { status: 'archived' })
    await refreshAll()
    await createEchoWithConfig(nextConfig)
    await refreshAll()
    await refreshActive()
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}

async function selectEcho(echoId) {
  activeEchoId.value = echoId
  if (activeEcho.value) {
    echoForm.value.sonata = activeEcho.value.set_name
    echoForm.value.cost = activeEcho.value.cost
    echoForm.value.main_stat = activeEcho.value.main_stat
    echoForm.value.is_continuous_tuning = activeEcho.value.is_continuous_tuning
  }
  await refreshActive()
}

async function clickTier(row, tier) {
  if (row.recorded || saving.value) {
    return
  }
  saving.value = true
  error.value = ''
  try {
    const echo = await ensureActiveEcho()
    if (!echo) {
      return
    }
    await addSubstat(echo.id, {
      substat_type: row.substat_type,
      tier_value: tier.value,
    })
    await refreshAll()
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}

async function undoActiveSubstat() {
  if (!activeEcho.value || !activeEcho.value.substats.length || saving.value) {
    return
  }
  saving.value = true
  error.value = ''
  try {
    await undoLastSubstat(activeEcho.value.id)
    await refreshAll()
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await bootstrap()
  await syncSetupPanelHeight()
  await nextTick()
  syncTerminalIconRotation()
  constrainSavedFloatingHistoryPosition()
  window.addEventListener('resize', syncSetupPanelHeight)
  window.addEventListener('resize', constrainSavedFloatingHistoryPosition)
})

onBeforeUnmount(() => {
  clearTimeout(historyPanelAnimationTimer)
  historyPanelAnimationTimer = null
  clearTimeout(suppressNextHistoryToggleTimer)
  suppressNextHistoryToggleTimer = null
  endFloatingHistoryDrag()
  endMarkovAxisDrag()
  window.removeEventListener('resize', syncSetupPanelHeight)
  window.removeEventListener('resize', constrainSavedFloatingHistoryPosition)
})

watch(
  page,
  async (nextPage) => {
    if (nextPage === 'workspace') {
      await syncSetupPanelHeight()
      await nextTick()
      constrainSavedFloatingHistoryPosition()
    }
  },
  { flush: 'post' },
)

watch(
  () => `${activeEchoId.value}:${activeEcho.value?.substats.length || 0}:${echoForm.value.cost}:${echoForm.value.main_stat}:${echoForm.value.sonata}`,
  syncSetupPanelHeight,
  { flush: 'post' },
)
</script>

<template>
  <main class="app-shell">
    <section v-if="loading" class="auth-shell">
      <div class="auth-copy">
        <span class="brand-mark">Wuwa Echo Lab</span>
        <h1>正在连接声骸研究台</h1>
      </div>
    </section>

    <section v-else-if="!user" class="auth-shell auth-shell-home">
      <div class="auth-hero">
        <div class="auth-copy">
          <span class="brand-mark">Wuwa Echo Lab</span>
          <h1>鸣潮声骸实验室</h1>
        </div>
        <div class="showcase-card login-info-card" aria-label="工具说明">
          <div>
            <span class="eyebrow">Echo tracker</span>
            <h2>声骸记录</h2>
            <p>记录套装、COST、主词条、副词条类型与数值档位，持续沉淀样本。</p>
          </div>
          <div class="login-info-grid">
            <div><strong>点击录入</strong><span>套装和档位都用按钮选择，减少手输。</span></div>
            <div><strong>概率排名</strong><span>输出候选副词条概率、基线偏离和依据。</span></div>
            <div><strong>谨慎判断</strong><span>套装、顺序、时间等变量只在样本足够时参与判断。</span></div>
          </div>
        </div>
      </div>

      <form class="auth-form product-panel" @submit.prevent="submitUidLogin">
        <label>
          游戏 UID
          <input v-model="authUid" inputmode="numeric" autocomplete="username" />
        </label>
        <label class="checkbox-row save-login-row">
          <input v-model="saveLogin" type="checkbox" />
          保存登录，下次自动进入
        </label>
        <p v-if="error" class="error-text">{{ error }}</p>
        <button class="button-buy" type="submit">进入研究台</button>
      </form>
    </section>

    <section v-else class="dashboard">
      <header class="topbar">
        <a class="wordmark" href="#" @click.prevent="page = 'workspace'">Wuwa Echo Lab</a>
        <nav class="pill-tabs" aria-label="页面">
          <button :class="{ active: page === 'workspace' }" @click="page = 'workspace'">工作台</button>
          <button :class="{ active: page === 'stats' }" @click="page = 'stats'">统计</button>
          <button :class="{ active: page === 'evaluation' }" @click="page = 'evaluation'">评估</button>
        </nav>
        <div class="account-actions">
          <span class="uid-chip">UID {{ playerUid }}</span>
          <button class="button-ghost" @click="signOut">退出</button>
        </div>
      </header>

      <section class="hero-band compact">
        <div>
          <span class="brand-mark">Echo research</span>
          <h1>鸣潮声骸实验室</h1>
          <p>记录调谐样本，实时校准副词条概率与模型证据。</p>
        </div>
        <div class="hero-stats">
          <div><strong>{{ sortedEchoes.length }}</strong><span>历史声骸</span></div>
          <div><strong>{{ stats?.total_rolls || 0 }}</strong><span>总样本</span></div>
          <div><strong>{{ prediction ? confidenceText(prediction.confidence) : '低' }}</strong><span>置信度</span></div>
        </div>
      </section>

      <p v-if="error" class="error-text">{{ error }}</p>

      <div v-if="page === 'workspace'" class="workspace-grid">
        <div class="workspace-sidebar">
        <aside ref="createPanelRef" class="product-panel create-panel" :style="setupPanelStyle">
          <div class="section-heading">
            <span class="eyebrow">Echo setup</span>
            <h2>初始化声骸</h2>
            <p>选择套装、COST 和主词条，开始录入当前声骸。</p>
          </div>

          <form class="echo-form" @submit.prevent>
            <fieldset>
              <legend>套装</legend>
              <div class="sonata-grid">
                <button
                  v-for="effect in sonataEffects"
                  :key="effect.id"
                  type="button"
                  :class="{ active: echoForm.sonata === effect.name }"
                  @click="applyEchoConfig({ sonata: effect.name })"
                >
                  <img :src="effect.icon" :alt="effect.name" />
                  <span>{{ effect.name }}</span>
                </button>
              </div>
            </fieldset>

            <fieldset>
              <legend>COST</legend>
              <div class="option-row cost-row">
                <button v-for="cost in [1, 3, 4]" :key="cost" type="button" :class="{ active: echoForm.cost === cost }" @click="applyEchoConfig({ cost })">
                  {{ cost }}C
                </button>
              </div>
            </fieldset>

            <fieldset>
              <legend>主词条</legend>
              <div class="option-row">
                <button
                  v-for="mainStat in legalMainStats"
                  :key="mainStat"
                  type="button"
                  :class="{ active: echoForm.main_stat === mainStat }"
                  @click="applyEchoConfig({ main_stat: mainStat })"
                >
                  {{ mainStatLabels[mainStat] }}
                </button>
              </div>
            </fieldset>

            <label class="checkbox-row">
              <input v-model="echoForm.is_continuous_tuning" type="checkbox" @change="applyEchoConfig({ is_continuous_tuning: echoForm.is_continuous_tuning })" />
              同一批连续调谐
            </label>
          </form>

          </aside>

        </div>

        <section ref="galleryPanelRef" class="gallery-panel">
          <div class="active-summary">
            <div class="active-identity">
              <span class="eyebrow">Active echo</span>
              <h3 class="active-section-title">当前声骸</h3>
              <p class="active-echo-id">{{ activeEcho ? displayEchoNumericId(activeEcho) : '选择或新增声骸' }}</p>
              <div v-if="activeEcho" class="active-config-chips" aria-label="当前声骸配置">
                <span>{{ activeEcho.cost }}C</span>
                <span>{{ activeEcho.set_name }}</span>
                <span>{{ mainStatLabels[activeEcho.main_stat] || activeEcho.main_stat }}</span>
              </div>
            </div>
            <div v-if="activeEcho" class="roll-strip" :class="{ empty: !activeEcho.substats.length }">
              <span v-for="roll in activeEcho.substats" :key="roll.id">
                <strong>{{ roll.position }}.</strong>
                {{ substatLabels[roll.substat_type] }} {{ roll.tier_value }}%
              </span>
              <button
                class="undo-roll-button"
                type="button"
                :disabled="saving || !activeEcho.substats.length"
                title="撤回上一次录入的副词条"
                @click="undoActiveSubstat"
              >
                撤回
              </button>
            </div>
            <div class="active-control-panel">
              <div class="progress-card">
                <strong>{{ activeEcho?.substats.length || 0 }}/5</strong>
                <span>已录入</span>
                <div class="progress-track"><i :style="{ width: `${progressPercent}%` }"></i></div>
              </div>
              <div v-if="activeEcho" class="active-actions" aria-label="当前声骸操作">
                <button class="button-danger" type="button" :disabled="saving" @click="discardActiveEcho">
                  弃置
                </button>
                <button class="button-next" type="button" :disabled="saving" @click="createNextEchoFromActive">
                  下一个
                </button>
              </div>
            </div>
          </div>

          <div v-if="activeEcho" class="substat-matrix">
            <article
              v-for="row in matrixRows"
              :key="row.substat_type"
              class="substat-row"
              :class="{ recorded: row.recorded, 'top-predicted-row': row.topPredicted && !row.recorded }"
            >
              <div class="substat-meta">
                <strong>{{ row.label }}</strong>
                <span v-if="row.recorded">已录入：{{ row.recorded.tier_value }}</span>
                <span v-else-if="row.candidate">预测 {{ formatPercent(row.candidate.p_final) }}</span>
                <small v-if="row.candidate">较基线 {{ formatSignedPercent(row.candidate.baseline_deviation) }}</small>
              </div>
              <div class="tier-grid">
                <button
                  v-for="tier in row.tier_table"
                  :key="`${row.substat_type}-${tier.value}`"
                  type="button"
                  :disabled="Boolean(row.recorded) || saving"
                  @click="clickTier(row, tier)"
                >
                  <strong>{{ tier.value }}</strong>
                  <span>{{ formatPercent(tier.probability) }}</span>
                </button>
              </div>
            </article>
          </div>

          <p v-else class="empty-text">先选择套装、COST 和主词条，再开始逐条点击录入。</p>
        </section>

        <section
          ref="floatingHistoryRef"
          class="product-panel records-panel history-records floating-history-panel"
          :class="{ minimized: isHistoryMinimized, pinned: isHistoryPinned, showcase: isHistoryShowcase && !isHistoryMinimized }"
          :style="floatingHistoryStyle"
          @pointerdown="isHistoryMinimized && startFloatingHistoryDrag($event)"
          @click="isHistoryMinimized && toggleFloatingHistorySize()"
        >
          <div class="floating-history-handle section-heading compact-heading" @pointerdown="startFloatingHistoryDrag">
            <div>
              <span class="eyebrow">Records</span>
              <h2>历史声骸</h2>
            </div>
          </div>
          <div class="floating-history-actions">
            <button type="button" :class="{ active: isHistoryPinned }" :aria-label="isHistoryPinned ? '取消固定历史声骸' : '固定历史声骸'" :title="isHistoryPinned ? '取消固定' : '固定'" @click.stop="toggleFloatingHistoryPin">
              <img class="history-action-icon" :src="historyPinnedIcon" alt="" aria-hidden="true" draggable="false" />
            </button>
            <button type="button" :class="{ active: isHistoryShowcase }" :aria-label="isHistoryShowcase ? '收起展示历史声骸' : '展示全部历史声骸'" :title="isHistoryShowcase ? '收起展示' : '展示全部'" @click.stop="toggleFloatingHistoryShowcase">
              <img class="history-action-icon" :src="historyShowcaseIcon" alt="" aria-hidden="true" draggable="false" />
            </button>
            <button type="button" :aria-label="isHistoryMinimized ? '展开历史声骸' : '缩小历史声骸'" :title="isHistoryMinimized ? '展开' : '缩小'" @click.stop="toggleFloatingHistorySize">
              <img class="history-action-icon" :class="{ 'terminal-expand-icon': isHistoryMinimized }" :style="isHistoryMinimized ? terminalExpandIconStyle : null" :src="isHistoryMinimized ? historyTerminalIcon : historyMinimizeIcon" alt="" aria-hidden="true" draggable="false" />
            </button>
            <p class="floating-history-count">{{ filteredHistoryEchoes.length }} / {{ sortedEchoes.length }} 个记录</p>
          </div>
          <div class="history-filter-bar" :aria-hidden="isHistoryMinimized" :inert="isHistoryMinimized">
            <button
              v-for="option in historyFilterOptions"
              :key="option.key"
              type="button"
              class="history-filter-chip"
              :class="[option.key, { active: historyFilter === option.key }]"
              :aria-pressed="historyFilter === option.key"
              @click="historyFilter = option.key"
            >
              <span>{{ option.label }}</span>
              <strong>{{ option.count }}</strong>
            </button>
          </div>
          <div class="echo-list" :class="{ revealed: !isHistoryMinimized }" :aria-hidden="isHistoryMinimized" :inert="isHistoryMinimized">
            <button
              v-for="echo in filteredHistoryEchoes"
              :key="echo.id"
              class="echo-item"
              :class="{
                active: echo.id === activeEchoId,
                pending: echo.status !== 'archived' && echo.substats.length > 0 && echo.substats.length < 5,
                completed: echo.status !== 'archived' && echo.substats.length >= 5,
                discarded: echo.status === 'archived',
              }"
              :style="{ '--substat-count': echo.substats.length }"
              @click="selectEcho(echo.id)"
            >
              <div class="echo-item-head">
                <strong>
                  {{ displayEchoNumericId(echo) }}
                  <em
                    v-if="statusBadge(echo, activeEchoId)"
                    :class="{
                      'status-discarded': statusBadge(echo, activeEchoId) === '弃置',
                      'status-pending': statusBadge(echo, activeEchoId) === '待强化',
                      'status-completed': statusBadge(echo, activeEchoId) === '已强化',
                    }"
                  >
                    {{ statusBadge(echo, activeEchoId) }}
                  </em>
                </strong>
                <span>{{ echo.cost }}C · {{ echo.set_name }} · {{ mainStatLabels[echo.main_stat] || echo.main_stat }} · {{ echo.substats.length }}/5</span>
              </div>
              <div v-if="echo.substats.length" class="echo-roll-list">
                <span v-for="roll in echo.substats" :key="roll.id">
                  <strong>{{ roll.position }}. {{ substatLabels[roll.substat_type] }}</strong>
                  <small>{{ roll.tier_value }}%</small>
                </span>
              </div>
              <small v-else class="echo-roll-empty">尚未录入副词条</small>
            </button>
          </div>
        </section>

      </div>

      <section v-if="page === 'stats'" class="product-panel full-panel stats-analytics-panel">
        <div class="stats-diagnostic-head">
          <div>
            <h2>统计诊断</h2>
            <p v-if="stats">{{ sampleStageText(stats.sample_stage) }}</p>
            <p v-else>等待样本录入后生成统计图表。</p>
          </div>
        </div>

        <div v-if="stats" class="stats-summary-bar">
          <article v-for="item in statsSummaryItems" :key="item.label" :class="item.tone" :title="item.title">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </article>
        </div>
        <div v-else class="stats-empty-state">
          <strong>暂无统计样本</strong>
          <p>录入声骸副词条后，会在这里显示样本分布和阶段诊断。</p>
        </div>

        <section v-if="stats" class="stats-chart-card substat-deviation-card">
          <div class="stats-section-heading">
            <h3>副词条分布偏差</h3>
            <span>按偏差排序</span>
          </div>
          <div class="substat-deviation-chart" role="img" aria-label="副词条相对基线的偏差">
            <div class="deviation-axis-labels" aria-hidden="true">
              <span></span>
              <div class="deviation-axis-scale">
                <span>偏低</span>
                <strong>基线</strong>
                <span>偏高</span>
              </div>
              <span></span>
            </div>
            <article
              v-for="row in sortedStatFrequency"
              :key="row.substat_type"
              class="substat-deviation-row"
              :class="statDiagnosticClass(row)"
              :title="`基于 ${stats.total_rolls || 0} 条样本，${row.label}: ${row.count} 次，观察 ${formatPercent(row.observed_rate)}，基线 ${formatPercent(row.baseline_rate)}`"
            >
              <div class="substat-deviation-name">
                <strong>{{ row.label }}</strong>
                <span>{{ row.count }} 次 · {{ formatPercent(row.observed_rate) }}</span>
              </div>
              <div class="substat-deviation-track">
                <i aria-hidden="true"></i>
                <b :style="{ width: `${Math.max(row.absDeviation / maxAbsStatDeviation * 48, row.absDeviation ? 5 : 0)}%`, left: row.deviation >= 0 ? '50%' : 'auto', right: row.deviation < 0 ? '50%' : 'auto' }"></b>
              </div>
              <strong class="substat-deviation-value">{{ formatSignedPercent(row.deviation) }}</strong>
            </article>
          </div>
        </section>

        <div v-if="stats" class="stats-chart-grid">
          <section class="stats-chart-card sample-stage-card">
            <div class="stats-section-heading compact">
              <h3>样本阶段</h3>
              <span>{{ stats.total_rolls }} / 50000+</span>
            </div>
            <div class="sample-stage-axis" role="img" aria-label="当前样本阶段">
              <div class="sample-stage-track" aria-hidden="true">
                <b :style="{ width: formatPercent(visualSampleStageProgress) }"></b>
                <i class="sample-stage-marker" :style="{ left: formatPercent(sampleStageProgress) }"></i>
              </div>
              <article v-for="stage in sampleStageAxisRows" :key="stage.label" :class="{ active: stage.active, current: stage.current }">
                <strong>{{ stage.label }}</strong>
                <span>{{ stage.caption }}<em v-if="stage.current">当前</em></span>
              </article>
            </div>
          </section>
        </div>
      </section>

      <section v-if="page === 'evaluation'" class="product-panel full-panel evaluation-panel">
        <div class="evaluation-status-bar">
          <h2>模型评估</h2>
          <div class="evaluation-status-chips" aria-label="评估摘要">
            <span class="evaluation-status-chip state">
              <i aria-hidden="true"></i>
              {{ evaluationStatusText() }}
            </span>
            <span class="evaluation-status-chip">
              <small>阶段</small>
              {{ stats ? sampleStageText(stats.sample_stage).split('：')[0] : '等待样本' }}
            </span>
            <span class="evaluation-status-chip">
              <small>Top 3</small>
              {{ evaluationMetricText(evaluationMetrics[3]) }}
            </span>
          </div>
        </div>

        <div class="evaluation-section-title">
          <div>
            <h3>当前融合权重</h3>
          </div>
          <div class="fusion-title-tools">
            <div class="fusion-shared-legend" aria-label="融合权重图例">
              <small>标记说明</small>
              <span title="当前权重：当前融合后用于最终概率的模型贡献"><i class="legend-current-line"></i>当前权重</span>
              <span title="基础权重：低样本阶段的默认初始权重"><i class="legend-base-line"></i>基础权重</span>
              <span title="Top1 命中率：该模型单独预测第一候选时的回测命中率"><i class="legend-hit-triangle"></i>Top1 命中率</span>
            </div>
            <span class="fusion-live-pill">{{ prediction ? '实时' : '预览' }}</span>
          </div>
        </div>

        <div class="fusion-weight-grid">
          <article
            v-for="row in weightRows"
            :key="row.key"
            :class="[weightDiagnosticClass(row), { 'summary-linked': highlightedSummaryModelKey === row.key }]"
            class="fusion-weight-card"
            :title="fusionWeightTooltip(row)"
          >
            <div>
              <span>{{ row.label }}<em v-if="row.disabled" class="fusion-disabled-badge">{{ row.statusLabel }}</em></span>
              <strong>{{ formatPercent(row.weight) }}</strong>
            </div>
            <i
              class="fusion-weight-track"
              :aria-label="fusionWeightTooltip(row)"
            >
              <b :style="{ width: formatPercent(row.weight) }" :title="`当前 ${formatPercent(row.weight)}`"></b>
              <span
                class="weight-marker base-marker"
                :style="{ left: percentPosition(row.baseWeight) }"
                :title="`基础 ${formatPercent(row.baseWeight)}`"
              ></span>
              <span
                v-if="row.adjustment?.hit_rate != null"
                class="weight-marker hit-marker"
                :style="{ left: percentPosition(row.adjustment.hit_rate) }"
                :title="`Top1 回测 ${formatPercent(row.adjustment.hit_rate)}`"
              ></span>
            </i>
          </article>
        </div>

        <section
          class="evaluation-summary-line"
          :class="evaluationSummaryParts.dominant.key ? `summary-dominant-${evaluationSummaryParts.dominant.key}` : ''"
        >
          <span class="evaluation-summary-kicker">结论摘要</span>
          <strong :key="evaluationSummaryParts.motionKey" class="evaluation-summary-copy">
            当前由<span
              class="summary-model-link summary-model-link-dominant"
              :class="{ active: evaluationSummaryParts.dominant.key && highlightedSummaryModelKey === evaluationSummaryParts.dominant.key }"
              :tabindex="evaluationSummaryParts.dominant.key ? 0 : -1"
              :title="`定位到${evaluationSummaryParts.dominant.label}`"
              @mouseenter="setSummaryModelHighlight(evaluationSummaryParts.dominant.key)"
              @mouseleave="clearSummaryModelHighlight"
              @focus="setSummaryModelHighlight(evaluationSummaryParts.dominant.key)"
              @blur="clearSummaryModelHighlight"
            >{{ evaluationSummaryParts.dominant.label }}</span>主导，<template v-for="(model, index) in evaluationSummaryParts.auxiliaries" :key="`${model.key || model.label}-${index}`"><span
                class="summary-model-link summary-model-link-auxiliary"
                :class="{ active: model.key && highlightedSummaryModelKey === model.key }"
                :tabindex="model.key ? 0 : -1"
                :title="`定位到${model.label}`"
                @mouseenter="setSummaryModelHighlight(model.key)"
                @mouseleave="clearSummaryModelHighlight"
                @focus="setSummaryModelHighlight(model.key)"
                @blur="clearSummaryModelHighlight"
              >{{ model.label }}</span><template v-if="index < evaluationSummaryParts.auxiliaries.length - 1"> / </template></template>作为辅助。
          </strong>
        </section>

        <div class="evaluation-section-title backtest-section-title">
          <div>
            <h3>核心回测</h3>
          </div>
          <span class="evaluation-technical-meta">{{ calibrationSummaryText() }}</span>
        </div>

        <div class="evaluation-grid compact-evaluation-grid evaluation-chart-strip">
          <section class="evaluation-card chart-card">
            <div class="chart-heading chart-heading-stacked">
              <div>
                <div class="chart-title-row">
                  <h3>预测范围命中率</h3>
                </div>
              </div>
            </div>
            <div
              class="coverage-band-chart"
              role="img"
              aria-label="Top1 到 Top5 预测范围命中率"
              title="Top1 表示首选预测；Top3 表示推荐参考；Top5 表示补充检查。"
            >
              <div class="coverage-band-track" aria-hidden="true">
                <span class="coverage-band-fill"></span>
                <i
                  v-for="(metric, index) in hitRateMetrics"
                  :key="metric.label"
                  class="coverage-band-node"
                  :class="coverageNodeClass(index)"
                  :style="{ left: `${coverageNodePosition(index)}%` }"
                ></i>
              </div>
              <div class="coverage-labels">
                <article
                  v-for="(metric, index) in hitRateMetrics"
                  :key="metric.label"
                  :title="`${metric.label} ${evaluationMetricText(metric)}`"
                  :style="{ left: `${coverageNodePosition(index)}%` }"
                >
                  <strong>{{ evaluationMetricText(metric) }}</strong>
                  <span>{{ coverageMetricLabel(metric) }}</span>
                </article>
              </div>
              <div class="coverage-gain-note">
                <strong>{{ coverageGainText(hitRateMetrics) }}</strong>
                <span>{{ evaluationReady ? 'Top3 适合作为推荐参考，Top5 适合做补充检查。' : '积累更多副词条记录后自动计算。' }}</span>
              </div>
            </div>
          </section>

          <section class="evaluation-card model-backtest-card">
            <div class="chart-heading">
              <h3>子模型回测</h3>
              <span :title="modelBacktestSummaryText">{{ modelBacktestSummaryText }}</span>
            </div>
            <div class="model-bars-head">
              <span>模型</span>
              <span>命中率<i title="单个子模型独立预测第一候选时的 Top1 回测命中率，不是整体融合模型命中率。">?</i></span>
              <span>Loss<i title="单个子模型独立回测的损失值，越低表示概率排序和真实结果越接近。">?</i></span>
              <span></span>
            </div>
            <div class="model-bars">
              <article
                v-for="row in modelEvaluationRows"
                :key="row.key"
                :class="{ best: row.isBest, expanded: expandedModelDetailKey === row.key, disabled: row.disabled }"
                :title="row.evaluated ? `${row.label}基于 ${row.evaluated} 条样本回测` : `${row.label}等待回测样本`"
              >
                <div
                  class="model-bar-summary"
                  role="button"
                  tabindex="0"
                  :aria-expanded="expandedModelDetailKey === row.key"
                  @click="toggleModelDetail(row.key)"
                  @keydown.enter="toggleModelDetail(row.key)"
                  @keydown.space.prevent="toggleModelDetail(row.key)"
                >
                  <strong>
                    {{ row.label }}
                    <em v-if="row.isBest">最高命中</em>
                    <em v-else-if="row.disabled" class="disabled-model-badge">{{ row.statusLabel || '未启用' }}</em>
                  </strong>
                  <small>
                    <span>{{ row.note }}</span>
                  </small>
                  <span class="model-hit-rate">{{ modelHitRateText(row) }}</span>
                  <span class="model-loss">{{ modelLossText(row) }}</span>
                  <button
                    class="model-expand-state"
                    type="button"
                    :aria-expanded="expandedModelDetailKey === row.key"
                    :aria-label="expandedModelDetailKey === row.key ? `收起${row.label}详情` : `展开${row.label}详情`"
                    :title="expandedModelDetailKey === row.key ? '收起' : '展开'"
                    @click.stop="toggleModelDetail(row.key)"
                  >
                    <i class="model-expand-chevron" aria-hidden="true"></i>
                  </button>
                </div>
                <i
                  class="model-row-progress"
                  :title="modelProgressTitle(row)"
                >
                  <b :style="{ width: row.hitRate == null ? '0%' : `${Math.max(row.relativeHitRate * 92, 8)}%` }"></b>
                </i>
                <Transition name="model-row-detail">
                  <div v-if="expandedModelDetailKey === row.key" class="model-row-detail" @click.stop>
                    <article v-for="model in modelDetailListForKey(row.key)" :key="model.key" class="model-insight-card inline-model-insight" :class="modelInsightClass(model)">
            <div v-if="modelShowsInsightTabs(model)" class="model-insight-tabs" role="tablist" :aria-label="`${model.title} 展示模式`">
              <button
                v-for="tab in modelInsightTabs(model)"
                :key="tab.key"
                type="button"
                :class="{ active: modelInsightView(model) === tab.key }"
                @click="setModelInsightView(model, tab.key)"
              >
                {{ modelInsightTabLabel(tab) }}
              </button>
            </div>

            <div class="model-insight-body">
              <section v-if="modelInsightView(model) === 'distribution'" class="model-insight-chart" :class="`model-chart-${model.key}`">
                <p class="model-judgement-summary">{{ modelJudgementSummary(model) }}</p>

                <div v-if="model.key === 'bayes'" class="bayes-contribution-chart">
                  <div class="bayes-contribution-labels">
                    <span
                      v-for="segment in model.segments"
                      :key="`${segment.label}-label`"
                      :class="{ primary: segment.label === 'Exact', secondary: segment.label !== 'Exact' }"
                    >
                      {{ segment.label }} {{ formatPercent(segment.value) }}
                    </span>
                  </div>
                  <div class="bayes-contribution-bar" aria-hidden="true">
                    <i
                      v-for="segment in model.segments"
                      :key="`${segment.label}-bar`"
                      :class="{ primary: segment.label === 'Exact', secondary: segment.label !== 'Exact' }"
                      :style="bayesContributionStyle(segment)"
                    ></i>
                  </div>
                  <div class="bayes-path-list">
                    <article
                      v-for="segment in model.segments"
                      :key="segment.label"
                      :class="{ primary: segment.label === 'Exact', secondary: segment.label !== 'Exact' }"
                    >
                      <div class="bayes-path-nodes">
                        <span>A</span>
                        <i>→</i>
                        <span>{{ segment.label === 'Wildcard' ? '?' : 'B' }}</span>
                        <i>→</i>
                        <span>C</span>
                      </div>
                      <div class="bayes-path-copy">
                        <div>
                          <strong>{{ segment.label }}</strong>
                          <span>{{ bayesSegmentRole(segment) }}</span>
                        </div>
                        <p>{{ bayesSegmentDescription(segment) }}</p>
                        <i aria-hidden="true">
                          <b :style="bayesContributionStyle(segment)"></b>
                        </i>
                      </div>
                    </article>
                  </div>
                </div>

                <div v-if="model.windows.length" class="cycle-window-grid">
                  <article
                    v-for="window in model.windows"
                    :key="window.key"
                    :class="[window.tone, { featured: window.key === 'double' }]"
                  >
                    <div class="cycle-window-card-body">
                      <span>{{ window.label }}</span>
                      <strong>{{ formatPercent(window.value) }}</strong>
                      <i><b :style="{ width: formatPercent(window.value) }"></b></i>
                    </div>
                  </article>
                </div>

                <div
                  v-if="model.segments.length && model.key !== 'bayes'"
                  class="model-segment-strip"
                  :class="`model-segment-strip-${model.key}`"
                >
                  <div
                    v-for="segment in model.segments"
                    :key="segment.label"
                    :style="modelSegmentStyle(segment)"
                  >
                    <span>{{ segment.label }}</span>
                    <strong>{{ formatPercent(segment.value) }}</strong>
                  </div>
                </div>

                <div
                  v-if="model.key === 'markov' && model.timelineNodes.length"
                  :key="markovAxisKey(model)"
                  class="markov-axis-shell"
                >
                  <div
                    class="markov-axis-chart"
                    @pointerdown="startMarkovAxisDrag"
                  >
                    <div class="markov-legend-row" aria-hidden="true">
                      <div class="markov-axis-legend">
                        <span><i class="normal-dot"></i>普通记录</span>
                        <span><i class="hot-dot"></i>触发冷却</span>
                      </div>
                    </div>
                    <div
                      class="markov-axis-track"
                      :style="markovAxisTrackStyle(model)"
                    >
                      <div class="markov-axis-line" aria-hidden="true"></div>
                      <div
                        v-for="item in model.timelineNodes"
                        :key="`${item.type}-${item.index}`"
                        class="markov-axis-node"
                        :class="[sequenceItemClass(item), item.track]"
                      >
                        <i></i>
                        <div class="markov-node-label">
                          <strong>{{ item.label }}</strong>
                          <span>#{{ item.index + 1 }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="markov-time-legend" aria-hidden="true">
                    <b></b>
                  </div>
                </div>

                <div v-if="model.key === 'context'" class="context-check-grid" aria-label="上下文监测条件">
                  <div class="context-overall-progress">
                    <div>
                      <span>上下文样本</span>
                      <strong>{{ contextOverallCheck(model).sampleSize }} / {{ contextOverallCheck(model).recommended }}</strong>
                    </div>
                    <i aria-hidden="true">
                      <b :style="{ width: formatPercent(contextOverallProgress(model)) }"></b>
                    </i>
                  </div>
                  <div class="context-check-head">
                    <span>观测维度</span>
                    <span>状态</span>
                  </div>
                  <article
                    v-for="check in model.contextChecks"
                    :key="check.key"
                    class="context-check-row"
                    :class="check.status"
                    :title="check.label"
                  >
                    <strong class="context-check-name">{{ check.label }}</strong>
                    <span class="context-check-state">纳入观察</span>
                  </article>
                </div>

                <div v-if="model.key === 'markov' && model.penaltyBars.length" class="markov-penalty-grid">
                  <article v-for="bar in model.penaltyBars" :key="bar.key" :class="bar.tone">
                    <span>{{ bar.label }}</span>
                    <strong>{{ formatPercent(bar.value) }}</strong>
                    <small>{{ bar.caption }}</small>
                  </article>
                </div>

                <div v-if="model.key === 'cycle' && model.groupBars.length" class="model-group-bars">
                  <div v-for="bar in model.groupBars" :key="bar.key" :class="bar.tone">
                    <label>
                      <span>{{ bar.label }}</span>
                      <strong>{{ modelBarText(bar) }}</strong>
                    </label>
                    <i><b :style="modelBarStyle(bar)"></b></i>
                  </div>
                </div>
              </section>

              <section v-else-if="modelInsightView(model) === 'evidence'" class="model-evidence-panel">
                <p class="model-judgement-summary">{{ model.detail }}</p>
                <ul>
                  <li v-for="(item, index) in model.evidence" :key="item">
                    <strong>{{ item }}</strong>
                    <span>{{ modelEvidenceNote(model, index) }}</span>
                  </li>
                </ul>
              </section>

              <aside class="model-insight-side">
                <div class="model-side-status-row">
                  <span class="model-side-status">{{ model.statusLabel }}</span>
                  <small>基础 {{ formatPercent(model.baseWeight) }}</small>
                </div>
                <section class="model-side-block">
                  <span class="model-side-title">
                    关键参数
                    <i title="该子模型当前用于判断的核心参数，帮助解释模型内部依据；不是最终融合概率。">?</i>
                  </span>
                  <div class="model-metric-grid">
                    <div v-for="metric in model.metrics" :key="metric.label">
                      <span>{{ metric.label }}</span>
                      <strong>{{ modelMetricText(metric) }}</strong>
                    </div>
                  </div>
                </section>
                <footer class="model-weight-change">
                  <span class="model-side-title">权重变化</span>
                  <template v-if="model.adjustment?.hit_rate != null">
                    当前模型命中 {{ formatPercent(model.adjustment.hit_rate) }}，权重{{ model.adjustment.direction === 'up' ? '上调' : model.adjustment.direction === 'down' ? '下调' : '持平' }}
                  </template>
                  <template v-else>
                    当前阶段样本不足，维持基础权重。
                  </template>
                </footer>
              </aside>
            </div>
              </article>
                  </div>
                </Transition>
                  </article>
                </div>
              </section>
        </div>
      </section>
    </section>
  </main>
</template>


