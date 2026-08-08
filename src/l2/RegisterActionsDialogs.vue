<script setup>
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
  progressPercent: { type: [Number, Object], required: true },
  cancelValidation: { type: Function, required: true },
  actionDialog: { type: Object, required: true }
})

const validationTitle = computed(() =>
  props.validationState?.operation === 'lookup-feacn-codes'
    ? 'Подбор кодов ТН ВЭД'
    : 'Проверка реестра'
)

const progressValue = computed(() => unref(props.progressPercent) ?? 0)

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
    @update:model-value="onValidationDialogUpdate"
  >
    <AppDialogFrame :title="validationTitle" compact>
      <v-progress-circular :model-value="progressValue" :size="70" :width="7" color="primary">
        {{ progressValue }}%
      </v-progress-circular>
      <template #actions>
        <v-btn v-bind="APP_DIALOG_BUTTON_PROPS.secondary" @click="cancelValidation">
          Отменить
        </v-btn>
      </template>
    </AppDialogFrame>
  </v-dialog>

  <ActionDialog :action-dialog="actionDialog" />
</template>
