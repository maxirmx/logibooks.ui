<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import RegistersList from '@/lists/Registers_List.vue'
import RegistersWhList from '@/lists/Registers_WhList.vue'
import { computed } from 'vue'
import { OP_MODE_PAPERWORK, OP_MODE_WAREHOUSE } from '@/helpers/op.mode.js'

const props = defineProps({
  mode: {
    type: String,
    default: OP_MODE_PAPERWORK
  }
})

const listComponent = computed(() =>
  props.mode === OP_MODE_WAREHOUSE ? RegistersWhList : RegistersList
)
</script>

<template>
  <Suspense>
    <component :is="listComponent" />
  </Suspense>
</template>
