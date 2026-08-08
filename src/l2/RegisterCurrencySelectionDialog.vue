<script setup>
import { onUnmounted, ref, watch } from 'vue'
import AppDialogFrame from '@/components/AppDialogFrame.vue'
import {
  APP_DIALOG_BUTTON_PROPS,
  APP_DIALOG_MAX_WIDTH,
  APP_DIALOG_SIZES
} from '@/helpers/dialog.helpers.js'

const props = defineProps({
  show: { type: Boolean, default: false },
  currencies: { type: Array, default: () => [] }
})

const emit = defineEmits(['select', 'cancel'])
const selectedCurrency = ref(null)

function confirmSelection() {
  if (selectedCurrency.value) {
    emit('select', selectedCurrency.value)
  }
}

function cancelSelection() {
  emit('cancel')
}

function handleKeydown(event) {
  if (!props.show) return

  if (event.key === 'Escape') {
    event.preventDefault()
    cancelSelection()
  } else if (event.key === 'Enter' && selectedCurrency.value) {
    event.preventDefault()
    confirmSelection()
  }
}

watch(() => props.show, (show) => {
  selectedCurrency.value = null
  if (show) {
    document.addEventListener('keydown', handleKeydown)
  } else {
    document.removeEventListener('keydown', handleKeydown)
  }
}, { immediate: true })

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <v-dialog
    v-if="show"
    :model-value="show"
    :width="APP_DIALOG_SIZES.small"
    :max-width="APP_DIALOG_MAX_WIDTH"
    aria-label="В реестре несколько валют"
    persistent
  >
    <AppDialogFrame title="В реестре несколько валют">
        <p>
          Выберите валюту посылок для загрузки. Посылки в других валютах будут пропущены.
        </p>
        <div
          class="radio-group"
          data-testid="register-currency-options"
        >
          <label
            v-for="currency in currencies"
            :key="currency"
            class="radio-styled"
          >
            <input
              v-model="selectedCurrency"
              type="radio"
              name="registerCurrency"
              :value="currency"
            />
            <span class="radio-mark"></span>
            {{ currency }}
          </label>
        </div>
      <template #actions>
        <v-btn
          v-bind="APP_DIALOG_BUTTON_PROPS.secondary"
          data-testid="cancel-currency-selection"
          @click="cancelSelection"
        >
          Отменить
        </v-btn>
        <v-btn
          v-bind="APP_DIALOG_BUTTON_PROPS.primary"
          :disabled="!selectedCurrency"
          data-testid="confirm-currency-selection"
          @click="confirmSelection"
        >
          Загрузить
        </v-btn>
      </template>
    </AppDialogFrame>
  </v-dialog>
</template>
