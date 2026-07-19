import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('workspace summary distinguishes real zero, missing confidence, loading, and error', async () => {
  const source = await readFile(new URL('./WorkspaceSummary.vue', import.meta.url), 'utf8')
  assert.match(source, /EMPTY_METRIC_TEXT/)
  assert.match(source, /sampleTotal\(props\.totalSamples\)/)
  assert.match(source, /props\.totalSamples === null/)
  assert.match(source, /class="hero-metric-skeleton"/)
  assert.match(source, />加载失败</)
  assert.match(source, /confidenceDisplay/)
  assert.match(source, /confidence:\s*\{\s*type:\s*\[String, Number\]/)
  assert.match(source, /置信度尚未形成/)
  assert.match(source, /v-if="historyDelta"/)
  assert.match(source, /v-if="sampleDelta"/)
  assert.doesNotMatch(source, /'低'/)
})
