<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { Field } from 'vee-validate'
import { ozonRegisterColumnTitles } from '@/helpers/ozon.register.mapping.js'

defineProps({
  name: { type: String, required: true },
  type: { type: String, default: 'text' },
  step: { type: String, default: null },
  as: { type: String, default: null },
  errors: { type: Object, default: () => ({}) },
  fullWidth: { type: Boolean, default: true }
})
</script>
<template>
  <div :class="fullWidth ? 'form-group-1' : 'form-group'">
    <label 
      :for="name" 
      :class="fullWidth ? 'label-1' : 'label'" 
    >
      {{ ozonRegisterColumnTitles[name] }}:
    </label>
    <Field 
      v-if="as === 'select'"
      :name="name" 
      :id="name" 
      as="select"
      :class="['form-control', fullWidth ? 'input-1' : 'input', { 'is-invalid': errors && errors[name] }]"
    >
      <slot />
    </Field>
    <Field 
      v-else
      :name="name" 
      :id="name" 
      :type="type || 'text'"
      :step="step"
      :class="['form-control', fullWidth ? 'input-1' : 'input', { 'is-invalid': errors && errors[name] }]"
    />
  </div>
</template>
