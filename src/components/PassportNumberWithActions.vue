<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { Field } from 'vee-validate'
import ActionButton from '@/components/ActionButton.vue'
import PassportCheckStatusIndicator from '@/components/PassportCheckStatusIndicator.vue'

const props = defineProps({
  name: { type: String, default: 'passportNumber' },
  label: { type: String, required: true },
  errors: { type: Object, default: () => ({}) },
  showActions: { type: Boolean, default: false },
  statusValue: { type: [String, Number], default: null },
  statuses: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['check', 'clear'])

function emitCheck() {
  if (props.disabled) return
  emit('check')
}

function emitClear() {
  if (props.disabled) return
  emit('clear')
}
</script>

<template>
  <div class="form-group passport-number-with-actions">
    <label :for="name" class="label">
      {{ label }}:
    </label>
    <div class="passport-number-with-actions__control">
      <div class="passport-number-with-actions__input-wrap">
        <PassportCheckStatusIndicator
          v-if="showActions"
          :value="statusValue"
          :statuses="statuses"
        />
        <Field
          :name="name"
          :id="name"
          type="text"
          :disabled="disabled"
          :class="['form-control', 'input', { 'is-invalid': errors && errors[name] }]"
        />
      </div>
      <div
        v-if="showActions"
        class="passport-number-with-actions__actions"
        data-testid="passport-check-actions"
      >
        <ActionButton
          :item="{}"
          icon="fa-solid fa-passport"
          iconSize="1x"
          tooltip-text="Проверить"
          :disabled="disabled"
          data-testid="passport-check-run"
          @click="emitCheck"
        />
        <ActionButton
          :item="{}"
          icon="fa-solid fa-broom"
          iconSize="1x"
          tooltip-text="Очистить"
          :disabled="disabled"
          data-testid="passport-check-clear"
          @click="emitClear"
        />
      </div>
    </div>
  </div>
</template>
