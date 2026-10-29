<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed } from 'vue'
import { formatWeight } from '@/helpers/number.formatters.js'

const props = defineProps({
  weight: { type: [String, Number], default: null },
  adjustedWeight: { type: [String, Number], default: null },
  derivedTotalsPending: { type: Boolean, default: false }
})
const hasAdjustedWeight = computed(() => !props.derivedTotalsPending && props.adjustedWeight !== null)
</script>

<template>
  <span class="corrected-weight-display" :aria-busy="derivedTotalsPending ? 'true' : undefined">
    <span>{{ formatWeight(weight) }}</span>
    <template v-if="derivedTotalsPending">
      <span class="mx-1" role="status">(пересчёт)</span>
    </template>
    <template v-else-if="hasAdjustedWeight">
      <font-awesome-icon icon="fa-solid fa-arrow-right" class="mx-1 arrow-icon corrected-weight-arrow" />
      <span>{{ formatWeight(adjustedWeight) }}</span>
    </template>
  </span>
</template>

<style scoped>
.corrected-weight-display {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  max-width: 100%;
  white-space: nowrap;
}
.corrected-weight-arrow { flex-shrink: 0; }
</style>
