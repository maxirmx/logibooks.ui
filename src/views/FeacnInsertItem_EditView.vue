<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks frontend application

import FeacnInsertItem_Settings from '@/dialogs/FeacnInsertItem_Settings.vue'

const props = defineProps({
  id: {
    type: Number,
    required: true
  }
})
</script>

<template>
  <FeacnInsertItem_Settings :mode="'edit'" :insert-item-id="props.id" />
</template>
