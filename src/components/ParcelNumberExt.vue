<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import ClickableCell from '@/components/ClickableCell.vue'
import ActionButton from '@/components/ActionButton.vue'

defineProps({
  item: { type: Object, required: true },
  fieldName: { type: String, default: 'postingNumber' }, // field to display (postingNumber for Ozon, shk for WBR)
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['click', 'fellows'])

function handleClick(item) {
  emit('click', item)
}

function handleFellowsClick(item) {
  emit('fellows', item)
}
</script>

<template>
  <div class="action-buttons">
    <ClickableCell 
      :item="item" 
      :display-value="item[fieldName] || ''" 
      cell-class="truncated-cell clickable-cell" 
      :disabled="disabled"
      @click="handleClick" 
    />
    <span
      v-if="item?.matchesExportFeeCategory"
      class="export-fee-category-marker"
      role="img"
      title="Код ТН ВЭД входит в справочник экспортных сборов"
      aria-label="Код ТН ВЭД входит в справочник экспортных сборов"
    >С</span>
    <ActionButton 
      v-if="item?.fellowItems?.length > 0 && !item?.blockedByFellowItem && !item?.excsiseByFellowItem"
      :item="item" 
      icon="fa-solid fa-comment-dots" 
      tooltip-text="Есть товары с тем же номером посылки" 
      @click="handleFellowsClick" 
      :disabled="disabled" 
    />
    <ActionButton 
      v-if="item?.blockedByFellowItem"
      :item="item" 
      icon="fa-solid fa-comment-slash" 
      tooltip-text="Есть запрет товара с тем же номером посылки" 
      @click="handleFellowsClick" 
      :disabled="disabled" 
      variant="red"
    />
    <ActionButton 
      v-if="item?.excsiseByFellowItem"
      :item="item" 
      icon="fa-solid fa-comment-dollar" 
      tooltip-text="Есть подакцизный товар с тем же номером посылки" 
      @click="handleFellowsClick" 
      :disabled="disabled" 
      variant="orange"
    />
    <ActionButton 
      v-if="item?.markedByFellowItem"
      :item="item" 
      icon="fa-solid fa-comment-nodes" 
      tooltip-text="Товар с тем же номером посылки помечен партнёром" 
      @click="handleFellowsClick" 
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
.export-fee-category-marker {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  min-width: 1.2em;
  height: 1.2em;
  border: 1px solid currentColor;
  border-radius: 2px;
  font-weight: 600;
  line-height: 1;
}
</style>
