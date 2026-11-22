<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application.

import LookupMonitor from '@/dialogs/Scanjob_LookupMonitor.vue'

defineProps({ id: { type: Number, required: true } })
</script>

<template>
  <LookupMonitor :key="id" :scanjob-id="id" />
</template>
