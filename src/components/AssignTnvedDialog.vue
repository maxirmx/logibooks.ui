<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed } from 'vue'

const props = defineProps({
  show: { type: Boolean, required: true },
  selectedIds: { type: Array, required: true },
})

const emit = defineEmits(['update:show', 'confirm'])

const idList = computed(() => props.selectedIds.join(', '))

function close() {
  emit('update:show', false)
}

function confirm() {
  emit('confirm', props.selectedIds)
  close()
}
</script>

<template>
  <v-dialog :model-value="show" width="30%" min-width="250px" @update:model-value="close">
    <v-card>
      <v-card-title>
        ТН ВЭД для выбранных посылок
      </v-card-title>
      <v-card-text>
        <div class="selected-ids-list">{{ idList }}</div>
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn variant="text" @click="close">Отменить</v-btn>
        <v-btn color="orange-darken-3" variant="text" @click="confirm">Назначить</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.selected-ids-list {
  max-height: 200px;
  overflow-y: auto;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.85em;
  word-break: break-all;
}
</style>
