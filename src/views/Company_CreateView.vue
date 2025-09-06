<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import CompanySettings from '@/dialogs/Company_Settings.vue'
</script>

<template>
  <Suspense>
    <CompanySettings :mode="'create'" />
  </Suspense>
</template>
