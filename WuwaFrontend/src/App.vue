<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  addSubstat,
  createEcho,
  getMe,
  getModelEvaluation,
  getPrediction,
  getStats,
  listEchoes,
  login,
  logout,
  register,
  undoLastSubstat,
  updateEcho,
} from './services/api'
import { displayEchoNumericId, generateNumericEchoUid, nextEchoSequence } from './services/echoId'
import { buildNextEchoConfig, isReusableDraft, sortVisibleEchoHistory, statusBadge } from './services/echoWorkflow'
import { confidenceText, formatPercent, formatSignedPercent, modelWeightLabel, sampleStageText, statusText } from './services/formatters'
import { mainStatLabels, mainStatsByCost, substatLabels, substatOrder, tierTables } from './data/substats'
import { sonataEffects } from './data/sonataEffects'

const user = ref(null)
const page = ref('workspace')
const authUid = ref(localStorage.getItem('wuwa-player-uid') || '')
const saveLogin = ref(localStorage.getItem('wuwa-save-login') === 'true')
const error = ref('')
const loading = ref(true)
const saving = ref(false)

const echoes = ref([])
const activeEchoId = ref(null)
const prediction = ref(null)
const stats = ref(null)
const evaluation = ref(null)
const playerUid = ref(localStorage.getItem('wuwa-player-uid') || '')
const createPanelRef = ref(null)
const galleryPanelRef = ref(null)
const setupPanelHeight = ref(null)
const floatingHistoryRef = ref(null)
const floatingHistoryPosition = ref(readFloatingHistoryPosition())
const isHistoryMinimized = ref(localStorage.getItem('wuwa-floating-history-minimized') === 'true')
const isHistoryPinned = ref(localStorage.getItem('wuwa-floating-history-pinned') === 'true')
const historyDrag = ref(null)

const echoForm = ref({
  sonata: sonataEffects.at(-1).name,
  cost: 1,
  main_stat: 'atk_percent',
  is_continuous_tuning: false,
})

const activeEcho = computed(() => echoes.value.find((echo) => echo.id === activeEchoId.value) || null)
const sortedEchoes = computed(() => sortVisibleEchoHistory(echoes.value))
const activeSubstatTypes = computed(() => new Set((activeEcho.value?.substats || []).map((roll) => roll.substat_type)))
const candidateByType = computed(() => {
  const pairs = (prediction.value?.candidates || []).map((candidate) => [candidate.substat_type, candidate])
  return new Map(pairs)
})
const matrixRows = computed(() =>
  substatOrder.map((substatType) => ({
    substat_type: substatType,
    label: substatLabels[substatType],
    candidate: candidateByType.value.get(substatType) || null,
    tier_table: tierTables[substatType],
    recorded: activeEcho.value?.substats.find((roll) => roll.substat_type === substatType) || null,
    topPredicted: topCandidate.value?.substat_type === substatType,
  })),
)
const legalMainStats = computed(() => mainStatsByCost[echoForm.value.cost] || [])
const progressPercent = computed(() => Math.min(((activeEcho.value?.substats.length || 0) / 5) * 100, 100))
const topCandidate = computed(() => prediction.value?.candidates?.[0] || null)
const selectedSonata = computed(() => sonataEffects.find((effect) => effect.name === echoForm.value.sonata) || sonataEffects.at(-1))
const weightRows = computed(() =>
  Object.entries(prediction.value?.weights || {}).map(([key, weight]) => ({
    key,
    label: prediction.value?.model_labels?.[key] || modelWeightLabel(key),
    weight,
    baseWeight: prediction.value?.base_weights?.[key],
    adjustment: prediction.value?.weight_adjustments?.[key] || null,
  })),
)
const evaluationMetrics = computed(() => [
  {
    label: 'Log Loss',
    value: evaluation.value?.log_loss,
    preview: 2.16,
    target: '越低越好',
    description: '概率分布是否把真实词条放在高概率区间',
  },
  {
    label: 'Brier Score',
    value: evaluation.value?.brier_score,
    preview: 0.86,
    target: '越低越好',
    description: '预测概率和真实结果的平方误差',
  },
  {
    label: 'Top 1 命中率',
    value: evaluation.value?.top_1_hit_rate,
    preview: 0.11,
    target: '越高越好',
    description: '概率第一名是否命中真实词条',
  },
  {
    label: 'Top 3 命中率',
    value: evaluation.value?.top_3_hit_rate,
    preview: 0.34,
    target: '越高越好',
    description: '前三名候选是否覆盖真实词条',
  },
  {
    label: 'Top 5 命中率',
    value: evaluation.value?.top_5_hit_rate,
    preview: 0.52,
    target: '越高越好',
    description: '前五名候选是否覆盖真实词条',
  },
])
const modelEvaluationRows = computed(() => {
  const rows = [
    { key: 'rule', label: '规则基线', hitRate: 0.31, loss: 2.07, note: '合法词条池与全局均衡' },
    { key: 'bayes', label: '周期模型', hitRate: 0.36, loss: 1.94, note: '历史词条片段重复度' },
    { key: 'markov', label: '马尔科夫', hitRate: 0.28, loss: 2.22, note: '上一词条到下一词条' },
    { key: 'context', label: '上下文模型', hitRate: 0.19, loss: 2.45, note: '套装、COST、主词条等变量' },
  ]
  return rows.map((row) => ({
    ...row,
    weight: prediction.value?.weights?.[row.key] ?? { rule: 0.7, bayes: 0.25, markov: 0.05, context: 0 }[row.key],
    isPreview: evaluation.value?.log_loss == null,
  }))
})
const sampleStageRows = computed(() => [
  { label: '0-500', text: '规则基线', active: (stats.value?.total_rolls || 0) < 500 },
  { label: '500-3000', text: '总体偏差', active: (stats.value?.total_rolls || 0) >= 500 && (stats.value?.total_rolls || 0) < 3000 },
  { label: '3000-10000', text: '上下文检验', active: (stats.value?.total_rolls || 0) >= 3000 && (stats.value?.total_rolls || 0) < 10000 },
  { label: '10000-50000', text: '顺序依赖', active: (stats.value?.total_rolls || 0) >= 10000 && (stats.value?.total_rolls || 0) < 50000 },
  { label: '50000+', text: '权重优化', active: (stats.value?.total_rolls || 0) >= 50000 },
])
const setupPanelStyle = computed(() => (setupPanelHeight.value ? { height: `${setupPanelHeight.value}px` } : {}))
const floatingHistoryStyle = computed(() => {
  if (typeof window !== 'undefined' && window.matchMedia('(max-width: 860px)').matches) {
    return {}
  }
  return {
    transform: `translate3d(${floatingHistoryPosition.value.x}px, ${floatingHistoryPosition.value.y}px, 0)`,
  }
})

