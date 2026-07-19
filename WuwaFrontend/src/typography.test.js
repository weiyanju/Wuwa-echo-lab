import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const readSource = (relativePath) =>
  readFile(new URL(relativePath, import.meta.url), 'utf8')

const allowedWeights = new Set([400, 500, 600, 700])

function assertTypographyValues(source, label) {
  for (const match of source.matchAll(/font-weight\s*:\s*(\d+)/g)) {
    const weight = Number(match[1])
    assert.ok(allowedWeights.has(weight), label + ' uses unsupported weight ' + weight)
  }

  for (const match of source.matchAll(/font-size\s*:\s*([^;]+)/g)) {
    const pxValues = [...match[1].matchAll(/(\d+(?:\.\d+)?)px/g)].map((item) =>
      Number(item[1]),
    )
    for (const size of pxValues) {
      assert.ok(Number.isInteger(size), label + ' uses fractional px size ' + size)
      assert.ok(size >= 11, label + ' uses text smaller than 11px: ' + size)
    }
  }

  for (const match of source.matchAll(/letter-spacing\s*:\s*([^;]+)/g)) {
    const value = match[1].trim()
    assert.ok(
      value === '0' || value.startsWith('var(--tracking-'),
      label + ' uses raw tracking value ' + value,
    )
  }
}

async function assertStyleGroup(relativePaths, label) {
  const sources = await Promise.all(relativePaths.map(readSource))
  for (let index = 0; index < sources.length; index += 1) {
    assertTypographyValues(sources[index], label + ': ' + relativePaths[index])
  }
}

test('typography uses the approved IBM Plex packages and semantic tokens', async () => {
  const packageJson = JSON.parse(await readSource('../package.json'))
  const tokens = await readSource('./styles/tokens.css')

  assert.equal(packageJson.dependencies['@ibm/plex-sans-sc'], '^1.1.0')
  assert.equal(packageJson.dependencies['@ibm/plex-mono'], '^2.5.0')
  assert.equal(packageJson.dependencies['@fontsource/noto-sans-sc'], undefined)

  assert.match(tokens, /IBMPlexSansSC-Regular\.css/)
  assert.match(tokens, /IBMPlexSansSC-Medium\.css/)
  assert.match(tokens, /IBMPlexSansSC-SemiBold\.css/)
  assert.match(tokens, /IBMPlexSansSC-Bold\.css/)
  assert.match(tokens, /IBMPlexMono-Medium\.css/)
  assert.match(tokens, /IBMPlexMono-SemiBold\.css/)

  for (const token of [
    '--font-cjk',
    '--font-ui',
    '--font-title',
    '--font-latin',
    '--font-data',
    '--font-mono',
    '--text-page-title',
    '--text-section-title',
    '--text-card-title',
    '--text-body',
    '--text-control',
    '--text-label',
    '--text-caption',
    '--text-micro',
    '--text-data-sm',
    '--text-data-md',
    '--text-data-lg',
    '--text-data-xl',
    '--weight-body',
    '--weight-supporting',
    '--weight-label',
    '--weight-control',
    '--weight-data',
    '--weight-title',
    '--weight-emphasis',
    '--leading-data',
    '--leading-title',
    '--leading-control',
    '--leading-label',
    '--leading-caption',
    '--leading-body',
    '--tracking-cjk',
    '--tracking-latin',
    '--tracking-abbr',
    '--tracking-caps',
    '--tracking-brand',
    '--tracking-data',
  ]) {
    assert.match(
      tokens,
      new RegExp(token.replace(/[.*+?^$()|[\]\\]/g, '\\$&') + ':'),
    )
  }

  assert.match(tokens, /font-synthesis: none;/)
})

test('shared styles use the approved typography values', async () => {
  await assertStyleGroup(
    ['./styles/base.css', './styles/controls.css', './styles/shell.css'],
    'shared styles',
  )
})

test('supporting views use the approved typography values', async () => {
  await assertStyleGroup(
    [
      './styles/features/auth.css',
      './styles/features/history.css',
      './styles/features/recognition.css',
    ],
    'supporting views',
  )
})

test('workbench and statistics use the approved typography values', async () => {
  await assertStyleGroup(
    [
      './styles/features/workspace.css',
      './styles/features/workspace-active.css',
      './styles/features/statistics.css',
    ],
    'workbench and statistics',
  )
})

test('evaluation uses the approved typography values', async () => {
  await assertStyleGroup(['./styles/features/evaluation.css'], 'evaluation')
})

test('brand, technical text, and comparable numbers use semantic font roles', async () => {
  const base = await readSource('./styles/base.css')
  const shell = await readSource('./styles/shell.css')
  const auth = await readSource('./styles/features/auth.css')

  assert.match(
    shell,
    /\.wordmark\s*\{[^}]*font-family:\s*var\(--font-latin\);[^}]*letter-spacing:\s*var\(--tracking-brand\);/s,
  )
  assert.match(
    shell,
    /\.uid-chip-value\s*\{[^}]*font-family:\s*var\(--font-data\);/s,
  )
  assert.match(
    auth,
    /\.terminal-system-status\s*\{[^}]*font-family:\s*var\(--font-mono\);[^}]*letter-spacing:\s*var\(--tracking-caps\);/s,
  )
  assert.match(
    base,
    /\.data-number,[\s\S]*\.percent-value\s*\{[^}]*font-family:\s*var\(--font-data\);[^}]*font-variant-numeric:\s*tabular-nums;[^}]*font-feature-settings:\s*"tnum";/s,
  )
})
