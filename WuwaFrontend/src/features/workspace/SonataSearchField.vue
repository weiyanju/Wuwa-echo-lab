<script setup>
import clearIcon from '../../assets/icons/x.svg'
import searchIcon from '../../assets/icons/search.svg'

const query = defineModel({ type: String, default: '' })

function iconMask(source) { return { '--icon-url': `url("${source}")` } }
</script>

<template>
  <div class="sonata-search-field" role="search">
    <span class="ui-line-icon sonata-search-icon" :style="iconMask(searchIcon)" aria-hidden="true"></span>
    <input
      v-model="query"
      type="search"
      inputmode="search"
      aria-label="筛选套装"
      placeholder="输入名称筛选"
      autocomplete="off"
    />
    <button
      v-if="query"
      type="button"
      class="sonata-search-clear"
      aria-label="清除套装筛选"
      @click="query = ''"
    >
      <span class="ui-line-icon sonata-search-clear-icon" :style="iconMask(clearIcon)" aria-hidden="true"></span>
    </button>
  </div>
</template>
