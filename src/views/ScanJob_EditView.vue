<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import ScanjobsSettings from '@/dialogs/Scanjob_Settings.vue'

const props = defineProps({
  id: {
    type: Number,
    required: true
  }
})
</script>

<template>
  <Suspense>
    <ScanjobsSettings :mode="'edit'" :scanjob-id="props.id" />
  </Suspense>
</template>
