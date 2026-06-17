<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, unref } from 'vue'
import { formatWeight } from '@/helpers/number.formatters.js'
import { getCorrectedWeight } from '@/helpers/weight.correction.helpers.js'

const props = defineProps({
  weight: { type: [String, Number], default: null },
  register: { type: Object, default: null },
  useCorrection: { type: Boolean, default: true }
})

const correctedWeight = computed(() => (
  props.useCorrection ? getCorrectedWeight(props.weight, unref(props.register)) : null
))
const hasCorrectedWeight = computed(() => correctedWeight.value !== null)
</script>

<template>
  <span v-if="hasCorrectedWeight" class="corrected-weight-display">
    <span>{{ formatWeight(weight) }}</span>
    <font-awesome-icon icon="fa-solid fa-arrow-right" class="mx-1 arrow-icon corrected-weight-arrow" />
    <span>{{ formatWeight(correctedWeight) }}</span>
  </span>
  <span v-else>{{ formatWeight(weight) }}</span>
</template>

<style scoped>
.corrected-weight-display {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  max-width: 100%;
  white-space: nowrap;
}

.corrected-weight-arrow {
  flex-shrink: 0;
}
</style>
