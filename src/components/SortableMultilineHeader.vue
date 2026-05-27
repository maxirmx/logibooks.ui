<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed } from 'vue'

const props = defineProps({
  lines: {
    type: Array,
    required: true
  },
  column: {
    type: Object,
    default: null
  },
  isSorted: {
    type: Function,
    default: null
  },
  getSortIcon: {
    type: Function,
    default: null
  }
})

const sorted = computed(() => {
  return props.column && typeof props.isSorted === 'function'
    ? props.isSorted(props.column)
    : false
})

const sortIcon = computed(() => {
  return props.column && typeof props.getSortIcon === 'function'
    ? props.getSortIcon(props.column)
    : null
})

const alignmentClass = computed(() => {
  return props.column?.align ? `sortable-multiline-header--${props.column.align}` : null
})
</script>

<template>
  <div class="sortable-multiline-header v-data-table-header__content" :class="alignmentClass">
    <span class="multiline-header">
      <span v-for="line in lines" :key="line">{{ line }}</span>
    </span>
    <v-icon
      v-if="sorted && sortIcon"
      class="v-data-table-header__sort-icon register-sort-icon"
      :icon="sortIcon"
      size="small"
    />
  </div>
</template>

<style scoped>
.sortable-multiline-header {
  align-items: center;
  display: inline-flex;
  gap: 4px;
}

.multiline-header {
  display: inline-flex;
  flex-direction: column;
  line-height: 1.15;
}

.multiline-header > span {
  white-space: nowrap;
}

.register-sort-icon {
  flex: 0 0 auto;
}

.sortable-multiline-header--end {
  flex-direction: row-reverse;
  justify-content: flex-end;
  text-align: right;
}

.sortable-multiline-header--center {
  justify-content: center;
  text-align: center;
}
</style>
