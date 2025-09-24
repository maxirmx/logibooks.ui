<script setup>
import { computed, unref } from 'vue'

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

const actionDialogTitle = computed(() => props.actionDialog?.title ?? 'Пожалуйста, подождите')
const actionDialogVisible = computed(() => props.actionDialog?.show ?? false)

const onValidationDialogUpdate = (value) => {
  if (!value) {
    props.cancelValidation()
  }
}
</script>

<template>
  <v-dialog :model-value="validationState.show" width="300" @update:model-value="onValidationDialogUpdate">
    <v-card>
      <v-card-title class="primary-heading">
        {{ validationTitle }}
      </v-card-title>
      <v-card-text class="text-center">
        <v-progress-circular :model-value="progressValue" :size="70" :width="7" color="primary">
          {{ progressValue }}%
        </v-progress-circular>
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn variant="text" @click="cancelValidation">Отменить</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

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
