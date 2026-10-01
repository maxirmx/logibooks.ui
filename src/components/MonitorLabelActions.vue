<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application


import { computed, inject } from 'vue'
import ActionButton from './ActionButton.vue'
import { LABEL_PRINTING_KEY } from '@/helpers/label.printing.helpers.js'
const props = defineProps({ item: { type: Object, required: true } })
const printing = inject(LABEL_PRINTING_KEY, null)
const templateCompanyNames = { WBRN: 'Wildberries', OZON: 'Ozon' }
const templates = computed(() => (props.item.printableTemplates ?? []).filter((value) => ['WBRN', 'OZON'].includes(value)))
</script>

<template>
  <template v-if="printing">
    <ActionButton
      v-for="template in templates"
      :key="template"
      :item="item"
      icon="fa-solid fa-print"
      :tooltip-text="`Печать стикера ${templateCompanyNames[template]}`"
      :aria-label="`Печать стикера ${templateCompanyNames[template]}`"
      data-testid="monitor-print-label"
      :disabled="printing.busy.value"
      @click="printing.print({ parcelId: item.parcelId ?? item.id, template })" />
  </template>
</template>
