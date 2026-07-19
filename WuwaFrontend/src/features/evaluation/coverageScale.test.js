import assert from 'node:assert/strict'
import test from 'node:test'

import { getCoverageScale } from './coverageScale.js'

test('coverage scale keeps low rates on a readable 0-20 percent axis', () => {
  assert.deepEqual(getCoverageScale([0.1159, 0.1304, 0.1884]), {
    max: 0.2,
    ticks: [0, 0.1, 0.2],
  })
})

test('coverage scale expands to friendly bounds as rates grow', () => {
  assert.deepEqual(getCoverageScale([0.3, 0.31, 0.32]), {
    max: 0.4,
    ticks: [0, 0.2, 0.4],
  })
  assert.deepEqual(getCoverageScale([0.5]), {
    max: 0.6,
    ticks: [0, 0.3, 0.6],
  })
  assert.deepEqual(getCoverageScale([0.82]), {
    max: 1,
    ticks: [0, 0.5, 1],
  })
})

test('coverage scale ignores invalid values and never exceeds 100 percent', () => {
  assert.deepEqual(getCoverageScale([]), {
    max: 0.2,
    ticks: [0, 0.1, 0.2],
  })
  assert.deepEqual(getCoverageScale([Number.NaN, -1, 1.4]), {
    max: 1,
    ticks: [0, 0.5, 1],
  })
})
