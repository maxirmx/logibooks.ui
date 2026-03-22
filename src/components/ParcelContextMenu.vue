<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

defineProps({
  contextMenu: { type: Object, required: true },
  selectedCount: { type: Number, required: true },
})

const emit = defineEmits(['assign-tnved'])
</script>

<template>
  <v-menu
    :model-value="contextMenu.show"
    :target="[contextMenu.x, contextMenu.y]"
    :close-on-content-click="true"
    @update:model-value="val => contextMenu.show = val"
  >
    <v-list density="compact">
      <v-list-item @click="emit('assign-tnved')">
        <v-list-item-title>
          Назначить ТН ВЭД ({{ selectedCount }})
        </v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>
