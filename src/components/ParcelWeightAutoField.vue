<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, toRaw, unref } from 'vue'
import CorrectedWeightDisplay from '@/components/CorrectedWeightDisplay.vue'
import { getWeightCorrection } from '@/helpers/weight.correction.helpers.js'

const props = defineProps({
  fieldComponent: { type: [Object, Function], required: true },
  item: { type: Object, default: null },
  register: { type: Object, default: null },
  label: { type: String, required: true },
  errors: { type: Object, default: () => ({}) },
  fullWidth: { type: Boolean, default: false }
})

const registerValue = computed(() => unref(props.register))
const fieldComponentDefinition = computed(() => toRaw(props.fieldComponent))
const canUseAutomaticWeight = computed(() => getWeightCorrection(registerValue.value).canCorrect)
const isWeightCorrectionEligible = computed(() => props.item?.weightCorrectionEligible === true)
const groupClass = computed(() => props.fullWidth ? 'form-group-1' : 'form-group')
const labelClass = computed(() => props.fullWidth ? 'label-1' : 'label')
const inputClass = computed(() => ['form-control', props.fullWidth ? 'input-1' : 'input', 'readonly-field', 'parcel-weight-auto-field'])
</script>

<template>
  <component
    :is="fieldComponentDefinition"
    v-if="!canUseAutomaticWeight"
    name="weightKg"
    type="number"
    step="1.0"
    :errors="errors"
    :fullWidth="fullWidth"
  />
  <div v-else :class="groupClass">
    <label :class="labelClass">{{ label }}:</label>
    <div :class="inputClass" role="textbox" aria-readonly="true">
      <CorrectedWeightDisplay
        :weight="item?.weightKg"
        :register="registerValue"
        :use-correction="isWeightCorrectionEligible"
      />
      <span class="parcel-weight-auto-note">(Автоматический расчёт)</span>
    </div>
  </div>
</template>

<style scoped>
.parcel-weight-auto-field {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 38px;
}

.parcel-weight-auto-note {
  color: #6c757d;
  white-space: nowrap;
}
</style>
