// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks frontend application
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 1. Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in the
//    documentation and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// ``AS IS'' AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
// TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
// PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDERS OR CONTRIBUTORS
// BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

<script setup>

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
