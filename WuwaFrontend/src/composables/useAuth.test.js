import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import test from 'node:test'

test('auth composable owns login lifecycle state', async () => {
  await access(new URL('./useAuth.js', import.meta.url))
  const source = await readFile(new URL('./useAuth.js', import.meta.url), 'utf8')

  assert.match(source, /export function useAuth\(\)/)
  assert.match(source, /const user = ref\(null\)/)
  assert.match(source, /const isAuthenticated = computed/)
  assert.match(source, /async function loadMe\(\)/)
  assert.match(source, /async function signIn\(payload\)/)
  assert.match(source, /async function signUp\(payload\)/)
  assert.match(source, /async function signOut\(\)/)
  assert.match(source, /from '\.\.\/services\/authApi\.js'/)
})

