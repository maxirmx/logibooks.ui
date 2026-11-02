<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (http://www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, unref } from 'vue'
import ActionDialog from '@/l2/ActionDialog.vue'
import AppDialogFrame from '@/components/AppDialogFrame.vue'
import {
  APP_DIALOG_BUTTON_PROPS,
  APP_DIALOG_MAX_WIDTH,
  APP_DIALOG_SIZES
} from '@/helpers/dialog.helpers.js'

const props = defineProps({
  validationState: { type: Object, required: true },
  progressPercent: { type: [Number, Object], default: null },
  cancelValidation: { type: Function, required: true },
  actionDialog: { type: Object, required: true }
})

const refreshingTotals = computed(() => props.validationState?.phase === 'refreshing-totals')
const finalizing = computed(() => refreshingTotals.value || props.validationState?.phase === 'finalizing')
const validationTitle = computed(() => refreshingTotals.value ? 'Пересчёт итогов'
  : finalizing.value ? 'Завершение обработки'
  : props.validationState?.operation === 'lookup-feacn-codes'
    ? 'Подбор кодов ТН ВЭД'
    : 'Проверка реестра'
)

const progressValue = computed(() => {
  const value = unref(props.progressPercent)
  return !finalizing.value && Number.isFinite(value) ? value : null
})

const onValidationDialogUpdate = (value) => {
  if (!value) {
    props.cancelValidation()
  }
}
</script>

<template>
  <v-dialog
    :model-value="validationState.show"
    :width="APP_DIALOG_SIZES.progress"
    :max-width="APP_DIALOG_MAX_WIDTH"
    :aria-label="validationTitle"
    :persistent="refreshingTotals"
    @update:model-value="onValidationDialogUpdate"
  >
    <AppDialogFrame :title="validationTitle" compact>
      <v-progress-circular
        :class="{ 'register-progress--spinning': progressValue === null }"
        :model-value="progressValue ?? 0"
        :indeterminate="progressValue === null ? 'disable-shrink' : false"
        :size="70"
        :width="7"
        color="primary"
      >
        <span v-if="progressValue !== null">{{ progressValue }}%</span>
      </v-progress-circular>
      <template #actions>
        <v-btn v-bind="APP_DIALOG_BUTTON_PROPS.secondary" :disabled="refreshingTotals" @click="cancelValidation">
          Отменить
        </v-btn>
      </template>
    </AppDialogFrame>
  </v-dialog>

  <ActionDialog :action-dialog="actionDialog" />
</template>

<style scoped>
.register-progress--spinning :deep(svg) {
  will-change: transform;
}
</style>
