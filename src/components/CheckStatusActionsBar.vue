<script setup>

// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import ActionButton from '@/components/ActionButton.vue'

defineProps({
  item: {
    type: Object,
    required: true
  },
  values: {
    type: Object,
    required: true
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

defineEmits(['validate-sw', 'validate-sw-ex', 'validate-fc', 'approve', 'approve-excise'])
</script>

<style scoped>
.action-buttons {
  display: flex;
  gap: 0.25rem;
  background: #ffffff;
  border: 1px solid #74777c;
  border-radius: 0.5rem;
  padding: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2), 0 1px 2px rgba(0, 0, 0, 0.1);
}
</style>

<template>
  <div class="action-buttons">
    <ActionButton
        :item="item"
        icon="fa-solid fa-spell-check"
        tooltip-text="Сохранить и проверить стоп слова"
        :disabled="disabled"
        @click="$emit('validate-sw', values)"
        :iconSize="'2x'"
    />
    <ActionButton
        :item="item"
        icon="fa-solid fa-book-journal-whills"
        tooltip-text="Сохранить и проверить стоп слова с учётом исторических данных"
        :disabled="disabled"
        @click="$emit('validate-sw-ex', values)"
        :iconSize="'2x'"
    />
    <ActionButton
        :item="item"
        icon="fa-solid fa-anchor-circle-check"
        tooltip-text="Сохранить и проверить коды ТН ВЭД"
        :disabled="disabled"
        @click="$emit('validate-fc', values)"
        :iconSize="'2x'"
    />
  </div>
  <div class="action-buttons">
    <ActionButton
        :item="item"
        icon="fa-solid fa-check-circle"
        tooltip-text="Сохранить и согласовать"
        :disabled="disabled"
        @click="$emit('approve', values)"
        variant="green"
        :iconSize="'2x'"
    />
    <ActionButton
        :item="item"
        icon="fa-solid fa-check-circle"
        tooltip-text="Сохранить и согласовать c акцизом"
        :disabled="disabled"
        @click="$emit('approve-excise', values)"
        variant="orange"
        :iconSize="'2x'"
    />
  </div>
</template>
