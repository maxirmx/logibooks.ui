<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { computed } from 'vue'

const props = defineProps({
  actionDialog: { type: Object, required: true }
})

const actionDialogTitle = computed(
  () => props.actionDialog?.title ?? 'Пожалуйста, подождите'
)
const actionDialogVisible = computed(
  () => props.actionDialog?.show ?? false
)
</script>

<template>
  <v-dialog :model-value="actionDialogVisible" width="300" persistent>
    <v-card>
      <v-card-title class="primary-heading">
        {{ actionDialogTitle }}
      </v-card-title>
      <v-card-text class="text-center">
        <v-progress-circular :model-value="0" indeterminate :size="70" :width="7" color="primary" />
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
