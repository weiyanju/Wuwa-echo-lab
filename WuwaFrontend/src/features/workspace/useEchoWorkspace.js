import { computed, ref } from 'vue'
import { addSubstat, createEcho, getModelEvaluation, getStats, listEchoes, undoLastSubstat, updateEcho } from '../../services/api.js'
import { buildNextEchoConfig, isReusableDraft, sortVisibleEchoHistory } from '../../services/echoWorkflow.js'
import { buildModelDetailCards } from '../../services/modelDetails.js'
import { substatLabels, substatOrder, tierTables } from '../../data/substats.js'
import { createEchoAssetIdentity } from './echoAssetIdentity.js'
import { createActivePredictionRefreshController } from './echoPredictionRefresh.js'
import { createDefaultEchoForm, createEchoPayload, createPreparedNextEchoController, normalizeEchoConfig } from './echoWorkspaceDrafts.js'
import { appendRollToEchoList, buildOptimisticRollDraft, removeOptimisticRollFromEchoList, replaceOptimisticRollInEchoList } from './echoWorkspaceMutations.js'
import { adjustWorkspaceStatsForSubstat } from './echoWorkspaceStats.js'

export function useEchoWorkspace({ selectedGameAccountId, boundPlayerUid, workspaceLocked, onError }) {
  const saving = ref(false)
  const pendingTierKey = ref('')
  const echoes = ref([])
  const activeEchoId = ref(null)
  const prediction = ref(null)
  const stats = ref(null)
  const sessionEchoDelta = ref(0)
  const sessionSampleDelta = ref(0)
  const evaluation = ref(null)
  const echoForm = ref(createDefaultEchoForm())
  let lifecycleGeneration = 0
  let refreshRequestId = 0

  const activeEcho = computed(() => echoes.value.find((echo) => echo.id === activeEchoId.value) || null)
  const visibleEchoCount = computed(() => sortVisibleEchoHistory(echoes.value).length)
  const candidateByType = computed(() => new Map(
    (prediction.value?.candidates || []).map((candidate) => [candidate.substat_type, candidate]),
  ))
  const topCandidate = computed(() => prediction.value?.candidates?.[0] || null)
  const matrixRows = computed(() => substatOrder.map((substatType) => ({
    substat_type: substatType,
    label: substatLabels[substatType],
    candidate: candidateByType.value.get(substatType) || null,
    tier_table: tierTables[substatType],
    recorded: activeEcho.value?.substats.find((roll) => roll.substat_type === substatType) || null,
    topPredicted: topCandidate.value?.substat_type === substatType,
  })))
  const modelDetailCards = computed(() => buildModelDetailCards({
    prediction: prediction.value,
    stats: stats.value,
    evaluation: evaluation.value,
    echoes: echoes.value,
    labels: substatLabels,
  }))

  function reportError(err) { onError(err?.message || String(err)) }

  const activePredictionRefresh = createActivePredictionRefreshController({
    activeEchoId,
    selectedGameAccountId,
    lifecycleGeneration: () => lifecycleGeneration,
    setPrediction: (nextPrediction) => { prediction.value = nextPrediction },
    reportError,
  })

  function cancelActivePredictionRefresh() { activePredictionRefresh.cancel() }

  function insertEcho(echo) {
    echoes.value = echoes.value.some((item) => item.id === echo.id)
      ? echoes.value.map((item) => (item.id === echo.id ? echo : item))
      : [echo, ...echoes.value]
  }

  function syncFormFromEcho(echo) {
    if (!echo) {
      return
    }
    echoForm.value.sonata = echo.set_name
    echoForm.value.cost = echo.cost
    echoForm.value.main_stat = echo.main_stat
    echoForm.value.is_continuous_tuning = true
  }

  function activateEcho(echo) {
    cancelActivePredictionRefresh()
    activeEchoId.value = echo.id
    syncFormFromEcho(echo)
    prediction.value = null
  }

  function reset() {
    lifecycleGeneration += 1
    refreshRequestId += 1
    cancelActivePredictionRefresh()
    nextDraft.clear()
    saving.value = false
    pendingTierKey.value = ''
    echoes.value = []
    activeEchoId.value = null
    prediction.value = null
    stats.value = null
    sessionEchoDelta.value = 0
    sessionSampleDelta.value = 0
    evaluation.value = null
    echoForm.value = createDefaultEchoForm()
    echoAssetIdentity.resetEchoAsset()
  }

  async function refresh() {
    const accountId = selectedGameAccountId.value
    if (workspaceLocked.value || !accountId) {
      reset()
      return
    }
    sessionEchoDelta.value = 0
    sessionSampleDelta.value = 0
    const generation = lifecycleGeneration
    const requestId = ++refreshRequestId
    const isCurrent = () => (
      generation === lifecycleGeneration
      && requestId === refreshRequestId
      && accountId === selectedGameAccountId.value
    )
    const echoData = await listEchoes(accountId)
    if (!isCurrent()) return
    echoes.value = echoData.results || []
    if (!echoes.value.length && boundPlayerUid.value) {
      const draftEcho = await createEchoWithConfig()
      if (draftEcho) {
        echoes.value = [draftEcho]
      }
    }
    if (!activeEchoId.value && echoes.value.length) {
      activeEchoId.value = echoes.value.find((echo) => echo.status !== 'archived' && echo.substats.length < 5)?.id || echoes.value[0].id
    }
    if (activeEchoId.value && !echoes.value.some((echo) => echo.id === activeEchoId.value)) {
      activeEchoId.value = echoes.value[0]?.id || null
    }
    syncFormFromEcho(activeEcho.value)
    refreshActiveInBackground()
    if (!isCurrent()) return
    const nextStats = await getStats(accountId)
    if (!isCurrent()) return
    stats.value = nextStats
    const nextEvaluation = await getModelEvaluation(accountId)
    if (!isCurrent()) return
    evaluation.value = nextEvaluation
  }

  function replaceEcho(nextEcho) {
    echoes.value = echoes.value.map((echo) => (echo.id === nextEcho.id ? nextEcho : echo))
  }

  async function selectEchoAsset(asset) {
    nextDraft.clear()
    await echoAssetIdentity.selectEchoAsset(asset)
  }

  const echoAssetIdentity = createEchoAssetIdentity({
    activeEcho,
    activeEchoId,
    selectedGameAccountId,
    lifecycleGeneration: () => lifecycleGeneration,
    replaceEcho,
    reportError,
  })

  const nextDraft = createPreparedNextEchoController({
    activeEcho,
    activeEchoId,
    selectedGameAccountId,
    workspaceLocked,
    lifecycleGeneration: () => lifecycleGeneration,
    buildPayload: (config) => createEchoPayload(config, echoAssetIdentity),
    insertEcho,
  })

  function appendRollToEcho(echoId, roll) {
    echoes.value = appendRollToEchoList(echoes.value, echoId, roll)
  }

  function replaceOptimisticRollInEcho(echoId, optimisticRollId, roll) {
    echoes.value = replaceOptimisticRollInEchoList(echoes.value, echoId, optimisticRollId, roll)
  }

  function removeOptimisticRollFromEcho(echoId, optimisticRollId) {
    echoes.value = removeOptimisticRollFromEchoList(echoes.value, echoId, optimisticRollId)
  }

  function adjustLoadedStatsForSubstat(substatType, delta) {
    stats.value = adjustWorkspaceStatsForSubstat(stats.value, substatType, delta)
  }

  function visibleEchoHistoryCount() { return sortVisibleEchoHistory(echoes.value).length }

  function adjustSessionEchoDelta(previousVisibleEchoCount) { sessionEchoDelta.value = Math.max(sessionEchoDelta.value + visibleEchoHistoryCount() - previousVisibleEchoCount, 0) }

  function adjustSessionSampleDelta(delta) {
    sessionSampleDelta.value = Math.max(sessionSampleDelta.value + delta, 0)
  }

  function buildOptimisticRoll(row, tier) {
    return buildOptimisticRollDraft(activeEcho.value, row, tier)
  }

  async function activatePreparedNextEcho(config, sourceEchoId) {
    const preparedEcho = await nextDraft.consume(config, sourceEchoId)
    if (!preparedEcho) return null
    activateEcho(preparedEcho)
    return preparedEcho
  }

  function refreshActiveInBackground() {
    activePredictionRefresh.refreshInBackground()
  }

  function tierButtonKey(row, tier) { return `${row.substat_type}:${tier.value}` }

  async function createEchoWithConfig(config = echoForm.value) {
    const accountId = selectedGameAccountId.value
    if (workspaceLocked.value || !accountId) {
      onError('请先填写你的游戏 UID。')
      return null
    }
    const generation = lifecycleGeneration
    const previousForm = { ...echoForm.value }
    const nextConfig = normalizeEchoConfig(config)
    echoForm.value = {
      sonata: nextConfig.sonata,
      cost: nextConfig.cost,
      main_stat: nextConfig.main_stat,
      is_continuous_tuning: true,
    }
    try {
      const echo = await createEcho(createEchoPayload(nextConfig, echoAssetIdentity), accountId)
      if (generation !== lifecycleGeneration || accountId !== selectedGameAccountId.value) return null
      insertEcho(echo)
      activateEcho(echo)
      return echo
    } catch (err) {
      if (generation !== lifecycleGeneration || accountId !== selectedGameAccountId.value) return null
      echoForm.value = previousForm
      reportError(err)
      return null
    }
  }

  async function ensureActiveEcho() {
    if (activeEcho.value && activeEcho.value.status !== 'archived' && activeEcho.value.substats.length < 5) return activeEcho.value
    if (activeEcho.value) {
      const preparedEcho = await activatePreparedNextEcho(buildNextEchoConfig(activeEcho.value), activeEcho.value.id)
      if (preparedEcho) return preparedEcho
    }
    const echo = await createEchoWithConfig()
    return echo
  }

  async function createNextEchoFromActive() {
    if (!activeEcho.value) return
    onError('')
    const sourceEcho = activeEcho.value
    const nextConfig = buildNextEchoConfig(sourceEcho)
    const preparedEcho = await activatePreparedNextEcho(nextConfig, sourceEcho.id)
    const echo = preparedEcho || await createEchoWithConfig(nextConfig)
    if (echo) refreshActiveInBackground()
  }

  async function applyEchoConfig(partialConfig) {
    onError('')
    nextDraft.clear()
    const nextConfig = normalizeEchoConfig({ ...echoForm.value, ...partialConfig })
    echoForm.value = nextConfig
    if (!activeEcho.value) {
      await createEchoWithConfig(nextConfig)
      await refresh()
      return
    }
    if (isReusableDraft(activeEcho.value)) {
      try {
        const updated = await updateEcho(activeEcho.value.id, {
          cost: nextConfig.cost,
          set_name: nextConfig.sonata,
          main_stat: nextConfig.main_stat,
          is_continuous_tuning: true,
          ...echoAssetIdentity.selectedEchoAssetFieldsForConfig(nextConfig),
        })
        replaceEcho(updated)
        refreshActiveInBackground()
      } catch (err) {
        reportError(err)
      }
      return
    }
    await createEchoWithConfig(nextConfig)
    await refresh()
  }

  async function discardActiveEcho() {
    if (!activeEcho.value || saving.value) return
    onError('')
    nextDraft.clear()
    saving.value = true
    const discardedEchoId = activeEcho.value.id
    const nextConfig = buildNextEchoConfig(activeEcho.value)
    try {
      await updateEcho(discardedEchoId, { status: 'archived' })
      await refresh()
      await createEchoWithConfig(nextConfig)
      await refresh()
      refreshActiveInBackground()
    } catch (err) {
      reportError(err)
    } finally {
      saving.value = false
    }
  }

  async function selectEcho(echoId) {
    nextDraft.clear()
    cancelActivePredictionRefresh()
    activeEchoId.value = echoId
    syncFormFromEcho(activeEcho.value)
    refreshActiveInBackground()
  }

  async function clickTier(row, tier) {
    if (row.recorded || pendingTierKey.value) return
    onError('')
    cancelActivePredictionRefresh()
    pendingTierKey.value = tierButtonKey(row, tier)
    let optimisticRoll = null
    let optimisticEchoId = null
    try {
      const echo = await ensureActiveEcho()
      if (!echo) return
      const visibleEchoCountBeforeEntry = visibleEchoHistoryCount()
      optimisticEchoId = echo.id
      optimisticRoll = buildOptimisticRoll(row, tier)
      appendRollToEcho(echo.id, optimisticRoll)
      const roll = await addSubstat(echo.id, { substat_type: row.substat_type, tier_value: tier.value })
      replaceOptimisticRollInEcho(echo.id, optimisticRoll.id, roll)
      adjustLoadedStatsForSubstat(roll.substat_type || row.substat_type, 1)
      adjustSessionEchoDelta(visibleEchoCountBeforeEntry)
      adjustSessionSampleDelta(1)
      nextDraft.prepare()
      refreshActiveInBackground()
    } catch (err) {
      if (optimisticEchoId && optimisticRoll) removeOptimisticRollFromEcho(optimisticEchoId, optimisticRoll.id)
      reportError(err)
    } finally {
      pendingTierKey.value = ''
    }
  }

  async function undoActiveSubstat() {
    if (!activeEcho.value || !activeEcho.value.substats.length || saving.value) return
    onError('')
    nextDraft.clear()
    saving.value = true
    const removedRoll = activeEcho.value.substats.at(-1) || null
    const visibleEchoCountBeforeUndo = visibleEchoHistoryCount()
    try {
      const result = await undoLastSubstat(activeEcho.value.id)
      replaceEcho(result.echo)
      adjustLoadedStatsForSubstat(removedRoll?.substat_type, -1)
      adjustSessionEchoDelta(visibleEchoCountBeforeUndo)
      adjustSessionSampleDelta(-1)
      refreshActiveInBackground()
    } catch (err) {
      reportError(err)
    } finally {
      saving.value = false
    }
  }

  function dispose() { reset() }

  return {
    activeEcho,
    activeEchoId,
    applyEchoConfig,
    clickTier,
    createNextEchoFromActive,
    discardActiveEcho,
    dispose,
    echoForm,
    echoes,
    evaluation,
    matrixRows,
    modelDetailCards,
    pendingTierKey,
    prediction,
    refresh,
    reset,
    saving,
    selectEcho,
    selectEchoAsset,
    sessionEchoDelta,
    sessionSampleDelta,
    stats,
    undoActiveSubstat,
    visibleEchoCount,
  }
}
