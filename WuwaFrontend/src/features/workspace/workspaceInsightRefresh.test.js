import assert from 'node:assert/strict'
import test from 'node:test'
import { ref } from 'vue'

import { createWorkspaceInsightRefresh } from './workspaceInsightRefresh.js'

function deferred() {
  let resolve
  const promise = new Promise((nextResolve) => { resolve = nextResolve })
  return { promise, resolve }
}

function createHarness(overrides = {}) {
  const selectedGameAccountId = ref(7)
  const workspaceLocked = ref(false)
  const stats = ref(null)
  const evaluation = ref(null)
  const errors = []
  let generation = 0
  const controller = createWorkspaceInsightRefresh({
    selectedGameAccountId,
    workspaceLocked,
    stats,
    evaluation,
    getStats: async () => ({ total_rolls: 0 }),
    getModelEvaluation: async () => ({ status: 'insufficient_data', evaluated_count: 0 }),
    lifecycleGeneration: () => generation,
    reportError: (error) => errors.push(error.message),
    ...overrides,
  })
  return { controller, selectedGameAccountId, workspaceLocked, stats, evaluation, errors, nextGeneration: () => { generation += 1 } }
}

test('statistics and evaluation refresh independently and expose request status', async () => {
  const harness = createHarness()
  await harness.controller.refreshStats()
  assert.deepEqual(harness.stats.value, { total_rolls: 0 })
  assert.equal(harness.controller.statsRequestStatus.value, 'ready')
  assert.equal(harness.evaluation.value, null)

  await harness.controller.refreshEvaluation()
  assert.equal(harness.evaluation.value.status, 'insufficient_data')
  assert.equal(harness.controller.evaluationRequestStatus.value, 'ready')
})

test('an old account response cannot restore stale insight data', async () => {
  const pending = deferred()
  const harness = createHarness({ getStats: () => pending.promise })
  const refresh = harness.controller.refreshStats()
  harness.selectedGameAccountId.value = 9
  harness.nextGeneration()
  harness.controller.reset()
  pending.resolve({ total_rolls: 286 })
  await refresh
  assert.equal(harness.stats.value, null)
  assert.equal(harness.controller.statsRequestStatus.value, 'idle')
})

test('request errors are explicit and do not replace the last successful value', async () => {
  const harness = createHarness({ getStats: async () => { throw new Error('stats unavailable') } })
  harness.stats.value = { total_rolls: 12 }
  await harness.controller.refreshStats()
  assert.deepEqual(harness.stats.value, { total_rolls: 12 })
  assert.equal(harness.controller.statsRequestStatus.value, 'error')
  assert.deepEqual(harness.errors, ['stats unavailable'])
})
