<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import CustomsReportRowsList from '@/lists/CustomsReportRows_List.vue'

const props = defineProps({
  reportId: {
    type: Number,
    required: true
  }
})
</script>

<template>
  <CustomsReportRowsList :report-id="props.reportId" />
</template>
