<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import RegistersList from '@/lists/Registers_List.vue'
import { OP_MODE_PAPERWORK } from '@/helpers/op.mode.js'

defineProps({
  mode: {
    type: String,
    default: OP_MODE_PAPERWORK
  }
})
</script>

<template>
  <Suspense>
    <RegistersList :mode="mode" />
  </Suspense>
</template>
