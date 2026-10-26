<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { computed } from 'vue'
import AppDialogFrame from '@/components/AppDialogFrame.vue'
import { APP_DIALOG_BUTTON_PROPS, APP_DIALOG_MAX_WIDTH, APP_DIALOG_SIZES } from '@/helpers/dialog.helpers.js'

const props = defineProps({
  actionDialog: { type: Object, required: true },
  cancellable: { type: Boolean, default: false },
  cancelDisabled: { type: Boolean, default: false },
  cancelling: { type: Boolean, default: false }
})

const emit = defineEmits(['cancel'])

const progressPercent = computed(() => Number.isFinite(props.actionDialog?.percent) ? Math.max(0, Math.min(100, props.actionDialog.percent)) : null)

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
      <v-progress-circular :model-value="progressPercent ?? 0" :indeterminate="progressPercent === null" :size="70" :width="7" color="primary">
        <span v-if="progressPercent !== null">{{ progressPercent }}%</span>
      </v-progress-circular>
      <template v-if="cancellable" #actions>
        <v-btn v-bind="APP_DIALOG_BUTTON_PROPS.secondary" :disabled="cancelDisabled || cancelling" data-testid="operation-cancel" @click="emit('cancel')">
          {{ cancelling ? 'Отмена…' : 'Отменить' }}
        </v-btn>
      </template>
    </AppDialogFrame>
  </v-dialog>
</template>
