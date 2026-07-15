import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

function bodyFor(source, target) {
  return [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((match) => match[1].split(',').map((selector) => selector.trim()).includes(target))
    .map((match) => match[2])
    .join('\n')
}

function cssHexValue(body, property) {
  const match = body.match(new RegExp(`${property}:\\s*(#[0-9a-fA-F]{6})\\b`))
  assert.ok(match, `${property} should use a six-digit hex value`)
  return match[1]
}

function relativeLuminance(hex) {
  const channels = hex.slice(1).match(/.{2}/g).map((channel) => Number.parseInt(channel, 16) / 255)
  const [red, green, blue] = channels.map((channel) => (
    channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4
  ))

  return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue)
}

function contrastRatio(first, second) {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second))
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second))
  return (lighter + 0.05) / (darker + 0.05)
}

test('floating history owns its filters and panel interaction state', async () => {
  const source = await readFile(new URL('./FloatingHistoryPanel.vue', import.meta.url), 'utf8')

  assert.match(source, /defineProps\(\{[\s\S]+echoes:[\s\S]+activeEchoId:/)
  assert.match(source, /isDarkTheme:/)
  assert.match(source, /import historyTerminalDarkIcon from '\.\.\/\.\.\/assets\/icons\/pangu-terminal-dark\.png'/)
  assert.match(source, /import historyTerminalIcon from '\.\.\/\.\.\/assets\/icons\/rovers-terminal-expand\.png'/)
  assert.match(source, /import \{ HISTORY_PANEL_MODE, initialHistoryPanelState, resolveHistoryPanelTransition \} from '\.\/floatingHistoryMode\.js'/)
  assert.match(source, /const historyFilter = ref\('all'\)/)
  assert.match(source, /const historyPanelMode = ref\(initialPanelState\.mode\)/)
  assert.match(source, /const lastExpandedMode = ref\(initialPanelState\.lastExpandedMode\)/)
  assert.match(source, /initialHistoryPanelState\([\s\S]+localStorage\.getItem\('wuwa-floating-history-minimized'\),[\s\S]+localStorage\.getItem\('wuwa-floating-history-expanded-mode'\),[\s\S]+\)/)
  assert.match(source, /emptyHistory: sortVisibleEchoHistory\(props\.echoes\)\.length === 0/)
  assert.match(source, /const isHistoryMinimized = computed\(\(\) => historyPanelMode\.value === HISTORY_PANEL_MODE\.MINIMIZED\)/)
  assert.match(source, /const isHistoryShowcase = computed\(\(\) => historyPanelMode\.value === HISTORY_PANEL_MODE\.SHOWCASE\)/)
  assert.match(source, /const floatingHistoryPosition = ref\(readFloatingHistoryPosition\(\{/)
  assert.match(source, /const isHistoryPinned = ref\(localStorage\.getItem\('wuwa-floating-history-pinned'\) === 'true'\)/)
  assert.doesNotMatch(source, /const isHistoryMinimized = ref\(/)
  assert.doesNotMatch(source, /const isHistoryShowcase = ref\(/)
  assert.match(source, /class="history-action-icon terminal-expand-icon"/)
  assert.match(source, /minimizedHistoryTerminalIcon/)
  assert.match(source, /terminalExpandIconStyle/)
})

test('floating history routes all three modes through one layout-safe transition', async () => {
  const source = await readFile(new URL('./FloatingHistoryPanel.vue', import.meta.url), 'utf8')

  assert.match(source, /async function transitionFloatingHistoryPanel\(intent\)/)
  assert.match(source, /resolveHistoryPanelTransition\(\{[\s\S]+mode: historyPanelMode\.value,[\s\S]+lastExpandedMode: lastExpandedMode\.value,[\s\S]+\}, intent\)/)
  assert.match(source, /function toggleFloatingHistorySize\(\) \{[\s\S]+transitionFloatingHistoryPanel\('toggle-minimized'\)[\s\S]+\}/)
  assert.match(source, /function toggleFloatingHistoryShowcase\(\) \{[\s\S]+transitionFloatingHistoryPanel\('toggle-showcase'\)[\s\S]+\}/)
  assert.match(source, /:class="\[historyPanelMode, \{ pinned: isHistoryPinned \}\]"/)
  assert.equal((source.match(/historyPanelMode\.value\s*=(?!=)/g) || []).length, 1)
  assert.doesNotMatch(source, /panel\.style\.filter|filter \$\{duration\}/)
  assert.match(source, /opacity \$\{duration\}ms ease-out, transform \$\{duration\}ms cubic-bezier\(0\.2, 0\.9, 0\.18, 1\)/)
  assert.match(source, /const HISTORY_PANEL_EXIT_DURATION = 120/)
  assert.match(source, /const HISTORY_PANEL_ENTER_DURATION = 140/)
  assert.match(source, /window\.setTimeout\(finish, duration \+ 24\)/)
  assert.match(source, /localStorage\.setItem\('wuwa-floating-history-expanded-mode', nextState\.lastExpandedMode\)/)
})

test('floating history filters stay mutually exclusive without a selected icon slot', async () => {
  const source = await readFile(new URL('./FloatingHistoryPanel.vue', import.meta.url), 'utf8')
  const style = await readFile(new URL('../../styles/features/history.css', import.meta.url), 'utf8')

  assert.match(source, /:aria-pressed="historyFilter === option\.key"/)
  assert.match(source, /@click="historyFilter = option\.key"/)
  assert.match(source, />\s*<span>\{\{ option\.label \}\}<\/span>\s*<strong>\{\{ option\.count \}\}<\/strong>\s*<\/button>/)
  assert.doesNotMatch(source, /historySelectedIcon|history-filter-selected-icon/)
  assert.doesNotMatch(style, /history-filter-selected-icon/)
  assert.match(bodyFor(style, '.history-filter-chip'), /padding:\s*5px 9px 5px 12px;/)
  assert.match(bodyFor(style, '.history-filter-chip.active'), /box-shadow:\s*none;/)
})

test('history filter active palettes meet text contrast in light and dark themes', async () => {
  const style = await readFile(new URL('../../styles/features/history.css', import.meta.url), 'utf8')
  const expectedPalettes = {
    '.history-filter-chip': {
      '--history-filter-active-bg': '#324455',
      '--history-filter-active-ink': '#f4f8fb',
      '--history-filter-active-count-bg': '#e8f0f5',
      '--history-filter-active-count-ink': '#263746',
    },
    '.history-filter-chip.current': {
      '--history-filter-active-bg': '#0064e0',
      '--history-filter-active-ink': '#f7faff',
      '--history-filter-active-count-bg': '#e8f2ff',
      '--history-filter-active-count-ink': '#0457cb',
    },
    '.history-filter-chip.pending': {
      '--history-filter-active-bg': '#f2bd48',
      '--history-filter-active-ink': '#4a3100',
      '--history-filter-active-count-bg': '#fff1c6',
      '--history-filter-active-count-ink': '#513500',
    },
    '.history-filter-chip.completed': {
      '--history-filter-active-bg': '#267640',
      '--history-filter-active-ink': '#f5fff7',
      '--history-filter-active-count-bg': '#def4e4',
      '--history-filter-active-count-ink': '#1f6035',
    },
    '.history-filter-chip.discarded': {
      '--history-filter-active-bg': '#b32642',
      '--history-filter-active-ink': '#fff7f8',
      '--history-filter-active-count-bg': '#ffe5e9',
      '--history-filter-active-count-ink': '#8f1930',
    },
    '.app-shell.theme-dark .history-filter-chip': {
      '--history-filter-active-bg': '#51697b',
      '--history-filter-active-ink': '#f4f8fb',
      '--history-filter-active-count-bg': '#e8f0f5',
      '--history-filter-active-count-ink': '#263746',
    },
    '.app-shell.theme-dark .history-filter-chip.current': {
      '--history-filter-active-bg': '#1767bb',
      '--history-filter-active-ink': '#f7faff',
      '--history-filter-active-count-bg': '#e8f2ff',
      '--history-filter-active-count-ink': '#0457cb',
    },
    '.app-shell.theme-dark .history-filter-chip.pending': {
      '--history-filter-active-bg': '#d3a337',
      '--history-filter-active-ink': '#362300',
      '--history-filter-active-count-bg': '#fff1c6',
      '--history-filter-active-count-ink': '#513500',
    },
    '.app-shell.theme-dark .history-filter-chip.completed': {
      '--history-filter-active-bg': '#2b7e4b',
      '--history-filter-active-ink': '#f5fff7',
      '--history-filter-active-count-bg': '#def4e4',
      '--history-filter-active-count-ink': '#1f6035',
    },
    '.app-shell.theme-dark .history-filter-chip.discarded': {
      '--history-filter-active-bg': '#b83d55',
      '--history-filter-active-ink': '#fff7f8',
      '--history-filter-active-count-bg': '#ffe5e9',
      '--history-filter-active-count-ink': '#8f1930',
    },
  }

  for (const [selector, expectedPalette] of Object.entries(expectedPalettes)) {
    const body = bodyFor(style, selector)
    const palette = {
      '--history-filter-active-bg': cssHexValue(body, '--history-filter-active-bg'),
      '--history-filter-active-ink': cssHexValue(body, '--history-filter-active-ink'),
      '--history-filter-active-count-bg': cssHexValue(body, '--history-filter-active-count-bg'),
      '--history-filter-active-count-ink': cssHexValue(body, '--history-filter-active-count-ink'),
    }

    assert.deepEqual(palette, expectedPalette, `${selector} should keep its approved active palette`)

    assert.ok(
      contrastRatio(
        palette['--history-filter-active-ink'],
        palette['--history-filter-active-bg'],
      ) >= 4.5,
      `${selector} active label contrast should meet WCAG AA`,
    )
    assert.ok(
      contrastRatio(
        palette['--history-filter-active-count-ink'],
        palette['--history-filter-active-count-bg'],
      ) >= 4.5,
      `${selector} active count contrast should meet WCAG AA`,
    )
  }

  const lightInactiveHover = bodyFor(style, '.history-filter-chip:not(.active):hover')
  assert.match(
    lightInactiveHover,
    /border-color:\s*color-mix\(in srgb, var\(--history-filter-active-bg\) 38%, transparent\);/,
  )
  assert.match(
    lightInactiveHover,
    /background:\s*color-mix\(in srgb, var\(--history-filter-active-bg\) 10%, var\(--canvas\)\);/,
  )

  const darkInactiveHover = bodyFor(style, '.app-shell.theme-dark .history-filter-chip:not(.active):hover')
  assert.match(
    darkInactiveHover,
    /border-color:\s*color-mix\(in srgb, var\(--history-filter-active-bg\) 54%, transparent\);/,
  )
  assert.match(
    darkInactiveHover,
    /background:\s*color-mix\(in srgb, var\(--history-filter-active-bg\) 18%, var\(--surface-soft\)\);/,
  )

  const darkActive = bodyFor(style, '.app-shell.theme-dark .history-filter-chip.active')
  assert.match(darkActive, /border-color:\s*var\(--history-filter-active-bg\);/)
  assert.match(darkActive, /color:\s*var\(--history-filter-active-ink\);/)
  assert.match(darkActive, /background:\s*var\(--history-filter-active-bg\);/)
  assert.match(darkActive, /box-shadow:\s*none;/)

  const darkActiveCount = bodyFor(style, '.app-shell.theme-dark .history-filter-chip.active strong')
  assert.match(darkActiveCount, /color:\s*var\(--history-filter-active-count-ink\);/)
  assert.match(darkActiveCount, /background:\s*var\(--history-filter-active-count-bg\);/)

  const darkActiveHover = bodyFor(style, '.app-shell.theme-dark .history-filter-chip.active:hover')
  assert.match(
    darkActiveHover,
    /border-color:\s*color-mix\(in srgb, var\(--history-filter-active-bg\) 92%, #0a1317\);/,
  )
  assert.match(
    darkActiveHover,
    /background:\s*color-mix\(in srgb, var\(--history-filter-active-bg\) 92%, #0a1317\);/,
  )
})

test('floating history uses the safe default only when no saved position exists', async () => {
  const source = await readFile(new URL('./FloatingHistoryPanel.vue', import.meta.url), 'utf8')

  assert.match(source, /import \{ readFloatingHistoryPosition \} from '\.\/floatingHistoryPosition\.js'/)
  assert.match(source, /storedPosition: localStorage\.getItem\('wuwa-floating-history-position'\)/)
  assert.match(source, /minimized: isHistoryMinimized\.value/)
})

test('floating history emits selection and cleans up document listeners', async () => {
  const source = await readFile(new URL('./FloatingHistoryPanel.vue', import.meta.url), 'utf8')

  assert.match(source, /const emit = defineEmits\(\['select'\]\)/)
  assert.match(source, /@click="emit\('select', echo\.id\)"/)
  assert.match(source, /onBeforeUnmount\(\(\) => \{[\s\S]+endFloatingHistoryDrag\(\)[\s\S]+window\.removeEventListener\('resize', constrainSavedFloatingHistoryPosition\)/)
  assert.match(source, /document\.removeEventListener\('pointermove', moveFloatingHistory\)/)
  assert.match(source, /document\.removeEventListener\('pointerup', endFloatingHistoryDrag\)/)
  assert.match(source, /document\.removeEventListener\('pointercancel', endFloatingHistoryDrag\)/)
})

test('floating history presents echo names instead of internal ids', async () => {
  const source = await readFile(new URL('./FloatingHistoryPanel.vue', import.meta.url), 'utf8')

  assert.match(source, /import \{ displayEchoName \} from '\.\.\/\.\.\/services\/echoDisplay'/)
  assert.match(source, /\{\{ displayEchoName\(echo\) \}\}/)
  assert.doesNotMatch(source, /displayEchoNumericId/)
})

test('floating history presents echo config as the pre-pill inline metadata row', async () => {
  const source = await readFile(new URL('./FloatingHistoryPanel.vue', import.meta.url), 'utf8')
  const style = await readFile(new URL('../../styles/features/history.css', import.meta.url), 'utf8')

  assert.match(source, /\{\{ echo\.cost \}\}C · \{\{ echo\.set_name \}\} · \{\{ mainStatLabels\[echo\.main_stat\] \|\| echo\.main_stat \}\} · \{\{ echo\.substats\.length \}\}\/5/)
  assert.doesNotMatch(source, /class="echo-name"/)
  assert.doesNotMatch(source, /class="echo-meta-line"/)
  assert.doesNotMatch(source, /class="echo-progress"/)
  assert.doesNotMatch(source, /class="echo-meta-pills"/)
  assert.doesNotMatch(source, /class="echo-meta-pill/)
  assert.match(style, /\.echo-item-head > span \{[\s\S]+font-size: var\(--text-caption\);/)
  assert.doesNotMatch(style, /\.echo-meta-line/)
  assert.doesNotMatch(style, /\.echo-progress/)
})

test('floating history keeps the title and filters compact', async () => {
  const style = await readFile(new URL('../../styles/features/history.css', import.meta.url), 'utf8')

  assert.match(style, /\.floating-history-handle \{[\s\S]+margin: -4px -4px 0;/)
  assert.match(style, /\.floating-history-handle \{[\s\S]+padding: 4px 154px 0 4px;/)
  assert.match(style, /\.floating-history-handle\.section-heading \{[\s\S]+margin-bottom: 0;/)
  assert.match(style, /\.history-filter-bar \{[\s\S]+margin: 0 0 2px;/)
  assert.match(style, /\.compact-heading \{[\s\S]+margin-bottom: 0;/)
  assert.match(style, /\.history-records \{[\s\S]+gap: 8px;/)
  assert.match(style, /\.history-records h2 \{[\s\S]+margin-bottom: 0;/)
})
