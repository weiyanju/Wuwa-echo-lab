export const TITLE_START_DELAY_MS = 180
export const TITLE_GRAPHEME_DELAYS_MS = Object.freeze([90, 64, 98, 70, 250, 94, 72])
export const TITLE_DEFAULT_INTERVAL_MS = 70
export const TITLE_PUNCTUATION_COMPRESS_MS = 170
export const TITLE_FINAL_HOLD_MS = 166
export const TITLE_AUTH_HANDOFF_DELAY_MS = 40
export const TITLE_INDICATOR_HIDE_DELAY_MS = 420
export const TITLE_INDICATOR_TRANSITION_MS = 220
export const TITLE_COMPLETE_DELAY_MS = TITLE_INDICATOR_HIDE_DELAY_MS + TITLE_INDICATOR_TRANSITION_MS

export const TITLE_PHASE = Object.freeze({
  PREPARING: 'preparing',
  TYPING: 'typing',
  PUNCTUATION: 'punctuation',
  RESOLVING: 'resolving',
  COMPLETED: 'completed',
  STATIC: 'static',
})

export const TITLE_INDICATOR_STATE = Object.freeze({
  BAR: 'bar',
  COMPRESSED: 'compressed',
  DOT: 'dot',
  HIDDEN: 'hidden',
})

export function splitTitleGraphemes(text, Segmenter = globalThis.Intl?.Segmenter) {
  if (!Segmenter) return Array.from(text)
  const segmenter = new Segmenter('zh-CN', { granularity: 'grapheme' })
  return Array.from(segmenter.segment(text), ({ segment }) => segment)
}

export function shouldAnimateTitle({ reduceMotion, compactViewport, documentHidden }) {
  return !reduceMotion && !compactViewport && !documentHidden
}

function delayAfter(index) {
  return TITLE_GRAPHEME_DELAYS_MS[index] ?? TITLE_DEFAULT_INTERVAL_MS
}

export function createTitleAnimation({
  text,
  onFrame,
  onPhaseChange = () => {},
  onIndicatorChange = () => {},
  onAuthReady = () => {},
  onComplete,
  schedule = globalThis.setTimeout,
  cancel = globalThis.clearTimeout,
}) {
  const graphemes = splitTitleGraphemes(text)
  const timerIds = new Set()
  let currentIndex = 0
  let started = false
  let finished = false
  let authReady = false

  function clearScheduledFrames() {
    for (const timerId of timerIds) cancel(timerId)
    timerIds.clear()
  }

  function notifyAuthReady() {
    if (finished || authReady) return
    authReady = true
    onAuthReady()
  }

  function finishStatic() {
    if (finished) return
    finished = true
    clearScheduledFrames()
    onFrame(text)
    onPhaseChange(TITLE_PHASE.STATIC)
    onIndicatorChange(TITLE_INDICATOR_STATE.HIDDEN)
    if (!authReady) {
      authReady = true
      onAuthReady()
    }
    onComplete()
  }

  function finishArchive() {
    if (finished) return
    finished = true
    clearScheduledFrames()
    onPhaseChange(TITLE_PHASE.COMPLETED)
    onComplete()
  }

  function scheduleFrame(callback, delay) {
    if (finished) return
    try {
      let timerId = null
      timerId = schedule(() => {
        timerIds.delete(timerId)
        callback()
      }, delay)
      timerIds.add(timerId)
    } catch {
      finishStatic()
    }
  }

  function beginArchive() {
    if (finished) return
    onPhaseChange(TITLE_PHASE.RESOLVING)
    onIndicatorChange(TITLE_INDICATOR_STATE.DOT)
    scheduleFrame(notifyAuthReady, TITLE_AUTH_HANDOFF_DELAY_MS)
    scheduleFrame(
      () => onIndicatorChange(TITLE_INDICATOR_STATE.HIDDEN),
      TITLE_INDICATOR_HIDE_DELAY_MS,
    )
    scheduleFrame(finishArchive, TITLE_COMPLETE_DELAY_MS)
  }

  function advance() {
    if (finished) return
    const grapheme = graphemes[currentIndex]
    currentIndex += 1
    onFrame(graphemes.slice(0, currentIndex).join(''))

    if (grapheme === '，') {
      onPhaseChange(TITLE_PHASE.PUNCTUATION)
      onIndicatorChange(TITLE_INDICATOR_STATE.COMPRESSED)
      scheduleFrame(() => {
        onIndicatorChange(TITLE_INDICATOR_STATE.BAR)
        onPhaseChange(TITLE_PHASE.TYPING)
      }, TITLE_PUNCTUATION_COMPRESS_MS)
    }

    if (currentIndex >= graphemes.length) {
      scheduleFrame(beginArchive, TITLE_FINAL_HOLD_MS)
      return
    }
    scheduleFrame(advance, delayAfter(currentIndex - 1))
  }

  return {
    start() {
      if (started || finished) return
      started = true
      onFrame('')
      onPhaseChange(TITLE_PHASE.TYPING)
      onIndicatorChange(TITLE_INDICATOR_STATE.BAR)
      if (!graphemes.length) {
        finishStatic()
        return
      }
      scheduleFrame(advance, TITLE_START_DELAY_MS)
    },
    complete() {
      finishStatic()
    },
    cancel() {
      if (finished) return
      finished = true
      clearScheduledFrames()
    },
  }
}
