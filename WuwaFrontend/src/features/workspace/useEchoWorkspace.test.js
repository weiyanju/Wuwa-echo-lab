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

  assert.match(source, /async function refresh\(\)/)
  assert.match(source, /function reset\(\) \{[\s\S]+clearTimeout\(insightsRefreshTimer\)[\s\S]+clearTimeout\(activeRefreshTimer\)/)
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

  try {
    const workspace = useEchoWorkspace({
      selectedGameAccountId: ref(1),
      boundPlayerUid: ref('123456789'),
      workspaceLocked: ref(false),
      onError: () => {},
    })

    await workspace.applyEchoConfig({ cost: 1 })

    assert.equal(createdPayload.is_continuous_tuning, true)
    assert.equal(workspace.echoForm.value.is_continuous_tuning, true)
  } finally {
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

  try {
    const workspace = useEchoWorkspace({
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

  try {
    const workspace = useEchoWorkspace({
      selectedGameAccountId: ref(1),
      boundPlayerUid: ref('123456789'),
      workspaceLocked: ref(false),
      onError: () => {},
    })

    await workspace.refresh()
    await workspace.selectEchoAsset({ ...previewEcho, set_name: testSetName })

    assert.equal(patchedPayload.echo_asset_id, String(previewEcho.id))
    assert.equal(patchedPayload.echo_name, previewEcho.name)
    assert.equal(workspace.echoes.value[0].echo_name, previewEcho.name)
  } finally {
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

  try {
    const selectedGameAccountId = ref(1)
    const workspace = useEchoWorkspace({
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

  try {
    const selectedGameAccountId = ref(1)
    const workspace = useEchoWorkspace({
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

    assert.equal(createdPayload.set_name, sonataEffects.at(-1).name)
    assert.notEqual(createdPayload.set_name, oldAccountSonata)
    assert.equal(createdPayload.cost, 1)
    assert.equal(createdPayload.main_stat, 'atk_percent')
  } finally {
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

  try {
    const workspace = useEchoWorkspace({
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

  try {
    const selectedGameAccountId = ref(1)
    const workspace = useEchoWorkspace({
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
    globalThis.document = originalDocument
    globalThis.fetch = originalFetch
  }
})

test('reset prevents an in-flight background refresh from restoring insights', async () => {
  const originalDocument = globalThis.document
  const originalFetch = globalThis.fetch
  const backgroundStats = deferred()
  const backgroundEvaluation = deferred()
  let statsRequests = 0
  let evaluationRequests = 0
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
    if (path.includes('/stats/')) {
      statsRequests += 1
      return statsRequests === 1 ? jsonResponse({ total_rolls: 1 }) : backgroundStats.promise
    }
    if (path.includes('/model-evaluation/')) {
      evaluationRequests += 1
      return evaluationRequests === 1 ? jsonResponse({}) : backgroundEvaluation.promise
    }
    throw new Error(`Unexpected request: ${path}`)
  }

  try {
    const selectedGameAccountId = ref(1)
    const workspace = useEchoWorkspace({
      selectedGameAccountId,
      boundPlayerUid: ref('123456789'),
      workspaceLocked: ref(false),
      onError: () => {},
    })
    await workspace.refresh()
    await workspace.clickTier(
      { recorded: null, substat_type: 'crit_rate' },
      { value: 6.3 },
    )
    await new Promise((resolve) => setTimeout(resolve, 1050))

    selectedGameAccountId.value = 2
    workspace.reset()
    backgroundStats.resolve(jsonResponse({ total_rolls: 999 }))
    backgroundEvaluation.resolve(jsonResponse({ model: 'old-account' }))
    await new Promise((resolve) => setTimeout(resolve, 0))

    assert.equal(workspace.stats.value, null)
    assert.equal(workspace.evaluation.value, null)
  } finally {
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

  try {
    const selectedGameAccountId = ref(1)
    const workspace = useEchoWorkspace({
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
    globalThis.document = originalDocument
    globalThis.fetch = originalFetch
  }
})
