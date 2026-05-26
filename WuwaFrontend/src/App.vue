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
let historyPanelAnimationTimer = null
let suppressNextHistoryToggle = false
let suppressNextHistoryToggleTimer = null
const FLOATING_HISTORY_MINIMIZED_SIZE = 76
const TERMINAL_ICON_BASE_ANGLE = 350
const ACTIVE_MODEL_WEIGHT_EPSILON = 0.0001

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
const weightRows = computed(() =>
  Object.entries(prediction.value?.weights || {}).map(([key, weight]) => ({
    key,
    label: prediction.value?.model_labels?.[key] || modelWeightLabel(key),
    weight,
    baseWeight: prediction.value?.base_weights?.[key],
    adjustment: prediction.value?.weight_adjustments?.[key] || null,
  })),
)
const modelDetailRows = computed(() => {
  const definitions = [
    {
      key: 'rule',
      title: '规则均衡',
      role: '长期全局回归',
      detail: '统计全局出现次数，压低历史过热词条，抬高历史偏少词条。',
      evidence: ['全局频率偏差', '当前合法候选池', '指数型均衡修正'],
    },
    {
      key: 'bayes',
      title: '周期规律',
      role: '历史片段复现',
      detail: '融合精确片段和 A -> 任意 -> C 通配片段，样本越多通配片段话语权越高。',
      evidence: ['P_bayes_exact', 'P_bayes_wildcard', '动态 alpha 平滑'],
    },
    {
      key: 'markov',
      title: '近期过热',
      role: '跨声骸短期冷却',
      detail: '只检查最近 12 条全局记录，候选词条出现至少 3 次才触发降温。',
      evidence: ['最近 12 条窗口', '过热阈值 >= 3', '只惩罚不奖励'],
    },
    {
      key: 'cycle',
      title: '周期窗口',
      role: '双爆与词条组窗口',
      detail: '暴击窗口占 75%，非暴击词条组周期占 25%，输出窗口倾向而不是硬判定。',
      evidence: ['双爆 / 单爆 / 冷却', '攻击/生命/防御/伤害加成/共鸣效率', '组内分配'],
    },
    {
      key: 'context',
      title: '上下文监测',
      role: '样本足够后参与',
      detail: '预留套装、COST、主词条、位置变量，样本不足时保持克制。',
      evidence: ['set name', 'cost', 'main stat', 'position'],
    },
  ]
  return definitions.map((definition) => {
    const weightRow = weightRows.value.find((row) => row.key === definition.key)
    return {
      ...definition,
      label: prediction.value?.model_labels?.[definition.key] || definition.title,
      weight: weightRow?.weight ?? 0,
      baseWeight: weightRow?.baseWeight ?? 0,
      adjustment: weightRow?.adjustment || null,
    }
  })
})
const evaluationMetrics = computed(() => [
  {
    label: 'Log Loss',
    value: evaluation.value?.log_loss,
    preview: 2.16,
    target: '越低越好',
    description: '概率分布是否把真实词条放在高概率区间',
  },
  {
    label: 'Brier Score',
    value: evaluation.value?.brier_score,
    preview: 0.86,
    target: '越低越好',
    description: '预测概率和真实结果的平方误差',
  },
  {
    label: 'Top 1 命中率',
    value: evaluation.value?.top_1_hit_rate,
    preview: 0.11,
    target: '越高越好',
    description: '概率第一名是否命中真实词条',
  },
  {
    label: 'Top 3 命中率',
    value: evaluation.value?.top_3_hit_rate,
    preview: 0.34,
    target: '越高越好',
    description: '前三名候选是否覆盖真实词条',
  },
  {
    label: 'Top 5 命中率',
    value: evaluation.value?.top_5_hit_rate,
    preview: 0.52,
    target: '越高越好',
    description: '前五名候选是否覆盖真实词条',
  },
])
const modelEvaluationRows = computed(() => {
  const rows = [
    { key: 'rule', label: '规则均衡', hitRate: 0.31, loss: 2.07, note: '合法词条池与全局均衡' },
    { key: 'bayes', label: '周期规律', hitRate: 0.36, loss: 1.94, note: '精确片段与通配片段' },
    { key: 'markov', label: '近期过热', hitRate: 0.28, loss: 2.22, note: '跨声骸短期冷却' },
    { key: 'cycle', label: '周期窗口', hitRate: 0.33, loss: 2.02, note: '双爆窗口与词条组周期' },
    { key: 'context', label: '上下文监测', hitRate: 0.19, loss: 2.45, note: '套装、COST、主词条等变量' },
  ]
  return rows.map((row) => ({
    ...row,
    weight: prediction.value?.weights?.[row.key] ?? { rule: 0.7, bayes: 0.1, markov: 0.1, cycle: 0.1, context: 0 }[row.key],
    isPreview: evaluation.value?.log_loss == null,
  }))
})
const sampleStageRows = computed(() => [
  { label: '0-500', text: '规则基线', active: (stats.value?.total_rolls || 0) < 500 },
  { label: '500-3000', text: '总体偏差', active: (stats.value?.total_rolls || 0) >= 500 && (stats.value?.total_rolls || 0) < 3000 },
  { label: '3000-10000', text: '上下文检验', active: (stats.value?.total_rolls || 0) >= 3000 && (stats.value?.total_rolls || 0) < 10000 },
  { label: '10000-50000', text: '顺序依赖', active: (stats.value?.total_rolls || 0) >= 10000 && (stats.value?.total_rolls || 0) < 50000 },
  { label: '50000+', text: '权重优化', active: (stats.value?.total_rolls || 0) >= 50000 },
])
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
  const value = metric.value ?? metric.preview
  if (metric.label.includes('命中率')) {
    return formatPercent(value)
  }
  return value.toFixed(2)
}

