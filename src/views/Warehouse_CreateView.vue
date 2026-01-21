<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import WarehouseSettings from '@/dialogs/Warehouse_Settings.vue'
</script>

<template>
  <Suspense>
    <WarehouseSettings :mode="'create'" />
  </Suspense>
</template>
