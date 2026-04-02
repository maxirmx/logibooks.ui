<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import UnregisteredParcelsList from '@/lists/UnregisteredParcels_List.vue'

const props = defineProps({
  registerId: { type: Number, required: true }
})
</script>

<template>
  <UnregisteredParcelsList :register-id="props.registerId" />
</template>
