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

test('next echo creation ignores repeated clicks while creation is pending', async () => {
  const originalDocument = globalThis.document
  const originalFetch = globalThis.fetch
  const createResponse = deferred()
  const baseEcho = {
    id: 73,
    status: 'completed',
    substats: Array.from({ length: 5 }, (_, index) => ({
      id: 730 + index,
      position: index + 1,
      substat_type: ['crit_rate', 'crit_damage', 'atk_percent', 'flat_atk', 'flat_hp'][index],
      tier_value: index + 1,
    })),
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
    if (path.endsWith('/echoes/') && options.method === 'POST') {
      createRequests += 1
      if (createRequests === 1) return createResponse.promise
      return jsonResponse({ id: 75, status: 'draft', substats: [], set_name: baseEcho.set_name, cost: 1, main_stat: 'atk_percent', is_continuous_tuning: true })
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
    const firstNext = workspace.createNextEchoFromActive()
    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.equal(workspace.saving.value, true)

    const secondNext = workspace.createNextEchoFromActive()
    await new Promise((resolve) => setTimeout(resolve, 0))

    assert.equal(createRequests, 1)

    createResponse.resolve(jsonResponse({ id: 74, status: 'draft', substats: [], set_name: baseEcho.set_name, cost: 1, main_stat: 'atk_percent', is_continuous_tuning: true }))
    await Promise.all([firstNext, secondNext])

    assert.equal(workspace.activeEchoId.value, 74)
  } finally {
    workspace.dispose()
    globalThis.document = originalDocument
    globalThis.fetch = originalFetch
  }
})

test('next echo creation is ignored while a tier save is pending', async () => {
  const originalDocument = globalThis.document
  const originalFetch = globalThis.fetch
  const substatResponse = deferred()
  const baseEcho = {
    id: 76,
    status: 'draft',
    substats: [],
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
    if (path.includes('/substats/') && options.method === 'POST') return substatResponse.promise
    if (path.endsWith('/echoes/') && options.method === 'POST') {
      createRequests += 1
      return jsonResponse({ id: 77, status: 'draft', substats: [], set_name: baseEcho.set_name, cost: 1, main_stat: 'atk_percent', is_continuous_tuning: true })
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
    const tierSave = workspace.clickTier(
      { recorded: null, substat_type: 'crit_damage' },
      { value: 12.6 },
    )
    await new Promise((resolve) => setTimeout(resolve, 0))

    await workspace.createNextEchoFromActive()

    assert.equal(createRequests, 0)
    assert.equal(workspace.activeEchoId.value, 76)

    substatResponse.resolve(jsonResponse({ id: 761, position: 1, substat_type: 'crit_damage', tier_value: 12.6 }))
    await tierSave
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
    assert.equal(workspace.sessionEchoDelta.value, 0)
    assert.equal(workspace.visibleSessionEchoDelta.value, 0)

    await workspace.createNextEchoFromActive()

    assert.equal(createRequests, 1)
    assert.equal(workspace.activeEchoId.value, 84)
    assert.equal(workspace.activeEcho.value.substats.length, 0)
    assert.equal(workspace.sessionEchoDelta.value, 0)
    assert.equal(workspace.visibleSessionEchoDelta.value, 0)
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
  const restrictedSet = sonataEffects.find((effect) => effect.id === 32)
  assert.ok(restrictedSet)
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
    await workspace.applyEchoConfig({ sonata: restrictedSet.name })

    assert.deepEqual(restrictedSet.availableCosts, [4])
    assert.equal(updatedPayload.set_name, restrictedSet.name)
    assert.equal(updatedPayload.cost, 4)
    assert.ok(mainStatsByCost[4].includes(updatedPayload.main_stat))
    assert.equal(workspace.echoForm.value.cost, 4)
    assert.equal(workspace.activeEcho.value.id, 41)
  } finally {
    workspace?.dispose()
    globalThis.document = originalDocument
    globalThis.fetch = originalFetch
  }
})

test('config selection immediately creates and announces a new echo after recording has started', async () => {
  const originalDocument = globalThis.document
  const originalFetch = globalThis.fetch
  const firstSet = sonataEffects[0]
  const nextSet = sonataEffects.find((effect) => effect.name !== firstSet.name)
  const records = [{
    id: 41,
    status: 'in_progress',
    substats: [{ id: 401, position: 1, substat_type: 'crit_rate', tier_value: 6.3 }],
    set_name: firstSet.name,
    cost: firstSet.availableCosts[0],
    main_stat: mainStatsByCost[firstSet.availableCosts[0]][0],
    is_continuous_tuning: true,
  }]
  let createRequests = 0
  globalThis.document = { cookie: 'csrftoken=test' }
  globalThis.fetch = async (url, options = {}) => {
    const path = String(url)
    if (path.includes('/echoes/?game_account_id=1')) return jsonResponse({ results: records })
    if (path.endsWith('/echoes/') && options.method === 'POST') {
      createRequests += 1
      const payload = JSON.parse(options.body)
      const echo = {
        id: 41 + createRequests,
        status: 'draft',
        substats: [],
        set_name: payload.set_name,
        cost: payload.cost,
        main_stat: payload.main_stat,
        is_continuous_tuning: true,
      }
      records.unshift(echo)
      return jsonResponse(echo)
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
    await workspace.applyEchoConfig({ sonata: nextSet.name })

    assert.equal(createRequests, 1)
    assert.equal(workspace.activeEcho.value.id, 42)
    assert.equal(workspace.activeEcho.value.substats.length, 0)
    assert.equal(workspace.echoes.value.find((echo) => echo.id === 41).substats.length, 1)
    assert.match(workspace.configCreationNotice.value, new RegExp(`^已新建：${nextSet.name} · COST `))

    await workspace.applyEchoConfig({ sonata: workspace.echoForm.value.sonata })
    assert.equal(createRequests, 1)
  } finally {
    workspace.dispose()
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
  const requestOrder = []
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
    if (path.includes('/prediction/')) {
      requestOrder.push('prediction')
      return hangingPrediction.promise
    }
    if (path.includes('/stats/')) {
      requestOrder.push('stats')
      return jsonResponse({ total_rolls: 1 })
    }
    if (path.includes('/model-evaluation/')) {
      requestOrder.push('model-evaluation')
      return jsonResponse({})
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
    const refreshPromise = workspace.refresh().then(() => { refreshSettled = true })
    await new Promise((resolve) => setTimeout(resolve, 700))

    assert.equal(workspace.activeEchoId.value, 92)
    assert.equal(refreshSettled, true)
    assert.equal(requestOrder.filter((request) => request === 'model-evaluation').length, 0)
    assert.equal(requestOrder.filter((request) => request === 'stats').length, 1)
    assert.equal(requestOrder.filter((request) => request === 'prediction').length, 1)
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

test('tier entry increments loaded stats total locally without refreshing analytics', async () => {
  const originalDocument = globalThis.document
  const originalFetch = globalThis.fetch
  const requestOrder = []
  globalThis.document = { cookie: 'csrftoken=test' }
  globalThis.fetch = async (url, options = {}) => {
    const path = String(url)
    if (path.includes('/echoes/?game_account_id=1')) {
      return jsonResponse({
        results: [{
          id: 293,
          status: 'in_progress',
          substats: [{ id: 2931, position: 1, substat_type: 'crit_rate', tier_value: 6.3 }],
          set_name: sonataEffects[0].name,
          cost: 1,
          main_stat: 'atk_percent',
          is_continuous_tuning: true,
        }],
      })
    }
    if (path.includes('/prediction/')) return jsonResponse({ candidates: [] })
    if (path.includes('/stats/')) {
      requestOrder.push('stats')
      return jsonResponse({
        total_rolls: 84,
        sample_stage: { min: 0, max: 500, key: 'recording', label: '0-500 条：规则基线主导' },
        substat_frequency: {
          crit_damage: { label: '暴击伤害', count: 4, observed_rate: 4 / 84, baseline_rate: 1 / 13, deviation: 4 / 84 - 1 / 13 },
        },
        context_factors: {
          set_name: { status: 'insufficient_data', sample_size: 84, groups: {} },
        },
      })
    }
    if (path.includes('/model-evaluation/')) {
      requestOrder.push('model-evaluation')
      return jsonResponse({})
    }
    if (path.includes('/substats/') && options.method === 'POST') {
      requestOrder.push('substat-save')
      return jsonResponse({ id: 2932, position: 2, substat_type: 'crit_damage', tier_value: 12.6 })
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
    assert.equal(workspace.stats.value.total_rolls, 84)
    assert.equal(workspace.sessionEchoDelta.value, 0)
    assert.equal(workspace.sessionSampleDelta.value, 0)
    requestOrder.length = 0

    await workspace.clickTier(
      { recorded: null, substat_type: 'crit_damage' },
      { value: 12.6 },
    )

    assert.equal(workspace.stats.value.total_rolls, 85)
    assert.equal(workspace.sessionEchoDelta.value, 0)
    assert.equal(workspace.sessionSampleDelta.value, 1)
    assert.equal(workspace.stats.value.substat_frequency.crit_damage.count, 5)
    assert.equal(workspace.stats.value.context_factors.set_name.sample_size, 85)
    assert.deepEqual(requestOrder, ['substat-save'])
  } finally {
    workspace.dispose()
    globalThis.document = originalDocument
    globalThis.fetch = originalFetch
  }
})

test('tier entry shows a temporary capsule delta without clearing the session total', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })

  const originalDocument = globalThis.document
  const originalFetch = globalThis.fetch
  globalThis.document = { cookie: 'csrftoken=test' }
  globalThis.fetch = async (url, options = {}) => {
    const path = String(url)
    if (path.includes('/echoes/?game_account_id=1')) {
      return jsonResponse({
        results: [{
          id: 294,
          status: 'in_progress',
          substats: [{ id: 2941, position: 1, substat_type: 'crit_rate', tier_value: 6.3 }],
          set_name: sonataEffects[0].name,
          cost: 1,
          main_stat: 'atk_percent',
          is_continuous_tuning: true,
        }],
      })
    }
    if (path.includes('/prediction/')) return jsonResponse({ candidates: [] })
    if (path.includes('/stats/')) return jsonResponse({ total_rolls: 84 })
    if (path.includes('/model-evaluation/')) return jsonResponse({})
    if (path.includes('/substats/') && options.method === 'POST') {
      return jsonResponse({ id: 2942, position: 2, substat_type: 'crit_damage', tier_value: 12.6 })
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
    assert.equal(workspace.visibleSessionSampleDelta.value, 0)

    await workspace.clickTier(
      { recorded: null, substat_type: 'crit_damage' },
      { value: 12.6 },
    )

    assert.equal(workspace.sessionSampleDelta.value, 1)
    assert.equal(workspace.visibleSessionSampleDelta.value, 1)

    t.mock.timers.tick(850)

    assert.equal(workspace.sessionSampleDelta.value, 1)
    assert.equal(workspace.visibleSessionSampleDelta.value, 0)
  } finally {
    workspace.dispose()
    globalThis.document = originalDocument
    globalThis.fetch = originalFetch
  }
})

test('undo decrements loaded stats total locally after the backend removes a roll', async () => {
  const originalDocument = globalThis.document
  const originalFetch = globalThis.fetch
  const requestOrder = []
  globalThis.document = { cookie: 'csrftoken=test' }
  globalThis.fetch = async (url, options = {}) => {
    const path = String(url)
    if (path.includes('/echoes/?game_account_id=1')) {
      return jsonResponse({
        results: [{
          id: 294,
          status: 'in_progress',
          substats: [
            { id: 2941, position: 1, substat_type: 'crit_rate', tier_value: 6.3 },
            { id: 2942, position: 2, substat_type: 'crit_damage', tier_value: 12.6 },
          ],
          set_name: sonataEffects[0].name,
          cost: 1,
          main_stat: 'atk_percent',
          is_continuous_tuning: true,
        }],
      })
    }
    if (path.includes('/prediction/')) return jsonResponse({ candidates: [] })
    if (path.includes('/stats/')) {
      requestOrder.push('stats')
      return jsonResponse({
        total_rolls: 85,
        sample_stage: { min: 0, max: 500, key: 'recording', label: '0-500 条：规则基线主导' },
        substat_frequency: {
          crit_damage: { label: '暴击伤害', count: 5, observed_rate: 5 / 85, baseline_rate: 1 / 13, deviation: 5 / 85 - 1 / 13 },
        },
        context_factors: {
          set_name: { status: 'insufficient_data', sample_size: 85, groups: {} },
        },
      })
    }
    if (path.includes('/model-evaluation/')) {
      requestOrder.push('model-evaluation')
      return jsonResponse({})
    }
    if (path.includes('/substats/latest/') && options.method === 'DELETE') {
      requestOrder.push('substat-undo')
      return jsonResponse({
        echo: {
          id: 294,
          status: 'in_progress',
          substats: [{ id: 2941, position: 1, substat_type: 'crit_rate', tier_value: 6.3 }],
          set_name: sonataEffects[0].name,
          cost: 1,
          main_stat: 'atk_percent',
          is_continuous_tuning: true,
        },
      })
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
    assert.equal(workspace.stats.value.total_rolls, 85)
    assert.equal(workspace.sessionEchoDelta.value, 0)
    assert.equal(workspace.sessionSampleDelta.value, 0)
    requestOrder.length = 0

    await workspace.undoActiveSubstat()

    assert.equal(workspace.stats.value.total_rolls, 84)
    assert.equal(workspace.sessionEchoDelta.value, 0)
    assert.equal(workspace.sessionSampleDelta.value, 0)
    assert.equal(workspace.stats.value.substat_frequency.crit_damage.count, 4)
    assert.equal(workspace.stats.value.context_factors.set_name.sample_size, 84)
    assert.deepEqual(requestOrder, ['substat-undo'])
  } finally {
    workspace.dispose()
    globalThis.document = originalDocument
    globalThis.fetch = originalFetch
  }
})

test('undo rolls back the session sample delta for an entry recorded in this session', async () => {
  const originalDocument = globalThis.document
  const originalFetch = globalThis.fetch
  globalThis.document = { cookie: 'csrftoken=test' }
  globalThis.fetch = async (url, options = {}) => {
    const path = String(url)
    if (path.includes('/echoes/?game_account_id=1')) {
      return jsonResponse({
        results: [{
          id: 295,
          status: 'in_progress',
          substats: [{ id: 2951, position: 1, substat_type: 'crit_rate', tier_value: 6.3 }],
          set_name: sonataEffects[0].name,
          cost: 1,
          main_stat: 'atk_percent',
          is_continuous_tuning: true,
        }],
      })
    }
    if (path.includes('/prediction/')) return jsonResponse({ candidates: [] })
    if (path.includes('/stats/')) return jsonResponse({ total_rolls: 84 })
    if (path.includes('/model-evaluation/')) return jsonResponse({})
    if (path.includes('/substats/') && options.method === 'POST') {
      return jsonResponse({ id: 2952, position: 2, substat_type: 'crit_damage', tier_value: 12.6 })
    }
    if (path.includes('/substats/latest/') && options.method === 'DELETE') {
      return jsonResponse({
        echo: {
          id: 295,
          status: 'in_progress',
          substats: [{ id: 2951, position: 1, substat_type: 'crit_rate', tier_value: 6.3 }],
          set_name: sonataEffects[0].name,
          cost: 1,
          main_stat: 'atk_percent',
          is_continuous_tuning: true,
        },
      })
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
    await workspace.clickTier(
      { recorded: null, substat_type: 'crit_damage' },
      { value: 12.6 },
    )
    assert.equal(workspace.sessionSampleDelta.value, 1)

    await workspace.undoActiveSubstat()

    assert.equal(workspace.sessionSampleDelta.value, 0)
  } finally {
    workspace.dispose()
    globalThis.document = originalDocument
    globalThis.fetch = originalFetch
  }
})

test('undo is ignored while a tier save is pending', async () => {
  const originalDocument = globalThis.document
  const originalFetch = globalThis.fetch
  const substatResponse = deferred()
  let undoRequests = 0
  const baseEcho = {
    id: 306,
    status: 'draft',
    substats: [],
    set_name: sonataEffects[0].name,
    cost: 1,
    main_stat: 'atk_percent',
    is_continuous_tuning: true,
  }
  globalThis.document = { cookie: 'csrftoken=test' }
  globalThis.fetch = async (url, options = {}) => {
    const path = String(url)
    if (path.includes('/echoes/?game_account_id=1')) return jsonResponse({ results: [baseEcho] })
    if (path.includes('/substats/') && options.method === 'POST') return substatResponse.promise
    if (path.includes('/substats/latest/') && options.method === 'DELETE') {
      undoRequests += 1
      return jsonResponse({ echo: baseEcho })
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
    const tierSave = workspace.clickTier(
      { recorded: null, substat_type: 'crit_damage' },
      { value: 12.6 },
    )
    await new Promise((resolve) => setTimeout(resolve, 0))

    await workspace.undoActiveSubstat()

    assert.equal(undoRequests, 0)

    substatResponse.resolve(jsonResponse({ id: 3061, position: 1, substat_type: 'crit_damage', tier_value: 12.6 }))
    await tierSave
  } finally {
    workspace.dispose()
    globalThis.document = originalDocument
    globalThis.fetch = originalFetch
  }
})

test('first tier entry on an empty echo only shows a sample delta', async () => {
  const originalDocument = globalThis.document
  const originalFetch = globalThis.fetch
  globalThis.document = { cookie: 'csrftoken=test' }
  globalThis.fetch = async (url, options = {}) => {
    const path = String(url)
    if (path.includes('/echoes/?game_account_id=1')) {
      return jsonResponse({
        results: [{
          id: 296,
          status: 'draft',
          substats: [],
          set_name: sonataEffects[0].name,
          cost: 1,
          main_stat: 'atk_percent',
          is_continuous_tuning: true,
        }],
      })
    }
    if (path.includes('/prediction/')) return jsonResponse({ candidates: [] })
    if (path.includes('/stats/')) return jsonResponse({ total_rolls: 84 })
    if (path.includes('/model-evaluation/')) return jsonResponse({})
    if (path.includes('/substats/') && options.method === 'POST') {
      return jsonResponse({ id: 2961, position: 1, substat_type: 'crit_damage', tier_value: 12.6 })
    }
    if (path.includes('/substats/latest/') && options.method === 'DELETE') {
      return jsonResponse({
        echo: {
          id: 296,
          status: 'draft',
          substats: [],
          set_name: sonataEffects[0].name,
          cost: 1,
          main_stat: 'atk_percent',
          is_continuous_tuning: true,
        },
      })
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
    assert.equal(workspace.visibleEchoCount.value, 0)

    await workspace.clickTier(
      { recorded: null, substat_type: 'crit_damage' },
      { value: 12.6 },
    )

    assert.equal(workspace.visibleEchoCount.value, 1)
    assert.equal(workspace.sessionEchoDelta.value, 0)
    assert.equal(workspace.visibleSessionEchoDelta.value, 0)
    assert.equal(workspace.sessionSampleDelta.value, 1)

    await workspace.undoActiveSubstat()

    assert.equal(workspace.visibleEchoCount.value, 0)
    assert.equal(workspace.sessionEchoDelta.value, 0)
    assert.equal(workspace.sessionSampleDelta.value, 0)
  } finally {
    workspace.dispose()
    globalThis.document = originalDocument
    globalThis.fetch = originalFetch
  }
})

test('fifth tier entry completes the echo without showing an echo-created delta', async () => {
  const originalDocument = globalThis.document
  const originalFetch = globalThis.fetch
  globalThis.document = { cookie: 'csrftoken=test' }
  globalThis.fetch = async (url, options = {}) => {
    const path = String(url)
    if (path.includes('/echoes/?game_account_id=1')) {
      return jsonResponse({
        results: [{
          id: 297,
          status: 'in_progress',
          substats: [
            { id: 2971, position: 1, substat_type: 'crit_rate', tier_value: 6.3 },
            { id: 2972, position: 2, substat_type: 'crit_damage', tier_value: 12.6 },
            { id: 2973, position: 3, substat_type: 'atk_percent', tier_value: 8.6 },
            { id: 2974, position: 4, substat_type: 'flat_atk', tier_value: 30 },
          ],
          set_name: sonataEffects[0].name,
          cost: 1,
          main_stat: 'atk_percent',
          is_continuous_tuning: true,
        }],
      })
    }
    if (path.includes('/prediction/')) return jsonResponse({ candidates: [] })
    if (path.includes('/stats/')) return jsonResponse({ total_rolls: 84 })
    if (path.includes('/model-evaluation/')) return jsonResponse({})
    if (path.includes('/substats/') && options.method === 'POST') {
      return jsonResponse({ id: 2975, position: 5, substat_type: 'flat_hp', tier_value: 580 })
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

    await workspace.clickTier(
      { recorded: null, substat_type: 'flat_hp' },
      { value: 580 },
    )

    assert.equal(workspace.activeEcho.value.status, 'completed')
    assert.equal(workspace.sessionEchoDelta.value, 0)
    assert.equal(workspace.visibleSessionEchoDelta.value, 0)
    assert.equal(workspace.sessionSampleDelta.value, 1)
  } finally {
    workspace.dispose()
    globalThis.document = originalDocument
    globalThis.fetch = originalFetch
  }
})

test('moving to the next echo records a delta when it creates a fresh draft id', async () => {
  const originalDocument = globalThis.document
  const originalFetch = globalThis.fetch
  const baseEcho = {
    id: 298,
    status: 'in_progress',
    substats: [
      { id: 2981, position: 1, substat_type: 'crit_rate', tier_value: 6.3 },
      { id: 2982, position: 2, substat_type: 'crit_damage', tier_value: 12.6 },
    ],
    set_name: sonataEffects[0].name,
    cost: 1,
    main_stat: 'atk_percent',
    is_continuous_tuning: true,
  }
  globalThis.document = { cookie: 'csrftoken=test' }
  globalThis.fetch = async (url, options = {}) => {
    const path = String(url)
    if (path.includes('/echoes/?game_account_id=1')) return jsonResponse({ results: [baseEcho] })
    if (path.endsWith('/echoes/') && options.method === 'POST') {
      const createdPayload = JSON.parse(options.body)
      return jsonResponse({
        id: 299,
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

    await workspace.createNextEchoFromActive()

    assert.equal(workspace.activeEchoId.value, 299)
    assert.equal(workspace.sessionEchoDelta.value, 1)
    assert.equal(workspace.visibleSessionEchoDelta.value, 1)
  } finally {
    workspace.dispose()
    globalThis.document = originalDocument
    globalThis.fetch = originalFetch
  }
})

test('undo does not roll back an echo-created delta for the active draft id', async () => {
  const originalDocument = globalThis.document
  const originalFetch = globalThis.fetch
  const sourceEcho = {
    id: 307,
    status: 'completed',
    substats: [
      { id: 3071, position: 1, substat_type: 'crit_rate', tier_value: 6.3 },
      { id: 3072, position: 2, substat_type: 'crit_damage', tier_value: 12.6 },
      { id: 3073, position: 3, substat_type: 'atk_percent', tier_value: 8.6 },
      { id: 3074, position: 4, substat_type: 'flat_atk', tier_value: 30 },
      { id: 3075, position: 5, substat_type: 'flat_hp', tier_value: 580 },
    ],
    set_name: sonataEffects[0].name,
    cost: 1,
    main_stat: 'atk_percent',
    is_continuous_tuning: true,
  }
  const createdCompleteEcho = {
    id: 308,
    status: 'completed',
    substats: [
      { id: 3081, position: 1, substat_type: 'crit_rate', tier_value: 6.3 },
      { id: 3082, position: 2, substat_type: 'crit_damage', tier_value: 12.6 },
      { id: 3083, position: 3, substat_type: 'atk_percent', tier_value: 8.6 },
      { id: 3084, position: 4, substat_type: 'flat_atk', tier_value: 30 },
      { id: 3085, position: 5, substat_type: 'flat_hp', tier_value: 580 },
    ],
    set_name: sonataEffects[0].name,
    cost: 1,
    main_stat: 'atk_percent',
    is_continuous_tuning: true,
  }
  globalThis.document = { cookie: 'csrftoken=test' }
  globalThis.fetch = async (url, options = {}) => {
    const path = String(url)
    if (path.includes('/echoes/?game_account_id=1')) return jsonResponse({ results: [sourceEcho] })
    if (path.endsWith('/echoes/') && options.method === 'POST') {
      const createdPayload = JSON.parse(options.body)
      return jsonResponse({
        id: 308,
        status: 'draft',
        substats: [],
        set_name: createdPayload.set_name,
        cost: createdPayload.cost,
        main_stat: createdPayload.main_stat,
        is_continuous_tuning: createdPayload.is_continuous_tuning,
      })
    }
    if (path.includes('/substats/latest/') && options.method === 'DELETE') {
      return jsonResponse({
        echo: {
          ...createdCompleteEcho,
          status: 'in_progress',
          substats: createdCompleteEcho.substats.slice(0, 4),
        },
      })
    }
    if (path.includes('/prediction/')) return jsonResponse({ candidates: [] })
    if (path.includes('/stats/')) return jsonResponse({ total_rolls: 84 })
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
    await workspace.refresh()

    await workspace.createNextEchoFromActive()

    assert.equal(workspace.activeEchoId.value, 308)
    assert.equal(workspace.sessionEchoDelta.value, 1)

    workspace.echoes.value = workspace.echoes.value.map((echo) => (
      echo.id === 308 ? createdCompleteEcho : echo
    ))

    await workspace.undoActiveSubstat()

    assert.equal(workspace.activeEcho.value.substats.length, 4)
    assert.equal(workspace.sessionEchoDelta.value, 1)
  } finally {
    workspace.dispose()
    globalThis.document = originalDocument
    globalThis.fetch = originalFetch
  }
})

test('discarding the active echo records the replacement draft creation', async () => {
  const originalDocument = globalThis.document
  const originalFetch = globalThis.fetch
  let listRequests = 0
  const activeEcho = {
    id: 300,
    status: 'draft',
    substats: [],
    set_name: sonataEffects[0].name,
    cost: 1,
    main_stat: 'atk_percent',
    is_continuous_tuning: true,
  }
  globalThis.document = { cookie: 'csrftoken=test' }
  globalThis.fetch = async (url, options = {}) => {
    const path = String(url)
    if (path.includes('/echoes/?game_account_id=1')) {
      listRequests += 1
      return jsonResponse({
        results: listRequests === 1
          ? [activeEcho]
          : [{ ...activeEcho, status: 'archived' }],
      })
    }
    if (path.includes('/echoes/300/') && options.method === 'PATCH') {
      return jsonResponse({ ...activeEcho, status: 'archived' })
    }
    if (path.endsWith('/echoes/') && options.method === 'POST') {
      const createdPayload = JSON.parse(options.body)
      return jsonResponse({
        id: 301,
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

    await workspace.discardActiveEcho()

    assert.equal(workspace.sessionEchoDelta.value, 1)
    assert.equal(workspace.visibleSessionEchoDelta.value, 1)
  } finally {
    workspace.dispose()
    globalThis.document = originalDocument
    globalThis.fetch = originalFetch
  }
})

test('discarding the active echo activates a replacement draft without full workspace refresh', async () => {
  const originalDocument = globalThis.document
  const originalFetch = globalThis.fetch
  const requestOrder = []
  let listRequests = 0
  const activeEcho = {
    id: 302,
    status: 'draft',
    substats: [],
    set_name: sonataEffects[0].name,
    cost: 1,
    main_stat: 'atk_percent',
    is_continuous_tuning: true,
  }
  const archivedEcho = { ...activeEcho, status: 'archived' }
  globalThis.document = { cookie: 'csrftoken=test' }
  globalThis.fetch = async (url, options = {}) => {
    const path = String(url)
    if (path.includes('/echoes/?game_account_id=1')) {
      listRequests += 1
      requestOrder.push('list')
      return jsonResponse({ results: listRequests === 1 ? [activeEcho] : [archivedEcho] })
    }
    if (path.includes('/stats/')) {
      requestOrder.push('stats')
      return jsonResponse({ total_rolls: 84 })
    }
    if (path.includes('/model-evaluation/')) {
      requestOrder.push('model-evaluation')
      return jsonResponse({})
    }
    if (path.includes('/echoes/302/') && options.method === 'PATCH') {
      requestOrder.push('archive')
      return jsonResponse(archivedEcho)
    }
    if (path.endsWith('/echoes/') && options.method === 'POST') {
      requestOrder.push('create')
      const createdPayload = JSON.parse(options.body)
      return jsonResponse({
        id: 303,
        status: 'draft',
        substats: [],
        set_name: createdPayload.set_name,
        cost: createdPayload.cost,
        main_stat: createdPayload.main_stat,
        is_continuous_tuning: createdPayload.is_continuous_tuning,
      })
    }
    if (path.includes('/prediction/')) {
      requestOrder.push('prediction')
      return jsonResponse({ candidates: [] })
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

    await workspace.discardActiveEcho()

    assert.deepEqual(requestOrder, ['archive', 'create'])
    assert.equal(listRequests, 1)
    assert.equal(workspace.activeEchoId.value, 303)
    assert.equal(workspace.activeEcho.value.status, 'draft')
    assert.equal(workspace.echoes.value.some((echo) => echo.id === 302 && echo.status === 'archived'), true)
    assert.equal(workspace.sessionEchoDelta.value, 1)
  } finally {
    workspace.dispose()
    globalThis.document = originalDocument
    globalThis.fetch = originalFetch
  }
})

test('tier clicks are ignored while discard is still saving', async () => {
  const originalDocument = globalThis.document
  const originalFetch = globalThis.fetch
  const archiveResponse = deferred()
  let substatRequests = 0
  const activeEcho = {
    id: 304,
    status: 'draft',
    substats: [],
    set_name: sonataEffects[0].name,
    cost: 1,
    main_stat: 'atk_percent',
    is_continuous_tuning: true,
  }
  globalThis.document = { cookie: 'csrftoken=test' }
  globalThis.fetch = async (url, options = {}) => {
    const path = String(url)
    if (path.includes('/echoes/?game_account_id=1')) {
      return jsonResponse({ results: [{ ...activeEcho, status: 'archived' }] })
    }
    if (path.includes('/stats/') || path.includes('/model-evaluation/')) return jsonResponse({})
    if (path.includes('/echoes/304/') && options.method === 'PATCH') return archiveResponse.promise
    if (path.endsWith('/echoes/') && options.method === 'POST') {
      const createdPayload = JSON.parse(options.body)
      return jsonResponse({
        id: 305,
        status: 'draft',
        substats: [],
        set_name: createdPayload.set_name,
        cost: createdPayload.cost,
        main_stat: createdPayload.main_stat,
        is_continuous_tuning: createdPayload.is_continuous_tuning,
      })
    }
    if (path.includes('/substats/') && options.method === 'POST') {
      substatRequests += 1
      return jsonResponse({ id: 3041, position: 1, substat_type: 'crit_damage', tier_value: 12.6 })
    }
    if (path.includes('/prediction/')) return jsonResponse({ candidates: [] })
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
    workspace.echoes.value = [activeEcho]
    workspace.activeEchoId.value = activeEcho.id

    const discardPromise = workspace.discardActiveEcho()
    assert.equal(workspace.saving.value, true)

    await workspace.clickTier(
      { recorded: null, substat_type: 'crit_damage' },
      { value: 12.6 },
    )

    archiveResponse.resolve(jsonResponse({ ...activeEcho, status: 'archived' }))
    await discardPromise

    assert.equal(substatRequests, 0)
    assert.equal(workspace.activeEchoId.value, 305)
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

test('page insight refresh is exposed without re-entering the tier save path', async () => {
  const source = await readFile(new URL('./useEchoWorkspace.js', import.meta.url), 'utf8')
  const clickTierSection = source.slice(source.indexOf('async function clickTier'), source.indexOf('async function undoActiveSubstat'))
  assert.match(source, /createWorkspaceInsightRefresh/)
  assert.match(source, /refreshStats/)
  assert.match(source, /refreshEvaluation/)
  assert.doesNotMatch(clickTierSection, /refreshStats|refreshEvaluation|getStats|getModelEvaluation/)
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
