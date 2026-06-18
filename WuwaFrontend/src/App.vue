<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  addSubstat,
  createEcho,
  getModelEvaluation,
  getPrediction,
  getStats,
  listEchoes,
  listRecognitionSessions,
  listRecognitionSnapshots,
  revertRecognitionSnapshot,
  undoLastSubstat,
  updateEcho,
} from './services/api'
import { useAuth } from './composables/useAuth'
import { useGameAccount } from './composables/useGameAccount'
import { buildNextEchoConfig, isReusableDraft, sortVisibleEchoHistory } from './services/echoWorkflow'
import { confidenceText } from './services/formatters'
import { buildModelDetailCards } from './services/modelDetails'
import { mainStatsByCost, substatLabels, substatOrder, tierTables } from './data/substats'
import { sonataEffects } from './data/sonataEffects'
import LoginView from './features/auth/LoginView.vue'
import EvaluationBacktest from './features/evaluation/EvaluationBacktest.vue'
import EvaluationOverview from './features/evaluation/EvaluationOverview.vue'
import FloatingHistoryPanel from './features/history/FloatingHistoryPanel.vue'
import RecognitionReviewPanel from './features/recognition/RecognitionReviewPanel.vue'
import StatisticsView from './features/statistics/StatisticsView.vue'
import EchoWorkbenchView from './features/workspace/EchoWorkbenchView.vue'
import UidSetupView from './features/workspace/UidSetupView.vue'
import moonIcon from './assets/icons/moon.svg'
import sunIcon from './assets/icons/sun.svg'

const auth = useAuth()
const gameAccount = useGameAccount()
const user = auth.user
const page = ref('workspace')
const error = ref('')
const loading = ref(true)
const saving = ref(false)
const pendingTierKey = ref('')

const echoes = ref([])
const activeEchoId = ref(null)
const prediction = ref(null)
const stats = ref(null)
const evaluation = ref(null)
const recognitionSessions = ref([])
const recognitionSnapshots = ref([])
const revertingSnapshotId = ref(null)
const recognitionRefreshing = ref(false)
const recognitionRefreshStatus = ref('')
const themeMode = ref(readInitialTheme())
let insightsRefreshTimer = null
let activeRefreshTimer = null
let recognitionRefreshFeedbackTimer = null
let activePredictionRefreshToken = 0

const echoForm = ref({
  sonata: sonataEffects.at(-1).name,
  cost: 1,
  main_stat: 'atk_percent',
  is_continuous_tuning: false,
})

const activeEcho = computed(() => echoes.value.find((echo) => echo.id === activeEchoId.value) || null)
const visibleEchoCount = computed(() => sortVisibleEchoHistory(echoes.value).length)
const isDarkTheme = computed(() => themeMode.value === 'dark')
const themeToggleLabel = computed(() => (isDarkTheme.value ? '切换到日间模式' : '切换到夜间模式'))
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
const topCandidate = computed(() => prediction.value?.candidates?.[0] || null)
const selectedGameAccountId = computed(() => gameAccount.defaultAccount.value?.id || null)
const boundPlayerUid = computed(() => gameAccount.defaultAccount.value?.uid || '')
const latestRecognitionSession = computed(() => recognitionSessions.value[0] || null)
const recognitionReviewRows = computed(() => recognitionSnapshots.value.filter((snapshot) => (
  ['saved', 'conflict', 'rejected', 'ignored_duplicate'].includes(snapshot.status)
)))
const recognitionMetrics = computed(() => {
  const session = latestRecognitionSession.value || {}
  return [
    { key: 'saved_roll_count', label: '保存词条', value: session.saved_roll_count || 0 },
    { key: 'snapshot_count', label: '识别快照', value: session.snapshot_count || 0 },
    { key: 'conflict_count', label: '待处理', value: session.conflict_count || 0 },
  ]
})
const recognitionRefreshDisabled = computed(() => saving.value || recognitionRefreshing.value || Boolean(recognitionRefreshStatus.value))
const modelDetailCards = computed(() =>
  buildModelDetailCards({
    prediction: prediction.value,
    stats: stats.value,
    evaluation: evaluation.value,
    echoes: echoes.value,
    labels: substatLabels,
  }),
)

function iconMask(source) {
  return { '--icon-url': `url("${source}")` }
}

