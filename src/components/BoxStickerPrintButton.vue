<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application
import { computed, inject } from 'vue'
import ActionButton from './ActionButton.vue'
import { LABEL_PRINTING_KEY } from '@/helpers/label.printing.helpers.js'
import { WBR_COMPANY_ID } from '@/helpers/company.constants.js'
const props = defineProps({
  box: { type: Object, required: true },
  company: { type: Object, default: null },
  disabled: { type: Boolean, default: false }
})
const printing = inject(LABEL_PRINTING_KEY, null)
const info = computed(() => props.company || props.box)
const boxId = computed(() => props.box.boxId ?? props.box.id)
const template = computed(() => {
  if (!(Number(boxId.value) > 0) || props.box.bucketIndex != null ||
      [2, 3].includes(props.box.area) || !props.box.boxSticker?.trim()) return null

  const templates = props.box.printableTemplates ?? []
  if (templates.includes('OZON_BOX')) return 'OZON_BOX'
  if (info.value?.companyId === WBR_COMPANY_ID && templates.includes('WBR_BOX')) return 'WBR_BOX'
  return null
})
const printTitle = 'Печать стикера'
</script>
<template>
  <ActionButton :item="box" icon="fa-solid fa-print"
    :tooltip-text="printTitle" :aria-label="printTitle" data-testid="box-print-label"
    :disabled="disabled || !template || !printing || printing.busy.value"
    @click="printing.print({ boxId, template })" />
</template>
