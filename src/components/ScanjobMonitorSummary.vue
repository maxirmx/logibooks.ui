<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import '@/assets/styles/scanjob-monitor.css'

defineOptions({ name: 'ScanjobMonitorSummary' })

const props = defineProps({
  cards: { type: Array, default: () => [] },
  printQueue: { type: Object, default: null }
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
    <div v-if="props.printQueue" class="monitor-summary-item" data-testid="scanjob-monitor-print-queue">
      <div class="monitor-summary-content">
        <div class="monitor-summary-label">Этикетки в очереди печати</div>
        <div class="monitor-summary-value">{{ props.printQueue.queued }}{{ props.printQueue.paused ? ' — приостановлена' : '' }}</div>
      </div>
    </div>
  </div>
</template>
