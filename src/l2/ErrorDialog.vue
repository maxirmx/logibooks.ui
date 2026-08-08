<script setup>
 
import { computed, onUnmounted, watch } from 'vue'

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
    width="560"
    max-width="calc(100vw - 32px)"
    persistent
    aria-labelledby="error-dialog-title"
  >
    <v-card class="error-dialog">
      <v-card-title id="error-dialog-title" class="error-dialog__title">
        <span class="error-dialog__icon" aria-hidden="true">!</span>
        <span>{{ title }}</span>
      </v-card-title>
      <v-card-text class="error-dialog__content">
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
      </v-card-text>
      <v-card-actions class="error-dialog__actions">
        <v-btn color="primary" variant="flat" data-testid="error-dialog-close" @click="closeDialog">
          Закрыть
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.error-dialog {
  max-height: min(80vh, 640px);
  overflow: hidden;
  border-radius: 12px;
}

.error-dialog__title {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 22px 24px 12px;
  color: #b42318;
  font-size: 1.25rem;
  font-weight: 600;
  line-height: 1.35;
  white-space: normal;
  overflow-wrap: anywhere;
}

.error-dialog__icon {
  display: inline-flex;
  flex: 0 0 28px;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  margin-top: 1px;
  border-radius: 50%;
  color: #fff;
  background: #d92d20;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1;
}

.error-dialog__content {
  min-height: 0;
  padding: 8px 24px 20px;
  overflow-y: auto;
  color: rgba(0, 0, 0, 0.78);
}

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
  background: #d92d20;
  content: '';
  transform: translateY(-50%);
}

.error-dialog__actions {
  justify-content: flex-end;
  padding: 12px 20px 16px;
  border-top: 1px solid #eaecf0;
}

@media (max-width: 600px) {
  .error-dialog__title {
    padding: 18px 18px 10px;
    font-size: 1.1rem;
  }

  .error-dialog__content {
    padding: 8px 18px 18px;
  }

  .error-dialog__actions {
    padding: 10px 14px 14px;
  }
}
</style>
