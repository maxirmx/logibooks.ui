<script setup>
import { computed } from 'vue'
import {
  buildWeightCorrectionMessage,
  WEIGHT_CORRECTION_CONFIRM_BUTTON_PROPS,
  WEIGHT_CORRECTION_CONFIRM_DIALOG_PROPS,
  WEIGHT_CORRECTION_CHOICE
} from '@/helpers/weight.correction.helpers.js'

const props = defineProps({
  state: { type: Object, required: true }
})

const emit = defineEmits(['choose'])

const visible = computed(() => props.state?.show === true)
const message = computed(() => buildWeightCorrectionMessage(props.state?.coefficientText ?? ''))
</script>

<template>
  <v-dialog
    :model-value="visible"
    v-bind="WEIGHT_CORRECTION_CONFIRM_DIALOG_PROPS"
    persistent
  >
    <v-card>
      <v-card-title>
        Подтверждение
      </v-card-title>
      <v-card-text>
        {{ message }}
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          @click="emit('choose', WEIGHT_CORRECTION_CHOICE.Cancel)"
        >
          Отменить сохранение
        </v-btn>
        <v-btn
          @click="emit('choose', WEIGHT_CORRECTION_CHOICE.Skip)"
        >
          Сохранить без поправки
        </v-btn>
        <v-btn
          v-bind="WEIGHT_CORRECTION_CONFIRM_BUTTON_PROPS"
          @click="emit('choose', WEIGHT_CORRECTION_CHOICE.Apply)"
        >
          Сохранить с поправкой
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
