const VIEWPORT_MARGIN = 12
const ANCHOR_GAP = 8
const TITLE_ALIGNMENT_OFFSET = 8

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), Math.max(maximum, minimum))
}

export function resolveSampleStageGuidePosition({
  triggerRect,
  panelRect,
  viewportWidth,
  viewportHeight,
}) {
  const viewportMaxWidth = Math.max(viewportWidth - VIEWPORT_MARGIN * 2, 0)
  const maxHeight = Math.max(viewportHeight - VIEWPORT_MARGIN * 2, 0)
  const panelWidth = Math.min(panelRect.width, viewportMaxWidth)
  const panelHeight = Math.min(panelRect.height, maxHeight)
  const maximumLeft = viewportWidth - VIEWPORT_MARGIN - panelWidth
  const maximumTop = viewportHeight - VIEWPORT_MARGIN - panelHeight
  const alignedTop = clamp(
    triggerRect.top - TITLE_ALIGNMENT_OFFSET,
    VIEWPORT_MARGIN,
    maximumTop,
  )
  const rightLeft = triggerRect.right + ANCHOR_GAP

  if (
    rightLeft >= VIEWPORT_MARGIN
    && rightLeft + panelWidth <= viewportWidth - VIEWPORT_MARGIN
  ) {
    return {
      placement: 'right',
      left: rightLeft,
      top: alignedTop,
      maxWidth: panelWidth,
    }
  }

  const leftLeft = triggerRect.left - ANCHOR_GAP - panelWidth
  if (
    leftLeft >= VIEWPORT_MARGIN
    && leftLeft + panelWidth <= viewportWidth - VIEWPORT_MARGIN
  ) {
    return {
      placement: 'left',
      left: leftLeft,
      top: alignedTop,
      maxWidth: panelWidth,
    }
  }

  return {
    placement: 'below',
    left: clamp(
      triggerRect.left - TITLE_ALIGNMENT_OFFSET,
      VIEWPORT_MARGIN,
      maximumLeft,
    ),
    top: clamp(triggerRect.bottom + ANCHOR_GAP, VIEWPORT_MARGIN, maximumTop),
    maxWidth: viewportMaxWidth,
  }
}
