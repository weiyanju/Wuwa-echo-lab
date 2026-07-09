import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

function waitForFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve())
  })
}

function numericScrollPadding(grid, property) {
  const styles = grid.ownerDocument?.defaultView?.getComputedStyle?.(grid) || window.getComputedStyle(grid)
  const value = Number.parseFloat(styles[property])
  return Number.isFinite(value) ? value : 0
}

function clampScrollTop(grid, scrollTop) {
  const maxScrollTop = Number.isFinite(grid.scrollHeight)
    ? Math.max(0, grid.scrollHeight - grid.clientHeight)
    : Number.POSITIVE_INFINITY
  return Math.min(maxScrollTop, Math.max(0, scrollTop))
}

export function sonataScrollTopForActiveButton(grid, activeButton) {
  const paddingTop = numericScrollPadding(grid, 'scrollPaddingTop')
  const paddingBottom = numericScrollPadding(grid, 'scrollPaddingBottom')
  const gridRect = grid.getBoundingClientRect()
  const activeRect = activeButton.getBoundingClientRect()
  const viewportTop = grid.scrollTop + paddingTop
  const viewportBottom = grid.scrollTop + grid.clientHeight - paddingBottom
  const activeTop = grid.scrollTop + activeRect.top - gridRect.top
  const activeHeight = activeButton.offsetHeight || activeRect.height || 0
  const activeBottom = activeTop + activeHeight

  if (activeTop < viewportTop) {
    return clampScrollTop(grid, activeTop - paddingTop)
  }

  if (activeBottom > viewportBottom) {
    return clampScrollTop(grid, activeBottom - grid.clientHeight + paddingBottom)
  }

  return grid.scrollTop
}

export function useEchoWorkbenchLayout(props, legalMainStats) {
  const createPanelRef = ref(null)
  const galleryPanelRef = ref(null)
  const mainStatRowRef = ref(null)
  const sonataGridRef = ref(null)
  const setupPanelHeight = ref(null)
  const mainStatRowHeight = ref(null)
  const setupPanelStyle = computed(() => (setupPanelHeight.value ? { height: `${setupPanelHeight.value}px` } : {}))
  const mainStatRowStyle = computed(() => (mainStatRowHeight.value === null ? {} : { height: `${mainStatRowHeight.value}px` }))
  let mainStatRowAnimationId = 0

  async function syncSetupPanelHeight() {
    await nextTick()
    await waitForFrame()
    if (!createPanelRef.value || !galleryPanelRef.value || window.matchMedia('(max-width: 860px)').matches) {
      setupPanelHeight.value = null
      return
    }
    setupPanelHeight.value = Math.ceil(galleryPanelRef.value.getBoundingClientRect().height)
  }

  async function focusActiveSonata() {
    await nextTick()
    await waitForFrame()
    const grid = sonataGridRef.value
    const activeButton = grid?.querySelector('button.active')
    if (!grid || !activeButton) return

    grid.scrollTop = sonataScrollTopForActiveButton(grid, activeButton)
  }

  async function syncSetupPanelLayout() {
    await syncSetupPanelHeight()
    await focusActiveSonata()
  }

  function clearMainStatRowHeight(event) {
    if (event.target === mainStatRowRef.value && event.propertyName === 'height') {
      mainStatRowHeight.value = null
    }
  }

  function measureMainStatRowContentHeight() {
    const content = mainStatRowRef.value.firstElementChild
    return Math.ceil((content || mainStatRowRef.value).getBoundingClientRect().height)
  }

  async function animateMainStatRowChange() {
    const row = mainStatRowRef.value
    const animationId = ++mainStatRowAnimationId
    if (!row || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      mainStatRowHeight.value = null
      return
    }

    const startHeight = Math.ceil(row.getBoundingClientRect().height)
    mainStatRowHeight.value = startHeight
    await nextTick()
    if (animationId !== mainStatRowAnimationId) return

    const targetHeight = measureMainStatRowContentHeight()
    if (targetHeight === startHeight) {
      mainStatRowHeight.value = null
      return
    }

    await waitForFrame()
    if (animationId === mainStatRowAnimationId) {
      mainStatRowHeight.value = targetHeight
    }
  }

  onMounted(() => {
    syncSetupPanelLayout()
    window.addEventListener('resize', syncSetupPanelLayout)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', syncSetupPanelLayout)
  })

  watch(
    () => `${props.activeEcho?.id || ''}:${props.config.cost}:${props.config.main_stat}:${props.config.sonata}`,
    syncSetupPanelLayout,
    { flush: 'post' },
  )

  watch(
    () => legalMainStats.value.join('|'),
    animateMainStatRowChange,
    { flush: 'pre' },
  )

  return {
    createPanelRef,
    galleryPanelRef,
    mainStatRowRef,
    sonataGridRef,
    setupPanelStyle,
    mainStatRowStyle,
    clearMainStatRowHeight,
  }
}
