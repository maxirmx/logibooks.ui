<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

defineProps({
  item: { type: Object, required: true },
  displayValue: { type: [String, Number, null, undefined], default: '' },
  cellClass: { type: String, default: 'clickable-cell' },
  showBookmark: { type: Boolean, default: false }
})

defineEmits(['click'])
</script>

<template>
  <span
    :class="cellClass"
    @click="$emit('click', item)"
  >
    <font-awesome-icon
      v-if="showBookmark"
      class="bookmark-icon"
      icon="fa-solid fa-bookmark"
    />
    <slot :item="item" :value="displayValue">
      {{ displayValue }}
    </slot>
  </span>
</template>

<style scoped>
.clickable-cell {
  cursor: pointer;
}

.bookmark-icon {
  font-size: 0.9em;
  margin-right: 6px;
}
</style>
