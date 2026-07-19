<script setup>
import { formatPercent } from '../../services/formatters.js'

defineProps({
  progress: { type: Number, required: true },
  rows: { type: Array, required: true },
  segments: { type: Array, required: true },
  ariaLabel: { type: String, required: true },
})
</script>

<template>
  <div class="sample-stage-axis" role="img" :aria-label="ariaLabel">
    <div class="sample-stage-track" aria-hidden="true">
      <b :style="{ width: formatPercent(progress) }"></b>
      <span
        v-for="stage in rows"
        :key="`tick-${stage.label}`"
        class="sample-stage-boundary-tick"
        :class="{ active: stage.active, current: stage.current }"
        :style="{ left: formatPercent(stage.axisProgress) }"
      ></span>
      <i class="sample-stage-marker" :style="{ left: formatPercent(progress) }"></i>
    </div>
    <div class="sample-stage-boundaries" aria-hidden="true">
      <span
        v-for="stage in rows"
        :key="`boundary-${stage.label}`"
        :class="{ active: stage.active, current: stage.current }"
        :style="{ left: formatPercent(stage.axisProgress) }"
      ><strong class="stats-number">{{ stage.displayLabel }}</strong></span>
    </div>
    <div class="sample-stage-segments" aria-hidden="true">
      <span
        v-for="stage in segments"
        :key="`segment-${stage.label}`"
        :class="{ active: stage.active, current: stage.current }"
        :style="{ left: formatPercent(stage.captionProgress) }"
      >{{ stage.caption }}</span>
    </div>
  </div>
</template>
