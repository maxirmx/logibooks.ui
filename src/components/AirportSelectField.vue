<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed } from 'vue'
import { Field } from 'vee-validate'

const props = defineProps({
  label: { type: String, required: true },
  name: { type: String, required: true },
  airports: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false }
})

const airportOptions = computed(() => {
  if (!Array.isArray(props.airports)) {
    return []
  }
  return props.airports
})

function formatAirport(airport) {
  if (!airport) return ''
  const name = airport.name || '—'
  const code = airport.codeIata || ''
  return code ? `${name} (${code})` : name
}
</script>

<template>
  <div class="form-group">
    <label class="label" :for="name">{{ label }}</label>
    <Field
      :name="name"
      :id="name"
      as="select"
      class="form-control input"
      :disabled="disabled"
      :value-as-number="true"
    >
      <option :value="0">Не выбрано</option>
      <option v-for="airport in airportOptions" :key="airport.id" :value="airport.id">
        {{ formatAirport(airport) }}
      </option>
    </Field>
  </div>
</template>
