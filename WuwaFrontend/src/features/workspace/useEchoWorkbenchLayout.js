import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

function waitForFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve())
  })
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

    const gridRect = grid.getBoundingClientRect()
    const activeRect = activeButton.getBoundingClientRect()
    const targetScroll = grid.scrollTop + activeRect.top - gridRect.top - ((grid.clientHeight - activeButton.offsetHeight) / 2)
    grid.scrollTop = Math.max(0, targetScroll)
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
    syncSetupPanelHeight()
    focusActiveSonata()
    window.addEventListener('resize', syncSetupPanelHeight)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', syncSetupPanelHeight)
  })

  watch(
    () => `${props.activeEcho?.id || ''}:${props.activeEcho?.substats.length || 0}:${props.config.cost}:${props.config.main_stat}:${props.config.sonata}`,
    syncSetupPanelHeight,
    { flush: 'post' },
  )

  watch(
    () => props.config.sonata,
    focusActiveSonata,
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
