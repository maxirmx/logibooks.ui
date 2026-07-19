<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import CustomsStationSettings from '@/dialogs/CustomsStation_Settings.vue'
</script>

<template>
  <Suspense>
    <CustomsStationSettings :mode="'create'" />
  </Suspense>
</template>
