import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('recognition review panel owns presentation and emits workflow commands', async () => {
  const source = await readFile(new URL('./RecognitionReviewPanel.vue', import.meta.url), 'utf8')

  assert.match(source, /defineEmits\(\['refresh', 'revert'\]\)/)
  assert.match(source, /class="recognition-panel product-panel"/)
  assert.match(source, /@click="emit\('refresh'\)"/)
  assert.match(source, /@click="emit\('revert', snapshot\)"/)
  assert.match(source, /v-for="snapshot in reviewRows"/)
})
