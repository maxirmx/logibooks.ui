<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed } from 'vue'
import ActionButton from '@/components/ActionButton.vue'

const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  hasImage: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['view', 'remove'])

const isDisabled = computed(() => !props.hasImage)
</script>

<template>
  <div class="action-buttons">
    <ActionButton
      :item="item"
      icon="fa-solid fa-eye"
      tooltip-text="Посмотреть изображение для тех. документации"
      :disabled="isDisabled"
      @click="emit('view', item)"
      :iconSize="'1x'"
    />
    <ActionButton
      :item="item"
      icon="fa-solid fa-trash-can"
      tooltip-text="Удалить изображение для тех. документации"
      :disabled="isDisabled"
      @click="emit('remove', item)"
      variant="red"
      :iconSize="'1x'"
    />
  </div>
</template>
