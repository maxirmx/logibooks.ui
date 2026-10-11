<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed } from 'vue'
import { Field } from 'vee-validate'
import FieldError from '@/components/FieldError.vue'
import { formatAirportDisplayName } from '@/helpers/register.display.helpers.js'

const props = defineProps({
  label: { type: String, required: true },
  name: { type: String, required: true },
  airports: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
  errors: { type: Object, default: () => ({}) }
})

const airportOptions = computed(() => {
  if (!Array.isArray(props.airports)) {
    return []
  }
  return props.airports
})

</script>

<template>
  <div class="form-group">
    <label class="label" :for="name">{{ label }}</label>
    <Field
      :name="name"
      :id="name"
      as="select"
      class="form-control input"
      :class="{ 'is-invalid': errors[name] }"
      :aria-required="required"
      :aria-invalid="Boolean(errors[name])"
      :aria-describedby="errors[name] ? `${name}-error` : undefined"
      :disabled="disabled"
      :value-as-number="true"
    >
      <option :value="0">Не выбрано</option>
      <option v-for="airport in airportOptions" :key="airport.id" :value="airport.id">
        {{ formatAirportDisplayName(airport) }}
      </option>
    </Field>
    <FieldError :id="`${name}-error`" :name="name" :errors="errors" />
  </div>
</template>
