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
const canPrint = computed(() => info.value?.companyId === WBR_COMPANY_ID &&
  Number(props.box.boxId ?? props.box.id) > 0 && props.box.bucketIndex == null &&
  ![2, 3].includes(props.box.area) && Boolean(props.box.boxSticker?.trim()) &&
  props.box.printableTemplates?.includes('WBR_BOX') === true)
const printTitle = 'Печать стикера'
</script>
<template>
  <ActionButton :item="box" icon="fa-solid fa-print"
    :tooltip-text="printTitle" :aria-label="printTitle" data-testid="box-print-label"
    :disabled="disabled || !canPrint || !printing || printing.busy.value"
    @click="printing.print({ boxId: box.boxId ?? box.id, template: 'WBR_BOX' })" />
</template>
