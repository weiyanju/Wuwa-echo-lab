<script setup>
const emit = defineEmits(['start-recording'])
</script>

<template>
  <section class="sample-activation-state evaluation-readiness-state" aria-label="模型评估数据准备">
    <div class="sample-activation-copy">
      <h3>积累历史后自动开启模型评估</h3>
      <p>先建立 20 条上下文，再积累 20 条有效回测。</p>
    </div>
    <button class="button-primary sample-activation-action" type="button" @click="emit('start-recording')">
      去工作台录入
    </button>
  </section>
</template>
