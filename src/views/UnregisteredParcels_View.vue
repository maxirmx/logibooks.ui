<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import UnregisteredParcelsList from '@/lists/UnregisteredParcels_List.vue'
import { useRoute, useRouter } from 'vue-router'

const props = defineProps({
  registerId: { type: Number, required: true }
})

const router = useRouter()
const route = useRoute()

function isSafeReturnUrl(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
}

function closeList() {
  const returnUrl = isSafeReturnUrl(route.query.returnUrl) ? route.query.returnUrl : null
  if (returnUrl) {
    router.push(returnUrl)
    return
  }

  router.back()
}
</script>

<template>
  <UnregisteredParcelsList :register-id="props.registerId" @close="closeList" />
</template>
