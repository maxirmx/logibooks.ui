<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import BoxesList from '@/lists/Boxes_List.vue'

const props = defineProps({
  registerId: {
    type: Number,
    required: true
  }
})
</script>

<template>
  <BoxesList :register-id="props.registerId" />
</template>
