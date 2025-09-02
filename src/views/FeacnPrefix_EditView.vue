<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks frontend application

import FeacnPrefix_Settings from '@/dialogs/FeacnPrefix_Settings.vue'

const props = defineProps({
  id: {
    type: Number,
    required: true
  }
})
</script>

<template>
  <FeacnPrefix_Settings :mode="'edit'" :prefix-id="props.id" />
</template>

