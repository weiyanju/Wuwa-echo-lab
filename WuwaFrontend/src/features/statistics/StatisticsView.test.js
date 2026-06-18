import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('statistics view owns analytics presentation', async () => {
  const source = await readFile(new URL('./StatisticsView.vue', import.meta.url), 'utf8')

  assert.match(source, /defineProps\(\{[\s\S]+stats:/)
  assert.match(source, /class="product-panel full-panel stats-analytics-panel"/)
  assert.match(source, /v-for="row in sortedStatFrequency"/)
  assert.match(source, /v-for="stage in sampleStageAxisRows"/)
})
