<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

import chevronDownIcon from '../../assets/icons/chevron-down.svg'
import xIcon from '../../assets/icons/x.svg'
import { canonicalModelLabels, modelOrder } from '../../data/modelPresentation.js'
import { resolveSampleStageGuidePosition } from './sampleStageGuidePosition.js'

defineProps({
  stages: { type: Array, required: true },
  total: { type: Number, required: true },
})

const isOpen = ref(false)
const rootRef = ref(null)
const triggerRef = ref(null)
const popoverRef = ref(null)
const closeRef = ref(null)
const popoverStyle = ref({})
const placement = ref('right')
const modelColumns = modelOrder.map((key) => ({ key, label: canonicalModelLabels[key] }))

function iconMask(source) {
  return { '--icon-url': `url("${source}")` }
}

function syncPosition() {
  if (!isOpen.value || !triggerRef.value || !popoverRef.value) return
  const position = resolveSampleStageGuidePosition({
    triggerRect: triggerRef.value.getBoundingClientRect(),
    panelRect: popoverRef.value.getBoundingClientRect(),
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  })
  placement.value = position.placement
  popoverStyle.value = {
    left: `${position.left}px`,
    top: `${position.top}px`,
    maxWidth: `${position.maxWidth}px`,
  }
}

async function setOpen(nextOpen, { restoreFocus = false } = {}) {
  isOpen.value = nextOpen
  if (nextOpen) {
    await nextTick()
    syncPosition()
    closeRef.value?.focus()
    return
  }
  if (restoreFocus) {
    triggerRef.value?.focus()
  }
}

function handleDocumentPointerDown(event) {
  const isOutside = !rootRef.value?.contains(event.target)
    && !popoverRef.value?.contains(event.target)
  if (isOpen.value && isOutside) {
    setOpen(false)
  }
}

function handleDocumentKeydown(event) {
  if (event.key !== 'Escape' || !isOpen.value) return
  setOpen(false, { restoreFocus: true })
}

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerDown)
  document.addEventListener('keydown', handleDocumentKeydown)
  window.addEventListener('resize', syncPosition)
  document.addEventListener('scroll', syncPosition, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
  document.removeEventListener('keydown', handleDocumentKeydown)
  window.removeEventListener('resize', syncPosition)
  document.removeEventListener('scroll', syncPosition, true)
})
</script>

<template>
  <div ref="rootRef" class="sample-stage-guide">
    <button
      ref="triggerRef"
      class="sample-stage-guide-trigger"
      type="button"
      aria-label="查看阶段与模型权重"
      aria-controls="sample-stage-weight-popover"
      :aria-expanded="String(isOpen)"
      @click="setOpen(!isOpen)"
    >
      <span
        class="ui-line-icon sample-stage-guide-chevron"
        :style="iconMask(chevronDownIcon)"
        aria-hidden="true"
      ></span>
    </button>

    <Teleport to=".app-shell">
      <Transition name="sample-stage-guide">
        <section
          v-if="isOpen"
          id="sample-stage-weight-popover"
          ref="popoverRef"
          class="sample-stage-weight-popover"
          :data-placement="placement"
          :style="popoverStyle"
          role="dialog"
          aria-modal="false"
          aria-labelledby="sample-stage-weight-title"
        >
          <header class="sample-stage-weight-header">
            <div>
              <strong id="sample-stage-weight-title">阶段与模型权重</strong>
              <span>当前 <span class="stats-number">{{ total }}</span> 条</span>
            </div>
            <button
              ref="closeRef"
              class="sample-stage-guide-close"
              type="button"
              aria-label="关闭"
              @click="setOpen(false, { restoreFocus: true })"
            >
              <span class="ui-line-icon" :style="iconMask(xIcon)" aria-hidden="true"></span>
            </button>
          </header>

          <div class="sample-stage-weight-scroll">
            <table class="sample-stage-weight-table">
              <colgroup>
                <col class="sample-stage-weight-stage-column">
                <col class="sample-stage-weight-range-column">
                <col
                  v-for="model in modelColumns"
                  :key="`col-${model.key}`"
                  class="sample-stage-weight-model-column"
                >
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">阶段</th>
                  <th scope="col">样本范围</th>
                  <th v-for="model in modelColumns" :key="model.key" scope="col">
                    {{ model.label }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="stage in stages" :key="stage.label" :class="{ current: stage.current }">
                  <th scope="row">
                    <span
                      v-if="stage.current"
                      class="sample-stage-current-rail"
                      role="img"
                      aria-label="当前阶段"
                    ></span>
                    <strong>{{ stage.caption }}</strong>
                    <small>{{ stage.focus }}</small>
                  </th>
                  <td class="sample-stage-weight-range stats-number">{{ stage.rangeLabel }}</td>
                  <td
                    v-for="model in modelColumns"
                    :key="`${stage.label}-${model.key}`"
                    class="sample-stage-weight-value stats-number"
                  >{{ stage.weights[model.key] }}%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p class="sample-stage-weight-note">样本门槛决定默认配比，规律是否成立仍需结合回测证据。</p>
        </section>
      </Transition>
    </Teleport>
  </div>
</template>
