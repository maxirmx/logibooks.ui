<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import ScannedItemsList from '@/lists/ScannedItems_List.vue'

const props = defineProps({
  id: { type: Number, required: true }
})
</script>

<template>
  <ScannedItemsList :scanjob-id="props.id" />
</template>
