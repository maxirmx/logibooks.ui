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

<template>
  <div class="action-buttons">
    <ActionButton
        :item="item"
        icon="fa-solid fa-spell-check"
        tooltip-text="Сохранить и проверить стоп слова"
        :disabled="disabled"
        @click="$emit('validate-sw', values)"
        :iconSize="'1x'"
    />
    <ActionButton
        :item="item"
        icon="fa-solid fa-book-journal-whills"
        tooltip-text="Сохранить и проверить стоп слова с учётом исторических данных"
        :disabled="disabled"
        @click="$emit('validate-sw-ex', values)"
        :iconSize="'1x'"
    />
    <ActionButton
        :item="item"
        icon="fa-solid fa-anchor-circle-check"
        tooltip-text="Сохранить и проверить коды ТН ВЭД"
        :disabled="disabled"
        @click="$emit('validate-fc', values)"
        :iconSize="'1x'"
    />
    <ActionButton
        :item="item"
        icon="fa-solid fa-check-circle"
        tooltip-text="Сохранить и согласовать"
        :disabled="disabled"
        @click="$emit('approve', values)"
        variant="green"
        :iconSize="'1x'"
    />
    <ActionButton
        :item="item"
        icon="fa-solid fa-check-circle"
        tooltip-text="Сохранить и согласовать c акцизом"
        :disabled="disabled"
        @click="$emit('approve-excise', values)"
        variant="orange"
        :iconSize="'1x'"
    />
  </div>
</template>