function readFloatingHistoryPosition() {
  try {
    const stored = JSON.parse(localStorage.getItem('wuwa-floating-history-position') || 'null')
    if (Number.isFinite(stored?.x) && Number.isFinite(stored?.y)) {
      return stored
    }
  } catch {
    // Ignore invalid saved panel coordinates.
  }
  return { x: 32, y: 150 }
}

function waitForFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve())
  })
}

async function syncSetupPanelHeight() {
  await nextTick()
  await waitForFrame()
  if (!createPanelRef.value || !galleryPanelRef.value || window.matchMedia('(max-width: 860px)').matches) {
    setupPanelHeight.value = null
    return
  }
  setupPanelHeight.value = Math.ceil(galleryPanelRef.value.getBoundingClientRect().height)
}

function setCost(cost) {
  echoForm.value.cost = cost
  if (!legalMainStats.value.includes(echoForm.value.main_stat)) {
    echoForm.value.main_stat = legalMainStats.value[0]
  }
}

function resetEchoForm() {
  echoForm.value.is_continuous_tuning = false
}

function setPlayerUid(value) {
  playerUid.value = value.trim()
  localStorage.setItem('wuwa-player-uid', playerUid.value)
}

function generateEchoUid() {
  return generateNumericEchoUid({
    playerUid: playerUid.value,
    sonataId: selectedSonata.value.id,
    cost: echoForm.value.cost,
    mainStat: echoForm.value.main_stat,
    sequence: nextEchoSequence(playerUid.value),
  })
}

function evaluationMetricText(metric) {
  const value = metric.value ?? metric.preview
  if (metric.label.includes('命中率')) {
    return formatPercent(value)
  }
  return value.toFixed(2)
}

function evaluationMetricFill(metric) {
  const value = metric.value ?? metric.preview
  if (metric.label.includes('命中率')) {
    return `${Math.min(value * 100, 100)}%`
  }
  return `${Math.max(8, Math.min((1 - value / 3) * 100, 100))}%`
}

function constrainFloatingHistoryPosition(position) {
  if (typeof window === 'undefined') {
    return position
  }
  const panel = floatingHistoryRef.value
  const width = panel?.offsetWidth || 360
  const height = panel?.offsetHeight || 520
  const padding = 12
  return {
    x: Math.min(Math.max(position.x, padding), Math.max(padding, window.innerWidth - width - padding)),
    y: Math.min(Math.max(position.y, padding), Math.max(padding, window.innerHeight - height - padding)),
  }
}

