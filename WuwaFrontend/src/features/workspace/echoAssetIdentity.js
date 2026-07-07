import { ref } from 'vue'
import { updateEcho } from '../../services/api.js'

const echoAssetPersistDelayMs = 360

function normalizeEchoAsset(asset) {
  const cost = Number(asset?.cost)
  const setName = asset?.set_name || asset?.setName || asset?.sonata || ''
  const name = asset?.echo_name || asset?.name || ''
  if (!setName || !name || !Number.isFinite(cost)) return null
  return {
    set_name: setName,
    cost,
    echo_asset_id: String(asset?.echo_asset_id ?? asset?.id ?? ''),
    echo_name: name,
    echo_image: asset?.echo_image || asset?.image || '',
  }
}

function echoAssetFields(asset) {
  return {
    echo_asset_id: asset.echo_asset_id,
    echo_name: asset.echo_name,
    echo_image: asset.echo_image,
  }
}

function echoAlreadyHasAsset(echo, fields) {
  return echo.echo_asset_id === fields.echo_asset_id
    && echo.echo_name === fields.echo_name
    && echo.echo_image === fields.echo_image
}

export function createEchoAssetIdentity({ activeEcho, activeEchoId, selectedGameAccountId, lifecycleGeneration, replaceEcho, reportError }) {
  const selectedEchoAsset = ref(null)
  let pendingPersist = null
  let persistTimer = null
  let persistToken = 0
  const matchesConfig = (asset, config) => asset?.set_name === config.sonata && asset.cost === config.cost
  const matchesEcho = (asset, echo) => asset?.set_name === echo?.set_name && asset.cost === echo?.cost

  function resetEchoAsset() {
    selectedEchoAsset.value = null
    pendingPersist = null
    persistToken += 1
    clearTimeout(persistTimer)
    persistTimer = null
  }

  function selectedEchoAssetFieldsForConfig(config) {
    return matchesConfig(selectedEchoAsset.value, config) ? echoAssetFields(selectedEchoAsset.value) : {}
  }

  function schedulePendingPersist(delay = echoAssetPersistDelayMs) {
    clearTimeout(persistTimer)
    persistTimer = setTimeout(flushPendingPersist, delay)
  }

  async function flushPendingPersist() {
    persistTimer = null
    if (!pendingPersist) return

    const request = pendingPersist
    pendingPersist = null
    const token = ++persistToken
    try {
      const updated = await updateEcho(request.echoId, request.fields)
      const hasNewerPendingForEcho = pendingPersist?.echoId === request.echoId
      if (
        token === persistToken
        && !hasNewerPendingForEcho
        && request.generation === lifecycleGeneration()
        && request.accountId === selectedGameAccountId.value
        && activeEchoId.value === request.echoId
        && activeEcho.value
      ) {
        replaceEcho({
          ...activeEcho.value,
          echo_asset_id: updated.echo_asset_id ?? request.fields.echo_asset_id,
          echo_name: updated.echo_name ?? request.fields.echo_name,
          echo_image: updated.echo_image ?? request.fields.echo_image,
        })
      }
    } catch (err) {
      if (request.generation === lifecycleGeneration() && request.accountId === selectedGameAccountId.value) {
        reportError(err)
      }
    } finally {
      if (pendingPersist) schedulePendingPersist()
    }
  }

  function selectEchoAsset(asset) {
    const normalizedAsset = normalizeEchoAsset(asset)
    if (!normalizedAsset) return
    selectedEchoAsset.value = normalizedAsset

    const echo = activeEcho.value
    if (!echo || echo.status === 'archived' || !matchesEcho(normalizedAsset, echo)) return

    const fields = echoAssetFields(normalizedAsset)
    if (echoAlreadyHasAsset(echo, fields)) return

    const generation = lifecycleGeneration()
    const accountId = selectedGameAccountId.value
    const echoId = echo.id
    replaceEcho({ ...echo, ...fields })
    pendingPersist = { accountId, echoId, fields, generation }
    schedulePendingPersist()
  }

  return { resetEchoAsset, selectedEchoAssetFieldsForConfig, selectEchoAsset }
}
