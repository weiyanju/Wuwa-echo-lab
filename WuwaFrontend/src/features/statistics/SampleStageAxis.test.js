import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('sample stage axis stays a presentational accessible graphic', async () => {
  const source = await readFile(new URL('./SampleStageAxis.vue', import.meta.url), 'utf8')
  assert.match(source, /progress: \{ type: Number, required: true \}/)
  assert.match(source, /rows: \{ type: Array, required: true \}/)
  assert.match(source, /segments: \{ type: Array, required: true \}/)
  assert.match(source, /role="img" :aria-label="ariaLabel"/)
  assert.match(source, /v-for="stage in rows"/)
  assert.match(source, /v-for="stage in segments"/)
  assert.doesNotMatch(source, /props\.stats|evaluation|total_rolls/)
})
