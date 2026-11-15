<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import CustomsDecisionsList from '@/lists/CustomsDecisions_List.vue'

defineProps({
  registerId: { type: Number, required: true },
  decId: { type: Number, default: null }
})
</script>

<template>
  <CustomsDecisionsList :key="registerId" :register-id="registerId" :dec-id="decId" />
</template>
