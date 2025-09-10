<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import ClickableCell from '@/components/ClickableCell.vue'
import ActionButton from '@/components/ActionButton.vue'

const props = defineProps({
  item: { type: Object, required: true },
  fieldName: { type: String, default: 'postingNumber' }, // field to display (postingNumber for Ozon, shk for WBR)
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['click'])

function handleClick(item) {
  emit('click', item)
}
</script>

<template>
  <div class="action-buttons">
    <ClickableCell 
      :item="item" 
      :display-value="item[fieldName] || ''" 
      cell-class="truncated-cell clickable-cell" 
      @click="handleClick" 
    />
    <ActionButton 
      v-if="item?.fellowItems?.length > 0 && !item?.blockedByFellowItem && !item?.excsiseByFellowItem"
      :item="item" 
      icon="fa-solid fa-comment-dots" 
      tooltip-text="Есть товары с тем же номером посылки" 
      @click="handleClick" 
      :disabled="disabled" 
    />
    <ActionButton 
      v-if="item?.blockedByFellowItem"
      :item="item" 
      icon="fa-solid fa-comment-slash" 
      tooltip-text="Запрет из-за товара с тем же номером посылки" 
      @click="handleClick" 
      :disabled="disabled" 
      variant="red"
    />
    <ActionButton 
      v-if="item?.excsiseByFellowItem"
      :item="item" 
      icon="fa-solid fa-comment-dollar" 
      tooltip-text="Акциз из-за товара с тем же номером посылки" 
      @click="handleClick" 
      :disabled="disabled" 
      variant="orange"
    />
    <ActionButton 
      v-if="item?.markedByFellowItem"
      :item="item" 
      icon="fa-solid fa-comment-nodes" 
      tooltip-text="Товара с тем же номером посылки помечен партнёром" 
      @click="handleClick" 
      :disabled="disabled" 
      variant="blue"
    />
  </div>
</template>

<style scoped>
.action-buttons {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
</style>
