<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { ref, computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: 'Нажмите клавишу...'
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const isFocused = ref(false)

const displayValue = computed(() => {
  return props.modelValue || ''
})

function handleFocus() {
  isFocused.value = true
}

function handleBlur() {
  isFocused.value = false
}

function handleKeyDown(event) {
  // Prevent default to avoid typing in the input
  event.preventDefault()
  
  // Ignore modifier-only keys
  const modifierKeys = ['Shift', 'Control', 'Alt', 'Meta']
  if (modifierKeys.includes(event.key)) {
    return
  }
  
  // Use event.code for consistent key identification (e.g., F1, KeyA, Enter)
  const keyCode = event.code
  
  emit('update:modelValue', keyCode)
}

function clearValue() {
  emit('update:modelValue', '')
}
</script>

<template>
  <div class="key-capture-input" :class="{ 'is-focused': isFocused, 'is-disabled': disabled }">
    <input
      type="text"
      :value="displayValue"
      :placeholder="placeholder"
      :disabled="disabled"
      readonly
      class="key-input"
      @focus="handleFocus"
      @blur="handleBlur"
      @keydown="handleKeyDown"
    />
    <button
      v-if="modelValue && !disabled"
      type="button"
      class="clear-button"
      @click="clearValue"
      tabindex="-1"
      title="Очистить"
    >
      <font-awesome-icon icon="fa-solid fa-xmark" size="sm" />
    </button>
  </div>
</template>

<style scoped>
.key-capture-input {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 100%;
  max-width: 150px;
}

.key-input {
  padding: 0.375rem 0.5rem;
  padding-right: 1.75rem;
  font-size: 0.875rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: 100%;
  cursor: pointer;
  background-color: white;
}

.key-input:focus {
  outline: none;
  border-color: #1976d2;
  box-shadow: 0 0 0 0.2rem rgba(25, 118, 210, 0.25);
}

.key-input::placeholder {
  color: #999;
  font-style: italic;
}

.is-disabled .key-input {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.clear-button {
  position: absolute;
  right: 4px;
  background: none;
  border: none;
  padding: 0.25rem;
  cursor: pointer;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-button:hover {
  color: #c00;
}
</style>
