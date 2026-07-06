import { computed, ref } from 'vue'
import {
  addSubstat,
  createEcho,
  getModelEvaluation,
  getPrediction,
  getStats,
  listEchoes,
  undoLastSubstat,
  updateEcho,
} from '../../services/api.js'
import { buildNextEchoConfig, isReusableDraft, sortVisibleEchoHistory } from '../../services/echoWorkflow.js'
import { buildModelDetailCards } from '../../services/modelDetails.js'
import { mainStatsByCost, substatLabels, substatOrder, tierTables } from '../../data/substats.js'
import { sonataEffects } from '../../data/sonataEffects.js'
import { createEchoAssetIdentity } from './echoAssetIdentity.js'
import { appendRollToEchoList, buildOptimisticRollDraft, removeOptimisticRollFromEchoList, replaceOptimisticRollInEchoList } from './echoWorkspaceMutations.js'

const defaultCostOptions = Object.freeze([1, 3, 4])

function getAvailableCostsForSonata(sonata) { return sonataEffects.find((effect) => effect.name === sonata)?.availableCosts || defaultCostOptions }

function normalizeEchoConfig(config) {
  const availableCosts = getAvailableCostsForSonata(config.sonata)
  const cost = availableCosts.includes(config.cost) ? config.cost : availableCosts[0]
  const legalMainStats = mainStatsByCost[cost] || []
  return { ...config, cost, main_stat: legalMainStats.includes(config.main_stat) ? config.main_stat : legalMainStats[0] }
}

function createDefaultEchoForm() {
  return normalizeEchoConfig({ sonata: sonataEffects[0].name, cost: 1, main_stat: 'atk_percent', is_continuous_tuning: true })
}

