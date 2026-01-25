<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import RegisterEditDialog from '@/dialogs/Register_EditDialog.vue'
import { OP_MODE_PAPERWORK } from '@/helpers/op.mode.js'

const props = defineProps({
  id: { type: Number, required: true },
  mode: { type: String, default: OP_MODE_PAPERWORK }
})
</script>

<template>
  <Suspense>
    <RegisterEditDialog :id="props.id" :create="false" :mode="props.mode" />
  </Suspense>
</template>
