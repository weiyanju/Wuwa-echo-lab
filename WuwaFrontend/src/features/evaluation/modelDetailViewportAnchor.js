const DEFAULT_POSITION_TOLERANCE_PX = 1
const DEFAULT_EXPAND_TOP_INSET_PX = 88
const DEFAULT_EXPAND_BOTTOM_INSET_PX = 24
const COMPACT_VIEWPORT_MAX_PX = 860
const COMPACT_EXPAND_TOP_INSET_PX = 64
const VIEWPORT_TAIL_CLASS = 'evaluation-detail-viewport-tail'

function finiteRectHeight(rect) {
  if (Number.isFinite(rect?.height) && rect.height >= 0) {
    return rect.height
  }
  if (Number.isFinite(rect?.top) && Number.isFinite(rect?.bottom)) {
    return Math.max(0, rect.bottom - rect.top)
  }
  return null
}

export function modelDetailExpandScrollDelta({
  summaryRect,
  detailRect,
  viewportHeight,
  topInset = DEFAULT_EXPAND_TOP_INSET_PX,
  bottomInset = DEFAULT_EXPAND_BOTTOM_INSET_PX,
} = {}) {
  const detailHeight = finiteRectHeight(detailRect)
  if (
    !Number.isFinite(summaryRect?.top)
    || !Number.isFinite(detailRect?.top)
    || detailHeight === null
    || !Number.isFinite(viewportHeight)
  ) {
    return 0
  }

  const summaryTop = summaryRect.top
  if (summaryTop <= topInset || detailHeight === 0) {
    return 0
  }

  const safeBottom = Math.max(topInset, viewportHeight - bottomInset)
  const detailOffsetFromSummary = Math.max(0, detailRect.top - summaryTop)
  const maximumRevealHeight = Math.max(
    0,
    safeBottom - topInset - detailOffsetFromSummary,
  )
  const desiredRevealHeight = Math.min(detailHeight, maximumRevealHeight)
  const currentRevealHeight = Math.min(
    detailHeight,
    Math.max(0, safeBottom - detailRect.top),
  )
  const missingRevealHeight = Math.max(0, desiredRevealHeight - currentRevealHeight)
  const availableSummaryTravel = Math.max(0, summaryTop - topInset)

  return Math.min(missingRevealHeight, availableSummaryTravel)
}

function anchorTop(anchorElement) {
  const top = anchorElement?.getBoundingClientRect?.().top
  return Number.isFinite(top) ? top : null
}

function expandedRowHeight(anchorElement) {
  const modelBars = anchorElement?.closest?.('.model-bars')
  const detailElement = modelBars?.querySelector?.('.model-row-detail')
  const expandedRow = detailElement?.closest?.('article')
  const height = expandedRow?.getBoundingClientRect?.().height
  return Number.isFinite(height) && height > 0 ? Math.ceil(height) : 0
}

function defaultWaitForFrame(anchorElement) {
  return new Promise((resolve) => {
    const requestFrame = anchorElement?.ownerDocument?.defaultView?.requestAnimationFrame
    if (typeof requestFrame === 'function') {
      requestFrame(() => resolve())
      return
    }
    resolve()
  })
}

function expandedDetailElement(anchorElement) {
  const rowElement = anchorElement?.closest?.('article')
  return rowElement?.querySelector?.(':scope > .model-row-detail') || null
}

function viewportMetrics(anchorElement, scrollingElement) {
  const view = anchorElement?.ownerDocument?.defaultView
  const viewportHeight = Number.isFinite(view?.innerHeight)
    ? view.innerHeight
    : scrollingElement?.clientHeight
  const viewportWidth = Number.isFinite(view?.innerWidth)
    ? view.innerWidth
    : Number.POSITIVE_INFINITY

  return {
    viewportHeight,
    topInset: viewportWidth <= COMPACT_VIEWPORT_MAX_PX
      ? COMPACT_EXPAND_TOP_INSET_PX
      : DEFAULT_EXPAND_TOP_INSET_PX,
    bottomInset: DEFAULT_EXPAND_BOTTOM_INSET_PX,
  }
}

