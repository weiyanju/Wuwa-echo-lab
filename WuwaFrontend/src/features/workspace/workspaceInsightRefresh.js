import { ref } from 'vue'

export function createWorkspaceInsightRefresh({
  selectedGameAccountId,
  workspaceLocked,
  stats,
  evaluation,
  getStats,
  getModelEvaluation,
  lifecycleGeneration,
  reportError,
}) {
  const statsRequestStatus = ref('idle')
  const evaluationRequestStatus = ref('idle')
  let statsRequestId = 0
  let evaluationRequestId = 0

  function canRequest() {
    return !workspaceLocked.value && Boolean(selectedGameAccountId.value)
  }

  async function refreshStats() {
    if (!canRequest()) return null
    const accountId = selectedGameAccountId.value
    const generation = lifecycleGeneration()
    const requestId = ++statsRequestId
    const isCurrent = () => generation === lifecycleGeneration()
      && requestId === statsRequestId
      && accountId === selectedGameAccountId.value
    statsRequestStatus.value = 'loading'
    try {
      const result = await getStats(accountId)
      if (!isCurrent()) return null
      stats.value = result
      statsRequestStatus.value = 'ready'
      return result
    } catch (error) {
      if (isCurrent()) {
        statsRequestStatus.value = 'error'
        reportError(error)
      }
      return null
    }
  }

  async function refreshEvaluation() {
    if (!canRequest()) return null
    const accountId = selectedGameAccountId.value
    const generation = lifecycleGeneration()
    const requestId = ++evaluationRequestId
    const isCurrent = () => generation === lifecycleGeneration()
      && requestId === evaluationRequestId
      && accountId === selectedGameAccountId.value
    evaluationRequestStatus.value = 'loading'
    try {
      const result = await getModelEvaluation(accountId)
      if (!isCurrent()) return null
      evaluation.value = result
      evaluationRequestStatus.value = 'ready'
      return result
    } catch (error) {
      if (isCurrent()) {
        evaluationRequestStatus.value = 'error'
        reportError(error)
      }
      return null
    }
  }

  function reset() {
    statsRequestId += 1
    evaluationRequestId += 1
    statsRequestStatus.value = 'idle'
    evaluationRequestStatus.value = 'idle'
  }

  return { evaluationRequestStatus, refreshEvaluation, refreshStats, reset, statsRequestStatus }
}
