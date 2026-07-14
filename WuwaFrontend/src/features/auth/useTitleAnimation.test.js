import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('title animation composable owns browser preferences, lifecycle, and cleanup', async () => {
  const source = await readFile(new URL('./useTitleAnimation.js', import.meta.url), 'utf8')

  assert.match(source, /import \{ onBeforeUnmount, onMounted, ref \} from 'vue'/)
  assert.match(source, /windowTarget\?\.matchMedia\?\.\('\(prefers-reduced-motion: reduce\)'\)/)
  assert.match(source, /windowTarget\?\.matchMedia\?\.\('\(max-width: 520px\)'\)/)
  assert.match(source, /const displayedTitle = ref\(shouldPlay \? '' : text\)/)
  assert.match(source, /const isComplete = ref\(!shouldPlay\)/)
  assert.match(source, /if \(documentTarget\?\.hidden \|\| reducedMotionQuery\.matches \|\| compactViewportQuery\.matches\) \{\s+complete\(\)/)
  assert.match(source, /animation = createTitleAnimation\(\{[\s\S]+onComplete: \(\) => \{\s+isComplete\.value = true/)
  assert.match(source, /documentTarget\?\.addEventListener\('visibilitychange', handleDocumentVisibility\)/)
  assert.match(source, /onBeforeUnmount\(\(\) => \{[\s\S]+animation\?\.cancel\(\)[\s\S]+removeEventListener/)
  assert.match(source, /return \{ displayedTitle, isComplete \}/)
})
