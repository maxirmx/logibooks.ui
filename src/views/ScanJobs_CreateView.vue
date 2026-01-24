<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import ScanJobsSettings from '@/dialogs/ScanJobs_Settings.vue'
</script>

<template>
  <Suspense>
    <ScanJobsSettings :mode="'create'" />
  </Suspense>
</template>
