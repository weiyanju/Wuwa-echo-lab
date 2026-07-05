<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import historyMinimizeIcon from '../../assets/icons/panel-left.svg'
import historyPinnedIcon from '../../assets/icons/pin.svg'
import historyShowcaseIcon from '../../assets/icons/layout-list.svg'
import historyTerminalDarkIcon from '../../assets/icons/pangu-terminal-dark.png'
import historyTerminalIcon from '../../assets/icons/rovers-terminal-expand.png'
import { mainStatLabels, substatLabels } from '../../data/substats'
import { displayEchoName } from '../../services/echoDisplay'
import { sortVisibleEchoHistory, statusBadge } from '../../services/echoWorkflow'

const props = defineProps({
  echoes: {
    type: Array,
    default: () => [],
  },
  activeEchoId: {
    type: [Number, String],
    default: null,
  },
  isDarkTheme: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['select'])

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
const terminalIconRotation = ref(0)
let historyPanelAnimationTimer = null
let suppressNextHistoryToggle = false
let suppressNextHistoryToggleTimer = null

const FLOATING_HISTORY_MINIMIZED_SIZE = 76
const TERMINAL_ICON_LIGHT_MOUTH_ANGLE = 350
const TERMINAL_ICON_DARK_MOUTH_ANGLE = 10

const sortedEchoes = computed(() => sortVisibleEchoHistory(props.echoes))
const historyFilterOptions = computed(() => {
  const counts = sortedEchoes.value.reduce(
    (nextCounts, echo) => {
      nextCounts.all += 1
      if (echo.id === props.activeEchoId) {
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
    return echo.id === props.activeEchoId
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
const minimizedHistoryTerminalIcon = computed(() => (props.isDarkTheme ? historyTerminalDarkIcon : historyTerminalIcon))
const terminalExpandIconStyle = computed(() => ({ '--terminal-angle': `${terminalIconRotation.value}deg` }))
const floatingHistoryStyle = computed(() => {
  if (typeof window !== 'undefined' && window.matchMedia('(max-width: 860px)').matches) {
    return {}
  }
  return {
    left: `${floatingHistoryPosition.value.x}px`,
    top: `${floatingHistoryPosition.value.y}px`,
  }
})

function iconMask(source) {
  return { '--icon-url': `url("${source}")` }
}

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
      x: corner.horizontal === 'right' ? basePosition.x + baseSize.width - targetSize.width : basePosition.x,
      y: corner.vertical === 'bottom' ? basePosition.y + baseSize.height - targetSize.height : basePosition.y,
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
  return {
    x: Math.sin(radians),
    y: -Math.cos(radians),
  }
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
  const mouthAngle = props.isDarkTheme ? TERMINAL_ICON_DARK_MOUTH_ANGLE : TERMINAL_ICON_LIGHT_MOUTH_ANGLE
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
  const nextMinimizedPosition = willMinimize && startRect
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
  if (historyDrag.value) {
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
  }
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

onMounted(() => {
  syncTerminalIconRotation()
  constrainSavedFloatingHistoryPosition()
  window.addEventListener('resize', constrainSavedFloatingHistoryPosition)
})

watch(() => props.isDarkTheme, () => {
  syncTerminalIconRotation()
})

onBeforeUnmount(() => {
  clearTimeout(historyPanelAnimationTimer)
  historyPanelAnimationTimer = null
  clearTimeout(suppressNextHistoryToggleTimer)
  suppressNextHistoryToggleTimer = null
  endFloatingHistoryDrag()
  window.removeEventListener('resize', constrainSavedFloatingHistoryPosition)
})
</script>

<template>
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
        <img
          v-if="isHistoryMinimized"
          class="history-action-icon terminal-expand-icon"
          :style="terminalExpandIconStyle"
          :src="minimizedHistoryTerminalIcon"
          alt=""
          aria-hidden="true"
          draggable="false"
        >
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
        @click="emit('select', echo.id)"
      >
        <div class="echo-item-head">
          <strong>
            {{ displayEchoName(echo) }}
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
</template>
