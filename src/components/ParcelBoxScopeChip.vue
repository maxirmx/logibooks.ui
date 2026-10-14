<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (http://www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

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
