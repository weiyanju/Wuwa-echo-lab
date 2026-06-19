import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { ref } from 'vue'

import { useEchoWorkspace } from './useEchoWorkspace.js'

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
