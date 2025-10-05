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
      <v-card-text class="text-left"  >
        {{ missingHeaders.length == 0 && missingColumns.length == 0 ? message : '' }}
        {{ missingHeaders.length > 0 ? 'Не найдены параметры посылок для столбцов реестра: ' + missingHeaders.join(', ') : '' }}
        {{ missingColumns.length > 0 ? 'Не найдены столбцы реестра для параметров посылок: ' + missingColumns.join(', ') : '' }}
      </v-card-text>
      <v-card-actions class="justify-center">
        <v-btn color="primary" @click="closeDialog">
          ОК
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>