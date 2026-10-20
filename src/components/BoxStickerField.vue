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
  showLabel: { type: Boolean, default: true },
  disabled: { type: Boolean, default: false }
})
const printing = inject(LABEL_PRINTING_KEY, null)
const info = computed(() => props.company || props.box)
const visible = computed(() => info.value?.companyId === WBR_COMPANY_ID &&
  Number(props.box.boxId ?? props.box.id) > 0 && props.box.bucketIndex == null &&
  ![2, 3].includes(props.box.area))
const canPrint = computed(() => props.box.printableTemplates?.includes('WBR_BOX') === true)
const printTitle = 'Печать стикера коробки'
</script>
<template>
  <div v-if="visible" class="box-sticker-field" data-testid="box-sticker-field">
    <span v-if="showLabel" class="label">Стикер:</span>
    <span class="box-sticker-value" data-testid="box-sticker-value">{{ box.wbrSticker || '—' }}</span>
    <ActionButton v-if="canPrint && printing" :item="box" icon="fa-solid fa-print"
      :tooltip-text="printTitle" :aria-label="printTitle" data-testid="box-print-label"
      :disabled="disabled || printing.busy.value"
      @click="printing.print({ boxId: box.boxId ?? box.id, template: 'WBR_BOX' })" />
  </div>
</template>
<style scoped>
.box-sticker-field { display: flex; align-items: center; gap: 0.5rem; }
.box-sticker-value { overflow-wrap: anywhere; min-width: 0; }
</style>
