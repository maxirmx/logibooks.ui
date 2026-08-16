<script setup>
import { computed } from 'vue'

const props = defineProps({
  boxId: { type: Number, required: true },
  boxCode: { type: String, default: null },
  disabled: { type: Boolean, default: false }
})

defineEmits(['clear'])

const label = computed(() => `Коробка: ${props.boxCode || `#${props.boxId}`}`)
</script>

<template>
  <v-chip
    color="primary"
    variant="tonal"
    closable
    :disabled="disabled"
    data-testid="parcel-box-scope"
    @click:close="$emit('clear')"
  >
    {{ label }}
  </v-chip>
</template>
