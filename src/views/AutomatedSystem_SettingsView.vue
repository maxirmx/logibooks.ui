<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import AutomatedSystemSettings from '@/dialogs/AutomatedSystem_Settings.vue'

defineProps({
  register: {
    type: Boolean,
    required: true
  },
  id: {
    type: Number,
    required: false
  }
})
</script>

<template>
  <Suspense>
    <AutomatedSystemSettings :register="register" :id="id" />
  </Suspense>
</template>
