// Copyright (c) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
//
// This file is a part of Media Pi frontend application

<script setup>
import { Field, FieldArray } from 'vee-validate'
import ActionButton from '@/components/ActionButton.vue'

defineProps({
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
    type: Object,
    default: () => ({})
  },
  hasError: {
    type: Boolean,
    default: false
  }
})
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
        />
        
        <Field :name="`${name}[${idx}]`" :as="fieldType" :id="`${name}_${idx}`"
          class="form-control input field-container-select" :class="{ 'is-invalid': hasError }"
          v-bind="fieldProps"
        >
          <option v-if="fieldType === 'select'" value="">{{ placeholder }}</option>
          <template v-if="fieldType === 'select'">
            <option v-for="option in options" :key="option.value" :value="option.value">
              {{ option.text }}
            </option>
          </template>
        </Field>
        
        <!-- Minus button always after select -->
        <ActionButton
          icon="fa-solid fa-minus"
          :item="idx"
          @click="remove(idx)"
          :disabled="fields.length === 1"
          class="button-o-c ml-2"
          :tooltip-text="removeTooltip"
        />
      </div>
    </div>
  </FieldArray>
</template>

<style scoped>
/* Moved styles from main.css - keeping exactly as they were */
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
