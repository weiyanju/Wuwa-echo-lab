export const TITLE_FONT_LOAD_TIMEOUT_MS = 180
export const TITLE_FONT_SHORTHAND = '700 56px "IBM Plex Sans SC"'

export function createTitleFontPreparation({
  text,
  fontSet = globalThis.document?.fonts,
  schedule = globalThis.setTimeout,
  cancel = globalThis.clearTimeout,
}) {
  let started = false
  let finished = false
  let timerId = null
  let resolveReady
  const ready = new Promise((resolve) => {
    resolveReady = resolve
  })

  function clearTimeoutJob() {
    if (timerId == null) return
    cancel(timerId)
    timerId = null
  }

  function finish(fontReady) {
    if (finished) return
    finished = true
    clearTimeoutJob()
    resolveReady(fontReady)
  }

  return {
    ready,
    start() {
      if (started || finished) return
      started = true
      if (typeof fontSet?.load !== 'function') {
        finish(false)
        return
      }
      try {
        timerId = schedule(() => finish(false), TITLE_FONT_LOAD_TIMEOUT_MS)
        Promise.resolve(fontSet.load(TITLE_FONT_SHORTHAND, text)).then(
          (faces) => finish((faces?.length ?? 0) > 0),
          () => finish(false),
        )
      } catch {
        finish(false)
      }
    },
    cancel() {
      finish(false)
    },
  }
}
