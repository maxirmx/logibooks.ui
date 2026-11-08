<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

// Reusable heading component with parcels statistics tooltip
import { computed } from 'vue'
import { formatParcelsByCheckStatusTooltip } from '@/helpers/parcel.stats.helpers.js'

function formatCountsLines(register) {
  if (!register) return []
  const norm = (v) => {
    if (v === null || v === undefined) return null
    const n = Number(v)
    return isNaN(n) ? null : n
  }
  const parcels = norm(register.parcelsTotal)
  const places = norm(register.placesTotal)
  if (parcels === null && places === null) return []
  return [
    `Всего товаров: ${parcels ?? 0}`,
    `Всего посылок: ${places ?? 0}`
  ]
}

const props = defineProps({
  register: { type: Object, default: null },
  heading: { type: String, required: true }
})

const tooltipText = computed(() => {
  const countLines = formatCountsLines(props.register)
  const stats = formatParcelsByCheckStatusTooltip(props.register)
  const parts = []
  if (countLines.length) parts.push(countLines.join('\n'))
  if (stats) {
    if (parts.length) parts.push('----------------')
    parts.push(stats)
  }
  return parts.join('\n')
})
</script>

<template>
  <v-tooltip v-if="tooltipText || heading" open-delay="300">
    <template #activator="{ props: tipProps }">
      <h1 class="primary-heading" v-bind="tipProps">{{ heading }}</h1>
    </template>
    <template #default>
      <div v-if="tooltipText" style="white-space: pre-line">{{ tooltipText }}</div>
      <div v-else>Нет статистики по посылкам</div>
    </template>
  </v-tooltip>
</template>

<style scoped>
/* No additional styling, inherits existing heading styles */
</style>
