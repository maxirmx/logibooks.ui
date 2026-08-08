<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { computed } from 'vue'
import AppDialogFrame from '@/components/AppDialogFrame.vue'
import { APP_DIALOG_MAX_WIDTH, APP_DIALOG_SIZES } from '@/helpers/dialog.helpers.js'

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
  <v-dialog
    :model-value="actionDialogVisible"
    :width="APP_DIALOG_SIZES.progress"
    :max-width="APP_DIALOG_MAX_WIDTH"
    :aria-label="actionDialogTitle"
    persistent
  >
    <AppDialogFrame :title="actionDialogTitle" compact>
      <v-progress-circular :model-value="0" indeterminate :size="70" :width="7" color="primary" />
    </AppDialogFrame>
  </v-dialog>
</template>