function saveFloatingHistoryPosition(position = floatingHistoryPosition.value) {
  localStorage.setItem('wuwa-floating-history-position', JSON.stringify(position))
}

function toggleFloatingHistorySize() {
  isHistoryMinimized.value = !isHistoryMinimized.value
  localStorage.setItem('wuwa-floating-history-minimized', String(isHistoryMinimized.value))
  nextTick(constrainSavedFloatingHistoryPosition)
}

function toggleFloatingHistoryPin() {
  isHistoryPinned.value = !isHistoryPinned.value
  localStorage.setItem('wuwa-floating-history-pinned', String(isHistoryPinned.value))
  if (isHistoryPinned.value) {
    endFloatingHistoryDrag()
  }
}

function moveFloatingHistory(event) {
  if (!historyDrag.value) {
    return
  }
  const nextPosition = constrainFloatingHistoryPosition({
    x: event.clientX - historyDrag.value.offsetX,
    y: event.clientY - historyDrag.value.offsetY,
  })
  floatingHistoryPosition.value = nextPosition
}

function endFloatingHistoryDrag() {
  if (!historyDrag.value) {
    return
  }
  historyDrag.value = null
  saveFloatingHistoryPosition()
  document.removeEventListener('pointermove', moveFloatingHistory)
  document.removeEventListener('pointerup', endFloatingHistoryDrag)
  document.removeEventListener('pointercancel', endFloatingHistoryDrag)
}

function startFloatingHistoryDrag(event) {
  if (event.button !== 0 || isHistoryPinned.value || window.matchMedia('(max-width: 860px)').matches) {
    return
  }
  const panel = floatingHistoryRef.value
  if (!panel) {
    return
  }
  const rect = panel.getBoundingClientRect()
  historyDrag.value = {
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
  }
  event.currentTarget.setPointerCapture?.(event.pointerId)
  document.addEventListener('pointermove', moveFloatingHistory)
  document.addEventListener('pointerup', endFloatingHistoryDrag)
  document.addEventListener('pointercancel', endFloatingHistoryDrag)
}

function constrainSavedFloatingHistoryPosition() {
  if (window.matchMedia('(max-width: 860px)').matches) {
    return
  }
  const nextPosition = constrainFloatingHistoryPosition(floatingHistoryPosition.value)
  floatingHistoryPosition.value = nextPosition
  saveFloatingHistoryPosition(nextPosition)
}

async function bootstrap() {
  try {
    user.value = await getMe()
    await refreshAll()
  } catch {
    user.value = null
    if (saveLogin.value && authUid.value) {
      await submitUidLogin()
    }
  } finally {
    loading.value = false
  }
}

function uidCredentials(uid) {
  const normalizedUid = uid.trim()
  return {
    username: `wuwa_${normalizedUid}`,
    password: `wuwa_uid_${normalizedUid}`,
  }
}

async function submitUidLogin() {
  error.value = ''
  const uid = authUid.value.trim()
  if (!uid) {
    error.value = '请填写游戏 UID。'
    return
  }
  try {
    const credentials = uidCredentials(uid)
    try {
      await login(credentials)
    } catch {
      await register(credentials)
      await login(credentials)
    }
    setPlayerUid(uid)
    localStorage.setItem('wuwa-save-login', saveLogin.value ? 'true' : 'false')
    user.value = await getMe()
    await refreshAll()
  } catch (err) {
    error.value = err.message
  }
}

async function signOut() {
  await logout()
  user.value = null
  echoes.value = []
  activeEchoId.value = null
  prediction.value = null
  stats.value = null
  evaluation.value = null
  if (!saveLogin.value) {
    authUid.value = ''
    setPlayerUid('')
  }
}

async function refreshAll() {
  const echoData = await listEchoes()
  echoes.value = echoData.results || []
  if (!echoes.value.length && playerUid.value) {
    const draftEcho = await createEchoWithConfig()
    if (draftEcho) {
      echoes.value = [draftEcho]
    }
  }
  if (!activeEchoId.value && echoes.value.length) {
    activeEchoId.value = echoes.value.find((echo) => echo.status !== 'archived' && echo.substats.length < 5)?.id || echoes.value[0].id
  }
  if (activeEchoId.value && !echoes.value.some((echo) => echo.id === activeEchoId.value)) {
    activeEchoId.value = echoes.value[0]?.id || null
  }
  const currentEcho = echoes.value.find((echo) => echo.id === activeEchoId.value)
  if (currentEcho) {
    echoForm.value.sonata = currentEcho.set_name
    echoForm.value.cost = currentEcho.cost
    echoForm.value.main_stat = currentEcho.main_stat
    echoForm.value.is_continuous_tuning = currentEcho.is_continuous_tuning
  }
  await refreshActive()
  stats.value = await getStats()
  evaluation.value = await getModelEvaluation()
}

