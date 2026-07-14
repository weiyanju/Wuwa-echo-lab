import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('title animation composable owns browser preferences, lifecycle, and cleanup', async () => {
  const source = await readFile(new URL('./useTitleAnimation.js', import.meta.url), 'utf8')

  assert.match(source, /import \{ onBeforeUnmount, onMounted, ref \} from 'vue'/)
  assert.match(source, /import \{ createTitleFontPreparation \} from '\.\/titleFont\.js'/)
  assert.match(source, /windowTarget\?\.matchMedia\?\.\('\(prefers-reduced-motion: reduce\)'\)/)
  assert.match(source, /windowTarget\?\.matchMedia\?\.\('\(max-width: 520px\)'\)/)
  assert.match(source, /const displayedTitle = ref\(shouldPlay \? '' : text\)/)
  assert.match(source, /const isComplete = ref\(!shouldPlay\)/)
  assert.match(source, /let fontPreparation = null/)
  assert.match(source, /let stopped = false/)
  assert.match(source, /onMounted\(async \(\) => \{/)
  assert.match(source, /if \(documentTarget\?\.hidden \|\| reducedMotionQuery\.matches \|\| compactViewportQuery\.matches\) \{\s+complete\(\)/)
  assert.match(source, /fontPreparation = createTitleFontPreparation\(\{\s+text,\s+fontSet: documentTarget\?\.fonts,/)
  assert.match(source, /fontPreparation\.start\(\)\s+const fontReady = await fontPreparation\.ready/)
  assert.match(source, /if \(stopped \|\| isComplete\.value\) return/)
  assert.match(source, /if \(!fontReady \|\| documentTarget\?\.hidden \|\| reducedMotionQuery\.matches \|\| compactViewportQuery\.matches\) \{\s+complete\(\)/)
  assert.match(source, /animation = createTitleAnimation\(\{[\s\S]+onComplete: \(\) => \{\s+isComplete\.value = true/)
  assert.match(source, /documentTarget\?\.addEventListener\('visibilitychange', handleDocumentVisibility\)/)
  assert.match(source, /stopped = true\s+fontPreparation\?\.cancel\(\)/)
  assert.match(source, /onBeforeUnmount\(\(\) => \{[\s\S]+animation\?\.cancel\(\)[\s\S]+removeEventListener/)
  assert.match(source, /return \{ displayedTitle, isComplete \}/)
})
