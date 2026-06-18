<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  addSubstat,
  createEcho,
  getModelEvaluation,
  getPrediction,
  getStats,
  listEchoes,
  listRecognitionSessions,
  listRecognitionSnapshots,
  revertRecognitionSnapshot,
  undoLastSubstat,
  updateEcho,
} from './services/api'
import { useAuth } from './composables/useAuth'
import { useGameAccount } from './composables/useGameAccount'
import { displayEchoNumericId } from './services/echoId'
import { buildNextEchoConfig, isReusableDraft, sortVisibleEchoHistory, statusBadge } from './services/echoWorkflow'
import { confidenceText, formatPercent, formatSignedPercent } from './services/formatters'
import { buildModelDetailCards } from './services/modelDetails'
import { normalizePlayerUid } from './services/playerUid'
import { mainStatLabels, mainStatsByCost, substatLabels, substatOrder, tierTables } from './data/substats'
import { sonataEffects } from './data/sonataEffects'
import EvaluationBacktest from './features/evaluation/EvaluationBacktest.vue'
import EvaluationOverview from './features/evaluation/EvaluationOverview.vue'
import RecognitionReviewPanel from './features/recognition/RecognitionReviewPanel.vue'
import StatisticsView from './features/statistics/StatisticsView.vue'
import historyMinimizeIcon from './assets/icons/panel-left.svg'
import historyPinnedIcon from './assets/icons/pin.svg'
import historyShowcaseIcon from './assets/icons/layout-list-lucide.svg'
import moonIcon from './assets/icons/moon.svg'
import historyTerminalDarkIcon from './assets/icons/pangu-terminal-dark.png'
import historyTerminalIcon from './assets/icons/rovers-terminal-expand.png'
import sunIcon from './assets/icons/sun.svg'

const auth = useAuth()
const gameAccount = useGameAccount()
const user = auth.user
const page = ref('workspace')
const authForm = ref({
  username: localStorage.getItem('wuwa-login-username') || '',
  password: '',
  mode: 'login',
})
const uidBinding = ref('')
const saveLogin = ref(localStorage.getItem('wuwa-save-login') === 'true')
const error = ref('')
const loading = ref(true)
const saving = ref(false)
const pendingTierKey = ref('')

const echoes = ref([])
const activeEchoId = ref(null)
const prediction = ref(null)
const stats = ref(null)
const evaluation = ref(null)
const recognitionSessions = ref([])
const recognitionSnapshots = ref([])
const revertingSnapshotId = ref(null)
const recognitionRefreshing = ref(false)
const recognitionRefreshStatus = ref('')
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
const themeMode = ref(readInitialTheme())
const historyFilter = ref('all')
const historyDrag = ref(null)
let historyPanelAnimationTimer = null
let suppressNextHistoryToggle = false
let suppressNextHistoryToggleTimer = null
let insightsRefreshTimer = null
let activeRefreshTimer = null
let recognitionRefreshFeedbackTimer = null
let activePredictionRefreshToken = 0
const FLOATING_HISTORY_MINIMIZED_SIZE = 76
// Terminal mouth angle in each unrotated asset. Angles use the app convention:
// 0deg points to 12 o'clock and increases clockwise.
const TERMINAL_ICON_LIGHT_MOUTH_ANGLE = 350
const TERMINAL_ICON_DARK_MOUTH_ANGLE = 10

const echoForm = ref({
  sonata: sonataEffects.at(-1).name,
  cost: 1,
  main_stat: 'atk_percent',
  is_continuous_tuning: false,
})

