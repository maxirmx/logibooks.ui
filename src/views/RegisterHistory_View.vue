<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import RegisterHistoryList from '@/lists/RegisterHistory_List.vue'
import { OP_MODE_PAPERWORK } from '@/helpers/op.mode.js'

defineProps({
  registerId: {
    type: Number,
    required: true
  },
  mode: {
    type: String,
    default: OP_MODE_PAPERWORK
  }
})
</script>

<template>
  <RegisterHistoryList :register-id="registerId" :mode="mode" />
</template>
