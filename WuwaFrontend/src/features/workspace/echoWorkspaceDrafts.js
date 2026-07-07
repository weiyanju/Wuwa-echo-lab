import { createEcho } from '../../services/api.js'
import { buildNextEchoConfig } from '../../services/echoWorkflow.js'
import { mainStatsByCost } from '../../data/substats.js'
import { sonataEffects } from '../../data/sonataEffects.js'

const defaultCostOptions = Object.freeze([1, 3, 4])

function getAvailableCostsForSonata(sonata) {
  return sonataEffects.find((effect) => effect.name === sonata)?.availableCosts || defaultCostOptions
}

export function normalizeEchoConfig(config) {
  const availableCosts = getAvailableCostsForSonata(config.sonata)
  const cost = availableCosts.includes(config.cost) ? config.cost : availableCosts[0]
  const legalMainStats = mainStatsByCost[cost] || []
  return { ...config, cost, main_stat: legalMainStats.includes(config.main_stat) ? config.main_stat : legalMainStats[0] }
}

export function createDefaultEchoForm() {
  return normalizeEchoConfig({ sonata: sonataEffects[0].name, cost: 1, main_stat: 'atk_percent', is_continuous_tuning: true })
}

export function createEchoPayload(config, echoAssetIdentity) {
  const nextConfig = normalizeEchoConfig(config)
  return {
    display_name: '',
    cost: nextConfig.cost,
    set_name: nextConfig.sonata,
    main_stat: nextConfig.main_stat,
    source: '',
    tuning_batch_id: '',
    is_continuous_tuning: true,
    ...echoAssetIdentity.selectedEchoAssetFieldsForConfig(nextConfig),
  }
}

function echoConfigKey(config) {
  const normalizedConfig = normalizeEchoConfig(config)
  return `${normalizedConfig.sonata}:${normalizedConfig.cost}:${normalizedConfig.main_stat}`
}

export function createPreparedNextEchoController({
  activeEcho,
  activeEchoId,
  selectedGameAccountId,
  workspaceLocked,
  lifecycleGeneration,
  buildPayload,
  insertEcho,
}) {
  let preparedEcho = null
  let preparedKey = ''
  let preparedSourceId = null
  let preparedPromise = null
  let preparedToken = 0

  function clear() {
    preparedEcho = null
    preparedKey = ''
    preparedSourceId = null
    preparedPromise = null
    preparedToken += 1
  }

  function prepare() {
    const sourceEcho = activeEcho.value
    const accountId = selectedGameAccountId.value
    if (!sourceEcho || sourceEcho.status === 'archived' || sourceEcho.substats.length < 5 || !accountId || workspaceLocked.value) return

    const nextConfig = normalizeEchoConfig(buildNextEchoConfig(sourceEcho))
    const nextKey = echoConfigKey(nextConfig)
    if (preparedSourceId === sourceEcho.id && preparedKey === nextKey && (preparedEcho || preparedPromise)) return

    const generation = lifecycleGeneration()
    const token = ++preparedToken
    preparedEcho = null
    preparedKey = nextKey
    preparedSourceId = sourceEcho.id
    preparedPromise = createEcho(buildPayload(nextConfig), accountId)
      .then((echo) => {
        if (
          token !== preparedToken
          || generation !== lifecycleGeneration()
          || accountId !== selectedGameAccountId.value
          || activeEchoId.value !== sourceEcho.id
        ) return null
        insertEcho(echo)
        preparedEcho = echo
        return echo
      })
      .catch(() => null)
      .finally(() => {
        if (token === preparedToken) preparedPromise = null
      })
  }

  async function consume(config, sourceEchoId) {
    const nextKey = echoConfigKey(config)
    if (preparedSourceId !== sourceEchoId || preparedKey !== nextKey) return null

    const echo = preparedEcho || (preparedPromise ? await preparedPromise : null)
    if (!echo || preparedSourceId !== sourceEchoId || preparedKey !== nextKey) return null

    clear()
    return echo
  }

  return { clear, consume, prepare }
}
