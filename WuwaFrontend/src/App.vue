<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useAuth } from './composables/useAuth'
import { useGameAccount } from './composables/useGameAccount'
import { confidenceText } from './services/formatters'
import UidSwitcher from './components/controls/UidSwitcher.vue'
import LoginView from './features/auth/LoginView.vue'
import EvaluationBacktest from './features/evaluation/EvaluationBacktest.vue'
import EvaluationOverview from './features/evaluation/EvaluationOverview.vue'
import FloatingHistoryPanel from './features/history/FloatingHistoryPanel.vue'
import RecognitionReviewPanel from './features/recognition/RecognitionReviewPanel.vue'
import { useRecognitionReview } from './features/recognition/useRecognitionReview'
import StatisticsView from './features/statistics/StatisticsView.vue'
import EchoWorkbenchView from './features/workspace/EchoWorkbenchView.vue'
import UidSetupView from './features/workspace/UidSetupView.vue'
import { useEchoWorkspace } from './features/workspace/useEchoWorkspace'
import moonIcon from './assets/icons/moon.svg'
import sunIcon from './assets/icons/sun.svg'

const auth = useAuth()
const gameAccount = useGameAccount()
const user = auth.user
const page = ref('workspace')
const error = ref('')
const loading = ref(true)
const accountChanging = ref(false)
const themeMode = ref(readInitialTheme())
const isDarkTheme = computed(() => themeMode.value === 'dark')
const themeToggleLabel = computed(() => (isDarkTheme.value ? '切换到日间模式' : '切换到夜间模式'))
const selectedGameAccountId = computed(() => gameAccount.currentAccount.value?.id || null)
const boundPlayerUid = computed(() => gameAccount.currentAccount.value?.uid || '')
const {
  activeEcho,
  activeEchoId,
  applyEchoConfig,
  clickTier,
  configCreationNotice,
  createNextEchoFromActive,
  discardActiveEcho,
  dispose: disposeWorkspace,
  echoForm,
  echoes,
  evaluation,
  matrixRows,
  modelDetailCards,
  pendingTierKey,
  prediction,
  refresh: refreshWorkspace,
  reset: resetWorkspace,
  saving,
  selectEcho,
  selectEchoAsset,
  sessionEchoDelta,
  sessionSampleDelta,
  stats,
  undoActiveSubstat,
  visibleEchoCount,
  visibleSessionEchoDelta,
  visibleSessionSampleDelta,
} = useEchoWorkspace({
  selectedGameAccountId,
  boundPlayerUid,
  workspaceLocked: gameAccount.workspaceLocked,
  onError: (message) => {
    error.value = message
  },
})
const appBusy = computed(() => saving.value || accountChanging.value)
const {
  dispose: disposeRecognition,
  latestSession: latestRecognitionSession,
  metrics: recognitionMetrics,
  refresh: refreshRecognition,
  refreshDisabled: recognitionRefreshDisabled,
  refreshing: recognitionRefreshing,
  refreshStatus: recognitionRefreshStatus,
  reset: resetRecognition,
  revert: revertRecognition,
  revertingSnapshotId,
  reviewRows: recognitionReviewRows,
} = useRecognitionReview({
  selectedGameAccountId,
  saving: appBusy,
  onError: (message) => {
    error.value = message
  },
})

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
  resetWorkspace()
  resetRecognition()
}

async function submitUidBinding(uid) { await changeGameAccount(() => gameAccount.bindInitialUid(uid)) }

async function changeGameAccount(change) {
  error.value = ''
  accountChanging.value = true
  resetWorkspaceState()
  let accountChanged = false
  try {
    await change()
    accountChanged = true
    await refreshAll()
  } catch (err) {
    error.value = err.message
    await gameAccount.loadGameAccounts().catch(() => {})
    if (accountChanged) {
      gameAccount.selectedAccountId.value = null
    }
    resetWorkspaceState()
  } finally {
    accountChanging.value = false
  }
}

async function addGameAccount(uid) { await changeGameAccount(() => gameAccount.addGameAccount(uid)) }

async function selectGameAccount(accountOrId) {
  const id = typeof accountOrId === 'object' ? accountOrId?.id : accountOrId
  await changeGameAccount(() => gameAccount.switchGameAccount(id))
}

async function signOut() {
  await auth.signOut()
  gameAccount.accounts.value = []
  resetWorkspaceState()
}

async function refreshAll() {
  await refreshWorkspace()
  await refreshRecognition({ silent: true })
}

async function revertSnapshot(snapshot) {
  error.value = ''
  try {
    if (await revertRecognition(snapshot)) {
      await refreshAll()
    }
  } catch (err) {
    error.value = err.message
  }
}

onMounted(async () => {
  await bootstrap()
})

onBeforeUnmount(() => {
  disposeWorkspace()
  disposeRecognition()
})
</script>