async function refreshActive() {
  if (!activeEchoId.value) {
    prediction.value = null
    return
  }
  prediction.value = await getPrediction(activeEchoId.value)
}

async function createEchoWithConfig(config = echoForm.value) {
  if (!playerUid.value) {
    error.value = '请先填写你的游戏 UID。'
    return null
  }
  const previousForm = { ...echoForm.value }
  echoForm.value.sonata = config.sonata
  echoForm.value.cost = config.cost
  echoForm.value.main_stat = config.main_stat
  echoForm.value.is_continuous_tuning = config.is_continuous_tuning ?? true
  try {
    const echo = await createEcho({
      echo_uid: generateEchoUid(),
      display_name: '',
      cost: echoForm.value.cost,
      set_name: echoForm.value.sonata,
      main_stat: echoForm.value.main_stat,
      source: '',
      tuning_batch_id: '',
      is_continuous_tuning: echoForm.value.is_continuous_tuning,
    })
    echoes.value = [echo, ...echoes.value]
    activeEchoId.value = echo.id
    return echo
  } catch (err) {
    echoForm.value = previousForm
    error.value = err.message
    return null
  }
}

async function ensureActiveEcho() {
  if (activeEcho.value && activeEcho.value.status !== 'archived' && activeEcho.value.substats.length < 5) {
    return activeEcho.value
  }
  const echo = await createEchoWithConfig()
  if (echo) {
    await refreshAll()
  }
  return echo
}

async function createNextEchoFromActive() {
  if (!activeEcho.value) {
    return
  }
  const echo = await createEchoWithConfig(buildNextEchoConfig(activeEcho.value))
  if (echo) {
    await refreshAll()
  }
}

async function applyEchoConfig(partialConfig) {
  error.value = ''
  const nextConfig = {
    sonata: echoForm.value.sonata,
    cost: echoForm.value.cost,
    main_stat: echoForm.value.main_stat,
    is_continuous_tuning: echoForm.value.is_continuous_tuning,
    ...partialConfig,
  }
  if (!mainStatsByCost[nextConfig.cost]?.includes(nextConfig.main_stat)) {
    nextConfig.main_stat = mainStatsByCost[nextConfig.cost][0]
  }
  echoForm.value = nextConfig

  if (!activeEcho.value) {
    await createEchoWithConfig(nextConfig)
    await refreshAll()
    return
  }

  if (isReusableDraft(activeEcho.value)) {
    try {
      const updated = await updateEcho(activeEcho.value.id, {
        echo_uid: generateEchoUid(),
        cost: nextConfig.cost,
        set_name: nextConfig.sonata,
        main_stat: nextConfig.main_stat,
        is_continuous_tuning: nextConfig.is_continuous_tuning,
      })
      echoes.value = echoes.value.map((echo) => (echo.id === updated.id ? updated : echo))
      await refreshActive()
    } catch (err) {
      error.value = err.message
    }
    return
  }

  await createEchoWithConfig(nextConfig)
  await refreshAll()
}

