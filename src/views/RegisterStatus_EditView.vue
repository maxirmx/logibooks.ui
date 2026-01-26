<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import RegisterStatusEditDialog from '@/dialogs/RegisterStatus_EditDialog.vue'

const props = defineProps({
  id: {
    type: Number,
    required: true
  }
})
</script>

<template>
  <Suspense>
    <RegisterStatusEditDialog :mode="'edit'" :register-status-id="props.id" />
  </Suspense>
</template>