export function createModelDetailViewportAnchor({
  waitForUpdate,
  waitForFrame = defaultWaitForFrame,
  positionTolerance = DEFAULT_POSITION_TOLERANCE_PX,
} = {}) {
  if (typeof waitForUpdate !== 'function') {
    throw new TypeError('waitForUpdate must be a function')
  }
  if (typeof waitForFrame !== 'function') {
    throw new TypeError('waitForFrame must be a function')
  }

  let latestOperationId = 0
  let tailDocument = null
  let tailHeight = 0
  let tailSpacer = null
  let tailWindow = null

  function removeScrollListener() {
    tailWindow?.removeEventListener?.('scroll', releaseViewportTail)
    tailWindow = null
  }

  function clearViewportTail() {
    removeScrollListener()
    if (tailSpacer) {
      tailSpacer.style.height = '0px'
      tailSpacer.remove?.()
    }
    tailDocument = null
    tailHeight = 0
    tailSpacer = null
  }

  function setViewportTailHeight(nextHeight) {
    const roundedHeight = Math.max(0, Math.ceil(nextHeight))
    tailHeight = roundedHeight
    if (tailSpacer) {
      tailSpacer.style.height = `${roundedHeight}px`
    }
    if (roundedHeight === 0) {
      clearViewportTail()
    }
  }

  function ensureViewportTail(anchorElement) {
    if (tailSpacer) {
      return tailSpacer
    }

    const ownerDocument = anchorElement?.ownerDocument
    const evaluationPanel = anchorElement?.closest?.('.evaluation-panel')
    if (!ownerDocument?.createElement || !evaluationPanel?.append) {
      return null
    }

    const spacer = ownerDocument.createElement('div')
    spacer.className = VIEWPORT_TAIL_CLASS
    spacer.setAttribute?.('aria-hidden', 'true')
    spacer.style.height = '0px'
    evaluationPanel.append(spacer)

    tailDocument = ownerDocument
    tailSpacer = spacer
    return spacer
  }

  function releaseViewportTail() {
    if (!tailSpacer || tailHeight <= 0) {
      return
    }

    const scrollingElement = tailDocument?.scrollingElement
    if (!scrollingElement) {
      clearViewportTail()
      return
    }

    const naturalMaxScroll = Math.max(
      0,
      scrollingElement.scrollHeight - scrollingElement.clientHeight - tailHeight,
    )
    const requiredTail = Math.max(0, scrollingElement.scrollTop - naturalMaxScroll)
    if (requiredTail < tailHeight) {
      setViewportTailHeight(requiredTail)
    }
  }

  function listenForTailRelease() {
    if (!tailSpacer || tailHeight <= 0 || tailWindow) {
      return
    }
    tailWindow = tailDocument?.defaultView || null
    tailWindow?.addEventListener?.('scroll', releaseViewportTail, { passive: true })
  }

  function reserveViewportTail(anchorElement) {
    const height = expandedRowHeight(anchorElement)
    if (!height || !ensureViewportTail(anchorElement)) {
      return
    }
    setViewportTailHeight(tailHeight + height)
  }

  async function preserveModelDetailViewportAnchor(
    anchorElement,
    applyStateChange,
    { action = 'collapse' } = {},
  ) {
    const operationId = ++latestOperationId
    const beforeTop = anchorTop(anchorElement)

    if (action === 'collapse') {
      reserveViewportTail(anchorElement)
    }

    applyStateChange()

    if (action === 'expand') {
      await waitForUpdate()

      if (operationId !== latestOperationId || !anchorElement?.isConnected) {
        return
      }

      clearViewportTail()
      await waitForFrame(anchorElement)

      if (operationId !== latestOperationId || !anchorElement?.isConnected) {
        return
      }

      const scrollingElement = anchorElement.ownerDocument?.scrollingElement
      const detailElement = expandedDetailElement(anchorElement)
      if (!scrollingElement || !detailElement) {
        return
      }

      const delta = modelDetailExpandScrollDelta({
        summaryRect: anchorElement.getBoundingClientRect(),
        detailRect: detailElement.getBoundingClientRect(),
        ...viewportMetrics(anchorElement, scrollingElement),
      })

      if (delta >= positionTolerance) {
        scrollingElement.scrollTop += delta
      }
      return
    }

    if (beforeTop === null) {
      releaseViewportTail()
      listenForTailRelease()
      return
    }

    await waitForUpdate()

    if (operationId !== latestOperationId || !anchorElement?.isConnected) {
      releaseViewportTail()
      listenForTailRelease()
      return
    }

    const scrollingElement = anchorElement.ownerDocument?.scrollingElement
    const afterTop = anchorTop(anchorElement)
    if (scrollingElement && afterTop !== null) {
      const positionDelta = afterTop - beforeTop
      if (Math.abs(positionDelta) >= positionTolerance) {
        scrollingElement.scrollTop += positionDelta
      }
    }

    releaseViewportTail()
    listenForTailRelease()
  }

  preserveModelDetailViewportAnchor.dispose = () => {
    latestOperationId += 1
    clearViewportTail()
  }

  return preserveModelDetailViewportAnchor
}
