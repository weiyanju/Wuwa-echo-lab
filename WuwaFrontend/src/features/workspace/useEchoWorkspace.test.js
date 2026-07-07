import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { ref } from 'vue'

import { useEchoWorkspace } from './useEchoWorkspace.js'
import { mainStatsByCost } from '../../data/substats.js'
import { sonataEffects } from '../../data/sonataEffects.js'

function jsonResponse(data) {
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  })
}

function deferred() {
  let resolve
  const promise = new Promise((nextResolve) => {
    resolve = nextResolve
  })
  return { promise, resolve }
}

test('echo workspace composable owns core state and derived presentation data', async () => {
  const source = await readFile(new URL('./useEchoWorkspace.js', import.meta.url), 'utf8')

  assert.match(source, /const echoes = ref\(\[\]\)/)
  assert.match(source, /const activeEchoId = ref\(null\)/)
  assert.match(source, /const prediction = ref\(null\)/)
  assert.match(source, /const stats = ref\(null\)/)
  assert.match(source, /const evaluation = ref\(null\)/)
  assert.match(source, /const matrixRows = computed/)
  assert.match(source, /const modelDetailCards = computed/)
})

test('echo workspace composable owns persistence and optimistic roll workflows', async () => {
  const source = await readFile(new URL('./useEchoWorkspace.js', import.meta.url), 'utf8')

  assert.match(source, /async function createEchoWithConfig/)
  assert.match(source, /async function applyEchoConfig/)
  assert.match(source, /async function selectEchoAsset/)
  assert.match(source, /async function discardActiveEcho/)
  assert.match(source, /async function clickTier/)
  assert.match(source, /appendRollToEcho\(echo\.id, optimisticRoll\)[\s\S]+await addSubstat/)
  assert.match(source, /removeOptimisticRollFromEcho\(optimisticEchoId, optimisticRoll\.id\)/)
  assert.match(source, /async function undoActiveSubstat/)
})

