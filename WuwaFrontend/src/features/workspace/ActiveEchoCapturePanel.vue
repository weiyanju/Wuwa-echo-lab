<script setup>
import { computed, ref, watch } from 'vue'
import { sonataEchoesBySetName } from '../../data/sonataEchoes'
import { sonataEffects } from '../../data/sonataEffects'
import { mainStatLabels, substatLabels } from '../../data/substats'
import { formatPercent, formatSubstatTierValue } from '../../services/formatters'

const props = defineProps({
  config: {
    type: Object,
    required: true,
  },
  activeEcho: {
    type: Object,
    default: null,
  },
  predictionRankings: {
    type: Array,
    default: () => [],
  },
  saving: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['undo', 'discard', 'next', 'preview-change'])
const activePreviewIndex = ref(0)
const selectedSonataEffect = computed(() => sonataEffects.find((effect) => effect.name === props.config.sonata) || null)
const activeSonataEffect = computed(() => sonataEffects.find((effect) => effect.name === props.activeEcho?.set_name) || null)
const previewSonataEffect = computed(() => activeSonataEffect.value || selectedSonataEffect.value)
const previewCost = computed(() => props.activeEcho?.cost || props.config.cost)
const activeEchoSubstats = computed(() => (Array.isArray(props.activeEcho?.substats) ? props.activeEcho.substats : []))
const progressSegments = computed(() => Array.from({ length: 5 }, (_, index) => index < activeEchoSubstats.value.length))
const activeEchoesForCost = computed(() => {
  const setEchoes = sonataEchoesBySetName[previewSonataEffect.value?.name]
  return setEchoes?.echoesByCost[`cost${previewCost.value}`] || []
})
const activePreviewEcho = computed(() => {
  if (!activeEchoesForCost.value.length) return null
  return activeEchoesForCost.value[activePreviewIndex.value % activeEchoesForCost.value.length]
})
const activeEchoDisplayName = computed(() => activePreviewEcho.value?.name || props.activeEcho?.echo_name || '未选择声骸')
const activeRecordPills = computed(() => [
  props.activeEcho?.set_name || props.config.sonata,
  `COST ${previewCost.value}`,
  mainStatLabels[props.activeEcho?.main_stat || props.config.main_stat] || props.activeEcho?.main_stat || props.config.main_stat,
].filter(Boolean))
const rollSlots = computed(() => Array.from({ length: 5 }, (_, index) => (
  activeEchoSubstats.value[index] || { id: `pending-${index + 1}`, position: index + 1, pending: true }
)))
const activePredictionRankings = computed(() => props.predictionRankings
  .slice(0, 3)
  .filter((prediction) => prediction?.label && Number.isFinite(prediction.probability))
  .map((prediction, index) => ({ ...prediction, rank: prediction.rank || index + 1 })))
const activePredictionRecommendation = computed(() => activePredictionRankings.value[0] || null)
const activePredictionAlternatives = computed(() => activePredictionRankings.value.slice(1))

function movePreviewEcho(direction) {
  const total = activeEchoesForCost.value.length
  if (total <= 1) return
  selectPreviewEcho((activePreviewIndex.value + direction + total) % total)
}

function selectPreviewEcho(index) {
  activePreviewIndex.value = index
  emitPreviewEcho()
}

function syncPreviewIndexFromEcho() {
  const storedAssetId = props.activeEcho?.echo_asset_id ? String(props.activeEcho.echo_asset_id) : ''
  const storedName = props.activeEcho?.echo_name || ''
  const storedIndex = activeEchoesForCost.value.findIndex((echo) => (
    (storedAssetId && String(echo.id) === storedAssetId) || (storedName && echo.name === storedName)
  ))
  activePreviewIndex.value = storedIndex >= 0 ? storedIndex : 0
}

function emitPreviewEcho() {
  if (!activePreviewEcho.value || !previewSonataEffect.value) return
  emit('preview-change', {
    ...activePreviewEcho.value,
    set_name: previewSonataEffect.value.name,
  })
}

function syncPreviewFromActiveEcho() {
  syncPreviewIndexFromEcho()
  emitPreviewEcho()
}

watch([() => previewSonataEffect.value?.name, previewCost, () => props.activeEcho?.echo_asset_id, () => props.activeEcho?.echo_name], syncPreviewFromActiveEcho, { immediate: true })
</script>

<template>
  <div class="active-summary">
    <section class="active-echo-stage" aria-label="当前声骸图片">
      <div v-if="previewSonataEffect" class="active-echo-set-badge" :title="previewSonataEffect.name">
        <img :src="previewSonataEffect.icon" :alt="previewSonataEffect.name" />
      </div>
      <div v-if="activePreviewEcho" class="active-echo-stage-media">
        <img
          class="active-echo-stage-art"
          :src="activePreviewEcho.image"
          :alt="activePreviewEcho.name"
        />
      </div>
      <div v-else class="active-echo-stage-empty">选择声骸套装</div>
      <button v-if="activePreviewEcho" class="active-echo-nav previous" type="button" :disabled="activeEchoesForCost.length <= 1" aria-label="上一只声骸" @click="movePreviewEcho(-1)">‹</button>
      <button v-if="activePreviewEcho" class="active-echo-nav next" type="button" :disabled="activeEchoesForCost.length <= 1" aria-label="下一只声骸" @click="movePreviewEcho(1)">›</button>
      <div v-if="activeEchoesForCost.length > 1" class="active-echo-stage-dots" aria-label="声骸轮播位置">
        <button
          v-for="(echo, index) in activeEchoesForCost"
          :key="echo.id"
          type="button"
          :class="{ active: index === activePreviewIndex }"
          :aria-label="`切换到${echo.name}`"
          @click="selectPreviewEcho(index)"
        ></button>
      </div>
    </section>

    <section class="active-record-panel" aria-label="当前声骸副词条记录">
      <div class="active-record-main">
        <div class="active-record-head">
          <div class="active-record-title-row">
            <strong class="active-echo-name-title">{{ activeEchoDisplayName }}</strong>
            <span class="active-record-meta-pills">
              <em v-for="pill in activeRecordPills" :key="pill" class="active-record-pill">{{ pill }}</em>
            </span>
          </div>
          <strong class="active-record-count-badge"><span>{{ activeEchoSubstats.length }}</span><small>/5</small></strong>
          <div class="active-progress-segments" aria-label="声骸副词条录入进度">
            <i v-for="(filled, index) in progressSegments" :key="index" :class="{ filled }"></i>
          </div>
        </div>

        <div class="roll-strip" :class="{ empty: !activeEchoSubstats.length }">
          <span v-for="roll in rollSlots" :key="roll.id" class="roll-slot" :class="{ pending: roll.pending }">
            <strong class="roll-position">{{ roll.position }}.</strong>
            <template v-if="!roll.pending">
              <em class="roll-name">{{ substatLabels[roll.substat_type] }}</em>
              <b class="roll-value">{{ formatSubstatTierValue(roll.substat_type, roll.tier_value) }}</b>
            </template>
            <em v-else class="roll-name">待调谐</em>
          </span>
        </div>
      </div>
      <aside v-if="activeEcho" class="active-actions record-actions active-action-bar active-action-rail" aria-label="声骸操作">
        <div class="active-prediction-card" aria-label="下一个副词条预测">
          <div v-if="activePredictionRecommendation" class="active-prediction-table">
            <span class="active-prediction-subheading active-prediction-suggestion-heading">建议</span>
            <span class="active-prediction-line active-prediction-suggestion">
              <em class="active-prediction-label">{{ activePredictionRecommendation.label }}</em>
              <strong class="active-prediction-probability">{{ formatPercent(activePredictionRecommendation.probability, 1) }}</strong>
            </span>
            <span v-if="activePredictionAlternatives.length" class="active-prediction-subheading">备选</span>
            <span
              v-for="prediction in activePredictionAlternatives"
              :key="prediction.substat_type || prediction.label"
              class="active-prediction-line active-prediction-alternative"
            >
              <em class="active-prediction-label">{{ prediction.label }}</em>
              <strong class="active-prediction-probability">{{ formatPercent(prediction.probability, 1) }}</strong>
            </span>
          </div>
          <span v-else class="active-prediction-empty">等待预测</span>
        </div>
        <div class="active-secondary-actions">
          <button class="active-action-button undo-action" type="button" :disabled="saving || !activeEchoSubstats.length" aria-label="撤回上一次录入的副词条" title="撤回上一次录入的副词条" @click="emit('undo')">
            <span>撤销</span>
          </button>
          <button class="active-action-button discard-action" type="button" :disabled="saving" aria-label="弃置当前声骸" @click="emit('discard')">
            <span>弃置</span>
          </button>
        </div>
        <button class="active-action-button next-action" type="button" :disabled="saving" aria-label="进入下一个声骸" @click="emit('next')">
          <span>下一个</span>
        </button>
      </aside>
    </section>
  </div>
</template>