<template>
  <main class="app-shell" :class="{ 'theme-dark': isDarkTheme }">
    <section v-if="loading" class="auth-shell">
      <div class="auth-copy">
        <span class="brand-mark">Tethys System</span>
        <h1>正在连接声骸研究台</h1>
      </div>
    </section>

    <LoginView v-else-if="!user" :error="error" @submit="submitAuth" />

    <UidSetupView
      v-else-if="gameAccount.workspaceLocked.value"
      :bound-uid="boundPlayerUid"
      :saving="accountChanging"
      :loading="gameAccount.loading.value"
      :error="error"
      :is-dark-theme="isDarkTheme"
      :theme-toggle-label="themeToggleLabel"
      @bind="submitUidBinding"
      @clear-error="error = ''"
      @toggle-theme="toggleTheme"
      @sign-out="signOut"
    />

    <section v-else class="dashboard">
      <header class="topbar">
        <a class="wordmark" href="#" aria-label="返回 Tethys System 工作台" @click.prevent="page = 'workspace'"><span class="wordmark-symbol" aria-hidden="true"></span>TETHYS</a>
        <nav class="pill-tabs" aria-label="页面">
          <button :class="{ active: page === 'workspace' }" @click="page = 'workspace'">工作台</button>
          <button :class="{ active: page === 'stats' }" @click="page = 'stats'">统计</button>
          <button :class="{ active: page === 'evaluation' }" @click="page = 'evaluation'">评估</button>
        </nav>
        <div class="account-actions">
          <UidSwitcher :accounts="gameAccount.boundAccounts.value" :current-account="gameAccount.currentAccount.value" :can-add-account="gameAccount.canAddAccount.value" :busy="appBusy || gameAccount.loading.value" :error="error" @select="selectGameAccount" @add="addGameAccount" @sign-out="signOut" />
          <button class="theme-toggle-button" type="button" :aria-pressed="isDarkTheme" :aria-label="themeToggleLabel" :title="themeToggleLabel" @click="toggleTheme">
            <span class="ui-line-icon theme-toggle-icon" :style="iconMask(isDarkTheme ? sunIcon : moonIcon)" aria-hidden="true"></span>
          </button>
        </div>
      </header>

      <section class="hero-band compact">
        <div>
          <h1>你好，漂泊者</h1>
        </div>
        <div class="hero-stats">
          <div class="hero-stat hero-stat-with-delta"><strong>{{ visibleEchoCount }}</strong><Transition name="metric-delta"><em v-if="visibleSessionEchoDelta" :key="visibleSessionEchoDelta" class="metric-delta-badge" :title="`本次新增 ${visibleSessionEchoDelta} 个声骸`">+{{ visibleSessionEchoDelta }}</em></Transition><span>历史声骸</span></div>
          <div class="hero-stat hero-stat-with-delta"><strong>{{ stats?.total_rolls || 0 }}</strong><Transition name="metric-delta"><em v-if="visibleSessionSampleDelta" :key="visibleSessionSampleDelta" class="metric-delta-badge" :title="`本次录入新增 ${visibleSessionSampleDelta} 条样本`">+{{ visibleSessionSampleDelta }}</em></Transition><span>总样本</span></div>
          <div class="hero-stat"><strong class="hero-confidence-value">{{ prediction ? confidenceText(prediction.confidence) : '低' }}</strong><span>置信度</span></div>
        </div>
      </section>

      <p v-if="error" class="error-text">{{ error }}</p>

      <div v-if="page === 'workspace'" class="workspace-grid">
        <EchoWorkbenchView
          :config="echoForm"
          :active-echo="activeEcho"
          :matrix-rows="matrixRows"
          :saving="saving"
          :pending-tier-key="pendingTierKey"
          :config-creation-notice="configCreationNotice"
          @config-change="applyEchoConfig"
          @undo="undoActiveSubstat"
          @discard="discardActiveEcho"
          @next="createNextEchoFromActive"
          @preview-change="selectEchoAsset"
          @select-tier="clickTier($event.row, $event.tier)"
        />

        <FloatingHistoryPanel
          :echoes="echoes"
          :active-echo-id="activeEchoId"
          @select="selectEcho"
        />

      </div>

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

      <StatisticsView v-if="!gameAccount.workspaceLocked.value && page === 'stats'" :stats="stats" />

      <section v-if="!gameAccount.workspaceLocked.value && page === 'evaluation'" class="product-panel full-panel evaluation-panel">
        <EvaluationOverview :evaluation="evaluation" :model-details="modelDetailCards" :prediction="prediction" :stats="stats" />

        <EvaluationBacktest :evaluation="evaluation" :model-details="modelDetailCards" :prediction="prediction" />
      </section>
    </section>
  </main>
</template>


