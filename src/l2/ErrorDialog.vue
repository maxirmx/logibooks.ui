<script setup>
 
import { computed, onUnmounted, watch } from 'vue'
import AppDialogFrame from '@/components/AppDialogFrame.vue'
import {
  APP_DIALOG_BUTTON_PROPS,
  APP_DIALOG_MAX_WIDTH,
  APP_DIALOG_SIZES
} from '@/helpers/dialog.helpers.js'

const props = defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: 'Ошибка' },
  message: { type: String, default: '' },
  missingHeaders: { type: Array, default: () => [] },
  missingColumns: { type: Array, default: () => [] }
})

const emit = defineEmits(['close'])

const dialogVisible = computed(() => props.show)

const hasMissingItems = computed(
  () => props.missingHeaders.length > 0 || props.missingColumns.length > 0
)

function closeDialog() {
  emit('close')
}

function handleKeydown(event) {
  if (props.show && (event.key === 'Enter' || event.key === 'Escape')) {
    event.preventDefault()
    closeDialog()
  }
}

// Add/remove event listener when dialog opens/closes
watch(() => props.show, (newValue) => {
  if (newValue) {
    document.addEventListener('keydown', handleKeydown)
  } else {
    document.removeEventListener('keydown', handleKeydown)
  }
})

// Cleanup on unmount
onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <v-dialog
    :model-value="dialogVisible"
    :width="APP_DIALOG_SIZES.medium"
    :max-width="APP_DIALOG_MAX_WIDTH"
    persistent
    :aria-label="title"
  >
    <AppDialogFrame :title="title" tone="error">
        <p v-if="message" class="error-dialog__message" data-testid="error-dialog-message">
          {{ message }}
        </p>

        <div v-if="hasMissingItems" class="error-dialog__details">
          <section
            v-if="missingHeaders.length"
            class="error-dialog__list"
            data-testid="error-dialog-missing-headers"
          >
            <h3 class="error-dialog__list-title">Неизвестные столбцы реестра</h3>
            <ul>
              <li v-for="header in missingHeaders" :key="`header-${header}`">
                {{ header }}
              </li>
            </ul>
          </section>
          <section
            v-if="missingColumns.length"
            class="error-dialog__list"
            data-testid="error-dialog-missing-columns"
          >
            <h3 class="error-dialog__list-title">Не найдены столбцы реестра</h3>
            <ul>
              <li v-for="column in missingColumns" :key="`column-${column}`">
                {{ column }}
              </li>
            </ul>
          </section>
        </div>
      <template #actions>
        <v-btn
          v-bind="APP_DIALOG_BUTTON_PROPS.primary"
          data-testid="error-dialog-close"
          @click="closeDialog"
        >
          Закрыть
        </v-btn>
      </template>
    </AppDialogFrame>
  </v-dialog>
</template>

<style scoped>
.error-dialog__message {
  margin: 0;
  font-size: 1rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.error-dialog__details {
  display: grid;
  gap: 12px;
  margin-top: 16px;
}

.error-dialog__list {
  padding: 14px 16px;
  border: 1px solid #e4e7ec;
  border-radius: 8px;
  background: #f8fafc;
}

.error-dialog__list-title {
  margin: 0 0 10px;
  color: rgba(0, 0, 0, 0.82);
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.4;
}

.error-dialog__list ul {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.error-dialog__list li {
  position: relative;
  padding-left: 16px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.error-dialog__list li::before {
  position: absolute;
  top: 0.65em;
  left: 1px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #000;
  content: '';
  transform: translateY(-50%);
}

</style>
