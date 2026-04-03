<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import UnregisteredParcelsList from '@/lists/UnregisteredParcels_List.vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  registerId: { type: Number, required: true }
})

const router = useRouter()

function closeList() {
  router.back()
}
</script>

<template>
  <UnregisteredParcelsList :register-id="props.registerId" @close="closeList" />
</template>
