<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { mainStatLabels, mainStatsByCost, substatLabels } from '../../data/substats'
import { sonataEffects } from '../../data/sonataEffects'
import { displayEchoNumericId } from '../../services/echoId'
import { formatPercent, formatSignedPercent } from '../../services/formatters'

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
})

const emit = defineEmits(['config-change', 'undo', 'discard', 'next', 'select-tier'])
const createPanelRef = ref(null)
const galleryPanelRef = ref(null)
const setupPanelHeight = ref(null)
const setupPanelStyle = computed(() => (setupPanelHeight.value ? { height: `${setupPanelHeight.value}px` } : {}))
const legalMainStats = computed(() => mainStatsByCost[props.config.cost] || [])
const progressPercent = computed(() => Math.min(((props.activeEcho?.substats.length || 0) / 5) * 100, 100))

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

function tierButtonKey(row, tier) {
  return `${row.substat_type}:${tier.value}`
}

function isTierPending(row, tier) {
  return props.pendingTierKey === tierButtonKey(row, tier)
}

onMounted(() => {
  syncSetupPanelHeight()
  window.addEventListener('resize', syncSetupPanelHeight)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncSetupPanelHeight)
})

watch(
  () => `${props.activeEcho?.id || ''}:${props.activeEcho?.substats.length || 0}:${props.config.cost}:${props.config.main_stat}:${props.config.sonata}`,
  syncSetupPanelHeight,
  { flush: 'post' },
)
</script>

<template>
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
              :class="{ active: config.sonata === effect.name }"
              @click="emit('config-change', { sonata: effect.name })"
            >
              <img :src="effect.icon" :alt="effect.name" />
              <span>{{ effect.name }}</span>
            </button>
          </div>
        </fieldset>

        <fieldset>
          <legend>COST</legend>
          <div class="option-row cost-row">
            <button v-for="cost in [1, 3, 4]" :key="cost" type="button" :class="{ active: config.cost === cost }" @click="emit('config-change', { cost })">
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
              :class="{ active: config.main_stat === mainStat }"
              @click="emit('config-change', { main_stat: mainStat })"
            >
              {{ mainStatLabels[mainStat] }}
            </button>
          </div>
        </fieldset>

        <label class="checkbox-row">
          <input
            :checked="config.is_continuous_tuning"
            type="checkbox"
            @change="emit('config-change', { is_continuous_tuning: $event.target.checked })"
          />
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
        <button class="undo-roll-button" type="button" :disabled="saving || !activeEcho.substats.length" title="撤回上一次录入的副词条" @click="emit('undo')">
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
          <button class="button-danger" type="button" :disabled="saving" @click="emit('discard')">弃置</button>
          <button class="button-next" type="button" :disabled="saving" @click="emit('next')">下一个</button>
        </div>
      </div>
    </div>

    <div v-if="activeEcho" class="substat-matrix">
      <article
        v-for="row in matrixRows"
        :key="row.substat_type"
        class="substat-row"
        :class="{ recorded: row.recorded, 'top-predicted-row': row.topPredicted && !row.recorded }"
        v-memo="[row.recorded?.id, row.recorded?.tier_value, row.candidate?.p_final, row.candidate?.baseline_deviation, row.topPredicted, pendingTierKey]"
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
            :disabled="Boolean(row.recorded) || isTierPending(row, tier)"
            @click="emit('select-tier', { row, tier })"
          >
            <strong>{{ tier.value }}</strong>
            <span>{{ formatPercent(tier.probability) }}</span>
          </button>
        </div>
      </article>
    </div>

    <p v-else class="empty-text">先选择套装、COST 和主词条，再开始逐条点击录入。</p>
  </section>
</template>
