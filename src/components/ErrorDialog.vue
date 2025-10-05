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
  <v-dialog :model-value="dialogVisible" width="900" persistent>
    <v-card>
      <v-card-title class="primary-heading">
        {{ title }}
      </v-card-title>
      <v-card-text class="text-left">
        <template v-if="hasMissingItems">
          <div class="error-dialog__lists">
            <div v-if="missingHeaders.length" class="error-dialog__list">
              <p class="error-dialog__list-title">
                Не найдены параметры посылок для столбцов реестра:
              </p>
              <ul>
                <li v-for="header in missingHeaders" :key="`header-${header}`">
                  {{ header }}
                </li>
              </ul>
            </div>
            <div v-if="missingColumns.length" class="error-dialog__list">
              <p class="error-dialog__list-title">
                Не найдены столбцы реестра для параметров посылок:
              </p>
              <ul>
                <li v-for="column in missingColumns" :key="`column-${column}`">
                  {{ column }}
                </li>
              </ul>
            </div>
          </div>
        </template>
        <template v-else>
          {{ message }}
        </template>
      </v-card-text>
      <v-card-actions class="justify-center">
        <v-btn color="primary" @click="closeDialog">
          ОК
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.error-dialog__lists {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.error-dialog__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.error-dialog__list-title {
  font-weight: 600;
}

.error-dialog__list ul {
  margin: 0;
  padding-left: 20px;
}

.error-dialog__list li + li {
  margin-top: 4px;
}
</style>
