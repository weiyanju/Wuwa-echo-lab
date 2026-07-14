<script setup>
import { computed, ref } from 'vue'
import selectedCheckIcon from '../../assets/icons/check.svg'
import topPredictedIcon from '../../assets/icons/fast-arrow-up.svg'
import { mainStatLabels, mainStatsByCost } from '../../data/substats'
import { sonataEffects } from '../../data/sonataEffects'
import { formatPercent, formatSubstatTierNumber, formatSubstatTierUnit, formatSubstatTierValue } from '../../services/formatters'
import ActiveEchoCapturePanel from './ActiveEchoCapturePanel.vue'
import SonataSearchField from './SonataSearchField.vue'
import { filterSonataEffects, useEchoWorkbenchLayout } from './useEchoWorkbenchLayout'

const props = defineProps({
  config: {
    type: Object,
    required: true,
  },
  activeEcho: {
    type: Object,
    default: null,
  },
  matrixRows: {
    type: Array,
    default: () => [],
  },
  saving: {
    type: Boolean,
    default: false,
  },
  pendingTierKey: {
    type: String,
    default: '',
  },
  configCreationNotice: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['config-change', 'undo', 'discard', 'next', 'select-tier', 'preview-change'])
const costOptions = Object.freeze([1, 3, 4])
const selectedSonataEffect = computed(() => sonataEffects.find((effect) => effect.name === props.config.sonata) || null)
const availableCosts = computed(() => selectedSonataEffect.value?.availableCosts || costOptions)
const legalMainStats = computed(() => mainStatsByCost[props.config.cost] || [])
const sonataQuery = ref('')
const filteredSonataEffects = computed(() => filterSonataEffects(sonataEffects, sonataQuery.value))
const visibleSonataNames = computed(() => filteredSonataEffects.value.map((effect) => effect.name))
const configChangeCreatesEcho = computed(() => Boolean(props.activeEcho?.substats?.length))
const predictionRankings = computed(() => props.matrixRows
  .filter((row) => row.candidate && !row.recorded && Number.isFinite(row.candidate?.p_final))
  .sort((left, right) => right.candidate.p_final - left.candidate.p_final)
  .slice(0, 3)
  .map((row, index) => ({
    rank: index + 1,
    label: row.candidate.label || row.label,
    probability: row.candidate.p_final,
    substat_type: row.substat_type,
  })))
const {
  mainStatRowRef,
  sonataGridRef,
  mainStatRowStyle,
  clearMainStatRowHeight,
} = useEchoWorkbenchLayout(props, legalMainStats, visibleSonataNames)

function tierButtonKey(row, tier) { return `${row.substat_type}:${tier.value}` }

function rowPendingTierKey(row) { return props.pendingTierKey.startsWith(`${row.substat_type}:`) ? props.pendingTierKey : '' }

function isTierPending(row, tier) { return props.pendingTierKey === tierButtonKey(row, tier) }

function isRecordedTier(row, tier) {
  return Boolean(row.recorded) && Number(row.recorded.tier_value) === Number(tier.value)
}

function isCostAvailable(cost) { return availableCosts.value.includes(cost) }

function selectCost(cost) { if (isCostAvailable(cost)) emit('config-change', { cost }) }

function iconMask(source) { return { '--icon-url': `url("${source}")` } }
</script>

<template>
  <div class="workspace-sidebar">
    <aside class="product-panel create-panel">
      <div class="setup-panel-content">
        <div class="section-heading">
          <span class="eyebrow">ECHO SETUP</span>
          <h2>初始化声骸</h2>
          <p>选择套装、COST、主词条后开始录入。</p>
        </div>

        <form class="echo-form" @submit.prevent>
        <fieldset>
          <legend>套装</legend>
          <SonataSearchField v-model="sonataQuery" />
          <p v-if="configChangeCreatesEcho" class="setup-behavior-hint">选择其他配置将新建声骸</p>
          <div ref="sonataGridRef" class="sonata-grid">
            <button
              v-for="effect in filteredSonataEffects"
              :key="effect.id"
              type="button"
              :class="{ active: config.sonata === effect.name }"
              :aria-current="config.sonata === effect.name ? 'true' : null"
              @click="emit('config-change', { sonata: effect.name })"
            >
              <img :src="effect.icon" :alt="effect.name" />
              <span>{{ effect.name }}</span>
              <span v-if="config.sonata === effect.name" class="ui-line-icon sonata-selected-indicator" :style="iconMask(selectedCheckIcon)" aria-hidden="true"></span>
            </button>
            <p v-if="!filteredSonataEffects.length" class="sonata-empty-state">未找到匹配套装</p>
          </div>
        </fieldset>

        <fieldset>
          <legend>COST</legend>
          <div class="option-row cost-row">
            <button
              v-for="cost in costOptions"
              :key="cost"
              type="button"
              :disabled="!isCostAvailable(cost)"
              :class="{ active: config.cost === cost }"
              @click="selectCost(cost)"
            >
              {{ cost }}C
            </button>
          </div>
        </fieldset>

        <fieldset>
          <legend>主词条</legend>
          <div ref="mainStatRowRef" class="main-stat-row-shell" :style="mainStatRowStyle" @transitionend="clearMainStatRowHeight">
            <TransitionGroup name="main-stat-option" tag="div" class="option-row main-stat-row">
              <button
                v-for="mainStat in legalMainStats"
                :key="mainStat"
                type="button"
                :class="{ active: config.main_stat === mainStat }"
                @click="emit('config-change', { main_stat: mainStat })"
              >
                {{ mainStatLabels[mainStat] }}
              </button>
            </TransitionGroup>
          </div>
        </fieldset>

        </form>
        <Transition name="config-notice">
          <p v-if="configCreationNotice" class="setup-creation-notice" role="status" aria-live="polite">
            {{ configCreationNotice }}
          </p>
        </Transition>
      </div>
    </aside>
  </div>

  <section class="gallery-panel">
    <ActiveEchoCapturePanel
      :config="config"
      :active-echo="activeEcho"
      :prediction-rankings="predictionRankings"
      :saving="saving || Boolean(pendingTierKey)"
      @undo="emit('undo')"
      @discard="emit('discard')"
      @next="emit('next')"
      @preview-change="emit('preview-change', $event)"
    />

    <div v-if="activeEcho" class="substat-matrix">
      <article
        v-for="row in matrixRows"
        :key="row.substat_type"
        class="substat-row"
        :class="{ recorded: row.recorded, 'top-predicted-row': row.topPredicted && !row.recorded }"
        v-memo="[row.recorded?.id, row.recorded?.tier_value, row.candidate?.p_final, row.candidate?.baseline_deviation, row.topPredicted, Boolean(props.pendingTierKey), rowPendingTierKey(row)]"
      >
        <div class="substat-meta">
          <div class="substat-title-line">
            <strong>{{ row.label }}</strong>
            <span v-if="row.topPredicted && !row.recorded" class="top-predicted-indicator" aria-label="预测概率提升" title="预测概率提升" role="img"><span class="ui-line-icon top-predicted-icon" :style="iconMask(topPredictedIcon)" aria-hidden="true"></span></span>
          </div>
          <span v-if="row.recorded">已录入：{{ formatSubstatTierValue(row.substat_type, row.recorded.tier_value) }}</span>
        </div>
        <div class="tier-grid">
          <button
            v-for="tier in row.tier_table"
            :key="`${row.substat_type}-${tier.value}`"
            type="button"
            :class="{ 'recorded-tier': isRecordedTier(row, tier), 'saving-tier': isTierPending(row, tier) }"
            :disabled="Boolean(row.recorded) || Boolean(pendingTierKey)"
            :aria-busy="isTierPending(row, tier)"
            @click="emit('select-tier', { row, tier })"
          >
            <strong class="tier-value">
              {{ formatSubstatTierNumber(row.substat_type, tier.value) }}<span v-if="formatSubstatTierUnit(row.substat_type)" class="tier-unit">{{ formatSubstatTierUnit(row.substat_type) }}</span>
            </strong>
            <span v-if="isTierPending(row, tier)" class="tier-probability tier-saving-label">保存中</span>
            <span v-else class="tier-probability">{{ formatPercent(tier.probability, 1) }}</span>
          </button>
        </div>
      </article>
    </div>

    <p v-else class="empty-text">先选择套装、COST 和主词条，再开始逐条点击录入。</p>
  </section>
</template>
