import { getPrediction } from '../../services/api.js'

export const activePredictionRefreshDelayMs = 650

export function createActivePredictionRefreshController({
  activeEchoId,
  selectedGameAccountId,
  lifecycleGeneration,
  setPrediction,
  reportError,
}) {
  let activeRefreshTimer = null
  let activePredictionRefreshToken = 0
  let activePredictionAbortController = null

  function cancel() {
    activePredictionRefreshToken += 1
    clearTimeout(activeRefreshTimer)
    activeRefreshTimer = null
    activePredictionAbortController?.abort()
    activePredictionAbortController = null
  }

  async function refresh() {
    if (!activeEchoId.value) {
      setPrediction(null)
      return
    }

    const echoId = activeEchoId.value
    activePredictionAbortController?.abort()
    const controller = new AbortController()
    activePredictionAbortController = controller
    const token = ++activePredictionRefreshToken
    try {
      const nextPrediction = await getPrediction(echoId, { mode: 'fast', signal: controller.signal })
      if (token === activePredictionRefreshToken && activeEchoId.value === echoId) {
        setPrediction(nextPrediction)
      }
    } catch (err) {
      if (err?.name !== 'AbortError') throw err
    } finally {
      if (activePredictionAbortController === controller) {
        activePredictionAbortController = null
      }
    }
  }

  function refreshInBackground() {
    const accountId = selectedGameAccountId.value
    const generation = lifecycleGeneration()
    clearTimeout(activeRefreshTimer)
    activeRefreshTimer = setTimeout(() => refresh().catch((err) => {
      if (generation === lifecycleGeneration() && accountId === selectedGameAccountId.value) {
        reportError(err)
      }
    }), activePredictionRefreshDelayMs)
  }

  return { cancel, refresh, refreshInBackground }
}
