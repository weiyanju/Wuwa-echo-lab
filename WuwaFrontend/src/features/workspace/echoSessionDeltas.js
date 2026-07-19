import { ref } from 'vue'

const deltaFeedbackDurationMs = 850

export function createEchoSessionDeltaController() {
  const sessionEchoDelta = ref(0)
  const sessionSampleDelta = ref(0)
  const visibleSessionEchoDelta = ref(0)
  const visibleSessionSampleDelta = ref(0)
  let sessionEchoDeltaTimer = null
  let sessionSampleDeltaTimer = null
  const sessionHistoryEchoIds = new Set()

  function clearSessionDeltaFeedback() {
    clearTimeout(sessionEchoDeltaTimer)
    clearTimeout(sessionSampleDeltaTimer)
    sessionEchoDeltaTimer = null
    sessionSampleDeltaTimer = null
    visibleSessionEchoDelta.value = 0
    visibleSessionSampleDelta.value = 0
  }

  function scheduleDeltaFeedback(visibleDelta, nextValue, currentTimer, setTimer) {
    clearTimeout(currentTimer)
    if (nextValue <= 0) {
      visibleDelta.value = 0
      setTimer(null)
      return
    }
    visibleDelta.value = nextValue
    setTimer(setTimeout(() => {
      visibleDelta.value = 0
      setTimer(null)
    }, deltaFeedbackDurationMs))
  }

  function adjustEchoDelta(delta) {
    sessionEchoDelta.value = Math.max(sessionEchoDelta.value + delta, 0)
    scheduleDeltaFeedback(
      visibleSessionEchoDelta,
      sessionEchoDelta.value,
      sessionEchoDeltaTimer,
      (timer) => { sessionEchoDeltaTimer = timer },
    )
  }

  function recordEchoHistory(echo) {
    if (!echo?.id || sessionHistoryEchoIds.has(echo.id)) return
    sessionHistoryEchoIds.add(echo.id)
    adjustEchoDelta(1)
  }

  function adjustSampleDelta(delta) {
    sessionSampleDelta.value = Math.max(sessionSampleDelta.value + delta, 0)
    scheduleDeltaFeedback(
      visibleSessionSampleDelta,
      sessionSampleDelta.value,
      sessionSampleDeltaTimer,
      (timer) => { sessionSampleDeltaTimer = timer },
    )
  }

  function reset() {
    sessionEchoDelta.value = 0
    sessionSampleDelta.value = 0
    sessionHistoryEchoIds.clear()
    clearSessionDeltaFeedback()
  }

  return {
    adjustSampleDelta,
    recordEchoHistory,
    reset,
    sessionEchoDelta,
    sessionSampleDelta,
    visibleSessionEchoDelta,
    visibleSessionSampleDelta,
  }
}
