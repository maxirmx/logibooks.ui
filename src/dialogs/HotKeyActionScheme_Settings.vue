<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { ref, computed } from 'vue'
import router from '@/router'
import { storeToRefs } from 'pinia'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { useHotKeyActionSchemesStore } from '@/stores/hotkey.action.schemes.store.js'

const props = defineProps({
  mode: {
    type: String,
    required: true,
    validator: (value) => ['create', 'edit'].includes(value)
  },
  hotKeyActionSchemeId: {
    type: Number,
    required: false
  }
})

const hotKeyActionSchemesStore = useHotKeyActionSchemesStore()
const { ops } = storeToRefs(hotKeyActionSchemesStore)
const isCreate = computed(() => props.mode === 'create')

let hotKeyActionScheme = ref({
  name: '',
  actions: []
})

// Load ops data
await hotKeyActionSchemesStore.ensureOpsLoaded()

if (!isCreate.value) {
  ;({ hotKeyActionScheme } = storeToRefs(hotKeyActionSchemesStore))
  await hotKeyActionSchemesStore.getById(props.hotKeyActionSchemeId)
  
  // Ensure actions array exists
  if (!hotKeyActionScheme.value.actions) {
    hotKeyActionScheme.value.actions = []
  }
} else {
  // In create mode, initialize with all actions from ops
  hotKeyActionScheme.value.actions = ops.value.actions.map(action => ({
    id: 0,
    action: action.value,
    keyCode: '',
    shift: false,
    ctrl: false,
    alt: false,
    schemeId: 0
  }))
}

function getTitle() {
  return isCreate.value
    ? 'Создание схемы настройки клавиатуры'
    : 'Изменение схемы настройки клавиатуры'
}

function getButtonText() {
  return isCreate.value ? 'Создать' : 'Сохранить'
}

function getActionName(actionId) {
  return hotKeyActionSchemesStore.getOpsLabel(ops.value.actions, actionId)
}

const schema = Yup.object({
  name: Yup.string().required('Название обязательно')
})

function onSubmit(values, { setErrors }) {
  const submitData = {
    id: hotKeyActionScheme.value.id,
    name: values.name,
    actions: hotKeyActionScheme.value.actions
  }

  if (isCreate.value) {
    return hotKeyActionSchemesStore
      .create(submitData)
      .then(() => {
        router.push('/hotkeyactionschemes')
      })
      .catch((error) => {
        if (error.message?.includes('409')) {
          setErrors({ apiError: 'Схема настройки клавиатуры с таким названием уже существует' })
        } else {
          setErrors({ apiError: error.message || 'Ошибка при создании схемы настройки клавиатуры' })
        }
      })
  }

  return hotKeyActionSchemesStore
    .update(props.hotKeyActionSchemeId, submitData)
    .then(() => {
      router.push('/hotkeyactionschemes')
    })
    .catch((error) => {
      setErrors({ apiError: error.message || 'Ошибка при сохранении схемы настройки клавиатуры' })
    })
}
</script>

<template>
  <div class="settings form-3">
    <h1 class="primary-heading">{{ getTitle() }}</h1>
    <hr class="hr" />
    <Form
      @submit="onSubmit"
      :initial-values="hotKeyActionScheme"
      :validation-schema="schema"
      v-slot="{ errors, isSubmitting }"
    >
      <div class="form-group">
        <label for="name" class="label">Название:</label>
        <Field
          name="name"
          id="name"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.name }"
          placeholder="Название"
        />
      </div>

      <div class="form-group mt-4">
        <label class="label">Действия:</label>
        <div class="actions-table">
          <table class="table">
            <thead>
              <tr>
                <th>Действие</th>
                <th>Клавиша</th>
                <th class="checkbox-col">Shift</th>
                <th class="checkbox-col">Ctrl</th>
                <th class="checkbox-col">Alt</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(action, index) in hotKeyActionScheme.actions" :key="action.action">
                <td>{{ getActionName(action.action) }}</td>
                <td>
                  <input
                    type="text"
                    v-model="action.keyCode"
                    class="form-control input-sm"
                    placeholder="Клавиша"
                  />
                </td>
                <td class="checkbox-col">
                  <input
                    type="checkbox"
                    v-model="action.shift"
                    class="checkbox checkbox-styled"
                    :id="`shift-${index}`"
                  />
                  <label :for="`shift-${index}`"></label>
                </td>
                <td class="checkbox-col">
                  <input
                    type="checkbox"
                    v-model="action.ctrl"
                    class="checkbox checkbox-styled"
                    :id="`ctrl-${index}`"
                  />
                  <label :for="`ctrl-${index}`"></label>
                </td>
                <td class="checkbox-col">
                  <input
                    type="checkbox"
                    v-model="action.alt"
                    class="checkbox checkbox-styled"
                    :id="`alt-${index}`"
                  />
                  <label :for="`alt-${index}`"></label>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="form-group mt-8">
        <button class="button primary" type="submit" :disabled="isSubmitting">
          <span v-show="isSubmitting" class="spinner-border spinner-border-sm mr-1"></span>
          <font-awesome-icon size="1x" icon="fa-solid fa-check-double" class="mr-1" />
          {{ getButtonText() }}
        </button>
        <button class="button secondary" type="button" @click="$router.push('/hotkeyactionschemes')">
          <font-awesome-icon size="1x" icon="fa-solid fa-xmark" class="mr-1" />
          Отменить
        </button>
      </div>

      <div v-if="errors.name" class="alert alert-danger mt-3 mb-0">{{ errors.name }}</div>
      <div v-if="errors.apiError" class="alert alert-danger mt-3 mb-0">{{ errors.apiError }}</div>
    </Form>
  </div>
</template>

<style scoped>
.actions-table {
  width: 100%;
  margin-top: 1rem;
  overflow-x: auto;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
}

.table {
  width: 100%;
  border-collapse: collapse;
  background-color: white;
}

.table thead {
  background-color: #f5f5f5;
}

.table th,
.table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

.table th {
  font-weight: 600;
  color: #424242;
  font-size: 0.875rem;
}

.table tbody tr:hover {
  background-color: #f9f9f9;
}

.table tbody tr:last-child td {
  border-bottom: none;
}

.input-sm {
  padding: 0.375rem 0.5rem;
  font-size: 0.875rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  width: 100%;
  max-width: 150px;
}

.input-sm:focus {
  outline: none;
  border-color: #1976d2;
  box-shadow: 0 0 0 0.2rem rgba(25, 118, 210, 0.25);
}

.checkbox-col {
  text-align: center;
  width: 80px;
}

.checkbox-col input[type="checkbox"] {
  margin: 0;
}

.checkbox-col label {
  margin: 0;
  padding: 0;
  cursor: pointer;
  width: auto;
  display: inline-block;
}

/* Override checkbox-styled label width for table */
.checkbox-col .checkbox-styled + label {
  width: auto;
  min-width: 20px;
}

.checkbox-col .checkbox-styled + label:after {
  margin-left: 0;
  margin-right: 0;
}

.checkbox-col .checkbox-styled + label:before {
  right: 4px;
}
</style>
