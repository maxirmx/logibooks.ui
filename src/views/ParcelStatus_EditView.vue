<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks frontend application

import ParcelStatusSettings from '@/dialogs/ParcelStatus_Settings.vue'

const props = defineProps({
  id: {
    type: Number,
    required: true
  }
})
</script>

<template>
  <Suspense>
    <ParcelStatusSettings :mode="'edit'" :order-status-id="props.id" />
  </Suspense>
</template>