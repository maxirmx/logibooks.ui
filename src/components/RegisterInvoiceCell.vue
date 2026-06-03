<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed } from 'vue'
import { formatDate } from '@/helpers/date.formatters.js'
import { formatRegisterInvoice } from '@/helpers/register.heading.helpers.js'

const props = defineProps({
  item: { type: Object, required: true },
  getTransportationDocument: { type: Function, required: true }
})

const invoiceText = computed(() => formatRegisterInvoice(props.item, props.getTransportationDocument))
</script>

<template>
  <div class="invoice-box">
    <div class="invoice-number">{{ invoiceText }}</div>
    <div v-if="item.invoiceDate" class="invoice-date">от {{ formatDate(item.invoiceDate) }}</div>
  </div>
</template>

<style scoped>
.invoice-box {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.invoice-number {
  font-size: 0.95rem;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.invoice-date {
  font-size: 0.78rem;
  margin-top: 4px;
}
</style>
