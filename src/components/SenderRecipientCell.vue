<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed } from 'vue'
import { getCompanyDisplayName } from '@/helpers/register.display.helpers.js'

const props = defineProps({
  item: { type: Object, required: true },
  companies: { type: Array, default: () => [] }
})

const senderName = computed(() => getCompanyDisplayName(props.companies, props.item?.senderId))
const recipientName = computed(() => getCompanyDisplayName(props.companies, props.item?.recipientId))
</script>

<template>
  <div class="data-box">
    <div>{{ senderName }}</div>
    <div>{{ recipientName }}</div>
  </div>
</template>

<style scoped>
.data-box {
  display: flex;
  flex-direction: column;
  font-size: 0.9rem;
  margin-top: 4px;
}

.data-box > div {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
