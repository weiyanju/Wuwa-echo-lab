<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: { type: String, required: true },
  description: { type: String, required: true },
  current: { type: Number, default: 0 },
  target: { type: Number, required: true },
  progressLabel: { type: String, required: true },
  strategyText: { type: String, default: '' },
  actionLabel: { type: String, default: '去工作台录入' },
})

const emit = defineEmits(['action'])
const safeTarget = computed(() => Math.max(1, Math.trunc(props.target)))
const safeCurrent = computed(() => Math.min(Math.max(0, Math.trunc(props.current)), safeTarget.value))
const percentText = computed(() => `${(safeCurrent.value / safeTarget.value * 100).toFixed(0)}%`)
</script>

<template>
  <section class="sample-readiness-panel" :aria-label="title">
    <div class="sample-readiness-copy">
      <span class="sample-readiness-eyebrow">数据准备</span>
      <h3>{{ title }}</h3>
      <p>{{ description }}</p>
      <small v-if="strategyText">{{ strategyText }}</small>
    </div>
    <div class="sample-readiness-progress">
      <p><strong>{{ safeCurrent }}</strong><span>/ {{ safeTarget }}</span></p>
      <progress :value="safeCurrent" :max="safeTarget">{{ percentText }}</progress>
      <small>{{ progressLabel }}</small>
    </div>
    <div v-if="$slots.detail" class="sample-readiness-detail">
      <slot name="detail"></slot>
    </div>
    <button class="button-primary" type="button" @click="emit('action')">{{ actionLabel }}</button>
  </section>
</template>
