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
</script>

<template>
  <v-dialog v-model="validationState.show" width="300">
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

  <v-dialog v-model="actionDialog.show" width="300">
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
