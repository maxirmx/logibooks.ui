<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed } from 'vue'
import { useRoute } from 'vue-router'
import ScanjobsSettings from '@/dialogs/Scanjob_Settings.vue'

const route = useRoute()

function parseQueryNumber(value) {
  if (Array.isArray(value)) {
    value = value[0]
  }
  if (value === undefined || value === null || value === '') {
    return null
  }
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

const registerId = computed(() => parseQueryNumber(route.query.registerId))

const warehouseId = computed(() => parseQueryNumber(route.query.warehouseId))
const dealNumber = computed(() => (route.query.dealNumber ? String(route.query.dealNumber) : ''))
</script>

<template>
  <Suspense>
    <ScanjobsSettings
      :mode="'create'"
      :register-id="registerId"
      :warehouse-id="warehouseId"
      :deal-number="dealNumber"
    />
  </Suspense>
</template>