test('echo workspace composable exposes refresh and cleans up timers without crossing feature boundaries', async () => {
  const source = await readFile(new URL('./useEchoWorkspace.js', import.meta.url), 'utf8')
  const predictionRefreshSource = await readFile(new URL('./echoPredictionRefresh.js', import.meta.url), 'utf8')

  assert.match(source, /async function refresh\(\)/)
  assert.match(source, /function reset\(\) \{[\s\S]+cancelActivePredictionRefresh\(\)/)
  assert.doesNotMatch(source, /insightsRefreshTimer/)
  assert.match(predictionRefreshSource, /function cancel\(\) \{[\s\S]+clearTimeout\(activeRefreshTimer\)[\s\S]+activePredictionAbortController\?\.abort\(\)/)
  assert.match(source, /function dispose\(\) \{\s+reset\(\)/)
  assert.doesNotMatch(source, /useAuth|useGameAccount|Recognition|recognition/)
})

test('echo workspace clears stale errors before user commands', async () => {
  const source = await readFile(new URL('./useEchoWorkspace.js', import.meta.url), 'utf8')

  assert.match(source, /async function applyEchoConfig\(partialConfig\) \{\s+onError\(''\)/)
  assert.match(source, /async function discardActiveEcho\(\) \{[\s\S]+?onError\(''\)/)
  assert.match(source, /async function clickTier\(row, tier\) \{[\s\S]+?onError\(''\)/)
  assert.match(source, /async function undoActiveSubstat\(\) \{[\s\S]+?onError\(''\)/)
})

test('echo workspace creates new echoes as continuous tuning by default', async () => {
  const originalDocument = globalThis.document
  const originalFetch = globalThis.fetch
  let createdPayload = null
  globalThis.document = { cookie: 'csrftoken=test' }
  globalThis.fetch = async (url, options = {}) => {
    const path = String(url)
    if (path.endsWith('/echoes/') && options.method === 'POST') {
      createdPayload = JSON.parse(options.body)
      return jsonResponse({
        id: 71,
        status: 'draft',
        substats: [],
        set_name: createdPayload.set_name,
        cost: createdPayload.cost,
        main_stat: createdPayload.main_stat,
        is_continuous_tuning: createdPayload.is_continuous_tuning,
      })
    }
    if (path.includes('/echoes/?game_account_id=1')) return jsonResponse({ results: [] })
    if (path.includes('/prediction/')) return jsonResponse({ candidates: [] })
    if (path.includes('/stats/') || path.includes('/model-evaluation/')) return jsonResponse({})
    throw new Error(`Unexpected request: ${path}`)
  }

  let workspace = null
  try {
    workspace = useEchoWorkspace({
      selectedGameAccountId: ref(1),
      boundPlayerUid: ref('123456789'),
      workspaceLocked: ref(false),
      onError: () => {},
    })

    await workspace.applyEchoConfig({ cost: 1 })

    assert.equal(createdPayload.is_continuous_tuning, true)
    assert.equal(workspace.echoForm.value.is_continuous_tuning, true)
  } finally {
    workspace?.dispose()
    globalThis.document = originalDocument
    globalThis.fetch = originalFetch
  }
})
test('echo workspace defaults new empty accounts to the latest sonata effect', async () => {
  const originalDocument = globalThis.document
  const originalFetch = globalThis.fetch
  let createdPayload = null
  globalThis.document = { cookie: 'csrftoken=test' }
  globalThis.fetch = async (url, options = {}) => {
    const path = String(url)
    if (path.includes('/echoes/?game_account_id=1')) return jsonResponse({ results: [] })
    if (path.endsWith('/echoes/') && options.method === 'POST') {
      createdPayload = JSON.parse(options.body)
      return jsonResponse({
        id: 71,
        status: 'draft',
        substats: [],
        set_name: createdPayload.set_name,
        cost: createdPayload.cost,
        main_stat: createdPayload.main_stat,
        is_continuous_tuning: createdPayload.is_continuous_tuning,
      })
    }
    if (path.includes('/prediction/')) return jsonResponse({ candidates: [] })
    if (path.includes('/stats/') || path.includes('/model-evaluation/')) return jsonResponse({})
    throw new Error(`Unexpected request: ${path}`)
  }

  let workspace = null
  try {
    workspace = useEchoWorkspace({
      selectedGameAccountId: ref(1),
      boundPlayerUid: ref('123456789'),
      workspaceLocked: ref(false),
      onError: () => {},
    })

    assert.equal(workspace.echoForm.value.sonata, sonataEffects[0].name)

    await workspace.refresh()

    assert.equal(createdPayload.set_name, sonataEffects[0].name)
    assert.notEqual(createdPayload.set_name, sonataEffects.at(-1).name)
  } finally {
    workspace?.dispose()
    globalThis.document = originalDocument
    globalThis.fetch = originalFetch
  }
})

test('echo workspace stores the selected preview echo identity on new records', async () => {
  const originalDocument = globalThis.document
  const originalFetch = globalThis.fetch
  const testSetName = '剪心辑梦之影'
  const previewEcho = {
    id: 60001839,
    name: '重工铁蹄',
    cost: 3,
    image: '/echo-images/images/31_%E5%89%AA%E5%BF%83%E8%BE%91%E6%A2%A6%E4%B9%8B%E5%BD%B1/cost3_60001839_%E9%87%8D%E5%B7%A5%E9%93%81%E8%B9%84.png',
  }
  let createdPayload = null
  globalThis.document = { cookie: 'csrftoken=test' }
  globalThis.fetch = async (url, options = {}) => {
    const path = String(url)
    if (path.endsWith('/echoes/') && options.method === 'POST') {
      createdPayload = JSON.parse(options.body)
      return jsonResponse({
        id: 91,
        status: 'draft',
        substats: [],
        set_name: createdPayload.set_name,
        cost: createdPayload.cost,
        main_stat: createdPayload.main_stat,
        echo_asset_id: createdPayload.echo_asset_id,
        echo_name: createdPayload.echo_name,
        echo_image: createdPayload.echo_image,
        is_continuous_tuning: createdPayload.is_continuous_tuning,
      })
    }
    if (path.includes('/echoes/?game_account_id=1')) return jsonResponse({ results: [] })
    if (path.includes('/prediction/')) return jsonResponse({ candidates: [] })
    if (path.includes('/stats/') || path.includes('/model-evaluation/')) return jsonResponse({})
    throw new Error(`Unexpected request: ${path}`)
  }

  let workspace = null
  try {
    workspace = useEchoWorkspace({
      selectedGameAccountId: ref(1),
      boundPlayerUid: ref('123456789'),
      workspaceLocked: ref(false),
      onError: () => {},
    })

    await workspace.selectEchoAsset({ ...previewEcho, set_name: testSetName })
    await workspace.applyEchoConfig({ sonata: testSetName, cost: 3, main_stat: 'def_percent' })

    assert.equal(createdPayload.echo_asset_id, String(previewEcho.id))
    assert.equal(createdPayload.echo_name, previewEcho.name)
    assert.equal(createdPayload.echo_image, previewEcho.image)
  } finally {
    workspace?.dispose()
    globalThis.document = originalDocument
    globalThis.fetch = originalFetch
  }
})

test('next echo creation activates a new draft without blocking on full workspace refresh', async () => {
  const originalDocument = globalThis.document
  const originalFetch = globalThis.fetch
  const baseEcho = {
    id: 71,
    status: 'completed',
    substats: Array.from({ length: 5 }, (_, index) => ({
      id: 710 + index,
      position: index + 1,
      substat_type: ['crit_rate', 'crit_damage', 'atk_percent', 'flat_atk', 'flat_hp'][index],
      tier_value: index + 1,
    })),
    set_name: sonataEffects[0].name,
    cost: 1,
    main_stat: 'atk_percent',
    is_continuous_tuning: true,
  }
  let listRequests = 0
  let createdPayload = null
  globalThis.document = { cookie: 'csrftoken=test' }
  globalThis.fetch = async (url, options = {}) => {
    const path = String(url)
    if (path.includes('/echoes/?game_account_id=1')) {
      listRequests += 1
      return jsonResponse({ results: [baseEcho] })
    }
    if (path.endsWith('/echoes/') && options.method === 'POST') {
      createdPayload = JSON.parse(options.body)
      return jsonResponse({
        id: 72,
        status: 'draft',
        substats: [],
        set_name: createdPayload.set_name,
        cost: createdPayload.cost,
        main_stat: createdPayload.main_stat,
        is_continuous_tuning: createdPayload.is_continuous_tuning,
      })
    }
    if (path.includes('/prediction/')) return jsonResponse({ candidates: [] })
    if (path.includes('/stats/') || path.includes('/model-evaluation/')) return jsonResponse({})
    throw new Error(`Unexpected request: ${path}`)
  }

  const workspace = useEchoWorkspace({
    selectedGameAccountId: ref(1),
    boundPlayerUid: ref('123456789'),
    workspaceLocked: ref(false),
    onError: () => {},
  })

  try {
    await workspace.refresh()
    assert.equal(listRequests, 1)

    await workspace.createNextEchoFromActive()

    assert.equal(listRequests, 1)
    assert.equal(workspace.activeEchoId.value, 72)
    assert.equal(workspace.activeEcho.value.substats.length, 0)
    assert.equal(workspace.echoes.value[0].id, 72)
  } finally {
    workspace.dispose()
    globalThis.document = originalDocument
    globalThis.fetch = originalFetch
  }
})

test('next echo is not prepared while the current echo still has only four substats', async () => {
  const originalDocument = globalThis.document
  const originalFetch = globalThis.fetch
  const baseEcho = {
    id: 81,
    status: 'in_progress',
    substats: [
      { id: 811, position: 1, substat_type: 'crit_rate', tier_value: 6.3 },
      { id: 812, position: 2, substat_type: 'crit_damage', tier_value: 12.6 },
      { id: 813, position: 3, substat_type: 'atk_percent', tier_value: 8.6 },
    ],
    set_name: sonataEffects[0].name,
    cost: 1,
    main_stat: 'atk_percent',
    is_continuous_tuning: true,
  }
  let createRequests = 0
  globalThis.document = { cookie: 'csrftoken=test' }
  globalThis.fetch = async (url, options = {}) => {
    const path = String(url)
    if (path.includes('/echoes/?game_account_id=1')) return jsonResponse({ results: [baseEcho] })
    if (path.includes('/substats/') && options.method === 'POST') {
      return jsonResponse({ id: 814, position: 4, substat_type: 'flat_atk', tier_value: 30 })
    }
    if (path.endsWith('/echoes/') && options.method === 'POST') {
      createRequests += 1
      const createdPayload = JSON.parse(options.body)
      return jsonResponse({
        id: 82,
        status: 'draft',
        substats: [],
        set_name: createdPayload.set_name,
        cost: createdPayload.cost,
        main_stat: createdPayload.main_stat,
        is_continuous_tuning: createdPayload.is_continuous_tuning,
      })
    }
    if (path.includes('/prediction/')) return jsonResponse({ candidates: [] })
    if (path.includes('/stats/') || path.includes('/model-evaluation/')) return jsonResponse({})
    throw new Error(`Unexpected request: ${path}`)
  }

  const workspace = useEchoWorkspace({
    selectedGameAccountId: ref(1),
    boundPlayerUid: ref('123456789'),
    workspaceLocked: ref(false),
    onError: () => {},
  })

  try {
    await workspace.refresh()
    await workspace.clickTier(
      { recorded: null, substat_type: 'flat_atk' },
      { value: 30 },
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.equal(createRequests, 0)
    assert.equal(workspace.activeEchoId.value, 81)
    assert.equal(workspace.activeEcho.value.substats.length, 4)
  } finally {
    workspace.dispose()
    globalThis.document = originalDocument
    globalThis.fetch = originalFetch
  }
})

test('next echo uses a prepared draft after the fifth recorded substat', async () => {
  const originalDocument = globalThis.document
  const originalFetch = globalThis.fetch
  const baseEcho = {
    id: 83,
    status: 'in_progress',
    substats: [
      { id: 831, position: 1, substat_type: 'crit_rate', tier_value: 6.3 },
      { id: 832, position: 2, substat_type: 'crit_damage', tier_value: 12.6 },
      { id: 833, position: 3, substat_type: 'atk_percent', tier_value: 8.6 },
      { id: 834, position: 4, substat_type: 'flat_atk', tier_value: 30 },
    ],
    set_name: sonataEffects[0].name,
    cost: 1,
    main_stat: 'atk_percent',
    is_continuous_tuning: true,
  }
  let createRequests = 0
  globalThis.document = { cookie: 'csrftoken=test' }
  globalThis.fetch = async (url, options = {}) => {
    const path = String(url)
    if (path.includes('/echoes/?game_account_id=1')) return jsonResponse({ results: [baseEcho] })
    if (path.includes('/substats/') && options.method === 'POST') {
      return jsonResponse({ id: 835, position: 5, substat_type: 'flat_hp', tier_value: 580 })
    }
    if (path.endsWith('/echoes/') && options.method === 'POST') {
      createRequests += 1
      const createdPayload = JSON.parse(options.body)
      return jsonResponse({
        id: 84,
        status: 'draft',
        substats: [],
        set_name: createdPayload.set_name,
        cost: createdPayload.cost,
        main_stat: createdPayload.main_stat,
        is_continuous_tuning: createdPayload.is_continuous_tuning,
      })
    }
    if (path.includes('/prediction/')) return jsonResponse({ candidates: [] })
    if (path.includes('/stats/') || path.includes('/model-evaluation/')) return jsonResponse({})
    throw new Error(`Unexpected request: ${path}`)
  }

  const workspace = useEchoWorkspace({
    selectedGameAccountId: ref(1),
    boundPlayerUid: ref('123456789'),
    workspaceLocked: ref(false),
    onError: () => {},
  })

  try {
    await workspace.refresh()
    await workspace.clickTier(
      { recorded: null, substat_type: 'flat_hp' },
      { value: 580 },
    )
    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.equal(createRequests, 1)

    await workspace.createNextEchoFromActive()

    assert.equal(createRequests, 1)
    assert.equal(workspace.activeEchoId.value, 84)
    assert.equal(workspace.activeEcho.value.substats.length, 0)
  } finally {
    workspace.dispose()
    globalThis.document = originalDocument
    globalThis.fetch = originalFetch
  }
})

test('late preview patch responses do not roll back newly recorded substats', async () => {
  const originalDocument = globalThis.document
  const originalFetch = globalThis.fetch
  const patchResponse = deferred()
  const testSetName = sonataEffects[0].name
  const previewEcho = {
    id: 60001839,
    name: 'new-preview',
    cost: 1,
    image: '/echo-images/new-preview.png',
  }
  const baseEcho = {
    id: 85,
    status: 'in_progress',
    substats: [
      { id: 851, position: 1, substat_type: 'crit_rate', tier_value: 6.3 },
      { id: 852, position: 2, substat_type: 'crit_damage', tier_value: 12.6 },
      { id: 853, position: 3, substat_type: 'atk_percent', tier_value: 8.6 },
      { id: 854, position: 4, substat_type: 'flat_atk', tier_value: 30 },
    ],
    set_name: testSetName,
    cost: 1,
    main_stat: 'atk_percent',
    echo_asset_id: '60000001',
    echo_name: 'old-preview',
    echo_image: '/echo-images/old-preview.png',
    is_continuous_tuning: true,
  }
  globalThis.document = { cookie: 'csrftoken=test' }
  globalThis.fetch = async (url, options = {}) => {
    const path = String(url)
    if (path.includes('/echoes/?game_account_id=1')) return jsonResponse({ results: [baseEcho] })
    if (path.endsWith('/echoes/85/') && options.method === 'PATCH') return patchResponse.promise
    if (path.includes('/substats/') && options.method === 'POST') {
      return jsonResponse({ id: 855, position: 5, substat_type: 'flat_hp', tier_value: 580 })
    }
    if (path.endsWith('/echoes/') && options.method === 'POST') {
      const createdPayload = JSON.parse(options.body)
      return jsonResponse({
        id: 86,
        status: 'draft',
        substats: [],
        set_name: createdPayload.set_name,
        cost: createdPayload.cost,
        main_stat: createdPayload.main_stat,
        is_continuous_tuning: createdPayload.is_continuous_tuning,
      })
    }
    if (path.includes('/prediction/')) return jsonResponse({ candidates: [] })
    if (path.includes('/stats/') || path.includes('/model-evaluation/')) return jsonResponse({})
    throw new Error(`Unexpected request: ${path}`)
  }

  const workspace = useEchoWorkspace({
    selectedGameAccountId: ref(1),
    boundPlayerUid: ref('123456789'),
    workspaceLocked: ref(false),
    onError: () => {},
  })

  try {
    await workspace.refresh()
    const selectPromise = workspace.selectEchoAsset({ ...previewEcho, set_name: testSetName })
    await workspace.clickTier(
      { recorded: null, substat_type: 'flat_hp' },
      { value: 580 },
    )
    assert.equal(workspace.activeEcho.value.substats.length, 5)

    patchResponse.resolve(jsonResponse({
      ...baseEcho,
      echo_asset_id: String(previewEcho.id),
      echo_name: previewEcho.name,
      echo_image: previewEcho.image,
    }))
    await selectPromise

    assert.equal(workspace.activeEcho.value.substats.length, 5)
    assert.equal(workspace.activeEcho.value.echo_name, previewEcho.name)
  } finally {
    workspace.dispose()
    globalThis.document = originalDocument
    globalThis.fetch = originalFetch
  }
})

test('echo workspace patches the active draft when the preview echo changes', async () => {
  const originalDocument = globalThis.document
  const originalFetch = globalThis.fetch
  const testSetName = '剪心辑梦之影'
  const previewEcho = {
    id: 60001839,
    name: '重工铁蹄',
    cost: 3,
    image: '/echo-images/images/31_%E5%89%AA%E5%BF%83%E8%BE%91%E6%A2%A6%E4%B9%8B%E5%BD%B1/cost3_60001839_%E9%87%8D%E5%B7%A5%E9%93%81%E8%B9%84.png',
  }
  let patchedPayload = null
  globalThis.document = { cookie: 'csrftoken=test' }
  globalThis.fetch = async (url, options = {}) => {
    const path = String(url)
    if (path.includes('/echoes/?game_account_id=1')) {
      return jsonResponse({
        results: [{
          id: 41,
          status: 'draft',
          substats: [],
          set_name: testSetName,
          cost: 3,
          main_stat: 'def_percent',
          is_continuous_tuning: true,
        }],
      })
    }
    if (path.endsWith('/echoes/41/') && options.method === 'PATCH') {
      patchedPayload = JSON.parse(options.body)
      return jsonResponse({
        id: 41,
        status: 'draft',
        substats: [],
        set_name: testSetName,
        cost: 3,
        main_stat: 'def_percent',
        ...patchedPayload,
        is_continuous_tuning: true,
      })
    }
    if (path.includes('/prediction/')) return jsonResponse({ candidates: [] })
    if (path.includes('/stats/') || path.includes('/model-evaluation/')) return jsonResponse({})
    throw new Error(`Unexpected request: ${path}`)
  }

  let workspace = null
  try {
    workspace = useEchoWorkspace({
      selectedGameAccountId: ref(1),
      boundPlayerUid: ref('123456789'),
      workspaceLocked: ref(false),
      onError: () => {},
    })

    await workspace.refresh()
    await workspace.selectEchoAsset({ ...previewEcho, set_name: testSetName })
    await new Promise((resolve) => setTimeout(resolve, 420))

    assert.equal(patchedPayload.echo_asset_id, String(previewEcho.id))
    assert.equal(patchedPayload.echo_name, previewEcho.name)
    assert.equal(workspace.echoes.value[0].echo_name, previewEcho.name)
  } finally {
    workspace?.dispose()
    globalThis.document = originalDocument
    globalThis.fetch = originalFetch
  }
})

test('rapid preview changes defer and coalesce echo image patches', async () => {
  const originalDocument = globalThis.document
  const originalFetch = globalThis.fetch
  const testSetName = sonataEffects[0].name
  const firstPreviewEcho = {
    id: 60000001,
    name: 'first-preview',
    cost: 1,
    image: '/echo-images/first-preview.png',
  }
  const finalPreviewEcho = {
    id: 60000002,
    name: 'final-preview',
    cost: 1,
    image: '/echo-images/final-preview.png',
  }
  const patchPayloads = []
  globalThis.document = { cookie: 'csrftoken=test' }
  globalThis.fetch = async (url, options = {}) => {
    const path = String(url)
    if (path.includes('/echoes/?game_account_id=1')) {
      return jsonResponse({
        results: [{
          id: 42,
          status: 'draft',
          substats: [],
          set_name: testSetName,
          cost: 1,
          main_stat: 'atk_percent',
          is_continuous_tuning: true,
        }],
      })
    }
    if (path.endsWith('/echoes/42/') && options.method === 'PATCH') {
      const payload = JSON.parse(options.body)
      patchPayloads.push(payload)
      return jsonResponse({
        id: 42,
        status: 'draft',
        substats: [],
        set_name: testSetName,
        cost: 1,
        main_stat: 'atk_percent',
        ...payload,
        is_continuous_tuning: true,
      })
    }
    if (path.includes('/prediction/')) return jsonResponse({ candidates: [] })
    if (path.includes('/stats/') || path.includes('/model-evaluation/')) return jsonResponse({})
    throw new Error(`Unexpected request: ${path}`)
  }

  const workspace = useEchoWorkspace({
    selectedGameAccountId: ref(1),
    boundPlayerUid: ref('123456789'),
    workspaceLocked: ref(false),
    onError: () => {},
  })

  try {
    await workspace.refresh()
    workspace.selectEchoAsset({ ...firstPreviewEcho, set_name: testSetName })
    workspace.selectEchoAsset({ ...finalPreviewEcho, set_name: testSetName })
    await new Promise((resolve) => setTimeout(resolve, 0))

    assert.equal(patchPayloads.length, 0)
    assert.equal(workspace.activeEcho.value.echo_name, finalPreviewEcho.name)

    await new Promise((resolve) => setTimeout(resolve, 420))

    assert.equal(patchPayloads.length, 1)
    assert.equal(patchPayloads[0].echo_asset_id, String(finalPreviewEcho.id))
    assert.equal(patchPayloads[0].echo_name, finalPreviewEcho.name)
  } finally {
    workspace.dispose()
    globalThis.document = originalDocument
    globalThis.fetch = originalFetch
  }
})

test('reset prevents an old account refresh from restoring workspace data', async () => {
  const originalDocument = globalThis.document
  const originalFetch = globalThis.fetch
  const echoList = deferred()
  globalThis.document = { cookie: '' }
  globalThis.fetch = async (url) => {
    if (String(url).includes('/echoes/?game_account_id=1')) {
      return echoList.promise
    }
    if (String(url).includes('/prediction/')) {
      return jsonResponse({ candidates: [] })
    }
    return jsonResponse({})
  }

  let workspace = null
  try {
    const selectedGameAccountId = ref(1)
    workspace = useEchoWorkspace({
      selectedGameAccountId,
      boundPlayerUid: ref('123456789'),
      workspaceLocked: ref(false),
      onError: () => {},
    })
    const refreshPromise = workspace.refresh()

    selectedGameAccountId.value = 2
    workspace.reset()
    echoList.resolve(jsonResponse({
      results: [{
        id: 41,
        status: 'in_progress',
        substats: [],
        set_name: '旧账号套装',
        cost: 1,
        main_stat: 'atk_percent',
        is_continuous_tuning: false,
      }],
    }))
    await refreshPromise

    assert.deepEqual(workspace.echoes.value, [])
    assert.equal(workspace.activeEchoId.value, null)
    assert.equal(workspace.stats.value, null)
  } finally {
    workspace?.dispose()
    globalThis.document = originalDocument
    globalThis.fetch = originalFetch
  }
})

test('reset clears account-scoped echo config before creating an empty account draft', async () => {
  const originalDocument = globalThis.document
  const originalFetch = globalThis.fetch
  const oldAccountSonata = 'old-account-sonata'
  let createdPayload = null
  globalThis.document = { cookie: 'csrftoken=test' }
  globalThis.fetch = async (url, options = {}) => {
    const path = String(url)
    if (path.includes('/echoes/?game_account_id=1')) {
      return jsonResponse({
        results: [{
          id: 41,
          status: 'draft',
          substats: [],
          set_name: oldAccountSonata,
          cost: 4,
          main_stat: 'crit_rate',
          is_continuous_tuning: true,
        }],
      })
    }
    if (path.includes('/echoes/?game_account_id=2')) return jsonResponse({ results: [] })
    if (path.endsWith('/echoes/') && options.method === 'POST') {
      createdPayload = JSON.parse(options.body)
      return jsonResponse({
        id: 82,
        status: 'draft',
        substats: [],
        set_name: createdPayload.set_name,
        cost: createdPayload.cost,
        main_stat: createdPayload.main_stat,
        is_continuous_tuning: createdPayload.is_continuous_tuning,
      })
    }
    if (path.includes('/prediction/')) return jsonResponse({ candidates: [] })
    if (path.includes('/stats/') || path.includes('/model-evaluation/')) return jsonResponse({})
    throw new Error(`Unexpected request: ${path}`)
  }

  let workspace = null
  try {
    const selectedGameAccountId = ref(1)
    workspace = useEchoWorkspace({
      selectedGameAccountId,
      boundPlayerUid: ref('123456789'),
      workspaceLocked: ref(false),
      onError: () => {},
    })

    await workspace.refresh()
    assert.equal(workspace.echoForm.value.sonata, oldAccountSonata)

    selectedGameAccountId.value = 2
    workspace.reset()
    await workspace.refresh()

    assert.equal(createdPayload.set_name, sonataEffects[0].name)
    assert.notEqual(createdPayload.set_name, oldAccountSonata)
    assert.equal(createdPayload.cost, sonataEffects[0].availableCosts[0])
    assert.ok(mainStatsByCost[createdPayload.cost].includes(createdPayload.main_stat))
  } finally {
    workspace?.dispose()
    globalThis.document = originalDocument
    globalThis.fetch = originalFetch
  }
})

test('echo workspace coerces unsupported costs when switching sonata', async () => {
  const originalDocument = globalThis.document
  const originalFetch = globalThis.fetch
  const leadSet = sonataEffects[0]
  let updatedPayload = null
  globalThis.document = { cookie: 'csrftoken=test' }
  globalThis.fetch = async (url, options = {}) => {
    const path = String(url)
    if (path.includes('/echoes/?game_account_id=1')) {
      return jsonResponse({
        results: [{
          id: 41,
          status: 'draft',
          substats: [],
          set_name: sonataEffects.at(-1).name,
          cost: 1,
          main_stat: 'atk_percent',
          is_continuous_tuning: true,
        }],
      })
    }
    if (path.endsWith('/echoes/41/') && options.method === 'PATCH') {
      updatedPayload = JSON.parse(options.body)
      return jsonResponse({
        id: 41,
        status: 'draft',
        substats: [],
        set_name: updatedPayload.set_name,
        cost: updatedPayload.cost,
        main_stat: updatedPayload.main_stat,
        is_continuous_tuning: updatedPayload.is_continuous_tuning,
      })
    }
    if (path.includes('/prediction/')) return jsonResponse({ candidates: [] })
    if (path.includes('/stats/') || path.includes('/model-evaluation/')) return jsonResponse({})
    throw new Error(`Unexpected request: ${path}`)
  }

  let workspace = null
  try {
    workspace = useEchoWorkspace({
      selectedGameAccountId: ref(1),
      boundPlayerUid: ref('123456789'),
      workspaceLocked: ref(false),
      onError: () => {},
    })

    await workspace.refresh()
    await workspace.applyEchoConfig({ sonata: leadSet.name })

    assert.deepEqual(leadSet.availableCosts, [4])
    assert.equal(updatedPayload.set_name, leadSet.name)
    assert.equal(updatedPayload.cost, 4)
    assert.ok(mainStatsByCost[4].includes(updatedPayload.main_stat))
    assert.equal(workspace.echoForm.value.cost, 4)
  } finally {
    workspace?.dispose()
    globalThis.document = originalDocument
    globalThis.fetch = originalFetch
  }
})

test('account id changes invalidate an old workspace refresh even without an explicit reset', async () => {
  const originalDocument = globalThis.document
  const originalFetch = globalThis.fetch
  const oldEchoList = deferred()
  globalThis.document = { cookie: '' }
  globalThis.fetch = async (url) => {
    const path = String(url)
    if (path.includes('/echoes/?game_account_id=1')) return oldEchoList.promise
    if (path.includes('/prediction/')) return jsonResponse({ candidates: [] })
    if (path.includes('/stats/') || path.includes('/model-evaluation/')) return jsonResponse({})
    throw new Error(`Unexpected request: ${path}`)
  }

  let workspace = null
  try {
    const selectedGameAccountId = ref(1)
    workspace = useEchoWorkspace({
      selectedGameAccountId,
      boundPlayerUid: ref('111111111'),
      workspaceLocked: ref(false),
      onError: () => {},
    })
    const refreshPromise = workspace.refresh()

    selectedGameAccountId.value = 2
    oldEchoList.resolve(jsonResponse({
      results: [{
        id: 91,
        status: 'in_progress',
        substats: [],
        set_name: 'old-account',
        cost: 1,
        main_stat: 'atk_percent',
        is_continuous_tuning: false,
      }],
    }))
    await refreshPromise

    assert.deepEqual(workspace.echoes.value, [])
    assert.equal(workspace.activeEchoId.value, null)
    assert.equal(workspace.stats.value, null)
  } finally {
    workspace?.dispose()
    globalThis.document = originalDocument
    globalThis.fetch = originalFetch
  }
})

test('reset clears loaded insights after tier entry', async () => {
  const originalDocument = globalThis.document
  const originalFetch = globalThis.fetch
  globalThis.document = { cookie: 'csrftoken=test' }
  globalThis.fetch = async (url, options = {}) => {
    const path = String(url)
    if (path.includes('/echoes/?game_account_id=1')) {
      return jsonResponse({
        results: [{
          id: 41,
          status: 'in_progress',
          substats: [],
          set_name: '当前套装',
          cost: 1,
          main_stat: 'atk_percent',
          is_continuous_tuning: false,
        }],
      })
    }
    if (path.includes('/substats/') && options.method === 'POST') {
      return jsonResponse({ id: 51, position: 1, substat_type: 'crit_rate', tier_value: 6.3 })
    }
    if (path.includes('/prediction/')) return jsonResponse({ candidates: [] })
    if (path.includes('/stats/')) return jsonResponse({ total_rolls: 1 })
    if (path.includes('/model-evaluation/')) return jsonResponse({ status: 'ready' })
    throw new Error(`Unexpected request: ${path}`)
  }

  let workspace = null
  try {
    const selectedGameAccountId = ref(1)
    workspace = useEchoWorkspace({
      selectedGameAccountId,
      boundPlayerUid: ref('123456789'),
      workspaceLocked: ref(false),
      onError: () => {},
    })
    await workspace.refresh()
    assert.equal(workspace.stats.value.total_rolls, 1)
    assert.equal(workspace.evaluation.value.status, 'ready')

    await workspace.clickTier(
      { recorded: null, substat_type: 'crit_rate' },
      { value: 6.3 },
    )

    selectedGameAccountId.value = 2
    workspace.reset()

    assert.equal(workspace.stats.value, null)
    assert.equal(workspace.evaluation.value, null)
  } finally {
    workspace?.dispose()
    globalThis.document = originalDocument
    globalThis.fetch = originalFetch
  }
})

test('workspace refresh resolves without waiting for prediction results', async () => {
  const originalDocument = globalThis.document
  const originalFetch = globalThis.fetch
  const hangingPrediction = deferred()
  let refreshSettled = false
  globalThis.document = { cookie: 'csrftoken=test' }
  globalThis.fetch = async (url) => {
    const path = String(url)
    if (path.includes('/echoes/?game_account_id=1')) {
      return jsonResponse({
        results: [{
          id: 92,
          status: 'in_progress',
          substats: [{ id: 921, position: 1, substat_type: 'crit_rate', tier_value: 6.3 }],
          set_name: sonataEffects[0].name,
          cost: 1,
          main_stat: 'atk_percent',
          is_continuous_tuning: true,
        }],
      })
    }
    if (path.includes('/prediction/')) return hangingPrediction.promise
    if (path.includes('/stats/')) return jsonResponse({ total_rolls: 1 })
    if (path.includes('/model-evaluation/')) return jsonResponse({})
    throw new Error(`Unexpected request: ${path}`)
  }

  const workspace = useEchoWorkspace({
    selectedGameAccountId: ref(1),
    boundPlayerUid: ref('123456789'),
    workspaceLocked: ref(false),
    onError: () => {},
  })

  try {
    const refreshPromise = workspace.refresh().then(() => { refreshSettled = true })
    await new Promise((resolve) => setTimeout(resolve, 30))

    assert.equal(workspace.activeEchoId.value, 92)
    assert.equal(refreshSettled, true)
    await refreshPromise
  } finally {
    workspace.dispose()
    hangingPrediction.resolve(jsonResponse({ candidates: [] }))
    globalThis.document = originalDocument
    globalThis.fetch = originalFetch
  }
})

test('tier entry keeps prediction refresh out of the immediate save path', async () => {
  const originalDocument = globalThis.document
  const originalFetch = globalThis.fetch
  const requestOrder = []
  globalThis.document = { cookie: 'csrftoken=test' }
  globalThis.fetch = async (url, options = {}) => {
    const path = String(url)
    if (path.includes('/echoes/?game_account_id=1')) {
      return jsonResponse({
        results: [{
          id: 93,
          status: 'in_progress',
          substats: [{ id: 931, position: 1, substat_type: 'crit_rate', tier_value: 6.3 }],
          set_name: sonataEffects[0].name,
          cost: 1,
          main_stat: 'atk_percent',
          is_continuous_tuning: true,
        }],
      })
    }
    if (path.includes('/prediction/')) {
      requestOrder.push('prediction')
      return jsonResponse({ candidates: [] })
    }
    if (path.includes('/substats/') && options.method === 'POST') {
      requestOrder.push('substat-save')
      return jsonResponse({ id: 932, position: 2, substat_type: 'crit_damage', tier_value: 12.6 })
    }
    if (path.includes('/stats/') || path.includes('/model-evaluation/')) return jsonResponse({})
    throw new Error(`Unexpected request: ${path}`)
  }

  const workspace = useEchoWorkspace({
    selectedGameAccountId: ref(1),
    boundPlayerUid: ref('123456789'),
    workspaceLocked: ref(false),
    onError: () => {},
  })

  try {
    await workspace.refresh()
    requestOrder.length = 0

    await workspace.clickTier(
      { recorded: null, substat_type: 'crit_damage' },
      { value: 12.6 },
    )
    await new Promise((resolve) => setTimeout(resolve, 180))

    assert.deepEqual(requestOrder, ['substat-save'])

    await new Promise((resolve) => setTimeout(resolve, 560))

    assert.deepEqual(requestOrder, ['substat-save', 'prediction'])
  } finally {
    workspace.dispose()
    globalThis.document = originalDocument
    globalThis.fetch = originalFetch
  }
})

test('tier entry refreshes next prediction without starting stats or model evaluation', async () => {
  const originalDocument = globalThis.document
  const originalFetch = globalThis.fetch
  const requestOrder = []
  globalThis.document = { cookie: 'csrftoken=test' }
  globalThis.fetch = async (url, options = {}) => {
    const path = String(url)
    if (path.includes('/echoes/?game_account_id=1')) {
      return jsonResponse({
        results: [{
          id: 193,
          status: 'in_progress',
          substats: [{ id: 1931, position: 1, substat_type: 'crit_rate', tier_value: 6.3 }],
          set_name: sonataEffects[0].name,
          cost: 1,
          main_stat: 'atk_percent',
          is_continuous_tuning: true,
        }],
      })
    }
    if (path.includes('/prediction/')) {
      requestOrder.push('prediction')
      return jsonResponse({ candidates: [] })
    }
    if (path.includes('/stats/')) {
      requestOrder.push('stats')
      return jsonResponse({})
    }
    if (path.includes('/model-evaluation/')) {
      requestOrder.push('model-evaluation')
      return jsonResponse({})
    }
    if (path.includes('/substats/') && options.method === 'POST') {
      requestOrder.push('substat-save')
      return jsonResponse({ id: 1932, position: 2, substat_type: 'crit_damage', tier_value: 12.6 })
    }
    throw new Error(`Unexpected request: ${path}`)
  }

  const workspace = useEchoWorkspace({
    selectedGameAccountId: ref(1),
    boundPlayerUid: ref('123456789'),
    workspaceLocked: ref(false),
    onError: () => {},
  })

  try {
    await workspace.refresh()
    requestOrder.length = 0

    await workspace.clickTier(
      { recorded: null, substat_type: 'crit_damage' },
      { value: 12.6 },
    )
    await new Promise((resolve) => setTimeout(resolve, 1200))

    assert.deepEqual(requestOrder, ['substat-save', 'prediction'])
  } finally {
    workspace.dispose()
    globalThis.document = originalDocument
    globalThis.fetch = originalFetch
  }
})

test('echo image selection does not cancel a pending prediction refresh', async () => {
  const originalDocument = globalThis.document
  const originalFetch = globalThis.fetch
  const testSetName = sonataEffects[0].name
  const previewEcho = {
    id: 60000006,
    name: 'prediction-idle-preview',
    cost: 1,
    image: '/echo-images/prediction-idle-preview.png',
  }
  let predictionRequests = 0
  globalThis.document = { cookie: 'csrftoken=test' }
  globalThis.fetch = async (url, options = {}) => {
    const path = String(url)
    if (path.includes('/echoes/?game_account_id=1')) {
      return jsonResponse({
        results: [{
          id: 94,
          status: 'in_progress',
          substats: [{ id: 941, position: 1, substat_type: 'crit_rate', tier_value: 6.3 }],
          set_name: testSetName,
          cost: 1,
          main_stat: 'atk_percent',
          is_continuous_tuning: true,
        }],
      })
    }
    if (path.endsWith('/echoes/94/') && options.method === 'PATCH') {
      const payload = JSON.parse(options.body)
      return jsonResponse({
        id: 94,
        status: 'in_progress',
        substats: [{ id: 941, position: 1, substat_type: 'crit_rate', tier_value: 6.3 }],
        set_name: testSetName,
        cost: 1,
        main_stat: 'atk_percent',
        ...payload,
        is_continuous_tuning: true,
      })
    }
    if (path.includes('/prediction/')) {
      predictionRequests += 1
      return jsonResponse({ candidates: [] })
    }
    if (path.includes('/stats/') || path.includes('/model-evaluation/')) return jsonResponse({})
    throw new Error(`Unexpected request: ${path}`)
  }

  const workspace = useEchoWorkspace({
    selectedGameAccountId: ref(1),
    boundPlayerUid: ref('123456789'),
    workspaceLocked: ref(false),
    onError: () => {},
  })

  try {
    await workspace.refresh()
    await new Promise((resolve) => setTimeout(resolve, 300))
    await workspace.selectEchoAsset({ ...previewEcho, set_name: testSetName })
    await new Promise((resolve) => setTimeout(resolve, 800))

    assert.equal(predictionRequests, 1)
  } finally {
    workspace.dispose()
    globalThis.document = originalDocument
    globalThis.fetch = originalFetch
  }
})

test('new tier clicks cancel stale pending prediction refreshes before they start', async () => {
  const originalDocument = globalThis.document
  const originalFetch = globalThis.fetch
  let predictionRequests = 0
  globalThis.document = { cookie: 'csrftoken=test' }
  globalThis.fetch = async (url, options = {}) => {
    const path = String(url)
    if (path.includes('/echoes/?game_account_id=1')) {
      return jsonResponse({
        results: [{
          id: 91,
          status: 'in_progress',
          substats: [{ id: 911, position: 1, substat_type: 'crit_rate', tier_value: 6.3 }],
          set_name: sonataEffects[0].name,
          cost: 1,
          main_stat: 'atk_percent',
          is_continuous_tuning: true,
        }],
      })
    }
    if (path.includes('/prediction/')) {
      predictionRequests += 1
      return jsonResponse({ candidates: [] })
    }
    if (path.includes('/substats/') && options.method === 'POST') {
      const body = JSON.parse(options.body)
      return jsonResponse({
        id: body.substat_type === 'crit_damage' ? 912 : 913,
        position: body.substat_type === 'crit_damage' ? 2 : 3,
        substat_type: body.substat_type,
        tier_value: body.tier_value,
      })
    }
    if (path.includes('/stats/') || path.includes('/model-evaluation/')) return jsonResponse({})
    throw new Error(`Unexpected request: ${path}`)
  }

  const workspace = useEchoWorkspace({
    selectedGameAccountId: ref(1),
    boundPlayerUid: ref('123456789'),
    workspaceLocked: ref(false),
    onError: () => {},
  })

  try {
    await workspace.refresh()
    await new Promise((resolve) => setTimeout(resolve, 300))
    assert.equal(predictionRequests, 0)

    await workspace.clickTier(
      { recorded: null, substat_type: 'crit_damage' },
      { value: 12.6 },
    )
    await new Promise((resolve) => setTimeout(resolve, 400))

    assert.equal(predictionRequests, 0)

    await new Promise((resolve) => setTimeout(resolve, 300))

    assert.equal(predictionRequests, 1)
  } finally {
    workspace.dispose()
    globalThis.document = originalDocument
    globalThis.fetch = originalFetch
  }
})

test('reset prevents an in-flight echo creation from restoring an old account echo', async () => {
  const originalDocument = globalThis.document
  const originalFetch = globalThis.fetch
  const createResponse = deferred()
  const nextAccountEchoes = deferred()
  globalThis.document = { cookie: 'csrftoken=test' }
  globalThis.fetch = async (url, options = {}) => {
    const path = String(url)
    if (path.endsWith('/echoes/') && options.method === 'POST') return createResponse.promise
    if (path.includes('/echoes/?game_account_id=2')) return nextAccountEchoes.promise
    if (path.includes('/stats/') || path.includes('/model-evaluation/')) return jsonResponse({})
    throw new Error(`Unexpected request: ${path}`)
  }

  let workspace = null
  try {
    const selectedGameAccountId = ref(1)
    workspace = useEchoWorkspace({
      selectedGameAccountId,
      boundPlayerUid: ref(''),
      workspaceLocked: ref(false),
      onError: () => {},
    })
    const applyPromise = workspace.applyEchoConfig({ cost: 1 })

    selectedGameAccountId.value = 2
    workspace.reset()
    createResponse.resolve(jsonResponse({
      id: 61,
      status: 'draft',
      substats: [],
      set_name: '旧账号套装',
      cost: 1,
      main_stat: 'atk_percent',
      is_continuous_tuning: false,
    }))
    await new Promise((resolve) => setTimeout(resolve, 0))

    assert.deepEqual(workspace.echoes.value, [])
    assert.equal(workspace.activeEchoId.value, null)

    nextAccountEchoes.resolve(jsonResponse({ results: [] }))
    await applyPromise
  } finally {
    workspace?.dispose()
    globalThis.document = originalDocument
    globalThis.fetch = originalFetch
  }
})