export function useEchoWorkspace({ selectedGameAccountId, boundPlayerUid, workspaceLocked, onError }) {
  const saving = ref(false)
  const pendingTierKey = ref('')
  const echoes = ref([])
  const activeEchoId = ref(null)
  const prediction = ref(null)
  const stats = ref(null)
  const evaluation = ref(null)
  const echoForm = ref(createDefaultEchoForm())
  let insightsRefreshTimer = null
  let activeRefreshTimer = null
  let activePredictionRefreshToken = 0
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

  function reportError(err) {
    onError(err?.message || String(err))
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

  function reset() {
    lifecycleGeneration += 1
    refreshRequestId += 1
    activePredictionRefreshToken += 1
    clearTimeout(insightsRefreshTimer)
    insightsRefreshTimer = null
    clearTimeout(activeRefreshTimer)
    activeRefreshTimer = null
    saving.value = false
    pendingTierKey.value = ''
    echoes.value = []
    activeEchoId.value = null
    prediction.value = null
    stats.value = null
    evaluation.value = null
    echoForm.value = createDefaultEchoForm()
    echoAssetIdentity.resetEchoAsset()
  }

  async function refreshActive() {
    if (!activeEchoId.value) {
      prediction.value = null
      return
    }
    const echoId = activeEchoId.value
    const token = ++activePredictionRefreshToken
    const nextPrediction = await getPrediction(echoId)
    if (token === activePredictionRefreshToken && activeEchoId.value === echoId) {
      prediction.value = nextPrediction
    }
  }

  async function refresh() {
    const accountId = selectedGameAccountId.value
    if (workspaceLocked.value || !accountId) {
      reset()
      return
    }
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
    await refreshActive()
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

  function appendRollToEcho(echoId, roll) {
    echoes.value = appendRollToEchoList(echoes.value, echoId, roll)
  }

  function replaceOptimisticRollInEcho(echoId, optimisticRollId, roll) {
    echoes.value = replaceOptimisticRollInEchoList(echoes.value, echoId, optimisticRollId, roll)
  }

  function removeOptimisticRollFromEcho(echoId, optimisticRollId) {
    echoes.value = removeOptimisticRollFromEchoList(echoes.value, echoId, optimisticRollId)
  }

  function buildOptimisticRoll(row, tier) {
    return buildOptimisticRollDraft(activeEcho.value, row, tier)
  }

  function refreshInsightsInBackground() {
    const accountId = selectedGameAccountId.value
    if (!accountId) return
    const generation = lifecycleGeneration
    const isCurrent = () => generation === lifecycleGeneration && accountId === selectedGameAccountId.value
    clearTimeout(insightsRefreshTimer)
    insightsRefreshTimer = setTimeout(() => {
      Promise.all([getStats(accountId), getModelEvaluation(accountId)])
        .then(([nextStats, nextEvaluation]) => {
          if (!isCurrent()) return
          stats.value = nextStats
          evaluation.value = nextEvaluation
        })
        .catch((err) => {
          if (isCurrent()) reportError(err)
        })
    }, 1000)
  }

  function refreshActiveInBackground() {
    const accountId = selectedGameAccountId.value
    const generation = lifecycleGeneration
    clearTimeout(activeRefreshTimer)
    activeRefreshTimer = setTimeout(() => refreshActive().catch((err) => {
      if (generation === lifecycleGeneration && accountId === selectedGameAccountId.value) reportError(err)
    }), 300)
  }

  function tierButtonKey(row, tier) {
    return `${row.substat_type}:${tier.value}`
  }

  async function createEchoWithConfig(config = echoForm.value) {
    const accountId = selectedGameAccountId.value
    if (workspaceLocked.value || !accountId) {
      onError('请先填写你的游戏 UID。')
      return null
    }
    const generation = lifecycleGeneration
    const previousForm = { ...echoForm.value }
    const nextConfig = normalizeEchoConfig(config)
    const assetPayload = echoAssetIdentity.selectedEchoAssetFieldsForConfig(nextConfig)
    echoForm.value = {
      sonata: nextConfig.sonata,
      cost: nextConfig.cost,
      main_stat: nextConfig.main_stat,
      is_continuous_tuning: true,
    }
    try {
      const echo = await createEcho({
        display_name: '',
        cost: echoForm.value.cost,
        set_name: echoForm.value.sonata,
        main_stat: echoForm.value.main_stat,
        source: '',
        tuning_batch_id: '',
        is_continuous_tuning: true,
        ...assetPayload,
      }, accountId)
      if (generation !== lifecycleGeneration || accountId !== selectedGameAccountId.value) return null
      echoes.value = [echo, ...echoes.value]
      activeEchoId.value = echo.id
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
    const echo = await createEchoWithConfig()
    if (echo) await refresh()
    return echo
  }

  async function createNextEchoFromActive() {
    if (!activeEcho.value) return
    const echo = await createEchoWithConfig(buildNextEchoConfig(activeEcho.value))
    if (echo) await refresh()
  }

  async function applyEchoConfig(partialConfig) {
    onError('')
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
        await refreshActive()
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
    saving.value = true
    const discardedEchoId = activeEcho.value.id
    const nextConfig = buildNextEchoConfig(activeEcho.value)
    try {
      await updateEcho(discardedEchoId, { status: 'archived' })
      await refresh()
      await createEchoWithConfig(nextConfig)
      await refresh()
      await refreshActive()
    } catch (err) {
      reportError(err)
    } finally {
      saving.value = false
    }
  }

  async function selectEcho(echoId) {
    activeEchoId.value = echoId
    syncFormFromEcho(activeEcho.value)
    await refreshActive()
  }

  async function clickTier(row, tier) {
    if (row.recorded || pendingTierKey.value) return
    onError('')
    pendingTierKey.value = tierButtonKey(row, tier)
    let optimisticRoll = null
    let optimisticEchoId = null
    try {
      const echo = await ensureActiveEcho()
      if (!echo) return
      optimisticEchoId = echo.id
      optimisticRoll = buildOptimisticRoll(row, tier)
      appendRollToEcho(echo.id, optimisticRoll)
      const roll = await addSubstat(echo.id, { substat_type: row.substat_type, tier_value: tier.value })
      replaceOptimisticRollInEcho(echo.id, optimisticRoll.id, roll)
      refreshActiveInBackground()
      refreshInsightsInBackground()
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
    saving.value = true
    try {
      const result = await undoLastSubstat(activeEcho.value.id)
      replaceEcho(result.echo)
      await refreshActive()
      refreshInsightsInBackground()
    } catch (err) {
      reportError(err)
    } finally {
      saving.value = false
    }
  }

  function dispose() {
    reset()
  }

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
    stats,
    undoActiveSubstat,
    visibleEchoCount,
  }
}
