import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('echo display names prefer stored backend identity before neutral fallback', async () => {
  const source = await readFile(new URL('./echoDisplay.js', import.meta.url), 'utf8')

  assert.match(source, /export function displayEchoName\(echo, fallback = '未指定声骸'\)/)
  assert.match(source, /if \(echo\?\.echo_name\) return echo\.echo_name/)
  assert.match(source, /if \(echo\?\.name\) return echo\.name/)
  assert.match(source, /if \(echo\?\.display_name\) return echo\.display_name/)
  assert.doesNotMatch(source, /sonataEchoesBySetName/)
  assert.match(source, /return fallback/)
})
