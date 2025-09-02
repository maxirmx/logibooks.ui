<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks frontend application

import KeyWord_Settings from '@/dialogs/KeyWord_Settings.vue'

const props = defineProps({
  id: {
    type: Number,
    required: true
  }
})
</script>

<template>
  <KeyWord_Settings :id="props.id" />
</template>
