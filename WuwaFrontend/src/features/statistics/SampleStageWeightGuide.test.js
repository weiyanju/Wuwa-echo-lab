import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('sample stage weight guide is a non-modal anchored disclosure with a semantic matrix', async () => {
  const source = await readFile(new URL('./SampleStageWeightGuide.vue', import.meta.url), 'utf8')

  assert.match(source, /stages: \{ type: Array, required: true \}/)
  assert.match(source, /total: \{ type: Number, required: true \}/)
  assert.match(source, /import chevronDownIcon from '\.\.\/\.\.\/assets\/icons\/chevron-down\.svg'/)
  assert.match(source, /import xIcon from '\.\.\/\.\.\/assets\/icons\/x\.svg'/)
  assert.match(source, /import \{ resolveSampleStageGuidePosition \} from '\.\/sampleStageGuidePosition\.js'/)
  assert.match(source, /aria-label="查看阶段与模型权重"/)
  assert.match(source, /aria-controls="sample-stage-weight-popover"/)
  assert.match(source, /:aria-expanded="String\(isOpen\)"/)
  assert.match(source, /<Teleport to="\.app-shell">/)
  assert.match(source, /role="dialog"/)
  assert.match(source, /aria-modal="false"/)
  assert.match(source, /aria-labelledby="sample-stage-weight-title"/)
  assert.match(source, /id="sample-stage-weight-title">阶段与模型权重/)
  assert.match(source, /<table class="sample-stage-weight-table">/)
  assert.match(source, /<th v-for="model in modelColumns"/)
  assert.match(source, /<tr v-for="stage in stages"/)
  assert.match(source, /stage\.weights\[model\.key\]/)
  assert.match(source, /class="sample-stage-current-rail"[\s\S]*role="img"[\s\S]*aria-label="当前阶段"/)

  assert.match(source, /!rootRef\.value\?\.contains\(event\.target\)/)
  assert.match(source, /!popoverRef\.value\?\.contains\(event\.target\)/)
  assert.match(source, /event\.key !== 'Escape'/)
  assert.match(source, /closeRef\.value\?\.focus\(\)/)
  assert.match(source, /triggerRef\.value\?\.focus\(\)/)
  assert.match(source, /@click="setOpen\(false, \{ restoreFocus: true \}\)"/)

  assert.match(source, /document\.addEventListener\('pointerdown', handleDocumentPointerDown\)/)
  assert.match(source, /document\.removeEventListener\('pointerdown', handleDocumentPointerDown\)/)
  assert.match(source, /document\.addEventListener\('keydown', handleDocumentKeydown\)/)
  assert.match(source, /document\.removeEventListener\('keydown', handleDocumentKeydown\)/)
  assert.match(source, /window\.addEventListener\('resize', syncPosition\)/)
  assert.match(source, /window\.removeEventListener\('resize', syncPosition\)/)
  assert.match(source, /document\.addEventListener\('scroll', syncPosition, true\)/)
  assert.match(source, /document\.removeEventListener\('scroll', syncPosition, true\)/)

  assert.doesNotMatch(source, /help-circle|circle-help|progress-bar|weight-track/)
})
