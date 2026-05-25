import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildNextEchoConfig,
  isReusableDraft,
  sortVisibleEchoHistory,
  statusBadge,
} from './echoWorkflow.js'

function echo(overrides) {
  return {
    id: overrides.id,
    status: overrides.status || 'in_progress',
    created_at: overrides.created_at || '2026-01-01T00:00:00.000Z',
    substats: overrides.substats || [],
  }
}

test('visible history excludes empty drafts but keeps discarded echoes', () => {
  const visible = sortVisibleEchoHistory([
    echo({ id: 1, substats: [] }),
    echo({ id: 2, status: 'archived', substats: [] }),
    echo({ id: 3, substats: [{ id: 10 }], created_at: '2026-01-03T00:00:00.000Z' }),
  ])

  assert.deepEqual(
    visible.map((item) => item.id),
    [3, 2],
  )
})

test('empty active echo can be reconfigured instead of creating a new echo', () => {
  assert.equal(isReusableDraft(echo({ id: 1, substats: [] })), true)
  assert.equal(isReusableDraft(echo({ id: 2, substats: [{ id: 10 }] })), false)
  assert.equal(isReusableDraft(echo({ id: 3, status: 'archived', substats: [] })), false)
})

test('history badges distinguish current, pending, discarded, and completed echoes', () => {
  assert.equal(statusBadge(echo({ id: 1, substats: [{ id: 10 }] }), 1), '当前录入')
  assert.equal(statusBadge(echo({ id: 2, substats: [{ id: 10 }] }), 1), '待强化')
  assert.equal(statusBadge(echo({ id: 3, status: 'archived', substats: [{ id: 10 }] }), 1), '弃置')
  assert.equal(statusBadge(echo({ id: 4, substats: Array.from({ length: 5 }, (_, id) => ({ id })) }), 1), '已强化')
})

test('next echo keeps the current echo configuration', () => {
  assert.deepEqual(
    buildNextEchoConfig({
      set_name: '啸谷长风',
      cost: 3,
      main_stat: 'hp_percent',
    }),
    {
      sonata: '啸谷长风',
      cost: 3,
      main_stat: 'hp_percent',
      is_continuous_tuning: true,
    },
  )
})
