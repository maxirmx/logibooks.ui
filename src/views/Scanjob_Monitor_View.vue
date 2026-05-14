<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import ScanjobMonitor from '@/dialogs/Scanjob_Monitor.vue'

const props = defineProps({
  id: { type: Number, required: true }
})
</script>

<template>
  <ScanjobMonitor :scanjob-id="props.id" />
</template>
