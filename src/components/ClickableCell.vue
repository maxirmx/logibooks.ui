<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks frontend application

defineProps({
  item: { type: Object, required: true },
  displayValue: { type: [String, Number, null, undefined], default: '' },
  cellClass: { type: String, default: 'clickable-cell' }
})

defineEmits(['click'])
</script>

<template>
  <span
    :class="cellClass"
    @click="$emit('click', item)"
  >
    <slot :item="item" :value="displayValue">
      {{ displayValue }}
    </slot>
  </span>
</template>

<style scoped>
.clickable-cell {
  cursor: pointer;
}
</style>
