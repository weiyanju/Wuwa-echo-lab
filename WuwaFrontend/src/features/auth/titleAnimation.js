export const TITLE_START_DELAY_MS = 150
export const TITLE_CHARACTER_INTERVAL_MS = 70
export const TITLE_PUNCTUATION_PAUSE_MS = 120

export function splitTitleGraphemes(text, Segmenter = globalThis.Intl?.Segmenter) {
  if (!Segmenter) return Array.from(text)
  const segmenter = new Segmenter('zh-CN', { granularity: 'grapheme' })
  return Array.from(segmenter.segment(text), ({ segment }) => segment)
}

export function shouldAnimateTitle({ reduceMotion, compactViewport, documentHidden }) {
  return !reduceMotion && !compactViewport && !documentHidden
}

function delayAfter(grapheme) {
  return TITLE_CHARACTER_INTERVAL_MS
    + (grapheme === '，' ? TITLE_PUNCTUATION_PAUSE_MS : 0)
}

export function createTitleAnimation({
  text,
  onFrame,
  onComplete,
  schedule = globalThis.setTimeout,
  cancel = globalThis.clearTimeout,
}) {
  const graphemes = splitTitleGraphemes(text)
  let currentIndex = 0
  let timerId = null
  let started = false
  let finished = false

  function clearScheduledFrame() {
    if (timerId == null) return
    cancel(timerId)
    timerId = null
  }

  function finish({ revealFullTitle = true } = {}) {
    if (finished) return
    finished = true
    clearScheduledFrame()
    if (revealFullTitle) onFrame(text)
    onComplete()
  }

  function scheduleNext(callback, delay) {
    try {
      timerId = schedule(callback, delay)
    } catch {
      finish()
    }
  }

  function advance() {
    if (finished) return
    currentIndex += 1
    onFrame(graphemes.slice(0, currentIndex).join(''))
    if (currentIndex >= graphemes.length) {
      scheduleNext(
        () => finish({ revealFullTitle: false }),
        TITLE_CHARACTER_INTERVAL_MS,
      )
      return
    }
    scheduleNext(advance, delayAfter(graphemes[currentIndex - 1]))
  }

  return {
    start() {
      if (started || finished) return
      started = true
      onFrame('')
      if (!graphemes.length) {
        finish()
        return
      }
      scheduleNext(advance, TITLE_START_DELAY_MS)
    },
    complete() {
      finish()
    },
    cancel() {
      if (finished) return
      finished = true
      clearScheduledFrame()
    },
  }
}
