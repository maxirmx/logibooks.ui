<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application.

import ScanjobMonitor from '@/dialogs/Scanjob_Monitor.vue'
import LookupMonitor from '@/dialogs/Scanjob_LookupMonitor.vue'

defineProps({ id: { type: Number, required: true } })
</script>

<template>
  <ScanjobMonitor :key="id" :scanjob-id="id" :lookup-view="LookupMonitor" />
</template>
