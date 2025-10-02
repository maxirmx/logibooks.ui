<script setup>
import { computed } from 'vue'

const props = defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: 'Ошибка' },
  message: { type: String, default: '' }
})

const emit = defineEmits(['close'])

const dialogVisible = computed(() => props.show)

function closeDialog() {
  emit('close')
}
</script>

<template>
  <v-dialog :model-value="dialogVisible" width="500" persistent>
    <v-card>
      <v-card-title class="primary-heading">
        {{ title }}
      </v-card-title>
      <v-card-text class="text-left" style="white-space: pre-wrap; word-wrap: break-word; line-height: 1.4;" v-html="message">
      </v-card-text>
      <v-card-actions class="justify-center">
        <v-btn color="primary" @click="closeDialog">
          ОК
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>