<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useAuth } from './composables/useAuth'
import { useDashboardNavigation } from './composables/useDashboardNavigation'
import { useGameAccount } from './composables/useGameAccount'
import UidSwitcher from './components/controls/UidSwitcher.vue'
import WorkspaceSummary from './components/shell/WorkspaceSummary.vue'
import LoginView from './features/auth/LoginView.vue'
import EvaluationView from './features/evaluation/EvaluationView.vue'
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
  evaluationRequestStatus,
  matrixRows,
  modelDetailCards,
  pendingTierKey,
  prediction,
  refresh: refreshWorkspace,
  refreshEvaluation,
  refreshStats,
  reset: resetWorkspace,
  saving,
  selectEcho,
  selectEchoAsset,
  sessionEchoDelta,
  sessionSampleDelta,
  stats,
  statsRequestStatus,
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
const { openPage, page } = useDashboardNavigation({ refreshStats, refreshEvaluation })
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

function iconMask(source) { return { '--icon-url': `url("${source}")` } }

function readInitialTheme() {
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

function toggleTheme() { themeMode.value = isDarkTheme.value ? 'light' : 'dark' }

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
        <a class="wordmark" href="#" aria-label="返回 Tethys System 工作台" @click.prevent="openPage('workspace')"><span class="wordmark-symbol" aria-hidden="true"></span>TETHYS</a>
        <nav class="pill-tabs" aria-label="页面">
          <button :class="{ active: page === 'workspace' }" :aria-current="page === 'workspace' ? 'page' : null" @click="openPage('workspace')">工作台</button>
          <button :class="{ active: page === 'stats' }" :aria-current="page === 'stats' ? 'page' : null" @click="openPage('stats')">统计</button>
          <button :class="{ active: page === 'evaluation' }" :aria-current="page === 'evaluation' ? 'page' : null" @click="openPage('evaluation')">评估</button>
        </nav>
        <div class="account-actions">
          <UidSwitcher :accounts="gameAccount.boundAccounts.value" :current-account="gameAccount.currentAccount.value" :can-add-account="gameAccount.canAddAccount.value" :busy="appBusy || gameAccount.loading.value" :error="error" @select="selectGameAccount" @add="addGameAccount" @sign-out="signOut" />
          <button class="theme-toggle-button" type="button" :aria-pressed="isDarkTheme" :aria-label="themeToggleLabel" :title="themeToggleLabel" @click="toggleTheme">
            <span class="ui-line-icon theme-toggle-icon" :style="iconMask(isDarkTheme ? sunIcon : moonIcon)" aria-hidden="true"></span>
          </button>
        </div>
      </header>

      <WorkspaceSummary
        :history-count="visibleEchoCount" :total-samples="stats?.total_rolls ?? null" :confidence="prediction?.confidence ?? null" :history-delta="visibleSessionEchoDelta"
        :sample-delta="visibleSessionSampleDelta" :busy="accountChanging" :request-status="statsRequestStatus"
      />

      <p v-if="error" class="error-text">{{ error }}</p>

      <div v-if="page === 'workspace'" class="workspace-grid">
        <EchoWorkbenchView
          :config="echoForm"
          :active-echo="activeEcho"
          :matrix-rows="matrixRows"
          :saving="saving"
          :pending-tier-key="pendingTierKey"
          :config-creation-notice="configCreationNotice"
          :first-entry="stats !== null && !stats.total_rolls"
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

      <StatisticsView
        v-if="!gameAccount.workspaceLocked.value && page === 'stats'" :stats="stats" :request-status="statsRequestStatus"
        @start-recording="openPage('workspace')" @retry="refreshStats"
      />

      <EvaluationView
        v-if="!gameAccount.workspaceLocked.value && page === 'evaluation'"
        :evaluation="evaluation"
        :model-details="modelDetailCards"
        :prediction="prediction"
        :stats="stats"
        :request-status="evaluationRequestStatus"
        @start-recording="openPage('workspace')" @retry="refreshEvaluation"
      />
    </section>
  </main>
</template>


