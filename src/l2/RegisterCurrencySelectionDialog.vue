<script setup>
import { onUnmounted, ref, watch } from 'vue'

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
  <v-dialog v-if="show" :model-value="show" width="420" persistent>
    <v-card>
      <v-card-title class="primary-heading">
        В реестре несколько валют
      </v-card-title>
      <v-card-text>
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
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn
          variant="text"
          data-testid="cancel-currency-selection"
          @click="cancelSelection"
        >
          Отменить
        </v-btn>
        <v-btn
          color="primary"
          :disabled="!selectedCurrency"
          data-testid="confirm-currency-selection"
          @click="confirmSelection"
        >
          Загрузить
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