async function discardActiveEcho() {
  if (!activeEcho.value || saving.value) {
    return
  }
  saving.value = true
  error.value = ''
  const discardedEchoId = activeEcho.value.id
  const nextConfig = buildNextEchoConfig(activeEcho.value)
  try {
    await updateEcho(discardedEchoId, { status: 'archived' })
    await refreshAll()
    await createEchoWithConfig(nextConfig)
    await refreshAll()
    await refreshActive()
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}

async function selectEcho(echoId) {
  activeEchoId.value = echoId
  if (activeEcho.value) {
    echoForm.value.sonata = activeEcho.value.set_name
    echoForm.value.cost = activeEcho.value.cost
    echoForm.value.main_stat = activeEcho.value.main_stat
    echoForm.value.is_continuous_tuning = activeEcho.value.is_continuous_tuning
  }
  await refreshActive()
}

async function clickTier(row, tier) {
  if (row.recorded || saving.value) {
    return
  }
  saving.value = true
  error.value = ''
  try {
    const echo = await ensureActiveEcho()
    if (!echo) {
      return
    }
    await addSubstat(echo.id, {
      substat_type: row.substat_type,
      tier_value: tier.value,
    })
    await refreshAll()
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}

async function undoActiveSubstat() {
  if (!activeEcho.value || !activeEcho.value.substats.length || saving.value) {
    return
  }
  saving.value = true
  error.value = ''
  try {
    await undoLastSubstat(activeEcho.value.id)
    await refreshAll()
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await bootstrap()
  await syncSetupPanelHeight()
  await nextTick()
  constrainSavedFloatingHistoryPosition()
  window.addEventListener('resize', syncSetupPanelHeight)
  window.addEventListener('resize', constrainSavedFloatingHistoryPosition)
})

onBeforeUnmount(() => {
  endFloatingHistoryDrag()
  window.removeEventListener('resize', syncSetupPanelHeight)
  window.removeEventListener('resize', constrainSavedFloatingHistoryPosition)
})

watch(
  page,
  async (nextPage) => {
    if (nextPage === 'workspace') {
      await syncSetupPanelHeight()
      await nextTick()
      constrainSavedFloatingHistoryPosition()
    }
  },
  { flush: 'post' },
)

watch(
  () => `${activeEchoId.value}:${activeEcho.value?.substats.length || 0}:${echoForm.value.cost}:${echoForm.value.main_stat}:${echoForm.value.sonata}`,
  syncSetupPanelHeight,
  { flush: 'post' },
)
</script>

<template>
  <main class="app-shell">
    <section v-if="loading" class="auth-shell">
      <div class="auth-copy">
        <span class="brand-mark">Wuwa Echo Lab</span>
        <h1>正在连接声骸研究台</h1>
      </div>
    </section>

    <section v-else-if="!user" class="auth-shell auth-shell-home">
      <div class="auth-hero">
        <div class="auth-copy">
          <span class="brand-mark">Wuwa Echo Lab</span>
          <h1>鸣潮声骸实验室</h1>
        </div>
        <div class="showcase-card login-info-card" aria-label="工具说明">
          <div>
            <span class="eyebrow">Echo tracker</span>
            <h2>声骸记录</h2>
            <p>记录套装、COST、主词条、副词条类型与数值档位，持续沉淀样本。</p>
          </div>
          <div class="login-info-grid">
            <div><strong>点击录入</strong><span>套装和档位都用按钮选择，减少手输。</span></div>
            <div><strong>概率排名</strong><span>输出候选副词条概率、基线偏离和依据。</span></div>
            <div><strong>谨慎判断</strong><span>套装、顺序、时间等变量只在样本足够时参与判断。</span></div>
          </div>
        </div>
      </div>

      <form class="auth-form product-panel" @submit.prevent="submitUidLogin">
        <label>
          游戏 UID
          <input v-model="authUid" inputmode="numeric" autocomplete="username" />
        </label>
        <label class="checkbox-row save-login-row">
          <input v-model="saveLogin" type="checkbox" />
          保存登录，下次自动进入
        </label>
        <p v-if="error" class="error-text">{{ error }}</p>
        <button class="button-buy" type="submit">进入研究台</button>
      </form>
    </section>

    <section v-else class="dashboard">
      <header class="topbar">
        <a class="wordmark" href="#" @click.prevent="page = 'workspace'">Wuwa Echo Lab</a>
        <nav class="pill-tabs" aria-label="页面">
          <button :class="{ active: page === 'workspace' }" @click="page = 'workspace'">工作台</button>
          <button :class="{ active: page === 'stats' }" @click="page = 'stats'">统计</button>
          <button :class="{ active: page === 'evaluation' }" @click="page = 'evaluation'">评估</button>
        </nav>
        <div class="account-actions">
          <span class="uid-chip">UID {{ playerUid }}</span>
          <button class="button-ghost" @click="signOut">退出</button>
        </div>
      </header>

      <section class="hero-band">
        <div>
          <span class="brand-mark">Echo research</span>
          <h1>鸣潮声骸实验室</h1>
          <p>记录调谐样本，实时校准副词条概率与模型证据。</p>
        </div>
        <div class="hero-stats">
          <div><strong>{{ sortedEchoes.length }}</strong><span>历史声骸</span></div>
          <div><strong>{{ stats?.total_rolls || 0 }}</strong><span>总样本</span></div>
          <div><strong>{{ prediction ? confidenceText(prediction.confidence) : '低' }}</strong><span>置信度</span></div>
        </div>
      </section>

      <p v-if="error" class="error-text">{{ error }}</p>

      <div v-if="page === 'workspace'" class="workspace-grid">
        <div class="workspace-sidebar">
        <aside ref="createPanelRef" class="product-panel create-panel" :style="setupPanelStyle">
          <div class="section-heading">
            <span class="eyebrow">Echo setup</span>
            <h2>初始化声骸</h2>
            <p>选择套装、COST 和主词条，开始录入当前声骸。</p>
          </div>

          <form class="echo-form" @submit.prevent>
            <fieldset>
              <legend>套装</legend>
              <div class="sonata-grid">
                <button
                  v-for="effect in sonataEffects"
                  :key="effect.id"
                  type="button"
                  :class="{ active: echoForm.sonata === effect.name }"
                  @click="applyEchoConfig({ sonata: effect.name })"
                >
                  <img :src="effect.icon" :alt="effect.name" />
                  <span>{{ effect.name }}</span>
                </button>
              </div>
            </fieldset>

            <fieldset>
              <legend>COST</legend>
              <div class="option-row cost-row">
                <button v-for="cost in [1, 3, 4]" :key="cost" type="button" :class="{ active: echoForm.cost === cost }" @click="applyEchoConfig({ cost })">
                  {{ cost }}C
                </button>
              </div>
            </fieldset>

            <fieldset>
              <legend>主词条</legend>
              <div class="option-row">
                <button
                  v-for="mainStat in legalMainStats"
                  :key="mainStat"
                  type="button"
                  :class="{ active: echoForm.main_stat === mainStat }"
                  @click="applyEchoConfig({ main_stat: mainStat })"
                >
                  {{ mainStatLabels[mainStat] }}
                </button>
              </div>
            </fieldset>

            <label class="checkbox-row">
              <input v-model="echoForm.is_continuous_tuning" type="checkbox" @change="applyEchoConfig({ is_continuous_tuning: echoForm.is_continuous_tuning })" />
              同一批连续调谐
            </label>
          </form>

          </aside>

        </div>

        <section ref="galleryPanelRef" class="gallery-panel">
          <div class="active-summary">
            <div class="active-identity">
              <span class="eyebrow">Active echo</span>
              <h3 class="active-section-title">当前声骸</h3>
              <p class="active-echo-id">{{ activeEcho ? displayEchoNumericId(activeEcho) : '选择或新增声骸' }}</p>
              <div v-if="activeEcho" class="active-config-chips" aria-label="当前声骸配置">
                <span>{{ activeEcho.cost }}C</span>
                <span>{{ activeEcho.set_name }}</span>
                <span>{{ mainStatLabels[activeEcho.main_stat] || activeEcho.main_stat }}</span>
              </div>
            </div>
            <div v-if="activeEcho" class="roll-strip" :class="{ empty: !activeEcho.substats.length }">
              <span v-for="roll in activeEcho.substats" :key="roll.id">
                <strong>{{ roll.position }}.</strong>
                {{ substatLabels[roll.substat_type] }} {{ roll.tier_value }}%
              </span>
              <button
                class="undo-roll-button"
                type="button"
                :disabled="saving || !activeEcho.substats.length"
                title="撤回上一次录入的副词条"
                @click="undoActiveSubstat"
              >
                撤回
              </button>
            </div>
            <div class="active-control-panel">
              <div class="progress-card">
                <strong>{{ activeEcho?.substats.length || 0 }}/5</strong>
                <span>已录入</span>
                <div class="progress-track"><i :style="{ width: `${progressPercent}%` }"></i></div>
              </div>
              <div v-if="activeEcho" class="active-actions" aria-label="当前声骸操作">
                <button class="button-danger" type="button" :disabled="saving" @click="discardActiveEcho">
                  弃置
                </button>
                <button class="button-next" type="button" :disabled="saving" @click="createNextEchoFromActive">
                  下一个
                </button>
              </div>
            </div>
          </div>

          <div v-if="activeEcho" class="substat-matrix">
            <article
              v-for="row in matrixRows"
              :key="row.substat_type"
              class="substat-row"
              :class="{ recorded: row.recorded, 'top-predicted-row': row.topPredicted && !row.recorded }"
            >
              <div class="substat-meta">
                <strong>{{ row.label }}</strong>
                <span v-if="row.recorded">已录入：{{ row.recorded.tier_value }}</span>
                <span v-else-if="row.candidate">预测 {{ formatPercent(row.candidate.p_final) }}</span>
                <small v-if="row.candidate">较基线 {{ formatSignedPercent(row.candidate.baseline_deviation) }}</small>
              </div>
              <div class="tier-grid">
                <button
                  v-for="tier in row.tier_table"
                  :key="`${row.substat_type}-${tier.value}`"
                  type="button"
                  :disabled="Boolean(row.recorded) || saving"
                  @click="clickTier(row, tier)"
                >
                  <strong>{{ tier.value }}</strong>
                  <span>{{ formatPercent(tier.probability) }}</span>
                </button>
              </div>
            </article>
          </div>

          <p v-else class="empty-text">先选择套装、COST 和主词条，再开始逐条点击录入。</p>
        </section>

        <section
          ref="floatingHistoryRef"
          class="product-panel records-panel history-records floating-history-panel"
          :class="{ minimized: isHistoryMinimized, pinned: isHistoryPinned }"
          :style="floatingHistoryStyle"
        >
          <div class="floating-history-handle section-heading compact-heading" @pointerdown="startFloatingHistoryDrag">
            <div>
              <span class="eyebrow">Records</span>
              <h2>历史声骸</h2>
            </div>
            <div class="floating-history-meta">
              <p>{{ sortedEchoes.length }} 个记录</p>
              <div class="floating-history-actions" @pointerdown.stop>
                <button type="button" :aria-label="isHistoryMinimized ? '展开历史声骸' : '缩小历史声骸'" :title="isHistoryMinimized ? '展开' : '缩小'" @click.stop="toggleFloatingHistorySize">
                  <span aria-hidden="true" :class="isHistoryMinimized ? 'window-icon' : 'minus-icon'"></span>
                </button>
                <button type="button" :class="{ active: isHistoryPinned }" :aria-label="isHistoryPinned ? '取消固定历史声骸' : '固定历史声骸'" :title="isHistoryPinned ? '取消固定' : '固定'" @click.stop="toggleFloatingHistoryPin">
                  <span aria-hidden="true" class="pin-icon"></span>
                </button>
              </div>
            </div>
          </div>
          <div v-if="!isHistoryMinimized" class="echo-list">
            <button
              v-for="echo in sortedEchoes"
              :key="echo.id"
              class="echo-item"
              :class="{
                active: echo.id === activeEchoId,
                pending: echo.status !== 'archived' && echo.substats.length > 0 && echo.substats.length < 5,
                completed: echo.status !== 'archived' && echo.substats.length >= 5,
                discarded: echo.status === 'archived',
              }"
              :style="{ '--substat-count': echo.substats.length }"
              @click="selectEcho(echo.id)"
            >
              <div class="echo-item-head">
                <strong>
                  {{ displayEchoNumericId(echo) }}
                  <em
                    v-if="statusBadge(echo, activeEchoId)"
                    :class="{
                      'status-discarded': statusBadge(echo, activeEchoId) === '弃置',
                      'status-pending': statusBadge(echo, activeEchoId) === '待强化',
                      'status-completed': statusBadge(echo, activeEchoId) === '已强化',
                    }"
                  >
                    {{ statusBadge(echo, activeEchoId) }}
                  </em>
                </strong>
                <span>{{ echo.cost }}C · {{ echo.set_name }} · {{ mainStatLabels[echo.main_stat] || echo.main_stat }} · {{ echo.substats.length }}/5</span>
              </div>
              <div v-if="echo.substats.length" class="echo-roll-list">
                <span v-for="roll in echo.substats" :key="roll.id">
                  <strong>{{ roll.position }}. {{ substatLabels[roll.substat_type] }}</strong>
                  <small>{{ roll.tier_value }}%</small>
                </span>
              </div>
              <small v-else class="echo-roll-empty">尚未录入副词条</small>
            </button>
          </div>
        </section>

        <section class="product-panel prediction-strip">
          <div class="prediction-strip-head">
            <div>
              <span class="eyebrow">Prediction</span>
              <h2>预测依据</h2>
              <p v-if="prediction?.weight_stage">权重阶段 {{ prediction.weight_stage }} 条样本</p>
            </div>
            <p v-if="topCandidate" class="top-pick">{{ topCandidate.label }} · {{ formatPercent(topCandidate.p_final) }}</p>
            <p v-else>等待选择声骸后生成候选排名。</p>
          </div>

          <dl v-if="prediction" class="weight-list">
            <div v-for="row in weightRows" :key="row.key">
              <dt>{{ row.label }}</dt>
              <dd>
                <strong>{{ formatPercent(row.weight) }}</strong>
                <small v-if="row.adjustment?.hit_rate !== null">
                  基础 {{ formatPercent(row.baseWeight) }} · 命中 {{ formatPercent(row.adjustment.hit_rate) }}
                  {{ row.adjustment.direction === 'up' ? '上调' : row.adjustment.direction === 'down' ? '下调' : '持平' }}
                </small>
                <small v-else>基础 {{ formatPercent(row.baseWeight) }} · 样本不足</small>
              </dd>
            </div>
          </dl>

          <div v-if="prediction" class="ranking">
            <div v-for="candidate in prediction.candidates.slice(0, 8)" :key="candidate.substat_type">
              <strong>{{ candidate.label }}</strong>
              <span>{{ formatPercent(candidate.p_final) }}</span>
              <small>基线 {{ formatPercent(candidate.p_rule) }}</small>
            </div>
          </div>
        </section>
      </div>

      <section v-if="page === 'stats'" class="product-panel full-panel">
        <span class="eyebrow">Analytics</span>
        <h2>统计看板</h2>
        <p v-if="stats">总样本量：{{ stats.total_rolls }} · {{ sampleStageText(stats.sample_stage) }}</p>
        <div v-if="stats" class="stat-grid">
          <article v-for="row in stats.substat_frequency" :key="row.substat_type">
            <strong>{{ row.label }}</strong>
            <span>{{ row.count }} 次</span>
            <small>观察 {{ formatPercent(row.observed_rate) }} / 基线 {{ formatPercent(row.baseline_rate) }}</small>
          </article>
        </div>
        <h3>上下文监控</h3>
        <div v-if="stats" class="context-grid">
          <article v-for="(factor, key) in stats.context_factors" :key="key">
            <strong>{{ key }}</strong>
            <span>{{ statusText(factor.status) }}</span>
            <small>样本 {{ factor.sample_size }}</small>
          </article>
        </div>
      </section>

      <section v-if="page === 'evaluation'" class="product-panel full-panel">
        <div class="evaluation-head">
          <div>
            <span class="eyebrow">Evaluation</span>
            <h2>模型评估</h2>
            <p>{{ evaluation?.message || '样本量不足，以下图表为评估页结构预览。' }}</p>
          </div>
          <span class="preview-pill">当前样本 {{ stats?.total_rolls || 0 }}</span>
        </div>

        <div class="evaluation-metrics">
          <article v-for="metric in evaluationMetrics" :key="metric.label">
            <div>
              <span>{{ metric.label }}</span>
              <strong>{{ evaluationMetricText(metric) }}</strong>
            </div>
            <small>{{ metric.target }} · {{ metric.description }}</small>
            <i><b :style="{ width: evaluationMetricFill(metric) }"></b></i>
          </article>
        </div>

        <div class="evaluation-grid">
          <section class="evaluation-card chart-card">
            <div class="chart-heading">
              <h3>命中率回测</h3>
              <span>预览</span>
            </div>
            <div class="hit-bars">
              <div v-for="metric in evaluationMetrics.filter((item) => item.label.includes('命中率'))" :key="metric.label">
                <span>{{ metric.label }}</span>
                <i><b :style="{ height: evaluationMetricFill(metric) }"></b></i>
                <strong>{{ evaluationMetricText(metric) }}</strong>
              </div>
            </div>
          </section>

          <section class="evaluation-card">
            <div class="chart-heading">
              <h3>子模型表现</h3>
              <span>命中率 / 损失</span>
            </div>
            <div class="model-bars">
              <article v-for="row in modelEvaluationRows" :key="row.key">
                <div>
                  <strong>{{ row.label }}</strong>
                  <span>{{ formatPercent(row.hitRate) }} · Loss {{ row.loss.toFixed(2) }}</span>
                </div>
                <i><b :style="{ width: `${row.hitRate * 100}%` }"></b></i>
                <small>{{ row.note }}</small>
              </article>
            </div>
          </section>

          <section class="evaluation-card">
            <div class="chart-heading">
              <h3>当前融合权重</h3>
              <span>{{ prediction ? '实时' : '预览' }}</span>
            </div>
            <div class="weight-bars">
              <div v-for="row in modelEvaluationRows" :key="`weight-${row.key}`">
                <span>{{ row.label }}</span>
                <i><b :style="{ width: formatPercent(row.weight) }"></b></i>
                <strong>{{ formatPercent(row.weight) }}</strong>
              </div>
            </div>
          </section>

          <section class="evaluation-card">
            <div class="chart-heading">
              <h3>样本阶段</h3>
              <span>{{ sampleStageText(stats?.sample_stage) }}</span>
            </div>
            <ol class="stage-timeline">
              <li v-for="stage in sampleStageRows" :key="stage.label" :class="{ active: stage.active }">
                <strong>{{ stage.label }}</strong>
                <span>{{ stage.text }}</span>
              </li>
            </ol>
          </section>
        </div>

        <section class="evaluation-card risk-card">
          <div class="chart-heading">
            <h3>结论风险提示</h3>
            <span>防误判</span>
          </div>
          <div class="risk-grid">
            <article>
              <strong>样本不足时不下结论</strong>
              <span>低样本阶段只展示波动，不把随机噪声解释成规律。</span>
            </article>
            <article>
              <strong>权重调整看验证集表现</strong>
              <span>某个模型频繁命中后才逐步上调，避免一次好运气改变系统判断。</span>
            </article>
            <article>
              <strong>套装影响需要显著证据</strong>
              <span>后台持续记录套装变量，样本足够且偏差稳定后才提升上下文模型权重。</span>
            </article>
          </div>
        </section>
      </section>
    </section>
  </main>
</template>


