<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { Field, FieldArray } from 'vee-validate'
import ActionButton from '@/components/ActionButton.vue'

const props = defineProps({
  name: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  fieldType: {
    type: String,
    default: 'select',
    validator: (value) => ['select', 'input', 'textarea'].includes(value)
  },
  options: {
    type: Array,
    default: () => []
  },
  placeholder: {
    type: String,
    default: 'Выберите опцию:'
  },
  addTooltip: {
    type: String,
    default: 'Добавить элемент'
  },
  removeTooltip: {
    type: String,
    default: 'Удалить элемент'
  },
  defaultValue: {
    type: [String, Number],
    default: ''
  },
  fieldProps: {
    type: [Object, Function],
    default: () => ({})
  },
  hasError: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

// Helper function to get field props for a specific index
function getFieldProps(index) {
  return typeof props.fieldProps === 'function' ? props.fieldProps({ index }) : props.fieldProps
}

function getFieldBindings(index) {
  const fieldProps = getFieldProps(index) || {}
  const placeholderProp =
    props.fieldType !== 'select' && !Object.prototype.hasOwnProperty.call(fieldProps, 'placeholder')
      ? { placeholder: props.placeholder }
      : {}

  return { ...placeholderProp, ...fieldProps, disabled: props.disabled }
}
</script>

<template>
  <FieldArray :name="name" v-slot="{ fields, push, remove }">
    <div v-for="(field, idx) in fields" :key="field.key" class="form-group mb-2">
      <label v-if="idx === 0" class="label">{{ label }}:</label>
      <div v-else class="label"></div>

      <div class="field-container">
        <!-- Plus button positioned to the left for first option -->
        <ActionButton
          v-if="idx === 0"
          icon="fa-solid fa-plus"
          :item="defaultValue"
          @click="push(defaultValue)"
          class="button-o-c field-container-plus"
          :tooltip-text="addTooltip"
          :disabled="disabled"
        />

        <Field :name="`${name}[${idx}]`" :as="fieldType" :id="`${name}_${idx}`"
          class="form-control input field-container-select" :class="{ 'is-invalid': hasError }"
          v-bind="getFieldBindings(idx)"
        >
          <option v-if="fieldType === 'select'" value="">{{ placeholder }}</option>
          <template v-if="fieldType === 'select'">
            <option v-for="option in options" :key="option.value" :value="option.value">
              {{ option.text }}
            </option>
          </template>
        </Field>

        <slot name="extra" :index="idx" />

        <!-- Minus button always after select -->
        <ActionButton
          icon="fa-solid fa-minus"
          :item="idx"
          @click="remove(idx)"
          :disabled="disabled || fields.length === 1"
          class="button-o-c ml-2"
          :tooltip-text="removeTooltip"
        />
      </div>
    </div>
  </FieldArray>
</template>

<style scoped>

.field-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.button-o-c {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  background-color: #f8f9fa;
  color: #495057;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  flex-shrink: 0;
}

.button-o-c:hover {
  background-color: #e9ecef;
  border-color: #adb5bd;
}

.button-o-c:active {
  background-color: #dee2e6;
  border-color: #6c757d;
}

.button-o-c:disabled {
  background-color: #e9ecef;
  border-color: #dee2e6;
  color: #adb5bd;
  cursor: not-allowed;
}

.button-o-c.field-container-plus {
  background-color: #d4edda;
  border-color: #c3e6cb;
  color: #155724;
}

.button-o-c.field-container-plus:hover {
  background-color: #c3e6cb;
  border-color: #b1dfbb;
}

.field-container-plus:focus {
  outline: none;
  border: none;
  box-shadow: none;
}

.button-o-c.field-container-plus:focus {
  outline: none;
  border: none;
  box-shadow: none;
}

.button-o-c.field-container-plus:active {
  background-color: #b1dfbb;
  border-color: #a1d2aa;
}

.ml-2 {
  margin-left: 8px;
}
</style>