const activeEcho = computed(() => echoes.value.find((echo) => echo.id === activeEchoId.value) || null)
const isDarkTheme = computed(() => themeMode.value === 'dark')
const themeToggleLabel = computed(() => (isDarkTheme.value ? '切换到日间模式' : '切换到夜间模式'))
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
const selectedGameAccountId = computed(() => gameAccount.defaultAccount.value?.id || null)
const boundPlayerUid = computed(() => gameAccount.defaultAccount.value?.uid || '')
const latestRecognitionSession = computed(() => recognitionSessions.value[0] || null)
const recognitionReviewRows = computed(() => recognitionSnapshots.value.filter((snapshot) => (
  ['saved', 'conflict', 'rejected', 'ignored_duplicate'].includes(snapshot.status)
)))
const recognitionMetrics = computed(() => {
  const session = latestRecognitionSession.value || {}
  return [
    { key: 'saved_roll_count', label: '保存词条', value: session.saved_roll_count || 0 },
    { key: 'snapshot_count', label: '识别快照', value: session.snapshot_count || 0 },
    { key: 'conflict_count', label: '待处理', value: session.conflict_count || 0 },
  ]
})
const recognitionRefreshDisabled = computed(() => saving.value || recognitionRefreshing.value || Boolean(recognitionRefreshStatus.value))
const modelDetailCards = computed(() =>
  buildModelDetailCards({
    prediction: prediction.value,
    stats: stats.value,
    evaluation: evaluation.value,
    echoes: echoes.value,
    labels: substatLabels,
  }),
)
const setupPanelStyle = computed(() => (setupPanelHeight.value ? { height: `${setupPanelHeight.value}px` } : {}))
const terminalIconRotation = ref(0)
const minimizedHistoryTerminalIcon = computed(() => (isDarkTheme.value ? historyTerminalDarkIcon : historyTerminalIcon))
const terminalExpandIconStyle = computed(() => ({
  '--terminal-angle': `${terminalIconRotation.value}deg`,
}))

function iconMask(source) {
  return { '--icon-url': `url("${source}")` }
}

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

