<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ScanJobsSettings from '@/dialogs/ScanJobs_Settings.vue'

const route = useRoute()

const registerId = computed(() => {
  const value = route.query.registerId
  return value !== undefined ? Number(value) : null
})

const warehouseId = computed(() => {
  const value = route.query.warehouseId
  return value !== undefined ? Number(value) : null
})

const dealNumber = computed(() => (route.query.dealNumber ? String(route.query.dealNumber) : ''))
</script>

<template>
  <Suspense>
    <ScanJobsSettings
      :mode="'create'"
      :register-id="registerId"
      :warehouse-id="warehouseId"
      :deal-number="dealNumber"
    />
  </Suspense>
</template>
