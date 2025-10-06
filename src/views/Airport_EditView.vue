<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import AirportSettings from '@/dialogs/Airport_Settings.vue'

const props = defineProps({
  id: {
    type: Number,
    required: true
  }
})
</script>

<template>
  <Suspense>
    <AirportSettings :mode="'edit'" :airport-id="props.id" />
  </Suspense>
</template>
