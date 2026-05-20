<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import ScanjobMonitor from '@/dialogs/Scanjob_Monitor.vue'
import { scanjobMonitorArea } from '@/helpers/scanjob.monitor.helpers.js'

const props = defineProps({
  id: { type: Number, required: true },
  monitorScope: {
    type: Object,
    default: () => ({
      area: scanjobMonitorArea.Boxes,
      boxId: null,
      bucketIndex: null
    })
  }
})
</script>

<template>
  <ScanjobMonitor :scanjob-id="props.id" :monitor-scope="props.monitorScope" />
</template>
