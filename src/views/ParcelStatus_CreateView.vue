<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import ParcelStatusSettings from '@/dialogs/ParcelStatus_Settings.vue'
</script>

<template>
  <Suspense>
    <ParcelStatusSettings :mode="'create'" />
  </Suspense>
</template>