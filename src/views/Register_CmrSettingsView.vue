<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (http://www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import CmrSettings from '@/dialogs/Cmr_Settings.vue'

const props = defineProps({
  id: { type: Number, required: true }
})
</script>

<template>
  <Suspense>
    <CmrSettings :id="props.id" />
  </Suspense>
</template>
