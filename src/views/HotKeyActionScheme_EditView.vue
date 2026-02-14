<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import HotKeysActionSchemeSettings from '@/dialogs/HotKeyActionScheme_Settings.vue'

const props = defineProps({
  id: {
    type: Number,
    required: true
  }
})
</script>

<template>
  <Suspense>
    <HotKeysActionSchemeSettings :mode="'edit'" :hot-key-action-scheme-id="props.id" />
  </Suspense>
</template>
