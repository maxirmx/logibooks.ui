<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

const props = defineProps({
  item: { type: Object, required: true },
  displayValue: { type: [String, Number, null, undefined], default: '' },
  cellClass: { type: String, default: 'clickable-cell' },
  showBookmark: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  disabledClass: { type: String, default: 'clickable-cell-disabled' }
})

const emit = defineEmits(['click'])

function handleClick() {
  if (props.disabled) {
    return
  }
  emit('click', props.item)
}
</script>

<template>
  <span
    :class="[cellClass, disabled ? disabledClass : '']"
    :aria-disabled="disabled || undefined"
    @click="handleClick"
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

.clickable-cell-disabled {
  cursor: not-allowed;
}

.bookmark-icon {
  font-size: 0.9em;
  margin-right: 6px;
}
</style>
