<script setup>
defineProps({
  status: { type: String, required: true, validator: (value) => ['loading', 'error'].includes(value) },
  title: { type: String, required: true },
  description: { type: String, default: '' },
})

const emit = defineEmits(['retry'])
</script>

<template>
  <section v-if="status === 'loading'" class="insight-request-state is-loading" aria-busy="true" :aria-label="title">
    <span class="insight-skeleton insight-skeleton--title"></span>
    <span class="insight-skeleton"></span>
    <span class="insight-skeleton insight-skeleton--short"></span>
  </section>
  <section v-else class="insight-request-state is-error" role="alert">
    <strong>{{ title }}</strong>
    <p>{{ description }}</p>
    <button class="button-secondary" type="button" @click="emit('retry')">重新加载</button>
  </section>
</template>
