<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

defineProps({
  name: { type: String, default: '' },
  email: { type: String, default: '' }
})
</script>

<template>
  <span class="d-block">{{ name }}</span>
  <span class="d-block text-medium-emphasis">{{ email }}</span>
</template>
