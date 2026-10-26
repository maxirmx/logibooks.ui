<script setup>
import ActionDialog from '@/l2/ActionDialog.vue'
import ErrorDialog from '@/l2/ErrorDialog.vue'
import AppDialogFrame from '@/components/AppDialogFrame.vue'
import { APP_DIALOG_BUTTON_PROPS, APP_DIALOG_MAX_WIDTH, APP_DIALOG_SIZES } from '@/helpers/dialog.helpers.js'

defineProps({ state: { type: Object, required: true } })
const emit = defineEmits(['close-error', 'summary-visible', 'cancel'])
const statistics = [
  ['dangerousGoodsCount', 'Посылок с признаком «Опасный груз»'],
  ['markedCount', 'Всего запретов'],
  ['newlyMarkedCount', 'Новых запретов'],
  ['excludedCount', 'Посылок, не переданных партнёру'],
  ['registerOnlyCount', 'Посылок в реестре, но не в манифесте', true],
  ['manifestOnlyCount', 'Посылок в манифесте, но не в реестре', true]
]
</script>

<template>
  <ActionDialog :action-dialog="state.progress" cancellable :cancel-disabled="!state.canCancel" :cancelling="state.cancelling" @cancel="emit('cancel')" />
  <ErrorDialog :show="state.error.show" title="Ошибка сверки реестра" :message="state.error.message" @close="emit('close-error')" />
  <v-dialog :model-value="state.summaryVisible" @update:model-value="emit('summary-visible', $event)" :width="APP_DIALOG_SIZES.medium" :max-width="APP_DIALOG_MAX_WIDTH" aria-label="Результаты сверки реестра">
    <AppDialogFrame title="Результаты сверки реестра">
      <dl v-if="state.result" class="form-row-1 form-compact ga-2" data-testid="reconciliation-statistics">
        <template v-for="[key, label, hideWhenZero] in statistics" :key="key">
          <div v-if="!hideWhenZero || state.result[key] !== 0" class="form-group">
            <dt class="label-0 mb-0 w-75">{{ label }}:</dt>
            <dd class="readonly-field w-25 flex-grow-0" :data-testid="`reconciliation-${key}`">{{ state.result[key] }}</dd>
          </div>
        </template>
      </dl>
      <template #actions>
        <v-btn v-bind="APP_DIALOG_BUTTON_PROPS.primary" @click="emit('summary-visible', false)">Закрыть</v-btn>
      </template>
    </AppDialogFrame>
  </v-dialog>
</template>
