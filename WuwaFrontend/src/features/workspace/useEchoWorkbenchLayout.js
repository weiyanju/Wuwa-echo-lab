import { computed, nextTick, onMounted, ref, watch } from 'vue'

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

function normalizedSonataSearch(value) {
  return String(value || '').replace(/\s+/g, '').toLocaleLowerCase('zh-CN')
}

export function filterSonataEffects(effects, query) {
  const normalizedQuery = normalizedSonataSearch(query)
  if (!normalizedQuery) return effects
  return effects.filter((effect) => normalizedSonataSearch(effect.name).includes(normalizedQuery))
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

export function useEchoWorkbenchLayout(props, legalMainStats, visibleSonataNames) {
  const mainStatRowRef = ref(null)
  const sonataGridRef = ref(null)
  const mainStatRowHeight = ref(null)
  const mainStatRowStyle = computed(() => (mainStatRowHeight.value === null ? {} : { height: `${mainStatRowHeight.value}px` }))
  let mainStatRowAnimationId = 0

  async function focusActiveSonata() {
    await nextTick()
    await waitForFrame()
    const grid = sonataGridRef.value
    const activeButton = grid?.querySelector('button.active')
    if (!grid || !activeButton) return

    grid.scrollTop = sonataScrollTopForActiveButton(grid, activeButton)
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

  onMounted(focusActiveSonata)

  watch(
    () => `${props.activeEcho?.id || ''}:${props.config.cost}:${props.config.main_stat}:${props.config.sonata}`,
    focusActiveSonata,
    { flush: 'post' },
  )

  watch(
    () => visibleSonataNames.value.join('|'),
    focusActiveSonata,
    { flush: 'post' },
  )

  watch(
    () => legalMainStats.value.join('|'),
    animateMainStatRowChange,
    { flush: 'pre' },
  )

  return {
    mainStatRowRef,
    sonataGridRef,
    mainStatRowStyle,
    clearMainStatRowHeight,
  }
}
