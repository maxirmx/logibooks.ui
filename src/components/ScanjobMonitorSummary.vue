<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import '@/assets/styles/scanjob-monitor.css'

defineOptions({ name: 'ScanjobMonitorSummary' })

const props = defineProps({
  cards: { type: Array, default: () => [] }
})
</script>

<template>
  <div class="monitor-summary" data-testid="scanjob-monitor-summary">
    <div v-for="card in props.cards" :key="card.key" class="monitor-summary-item">
      <div class="monitor-summary-content">
        <div class="monitor-summary-label">{{ card.label }}</div>
        <div class="monitor-summary-value">
          <span v-if="card.valueClass" :class="card.valueClass">
            {{ card.value }}
          </span>
          <template v-else>
            {{ card.value }}
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