function readInitialTheme() {
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

function toggleTheme() {
  themeMode.value = isDarkTheme.value ? 'light' : 'dark'
}

async function bootstrap() {
  try {
    const currentUser = await auth.loadMe()
    if (currentUser) {
      await gameAccount.loadGameAccounts()
      if (!gameAccount.workspaceLocked.value) {
        await refreshAll()
      } else {
        resetWorkspaceState()
      }
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function submitAuth({ username, password, mode, saveLogin }) {
  error.value = ''
  try {
    const payload = { username, password }
    if (mode === 'register') {
      await auth.signUp(payload)
    } else {
      await auth.signIn(payload)
    }
    localStorage.setItem('wuwa-save-login', saveLogin ? 'true' : 'false')
    if (saveLogin) {
      localStorage.setItem('wuwa-login-username', username)
    } else {
      localStorage.removeItem('wuwa-login-username')
    }
    await gameAccount.loadGameAccounts()
    if (gameAccount.workspaceLocked.value) {
      resetWorkspaceState()
    } else {
      await refreshAll()
    }
  } catch (err) {
    error.value = err.message
  }
}

function resetWorkspaceState() {
  echoes.value = []
  activeEchoId.value = null
  prediction.value = null
  stats.value = null
  evaluation.value = null
  recognitionSessions.value = []
  recognitionSnapshots.value = []
}

async function submitUidBinding(uid) {
  error.value = ''
  saving.value = true
  try {
    resetWorkspaceState()
    await gameAccount.bindDefaultUid(uid)
    await refreshAll()
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}

async function signOut() {
  await auth.signOut()
  gameAccount.accounts.value = []
  resetWorkspaceState()
}

async function refreshAll() {
  if (gameAccount.workspaceLocked.value || !selectedGameAccountId.value) {
    resetWorkspaceState()
    return
  }
  const echoData = await listEchoes(selectedGameAccountId.value)
  echoes.value = echoData.results || []
  if (!echoes.value.length && boundPlayerUid.value) {
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
  stats.value = await getStats(selectedGameAccountId.value)
  evaluation.value = await getModelEvaluation(selectedGameAccountId.value)
  await refreshRecognition({ silent: true })
}

async function refreshActive() {
  if (!activeEchoId.value) {
    prediction.value = null
    return
  }
  const echoId = activeEchoId.value
  const token = ++activePredictionRefreshToken
  const nextPrediction = await getPrediction(echoId)
  if (token === activePredictionRefreshToken && activeEchoId.value === echoId) {
    prediction.value = nextPrediction
  }
}

function setRecognitionRefreshStatus(status) {
  clearTimeout(recognitionRefreshFeedbackTimer)
  recognitionRefreshStatus.value = status
  if (status) {
    recognitionRefreshFeedbackTimer = setTimeout(() => {
      recognitionRefreshStatus.value = ''
      recognitionRefreshFeedbackTimer = null
    }, 900)
  }
}

async function refreshRecognition({ silent = false } = {}) {
  if (!selectedGameAccountId.value) {
    recognitionSessions.value = []
    recognitionSnapshots.value = []
    return
  }
  if (recognitionRefreshing.value) {
    return
  }
  recognitionRefreshing.value = true
  if (!silent) {
    recognitionRefreshStatus.value = ''
  }
  try {
    const [sessionData, snapshotData] = await Promise.all([
      listRecognitionSessions(selectedGameAccountId.value),
      listRecognitionSnapshots(selectedGameAccountId.value, ['saved', 'conflict', 'rejected', 'ignored_duplicate']),
    ])
    recognitionSessions.value = sessionData.results || []
    recognitionSnapshots.value = snapshotData.results || []
    if (!silent) {
      setRecognitionRefreshStatus('success')
    }
  } catch (err) {
    if (!silent) {
      error.value = err.message
      setRecognitionRefreshStatus('error')
      return
    }
    throw err
  } finally {
    recognitionRefreshing.value = false
  }
}

async function revertSnapshot(snapshot) {
  if (!snapshot?.snapshot_id || revertingSnapshotId.value) {
    return
  }
  error.value = ''
  revertingSnapshotId.value = snapshot.snapshot_id
  try {
    await revertRecognitionSnapshot(snapshot.snapshot_id)
    await refreshAll()
  } catch (err) {
    error.value = err.message
  } finally {
    revertingSnapshotId.value = null
  }
}

function replaceEcho(nextEcho) {
  echoes.value = echoes.value.map((echo) => (echo.id === nextEcho.id ? nextEcho : echo))
}

function appendRollToEcho(echoId, roll) {
  echoes.value = echoes.value.map((echo) => {
    if (echo.id !== echoId) {
      return echo
    }
    const nextRolls = [...echo.substats.filter((item) => item.id !== roll.id), roll]
      .sort((left, right) => left.position - right.position || left.id - right.id)
    return {
      ...echo,
      substats: nextRolls,
      status: nextRolls.length >= 5 ? 'completed' : 'in_progress',
      last_tuned_at: roll.tuned_at,
    }
  })
}

function replaceOptimisticRollInEcho(echoId, optimisticRollId, roll) {
  echoes.value = echoes.value.map((echo) => {
    if (echo.id !== echoId) {
      return echo
    }
    const nextRolls = echo.substats
      .map((item) => (item.id === optimisticRollId ? roll : item))
      .sort((left, right) => left.position - right.position || left.id - right.id)
    return {
      ...echo,
      substats: nextRolls,
      status: nextRolls.length >= 5 ? 'completed' : 'in_progress',
      last_tuned_at: roll.tuned_at,
    }
  })
}

function removeOptimisticRollFromEcho(echoId, optimisticRollId) {
  echoes.value = echoes.value.map((echo) => {
    if (echo.id !== echoId) {
      return echo
    }
    const nextRolls = echo.substats.filter((item) => item.id !== optimisticRollId)
    return {
      ...echo,
      substats: nextRolls,
      status: nextRolls.length >= 5 ? 'completed' : 'in_progress',
      last_tuned_at: nextRolls.at(-1)?.tuned_at || null,
    }
  })
}

function buildOptimisticRoll(row, tier) {
  return {
    id: -Date.now(),
    position: (activeEcho.value?.substats.length || 0) + 1,
    substat_type: row.substat_type,
    tier_value: tier.value,
    enhance_phase: '',
    tuning_order: null,
    tuned_at: new Date().toISOString(),
    optimistic: true,
  }
}

function refreshInsightsInBackground() {
  if (!selectedGameAccountId.value) {
    return
  }
  clearTimeout(insightsRefreshTimer)
  insightsRefreshTimer = setTimeout(() => {
    Promise.all([
      getStats(selectedGameAccountId.value),
      getModelEvaluation(selectedGameAccountId.value),
    ])
      .then(([nextStats, nextEvaluation]) => {
        stats.value = nextStats
        evaluation.value = nextEvaluation
      })
      .catch((err) => {
        error.value = err.message
      })
  }, 1000)
}

function refreshActiveInBackground() {
  clearTimeout(activeRefreshTimer)
  activeRefreshTimer = setTimeout(() => {
    refreshActive().catch((err) => {
      error.value = err.message
    })
  }, 300)
}

function tierButtonKey(row, tier) {
  return `${row.substat_type}:${tier.value}`
}

async function createEchoWithConfig(config = echoForm.value) {
  if (gameAccount.workspaceLocked.value || !selectedGameAccountId.value) {
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
      display_name: '',
      cost: echoForm.value.cost,
      set_name: echoForm.value.sonata,
      main_stat: echoForm.value.main_stat,
      source: '',
      tuning_batch_id: '',
      is_continuous_tuning: echoForm.value.is_continuous_tuning,
    }, selectedGameAccountId.value)
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
  if (row.recorded || pendingTierKey.value) {
    return
  }
  pendingTierKey.value = tierButtonKey(row, tier)
  error.value = ''
  let optimisticRoll = null
  let optimisticEchoId = null
  try {
    const echo = await ensureActiveEcho()
    if (!echo) {
      return
    }
    optimisticEchoId = echo.id
    optimisticRoll = buildOptimisticRoll(row, tier)
    appendRollToEcho(echo.id, optimisticRoll)
    const roll = await addSubstat(echo.id, {
      substat_type: row.substat_type,
      tier_value: tier.value,
    })
    replaceOptimisticRollInEcho(echo.id, optimisticRoll.id, roll)
    refreshActiveInBackground()
    refreshInsightsInBackground()
  } catch (err) {
    if (optimisticEchoId && optimisticRoll) {
      removeOptimisticRollFromEcho(optimisticEchoId, optimisticRoll.id)
    }
    error.value = err.message
  } finally {
    pendingTierKey.value = ''
  }
}

async function undoActiveSubstat() {
  if (!activeEcho.value || !activeEcho.value.substats.length || saving.value) {
    return
  }
  saving.value = true
  error.value = ''
  try {
    const result = await undoLastSubstat(activeEcho.value.id)
    replaceEcho(result.echo)
    await refreshActive()
    refreshInsightsInBackground()
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await bootstrap()
})

onBeforeUnmount(() => {
  clearTimeout(insightsRefreshTimer)
  insightsRefreshTimer = null
  clearTimeout(activeRefreshTimer)
  activeRefreshTimer = null
  clearTimeout(recognitionRefreshFeedbackTimer)
  recognitionRefreshFeedbackTimer = null
})
</script>

<template>
  <main class="app-shell" :class="{ 'theme-dark': isDarkTheme }">
    <section v-if="loading" class="auth-shell">
      <div class="auth-copy">
        <span class="brand-mark">Wuwa Echo Lab</span>
        <h1>正在连接声骸研究台</h1>
      </div>
    </section>

    <LoginView v-else-if="!user" :error="error" @submit="submitAuth" />

    <UidSetupView
      v-else-if="gameAccount.workspaceLocked.value"
      :bound-uid="boundPlayerUid"
      :saving="saving"
      :loading="gameAccount.loading.value"
      :error="error"
      :is-dark-theme="isDarkTheme"
      :theme-toggle-label="themeToggleLabel"
      @bind="submitUidBinding"
      @toggle-theme="toggleTheme"
      @sign-out="signOut"
    />

    <section v-else class="dashboard">
      <header class="topbar">
        <a class="wordmark" href="#" @click.prevent="page = 'workspace'">Wuwa Echo Lab</a>
        <nav class="pill-tabs" aria-label="页面">
          <button :class="{ active: page === 'workspace' }" @click="page = 'workspace'">工作台</button>
          <button :class="{ active: page === 'stats' }" @click="page = 'stats'">统计</button>
          <button :class="{ active: page === 'evaluation' }" @click="page = 'evaluation'">评估</button>
        </nav>
        <div class="account-actions uid-switcher">
          <div class="uid-chip">
            <i class="uid-status-dot" aria-hidden="true"></i>
            <span class="uid-chip-label">UID</span>
            <span class="uid-chip-value">{{ boundPlayerUid || '未绑定' }}</span>
          </div>
          <button
            class="theme-toggle-button"
            type="button"
            :aria-pressed="isDarkTheme"
            :aria-label="themeToggleLabel"
            :title="themeToggleLabel"
            @click="toggleTheme"
          >
            <span class="ui-line-icon theme-toggle-icon" :style="iconMask(isDarkTheme ? sunIcon : moonIcon)" aria-hidden="true"></span>
          </button>
          <button class="button-ghost" @click="signOut">退出</button>
        </div>
      </header>

      <section class="hero-band compact">
        <div>
          <span class="brand-mark">Echo research</span>
          <h1>鸣潮声骸实验室</h1>
          <p>记录调谐样本，实时校准副词条概率与模型证据。</p>
        </div>
        <div class="hero-stats">
          <div><strong>{{ visibleEchoCount }}</strong><span>历史声骸</span></div>
          <div><strong>{{ stats?.total_rolls || 0 }}</strong><span>总样本</span></div>
          <div><strong>{{ prediction ? confidenceText(prediction.confidence) : '低' }}</strong><span>置信度</span></div>
        </div>
      </section>

      <p v-if="error" class="error-text">{{ error }}</p>

      <RecognitionReviewPanel
        v-if="page === 'workspace'"
        :latest-session="latestRecognitionSession"
        :metrics="recognitionMetrics"
        :refresh-disabled="recognitionRefreshDisabled"
        :refresh-status="recognitionRefreshStatus"
        :refreshing="recognitionRefreshing"
        :reverting-snapshot-id="revertingSnapshotId"
        :review-rows="recognitionReviewRows"
        @refresh="refreshRecognition"
        @revert="revertSnapshot"
      />

      <div v-if="page === 'workspace'" class="workspace-grid">
        <EchoWorkbenchView
          :config="echoForm"
          :active-echo="activeEcho"
          :matrix-rows="matrixRows"
          :saving="saving"
          :pending-tier-key="pendingTierKey"
          @config-change="applyEchoConfig"
          @undo="undoActiveSubstat"
          @discard="discardActiveEcho"
          @next="createNextEchoFromActive"
          @select-tier="clickTier($event.row, $event.tier)"
        />

        <FloatingHistoryPanel
          :echoes="echoes"
          :active-echo-id="activeEchoId"
          :is-dark-theme="isDarkTheme"
          @select="selectEcho"
        />

      </div>

      <StatisticsView
        v-if="!gameAccount.workspaceLocked.value && page === 'stats'"
        :stats="stats"
      />

      <section v-if="!gameAccount.workspaceLocked.value && page === 'evaluation'" class="product-panel full-panel evaluation-panel">
        <EvaluationOverview
          :evaluation="evaluation"
          :model-details="modelDetailCards"
          :prediction="prediction"
          :stats="stats"
        />

        <EvaluationBacktest
          :evaluation="evaluation"
          :model-details="modelDetailCards"
          :prediction="prediction"
        />
      </section>
    </section>
  </main>
</template>


