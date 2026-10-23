<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application


import { computed, inject } from 'vue'
import ActionButton from './ActionButton.vue'
import { LABEL_PRINTING_KEY } from '@/helpers/label.printing.helpers.js'
const props = defineProps({
  item: { type: Object, required: true },
  template: { type: String, default: null },
  disabled: { type: Boolean, default: false }
})
const printing = inject(LABEL_PRINTING_KEY, null)
const templates = computed(() => props.template ? [props.template] :
  (props.item.printableTemplates ?? []).filter((value) => ['WBRN', 'OZON'].includes(value)))
</script>

<template>
  <template v-if="printing">
    <ActionButton
      v-for="template in templates"
      :key="template"
      :item="item"
      icon="fa-solid fa-print"
      tooltip-text="Печать стикера"
      aria-label="Печать стикера"
      data-testid="monitor-print-label"
      :disabled="disabled || printing.busy.value || !item.printableTemplates?.includes(template)"
      @click="printing.print({ parcelId: item.parcelId ?? item.id, template })" />
    <ActionButton
      v-if="item.printableTemplates?.includes('TJ_EXPORT')"
      :item="item"
      icon="fa-solid fa-file-invoice"
      tooltip-text="Печать инвойса"
      aria-label="Печать инвойса"
      data-testid="monitor-print-invoice"
      :disabled="disabled || printing.busy.value"
      @click="printing.print({ parcelId: item.parcelId ?? item.id, template: 'TJ_EXPORT' })" />
  </template>
</template>
