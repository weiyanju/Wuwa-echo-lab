const DEFAULT_POSITION_TOLERANCE_PX = 1

function anchorTop(anchorElement) {
  const top = anchorElement?.getBoundingClientRect?.().top
  return Number.isFinite(top) ? top : null
}

export function createModelDetailViewportAnchor({
  waitForUpdate,
  positionTolerance = DEFAULT_POSITION_TOLERANCE_PX,
} = {}) {
  if (typeof waitForUpdate !== 'function') {
    throw new TypeError('waitForUpdate must be a function')
  }

  let latestOperationId = 0

  return async function preserveModelDetailViewportAnchor(anchorElement, applyStateChange) {
    const operationId = ++latestOperationId
    const beforeTop = anchorTop(anchorElement)

    applyStateChange()

    if (beforeTop === null) {
      return
    }

    await waitForUpdate()

    if (operationId !== latestOperationId || !anchorElement?.isConnected) {
      return
    }

    const scrollingElement = anchorElement.ownerDocument?.scrollingElement
    const afterTop = anchorTop(anchorElement)
    if (!scrollingElement || afterTop === null) {
      return
    }

    const positionDelta = afterTop - beforeTop
    if (Math.abs(positionDelta) < positionTolerance) {
      return
    }

    scrollingElement.scrollTop += positionDelta
  }
}
