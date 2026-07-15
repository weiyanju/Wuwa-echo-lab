import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('sample readiness panel exposes one task boundary, native progress, detail slot, and action', async () => {
  const source = await readFile(new URL('./SampleReadinessPanel.vue', import.meta.url), 'utf8')
  const style = await readFile(new URL('../../styles/sample-readiness.css', import.meta.url), 'utf8')
  assert.match(source, /class="sample-readiness-panel"/)
  assert.match(source, /<progress[^>]+:value="safeCurrent"[^>]+:max="safeTarget"/)
  assert.match(source, /<slot name="detail"><\/slot>/)
  assert.match(source, /class="button-primary"/)
  assert.match(source, /emit\('action'\)/)
  assert.doesNotMatch(source, /box-shadow|product-panel/)
  assert.match(style, /\.sample-readiness-panel > \.button-primary\s*\{[^}]*grid-column:\s*3;[^}]*grid-row:\s*1;/s)
  assert.match(style, /@media \(max-width: 860px\)[\s\S]*\.sample-readiness-panel > \.button-primary\s*\{[^}]*grid-column:\s*1;[^}]*grid-row:\s*auto;/)
})
