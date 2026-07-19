import assert from 'node:assert/strict'
import test from 'node:test'

import { useDashboardNavigation } from './useDashboardNavigation.js'

test('dashboard navigation refreshes only the selected insight page', async () => {
  const calls = []
  const navigation = useDashboardNavigation({
    refreshStats: async () => calls.push('stats'),
    refreshEvaluation: async () => calls.push('evaluation'),
  })

  await navigation.openPage('stats')
  assert.equal(navigation.page.value, 'stats')
  assert.deepEqual(calls, ['stats'])

  await navigation.openPage('evaluation')
  assert.equal(navigation.page.value, 'evaluation')
  assert.deepEqual(calls, ['stats', 'evaluation'])

  await navigation.openPage('workspace')
  assert.equal(navigation.page.value, 'workspace')
  assert.deepEqual(calls, ['stats', 'evaluation'])
})
