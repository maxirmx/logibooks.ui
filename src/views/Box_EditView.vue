<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import BoxEditDialog from '@/dialogs/Box_EditDialog.vue'

const props = defineProps({
  registerId: {
    type: Number,
    required: true
  },
  id: {
    type: Number,
    required: true
  }
})
</script>

<template>
  <Suspense>
    <BoxEditDialog mode="edit" :register-id="props.registerId" :box-id="props.id" />
  </Suspense>
</template>