function readInitialTheme() {
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

function toggleTheme() {
  themeMode.value = isDarkTheme.value ? 'light' : 'dark'
  nextTick(() => syncTerminalIconRotation())
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
  const mouthAngle = isDarkTheme.value ? TERMINAL_ICON_DARK_MOUTH_ANGLE : TERMINAL_ICON_LIGHT_MOUTH_ANGLE
  const targetRotation = getFloatingHistoryTerminalAngle(position) - mouthAngle
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
    const currentUser = await auth.loadMe()
    if (currentUser) {
      await gameAccount.loadGameAccounts()
      uidBinding.value = boundPlayerUid.value
      if (!gameAccount.workspaceLocked.value) {
        await refreshAll()
      } else {
        resetWorkspaceState()
      }
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function submitAuth() {
  error.value = ''
  const username = authForm.value.username.trim()
  const password = authForm.value.password
  if (!username || !password) {
    error.value = '请填写用户名和密码。'
    return
  }
  try {
    const payload = { username, password }
    if (authForm.value.mode === 'register') {
      await auth.signUp(payload)
    } else {
      await auth.signIn(payload)
    }
    localStorage.setItem('wuwa-save-login', saveLogin.value ? 'true' : 'false')
    if (saveLogin.value) {
      localStorage.setItem('wuwa-login-username', username)
    } else {
      localStorage.removeItem('wuwa-login-username')
    }
    await gameAccount.loadGameAccounts()
    uidBinding.value = boundPlayerUid.value
    if (gameAccount.workspaceLocked.value) {
      resetWorkspaceState()
    } else {
      await refreshAll()
    }
  } catch (err) {
    error.value = err.message
  }
}

function resetWorkspaceState() {
  echoes.value = []
  activeEchoId.value = null
  prediction.value = null
  stats.value = null
  evaluation.value = null
  recognitionSessions.value = []
  recognitionSnapshots.value = []
}

function handleUidBindingInput() {
  uidBinding.value = normalizePlayerUid(uidBinding.value)
}

async function submitUidBinding() {
  error.value = ''
  const uid = normalizePlayerUid(uidBinding.value)
  uidBinding.value = uid
  if (!uid) {
    error.value = '请填写游戏 UID。'
    return
  }

  saving.value = true
  try {
    resetWorkspaceState()
    await gameAccount.bindDefaultUid(uidBinding.value)
    await refreshAll()
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}

async function signOut() {
  await auth.signOut()
  gameAccount.accounts.value = []
  uidBinding.value = ''
  resetWorkspaceState()
  if (!saveLogin.value) {
    authForm.value.username = ''
    localStorage.removeItem('wuwa-login-username')
  }
  authForm.value.password = ''
}

async function refreshAll() {
  if (gameAccount.workspaceLocked.value || !selectedGameAccountId.value) {
    resetWorkspaceState()
    return
  }
  const echoData = await listEchoes(selectedGameAccountId.value)
  echoes.value = echoData.results || []
  if (!echoes.value.length && boundPlayerUid.value) {
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
  stats.value = await getStats(selectedGameAccountId.value)
  evaluation.value = await getModelEvaluation(selectedGameAccountId.value)
  await refreshRecognition({ silent: true })
}

async function refreshActive() {
  if (!activeEchoId.value) {
    prediction.value = null
    return
  }
  const echoId = activeEchoId.value
  const token = ++activePredictionRefreshToken
  const nextPrediction = await getPrediction(echoId)
  if (token === activePredictionRefreshToken && activeEchoId.value === echoId) {
    prediction.value = nextPrediction
  }
}

function setRecognitionRefreshStatus(status) {
  clearTimeout(recognitionRefreshFeedbackTimer)
  recognitionRefreshStatus.value = status
  if (status) {
    recognitionRefreshFeedbackTimer = setTimeout(() => {
      recognitionRefreshStatus.value = ''
      recognitionRefreshFeedbackTimer = null
    }, 900)
  }
}

async function refreshRecognition({ silent = false } = {}) {
  if (!selectedGameAccountId.value) {
    recognitionSessions.value = []
    recognitionSnapshots.value = []
    return
  }
  if (recognitionRefreshing.value) {
    return
  }
  recognitionRefreshing.value = true
  if (!silent) {
    recognitionRefreshStatus.value = ''
  }
  try {
    const [sessionData, snapshotData] = await Promise.all([
      listRecognitionSessions(selectedGameAccountId.value),
      listRecognitionSnapshots(selectedGameAccountId.value, ['saved', 'conflict', 'rejected', 'ignored_duplicate']),
    ])
    recognitionSessions.value = sessionData.results || []
    recognitionSnapshots.value = snapshotData.results || []
    if (!silent) {
      setRecognitionRefreshStatus('success')
    }
  } catch (err) {
    if (!silent) {
      error.value = err.message
      setRecognitionRefreshStatus('error')
      return
    }
    throw err
  } finally {
    recognitionRefreshing.value = false
  }
}

async function revertSnapshot(snapshot) {
  if (!snapshot?.snapshot_id || revertingSnapshotId.value) {
    return
  }
  error.value = ''
  revertingSnapshotId.value = snapshot.snapshot_id
  try {
    await revertRecognitionSnapshot(snapshot.snapshot_id)
    await refreshAll()
  } catch (err) {
    error.value = err.message
  } finally {
    revertingSnapshotId.value = null
  }
}

function replaceEcho(nextEcho) {
  echoes.value = echoes.value.map((echo) => (echo.id === nextEcho.id ? nextEcho : echo))
}

function appendRollToEcho(echoId, roll) {
  echoes.value = echoes.value.map((echo) => {
    if (echo.id !== echoId) {
      return echo
    }
    const nextRolls = [...echo.substats.filter((item) => item.id !== roll.id), roll]
      .sort((left, right) => left.position - right.position || left.id - right.id)
    return {
      ...echo,
      substats: nextRolls,
      status: nextRolls.length >= 5 ? 'completed' : 'in_progress',
      last_tuned_at: roll.tuned_at,
    }
  })
}

function replaceOptimisticRollInEcho(echoId, optimisticRollId, roll) {
  echoes.value = echoes.value.map((echo) => {
    if (echo.id !== echoId) {
      return echo
    }
    const nextRolls = echo.substats
      .map((item) => (item.id === optimisticRollId ? roll : item))
      .sort((left, right) => left.position - right.position || left.id - right.id)
    return {
      ...echo,
      substats: nextRolls,
      status: nextRolls.length >= 5 ? 'completed' : 'in_progress',
      last_tuned_at: roll.tuned_at,
    }
  })
}

function removeOptimisticRollFromEcho(echoId, optimisticRollId) {
  echoes.value = echoes.value.map((echo) => {
    if (echo.id !== echoId) {
      return echo
    }
    const nextRolls = echo.substats.filter((item) => item.id !== optimisticRollId)
    return {
      ...echo,
      substats: nextRolls,
      status: nextRolls.length >= 5 ? 'completed' : 'in_progress',
      last_tuned_at: nextRolls.at(-1)?.tuned_at || null,
    }
  })
}

function buildOptimisticRoll(row, tier) {
  return {
    id: -Date.now(),
    position: (activeEcho.value?.substats.length || 0) + 1,
    substat_type: row.substat_type,
    tier_value: tier.value,
    enhance_phase: '',
    tuning_order: null,
    tuned_at: new Date().toISOString(),
    optimistic: true,
  }
}

function refreshInsightsInBackground() {
  if (!selectedGameAccountId.value) {
    return
  }
  clearTimeout(insightsRefreshTimer)
  insightsRefreshTimer = setTimeout(() => {
    Promise.all([
      getStats(selectedGameAccountId.value),
      getModelEvaluation(selectedGameAccountId.value),
    ])
      .then(([nextStats, nextEvaluation]) => {
        stats.value = nextStats
        evaluation.value = nextEvaluation
      })
      .catch((err) => {
        error.value = err.message
      })
  }, 1000)
}

function refreshActiveInBackground() {
  clearTimeout(activeRefreshTimer)
  activeRefreshTimer = setTimeout(() => {
    refreshActive().catch((err) => {
      error.value = err.message
    })
  }, 300)
}

function tierButtonKey(row, tier) {
  return `${row.substat_type}:${tier.value}`
}

function isTierPending(row, tier) {
  return pendingTierKey.value === tierButtonKey(row, tier)
}

function rowHasPendingTier(row) {
  return pendingTierKey.value.startsWith(`${row.substat_type}:`)
}

async function createEchoWithConfig(config = echoForm.value) {
  if (gameAccount.workspaceLocked.value || !selectedGameAccountId.value) {
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
      display_name: '',
      cost: echoForm.value.cost,
      set_name: echoForm.value.sonata,
      main_stat: echoForm.value.main_stat,
      source: '',
      tuning_batch_id: '',
      is_continuous_tuning: echoForm.value.is_continuous_tuning,
    }, selectedGameAccountId.value)
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
  if (row.recorded || pendingTierKey.value) {
    return
  }
  pendingTierKey.value = tierButtonKey(row, tier)
  error.value = ''
  let optimisticRoll = null
  let optimisticEchoId = null
  try {
    const echo = await ensureActiveEcho()
    if (!echo) {
      return
    }
    optimisticEchoId = echo.id
    optimisticRoll = buildOptimisticRoll(row, tier)
    appendRollToEcho(echo.id, optimisticRoll)
    const roll = await addSubstat(echo.id, {
      substat_type: row.substat_type,
      tier_value: tier.value,
    })
    replaceOptimisticRollInEcho(echo.id, optimisticRoll.id, roll)
    refreshActiveInBackground()
    refreshInsightsInBackground()
  } catch (err) {
    if (optimisticEchoId && optimisticRoll) {
      removeOptimisticRollFromEcho(optimisticEchoId, optimisticRoll.id)
    }
    error.value = err.message
  } finally {
    pendingTierKey.value = ''
  }
}

async function undoActiveSubstat() {
  if (!activeEcho.value || !activeEcho.value.substats.length || saving.value) {
    return
  }
  saving.value = true
  error.value = ''
  try {
    const result = await undoLastSubstat(activeEcho.value.id)
    replaceEcho(result.echo)
    await refreshActive()
    refreshInsightsInBackground()
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
  clearTimeout(insightsRefreshTimer)
  insightsRefreshTimer = null
  clearTimeout(activeRefreshTimer)
  activeRefreshTimer = null
  clearTimeout(recognitionRefreshFeedbackTimer)
  recognitionRefreshFeedbackTimer = null
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
  () => `${activeEchoId.value}:${echoForm.value.cost}:${echoForm.value.main_stat}:${echoForm.value.sonata}`,
  syncSetupPanelHeight,
  { flush: 'post' },
)
</script>

<template>
  <main class="app-shell" :class="{ 'theme-dark': isDarkTheme }">
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

      <form class="auth-form product-panel" @submit.prevent="submitAuth">
        <label>
          用户名
          <input v-model="authForm.username" autocomplete="username" />
        </label>
        <label>
          密码
          <input v-model="authForm.password" type="password" autocomplete="current-password" />
        </label>
        <label class="checkbox-row save-login-row">
          <input v-model="saveLogin" type="checkbox" />
          记住用户名
        </label>
        <p v-if="error" class="error-text">{{ error }}</p>
        <div class="auth-mode-actions">
          <button :class="{ active: authForm.mode === 'login' }" type="button" @click="authForm.mode = 'login'">登录</button>
          <button :class="{ active: authForm.mode === 'register' }" type="button" @click="authForm.mode = 'register'">注册</button>
        </div>
        <button class="button-buy" type="submit">{{ authForm.mode === 'register' ? '创建账号并进入' : '进入研究台' }}</button>
      </form>
    </section>

    <section v-else-if="gameAccount.workspaceLocked.value" class="uid-setup-shell">
      <header class="uid-setup-topbar">
        <a class="wordmark" href="#" @click.prevent="page = 'workspace'">Wuwa Echo Lab</a>
        <nav class="pill-tabs disabled-tabs" aria-label="页面">
          <button class="active" type="button" disabled>工作台</button>
          <button type="button" disabled>统计</button>
          <button type="button" disabled>评估</button>
        </nav>
        <div class="account-actions uid-switcher">
          <div class="uid-chip">
            <i class="uid-status-dot" aria-hidden="true"></i>
            <span class="uid-chip-label">UID</span>
            <span class="uid-chip-value">{{ boundPlayerUid || '未绑定' }}</span>
          </div>
          <button
            class="theme-toggle-button"
            type="button"
            :aria-pressed="isDarkTheme"
            :aria-label="themeToggleLabel"
            :title="themeToggleLabel"
            @click="toggleTheme"
          >
            <span class="ui-line-icon theme-toggle-icon" :style="iconMask(isDarkTheme ? sunIcon : moonIcon)" aria-hidden="true"></span>
          </button>
          <button class="button-ghost" @click="signOut">退出</button>
        </div>
      </header>

      <div class="uid-setup-content">
        <p v-if="error" class="error-text">{{ error }}</p>

        <section class="locked-workbench product-panel">
          <div class="section-heading">
            <h2>绑定鸣潮 UID</h2>
            <p>用于保存声骸记录和统计数据。</p>
          </div>
          <form class="uid-binding-form" @submit.prevent="submitUidBinding">
            <label>
              UID
              <input
                v-model="uidBinding"
                inputmode="numeric"
                autocomplete="off"
                placeholder="输入你的 UID"
                :disabled="saving || gameAccount.loading.value"
                @input="handleUidBindingInput"
              />
            </label>
            <button class="button-buy" type="submit" :disabled="saving || gameAccount.loading.value">
              {{ saving ? '保存中' : '保存' }}
            </button>
          </form>
        </section>
      </div>
    </section>

    <section v-else class="dashboard">
      <header class="topbar">
        <a class="wordmark" href="#" @click.prevent="page = 'workspace'">Wuwa Echo Lab</a>
        <nav class="pill-tabs" aria-label="页面">
          <button :class="{ active: page === 'workspace' }" @click="page = 'workspace'">工作台</button>
          <button :class="{ active: page === 'stats' }" @click="page = 'stats'">统计</button>
          <button :class="{ active: page === 'evaluation' }" @click="page = 'evaluation'">评估</button>
        </nav>
        <div class="account-actions uid-switcher">
          <div class="uid-chip">
            <i class="uid-status-dot" aria-hidden="true"></i>
            <span class="uid-chip-label">UID</span>
            <span class="uid-chip-value">{{ boundPlayerUid || '未绑定' }}</span>
          </div>
          <button
            class="theme-toggle-button"
            type="button"
            :aria-pressed="isDarkTheme"
            :aria-label="themeToggleLabel"
            :title="themeToggleLabel"
            @click="toggleTheme"
          >
            <span class="ui-line-icon theme-toggle-icon" :style="iconMask(isDarkTheme ? sunIcon : moonIcon)" aria-hidden="true"></span>
          </button>
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

      <RecognitionReviewPanel
        v-if="page === 'workspace'"
        :latest-session="latestRecognitionSession"
        :metrics="recognitionMetrics"
        :refresh-disabled="recognitionRefreshDisabled"
        :refresh-status="recognitionRefreshStatus"
        :refreshing="recognitionRefreshing"
        :reverting-snapshot-id="revertingSnapshotId"
        :review-rows="recognitionReviewRows"
        @refresh="refreshRecognition"
        @revert="revertSnapshot"
      />

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
              v-memo="[row.recorded?.id, row.recorded?.tier_value, row.candidate?.p_final, row.candidate?.baseline_deviation, row.topPredicted, rowHasPendingTier(row)]"
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
                  :disabled="Boolean(row.recorded) || isTierPending(row, tier)"
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
              <span class="ui-line-icon history-action-icon" :style="iconMask(historyPinnedIcon)" aria-hidden="true"></span>
            </button>
            <button type="button" :class="{ active: isHistoryShowcase }" :aria-label="isHistoryShowcase ? '收起展示历史声骸' : '展示全部历史声骸'" :title="isHistoryShowcase ? '收起展示' : '展示全部'" @click.stop="toggleFloatingHistoryShowcase">
              <span class="ui-line-icon history-action-icon" :style="iconMask(historyShowcaseIcon)" aria-hidden="true"></span>
            </button>
            <button type="button" :aria-label="isHistoryMinimized ? '展开历史声骸' : '缩小历史声骸'" :title="isHistoryMinimized ? '展开' : '缩小'" @click.stop="toggleFloatingHistorySize">
              <img v-if="isHistoryMinimized" class="history-action-icon terminal-expand-icon" :style="terminalExpandIconStyle" :src="minimizedHistoryTerminalIcon" alt="" aria-hidden="true" draggable="false" />
              <span v-else class="ui-line-icon history-action-icon" :style="iconMask(historyMinimizeIcon)" aria-hidden="true"></span>
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

      <StatisticsView
        v-if="!gameAccount.workspaceLocked.value && page === 'stats'"
        :stats="stats"
      />

      <section v-if="!gameAccount.workspaceLocked.value && page === 'evaluation'" class="product-panel full-panel evaluation-panel">
        <EvaluationOverview
          :evaluation="evaluation"
          :model-details="modelDetailCards"
          :prediction="prediction"
          :stats="stats"
        />

        <EvaluationBacktest
          :evaluation="evaluation"
          :model-details="modelDetailCards"
          :prediction="prediction"
        />
      </section>
    </section>
  </main>
</template>


