<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed } from 'vue'
import { hexToRgb, rgbToHex } from '@/helpers/status.color.helpers.js'

const props = defineProps({
  id: { type: String, required: true },
  label: { type: String, required: true },
  modelValue: { type: String, default: null },
  defaultColor: { type: String, default: null },
  disabled: Boolean,
  invalid: Boolean
})
const emit = defineEmits(['update:modelValue', 'blur'])

const color = computed(() => rgbToHex(props.modelValue) ?? props.defaultColor)
const defaultValue = computed(() => hexToRgb(props.defaultColor))
</script>

<template>
  <div class="status-color-control" :class="{ 'is-invalid': invalid }">
    <span
      class="status-color-swatch"
      :class="{ 'status-color-swatch--empty': !color }"
      :style="{ backgroundColor: color }"
    >
      <input
        :id="id + '-picker'"
        type="color"
        class="status-color-native"
        :aria-label="label"
        :disabled="disabled"
        :value="color ?? '#ffffff'"
        @input="emit('update:modelValue', hexToRgb($event.target.value))"
      />
    </span>
    <span v-if="disabled" class="status-color-value status-color-value--readonly">
      {{ modelValue || defaultValue || 'Не задан' }}
    </span>
    <input
      v-else
      :id="id"
      :name="id"
      type="text"
      class="status-color-value"
      :value="modelValue ?? defaultValue ?? ''"
      :placeholder="defaultValue ?? 'Не задан'"
      :aria-invalid="invalid || undefined"
      autocomplete="off"
      spellcheck="false"
      @focus="$event.target.select()"
      @input="emit('update:modelValue', $event.target.value)"
      @blur="emit('blur', $event)"
    />
  </div>
</template>

<style scoped>
.status-color-control {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  width: fit-content;
  max-width: 100%;
  min-height: 2.25rem;
  border: 1px solid #c7ccd1;
  border-radius: 4px;
  background: #fff;
  padding: 0.25rem 0.5rem;
}

.status-color-control:focus-within {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(var(--primary-color-rgb), 0.18);
}

.status-color-control.is-invalid {
  border-color: var(--input-invalid-border);
}

.status-color-swatch {
  position: relative;
  flex: none;
  width: 1.75rem;
  height: 1.75rem;
  border: 1px solid #74777c;
  border-radius: 4px;
}

.status-color-swatch:focus-within {
  outline: 2px solid var(--primary-color);
  outline-offset: 1px;
}

.status-color-swatch--empty::after {
  content: '';
  position: absolute;
  inset: 50% 0.2rem auto;
  border-top: 2px solid #d3223f;
  transform: rotate(-45deg);
  pointer-events: none;
}

.status-color-native {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}

.status-color-native:disabled {
  cursor: default;
}

.status-color-value {
  width: 7.5rem;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-variant-numeric: tabular-nums;
}

.status-color-value--readonly {
  white-space: nowrap;
  cursor: text;
  user-select: all;
}
</style>
