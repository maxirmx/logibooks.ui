<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks frontend application

import RegisterEditDialog from '@/dialogs/Register_EditDialog.vue'

const props = defineProps({
  id: { type: Number, required: true }
})
</script>

<template>
  <Suspense>
    <RegisterEditDialog :id="props.id" :create="false" />
  </Suspense>
</template>
