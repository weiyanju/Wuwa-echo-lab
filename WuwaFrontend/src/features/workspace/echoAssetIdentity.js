import { ref } from 'vue'
import { updateEcho } from '../../services/api.js'

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
  const matchesConfig = (asset, config) => asset?.set_name === config.sonata && asset.cost === config.cost
  const matchesEcho = (asset, echo) => asset?.set_name === echo?.set_name && asset.cost === echo?.cost

  function resetEchoAsset() {
    selectedEchoAsset.value = null
  }

  function selectedEchoAssetFieldsForConfig(config) {
    return matchesConfig(selectedEchoAsset.value, config) ? echoAssetFields(selectedEchoAsset.value) : {}
  }

  async function selectEchoAsset(asset) {
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
    try {
      const updated = await updateEcho(echoId, fields)
      if (generation === lifecycleGeneration() && accountId === selectedGameAccountId.value && activeEchoId.value === echoId) {
        replaceEcho(updated)
      }
    } catch (err) {
      if (generation === lifecycleGeneration() && accountId === selectedGameAccountId.value) reportError(err)
    }
  }

  return { resetEchoAsset, selectedEchoAssetFieldsForConfig, selectEchoAsset }
}
