import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import test from 'node:test'

test('game account composable owns workspace lock and uid binding state', async () => {
  await access(new URL('./useGameAccount.js', import.meta.url))
  const source = await readFile(new URL('./useGameAccount.js', import.meta.url), 'utf8')

  assert.match(source, /export function useGameAccount\(\)/)
  assert.match(source, /const accounts = ref\(\[\]\)/)
  assert.match(source, /const defaultAccount = computed/)
  assert.match(source, /const workspaceLocked = computed/)
  assert.match(source, /async function loadGameAccounts\(\)/)
  assert.match(source, /async function bindDefaultUid\(uid\)/)
  assert.match(source, /from '\.\.\/services\/gameAccountApi\.js'/)
})

