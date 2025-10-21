<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

// Reusable heading component with parcels statistics tooltip
import { onMounted, ref, watch, computed } from 'vue'
import { useRegistersStore } from '@/stores/registers.store.js'
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
  registerId: { type: Number, required: true },
  register: { type: Object, default: null },
  heading: { type: String, required: true }
})

const registersStore = useRegistersStore()
// Local snapshot so we can show existing data immediately then refresh
const localRegister = ref(props.register)

// Refresh logic: fetch updated register data in background
async function refreshRegister() {
  try {
    await registersStore.getById(props.registerId)
    if (registersStore.item?.id === props.registerId) {
      localRegister.value = { ...registersStore.item }
    }
  } catch {
    // Silently ignore – tooltip is optional
  }
}

onMounted(() => {
  // Initial async refresh (non-blocking)
  refreshRegister()
})

// Keep local register in sync if parent updates it externally
watch(() => props.register, (val) => {
  if (val) localRegister.value = val
})

const tooltipText = computed(() => {
  const countLines = formatCountsLines(localRegister.value)
  const stats = formatParcelsByCheckStatusTooltip(localRegister.value)
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