function evaluationMetricFill(metric) {
  const value = metric.value ?? metric.preview
  if (metric.label.includes('命中率')) {
    return `${Math.min(value * 100, 100)}%`
  }
  return `${Math.max(8, Math.min((1 - value / 3) * 100, 100))}%`
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

function contextDiagnosticClass(factor) {
  if (factor?.status === 'monitoring' || factor?.status === 'active') {
    return 'hot'
  }
  if (factor?.status === 'insufficient_data' || factor?.status === 'not_started') {
    return 'warn'
  }
  return 'cool'
}

function weightDiagnosticClass(row) {
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

      <section class="hero-band">
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

      <section v-if="page === 'stats'" class="product-panel prediction-strip stats-prediction-strip">
        <div class="stats-diagnostic-head">
          <div>
            <span class="eyebrow">Prediction</span>
            <h2>预测依据</h2>
            <p v-if="prediction?.weight_stage">权重阶段 {{ prediction.weight_stage }} 条样本</p>
            <p v-else>等待选择声骸后生成候选排名。</p>
          </div>
          <span v-if="topCandidate" class="stats-diagnostic-pill">{{ topCandidate.label }} · {{ formatPercent(topCandidate.p_final) }}</span>
          <span v-else class="stats-diagnostic-pill">Prediction matrix</span>
        </div>

        <div v-if="prediction" class="weight-list diagnostic-matrix prediction-diagnostic-grid">
          <article v-for="row in weightRows" :key="row.key" :class="weightDiagnosticClass(row)">
            <div>
              <strong>{{ row.label }}</strong>
              <span>{{ weightDiagnosticText(row) }}</span>
            </div>
            <p>{{ formatPercent(row.weight) }}</p>
            <small v-if="row.adjustment?.hit_rate != null">
              基础 {{ formatPercent(row.baseWeight) }} · 命中 {{ formatPercent(row.adjustment.hit_rate) }}
              {{ row.adjustment.direction === 'up' ? '上调' : row.adjustment.direction === 'down' ? '下调' : '持平' }}
            </small>
            <small v-else>基础 {{ formatPercent(row.baseWeight) }} · 样本不足</small>
          </article>
        </div>

        <div v-if="prediction" class="ranking diagnostic-matrix prediction-candidate-grid">
          <article
            v-for="(candidate, index) in prediction.candidates.slice(0, 8)"
            :key="candidate.substat_type"
            :class="candidateDiagnosticClass(candidate, index)"
          >
            <div>
              <strong>{{ candidate.label }}</strong>
              <span>{{ index === 0 ? '首选' : `#${index + 1}` }}</span>
            </div>
            <p>{{ formatPercent(candidate.p_final) }}</p>
            <small>基线 {{ formatPercent(candidate.p_rule) }} · 偏差 {{ formatSignedPercent(candidate.baseline_deviation) }}</small>
          </article>
        </div>
      </section>

      <section v-if="page === 'stats'" class="product-panel full-panel">
        <div class="stats-diagnostic-head">
          <div>
            <span class="eyebrow">Analytics</span>
            <h2>统计诊断</h2>
            <p v-if="stats">总样本量：{{ stats.total_rolls }} · {{ sampleStageText(stats.sample_stage) }}</p>
          </div>
          <span class="stats-diagnostic-pill">Evidence matrix</span>
        </div>

        <div v-if="stats" class="stat-grid diagnostic-matrix">
          <article v-for="row in stats.substat_frequency" :key="row.substat_type" :class="statDiagnosticClass(row)">
            <div>
              <strong>{{ row.label }}</strong>
              <span>{{ statDiagnosticText(row) }}</span>
            </div>
            <p>{{ row.count }} 次</p>
            <small>观察 {{ formatPercent(row.observed_rate) }} · 基线 {{ formatPercent(row.baseline_rate) }} · 偏差 {{ formatSignedPercent(statDeviation(row)) }}</small>
          </article>
        </div>
        <div class="stats-section-heading">
          <h3>上下文监控</h3>
          <span>Context evidence</span>
        </div>
        <div v-if="stats" class="context-grid diagnostic-matrix context-diagnostic-grid">
          <article v-for="(factor, key) in stats.context_factors" :key="key" :class="contextDiagnosticClass(factor)">
            <div>
              <strong>{{ key }}</strong>
              <span>{{ statusText(factor.status) }}</span>
            </div>
            <p>样本 {{ factor.sample_size }}</p>
            <small>用于判断套装、COST、主词条与位置变量是否足够稳定。</small>
          </article>
        </div>
      </section>

      <section v-if="page === 'evaluation'" class="product-panel full-panel">
        <div class="evaluation-head">
          <div>
            <span class="eyebrow">Evaluation</span>
            <h2>模型评估</h2>
            <p>{{ evaluation?.message || '按当前算法拆解融合权重、候选概率和各子模型职责。' }}</p>
          </div>
          <span class="preview-pill">当前样本 {{ stats?.total_rolls || 0 }}</span>
        </div>

        <div class="evaluation-section-title">
          <div>
            <h3>当前融合权重</h3>
            <p>先看每个模型在最终概率里的话语权，再看它们各自提供什么证据。</p>
          </div>
          <span>{{ prediction ? '实时' : '预览' }}</span>
        </div>

        <div class="fusion-weight-grid">
          <article v-for="row in weightRows" :key="row.key" :class="weightDiagnosticClass(row)">
            <div>
              <span>{{ row.label }}</span>
              <strong>{{ formatPercent(row.weight) }}</strong>
            </div>
            <i><b :style="{ width: formatPercent(row.weight) }"></b></i>
            <small v-if="row.adjustment?.hit_rate != null">
              基础 {{ formatPercent(row.baseWeight) }} · 命中 {{ formatPercent(row.adjustment.hit_rate) }}
              {{ row.adjustment.direction === 'up' ? '上调' : row.adjustment.direction === 'down' ? '下调' : '持平' }}
            </small>
            <small v-else>基础 {{ formatPercent(row.baseWeight) }} · 样本不足</small>
          </article>
        </div>

        <div class="evaluation-section-title">
          <div>
            <h3>模型细节</h3>
            <p>把当前算法拆开看：每个模型负责什么、看什么证据、当前权重是多少。</p>
          </div>
          <span>Model cards</span>
        </div>

        <div class="model-detail-grid">
          <article v-for="model in modelDetailRows" :key="model.key" :class="weightDiagnosticClass(model)">
            <header>
              <div>
                <span>{{ model.role }}</span>
                <strong>{{ model.title }}</strong>
              </div>
              <p>{{ formatPercent(model.weight) }}</p>
            </header>
            <small>{{ model.detail }}</small>
            <ul>
              <li v-for="item in model.evidence" :key="item">{{ item }}</li>
            </ul>
            <footer>
              基础 {{ formatPercent(model.baseWeight) }}
              <template v-if="model.adjustment?.hit_rate != null">
                · 命中 {{ formatPercent(model.adjustment.hit_rate) }}
              </template>
            </footer>
          </article>
        </div>

        <div class="evaluation-section-title">
          <div>
            <h3>回测指标</h3>
            <p>验证概率分布是否把真实词条放进更靠前、更高概率的位置。</p>
          </div>
          <span>Backtest</span>
        </div>

        <div class="evaluation-metrics">
          <article v-for="metric in evaluationMetrics" :key="metric.label">
            <div>
              <span>{{ metric.label }}</span>
              <strong>{{ evaluationMetricText(metric) }}</strong>
            </div>
            <small>{{ metric.target }} · {{ metric.description }}</small>
            <i><b :style="{ width: evaluationMetricFill(metric) }"></b></i>
          </article>
        </div>

        <div class="evaluation-grid compact-evaluation-grid">
          <section class="evaluation-card chart-card">
            <div class="chart-heading">
              <div>
                <h3>命中率回测</h3>
                <p>Top-k 覆盖率随候选池扩大后的验证表现</p>
              </div>
              <span>Backtest</span>
            </div>
            <div class="hit-chart">
              <div class="hit-axis" aria-hidden="true">
                <span>60%</span>
                <span>40%</span>
                <span>20%</span>
                <span>0%</span>
              </div>
              <div class="hit-bars">
                <div v-for="metric in evaluationMetrics.filter((item) => item.label.includes('命中率'))" :key="metric.label">
                  <strong>{{ evaluationMetricText(metric) }}</strong>
                  <i><b :style="{ height: evaluationMetricFill(metric) }"></b></i>
                  <span>{{ metric.label }}</span>
                </div>
              </div>
            </div>
          </section>

          <section class="evaluation-card">
            <div class="chart-heading">
              <h3>子模型回测</h3>
              <span>命中率 / 损失</span>
            </div>
            <div class="model-bars">
              <article v-for="row in modelEvaluationRows" :key="row.key">
                <div>
                  <strong>{{ row.label }}</strong>
                  <span>{{ formatPercent(row.hitRate) }} · Loss {{ row.loss.toFixed(2) }}</span>
                </div>
                <i><b :style="{ width: `${row.hitRate * 100}%` }"></b></i>
                <small>{{ row.note }}</small>
              </article>
            </div>
          </section>
        </div>

        <section class="evaluation-card risk-card">
          <div class="chart-heading">
            <h3>结论风险提示</h3>
            <span>防误判</span>
          </div>
          <div class="risk-grid">
            <article>
              <strong>样本不足时不下结论</strong>
              <span>低样本阶段只展示波动，不把随机噪声解释成规律。</span>
            </article>
            <article>
              <strong>权重调整看验证集表现</strong>
              <span>某个模型频繁命中后才逐步上调，避免一次好运气改变系统判断。</span>
            </article>
            <article>
              <strong>套装影响需要显著证据</strong>
              <span>后台持续记录套装变量，样本足够且偏差稳定后才提升上下文模型权重。</span>
            </article>
          </div>
        </section>
      </section>
    </section>
  </main>
</template>


