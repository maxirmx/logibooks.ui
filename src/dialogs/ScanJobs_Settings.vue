<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { ref, computed } from 'vue'
import router from '@/router'
import { storeToRefs } from 'pinia'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { useScanJobsStore } from '@/stores/scanjobs.store.js'
import { useWarehousesStore } from '@/stores/warehouses.store.js'
import { useAlertStore } from '@/stores/alert.store.js'

const props = defineProps({
  mode: {
    type: String,
    required: true,
    validator: (value) => ['create', 'edit'].includes(value)
  },
  scanjobId: {
    type: Number,
    required: false,
    validator: (value, props) => {
      // In edit mode, scanjobId must be provided
      if (props.mode === 'edit' && (value === null || value === undefined)) {
        console.error('scanjobId is required when mode is edit')
        return false
      }
      return true
    }
  }
})

const scanJobsStore = useScanJobsStore()
const warehousesStore = useWarehousesStore()
const alertStore = useAlertStore()
const { ops } = storeToRefs(scanJobsStore)

const isCreate = computed(() => props.mode === 'create')

// Runtime guard: fail fast if scanjobId is missing in edit mode
if (props.mode === 'edit' && (props.scanjobId === null || props.scanjobId === undefined)) {
  console.error('scanjobId is required when mode is edit')
  alertStore.error('Невозможно редактировать скан-задание: отсутствует идентификатор')
  router.push('/scanjobs')
  throw new Error('scanjobId is required when mode is edit')
}

await scanJobsStore.ensureOpsLoaded()
await warehousesStore.getAll()

let scanjob

if (isCreate.value) {
  scanjob = ref({
    id: 0,
    name: '',
    type: null,
    operation: null,
    mode: null,
    status: null,
    warehouseId: null
  })
} else {
  const { scanjob: storeScanjob } = storeToRefs(scanJobsStore)
  scanjob = storeScanjob
  await scanJobsStore.getById(props.scanjobId)
}

function getTitle() {
  return isCreate.value ? 'Создание скан-задания' : 'Редактировать скан-задание'
}

function getButtonText() {
  return isCreate.value ? 'Создать' : 'Сохранить'
}

const schema = Yup.object({
  id: Yup.number().required(),
  name: Yup.string().required('Название обязательно'),
  type: Yup.number().required('Тип обязателен'),
  operation: Yup.number().required('Операция обязательна'),
  mode: Yup.number().required('Режим обязателен'),
  status: Yup.number().required('Статус обязателен'),
  warehouseId: Yup.number().required('Склад обязателен')
})

function normalizeValues(values) {
  if (values && typeof values === 'object' && values.value && typeof values.value === 'object') {
    return values.value
  }
  return values
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') {
    return null
  }
  return Number(value)
}

function onSubmit(values, { setErrors }) {
  const normalizedValues = normalizeValues(values) || {}
  const payload = {
    ...normalizedValues,
    type: toNumberOrNull(normalizedValues.type),
    operation: toNumberOrNull(normalizedValues.operation),
    mode: toNumberOrNull(normalizedValues.mode),
    status: toNumberOrNull(normalizedValues.status),
    warehouseId: toNumberOrNull(normalizedValues.warehouseId)
  }

  if (isCreate.value) {
    return scanJobsStore
      .create(payload)
      .then(() => {
        router.push('/scanjobs')
      })
      .catch((error) => {
        if (error.message?.includes('409')) {
          setErrors({ apiError: 'Скан-задание с таким названием уже существует' })
        } else {
          setErrors({ apiError: error.message || 'Ошибка при создании скан-задания' })
        }
      })
  }

  return scanJobsStore
    .update(props.scanjobId, payload)
    .then(() => {
      router.push('/scanjobs')
    })
    .catch((error) => {
      setErrors({ apiError: error.message || 'Ошибка при сохранении скан-задания' })
    })
}
</script>

<template>
  <div class="settings form-2">
    <h1 class="primary-heading">{{ getTitle() }}</h1>
    <hr class="hr" />
    <Form
      @submit="onSubmit"
      :initial-values="scanjob"
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

      <div class="form-group">
        <label for="warehouseId" class="label">Склад:</label>
        <Field
          name="warehouseId"
          id="warehouseId"
          as="select"
          class="form-control input"
          :class="{ 'is-invalid': errors.warehouseId }"
        >
          <option value="">Выберите склад</option>
          <option v-for="warehouse in warehousesStore.warehouses" :key="warehouse.id" :value="warehouse.id">
            {{ warehouse.name }}
          </option>
        </Field>
      </div>

      <div class="form-group">
        <label for="type" class="label">Тип:</label>
        <Field
          name="type"
          id="type"
          as="select"
          class="form-control input"
          :class="{ 'is-invalid': errors.type }"
        >
          <option value="">Выберите тип</option>
          <option v-for="item in ops?.types" :key="item.value" :value="item.value">
            {{ item.name }}
          </option>
        </Field>
      </div>

      <div class="form-group">
        <label for="operation" class="label">Операция:</label>
        <Field
          name="operation"
          id="operation"
          as="select"
          class="form-control input"
          :class="{ 'is-invalid': errors.operation }"
        >
          <option value="">Выберите операцию</option>
          <option v-for="item in ops?.operations" :key="item.value" :value="item.value">
            {{ item.name }}
          </option>
        </Field>
      </div>

      <div class="form-group">
        <label for="mode" class="label">Режим:</label>
        <Field
          name="mode"
          id="mode"
          as="select"
          class="form-control input"
          :class="{ 'is-invalid': errors.mode }"
        >
          <option value="">Выберите режим</option>
          <option v-for="item in ops?.modes" :key="item.value" :value="item.value">
            {{ item.name }}
          </option>
        </Field>
      </div>

      <div class="form-group">
        <label for="status" class="label">Статус:</label>
        <Field
          name="status"
          id="status"
          as="select"
          class="form-control input"
          :class="{ 'is-invalid': errors.status }"
        >
          <option value="">Выберите статус</option>
          <option v-for="item in ops?.statuses" :key="item.value" :value="item.value">
            {{ item.name }}
          </option>
        </Field>
      </div>

      <div class="form-group mt-8">
        <button class="button primary" type="submit" :disabled="isSubmitting">
          <span v-show="isSubmitting" class="spinner-border spinner-border-sm mr-1"></span>
          <font-awesome-icon size="1x" icon="fa-solid fa-check-double" class="mr-1" />
          {{ getButtonText() }}
        </button>
        <button
          class="button secondary"
          type="button"
          data-testid="cancel-button"
          @click="$router.push('/scanjobs')"
        >
          <font-awesome-icon size="1x" icon="fa-solid fa-xmark" class="mr-1" />
          Отменить
        </button>
      </div>
      <div v-if="errors.name" class="alert alert-danger mt-3 mb-0">{{ errors.name }}</div>
      <div v-if="errors.warehouseId" class="alert alert-danger mt-3 mb-0">{{ errors.warehouseId }}</div>
      <div v-if="errors.type" class="alert alert-danger mt-3 mb-0">{{ errors.type }}</div>
      <div v-if="errors.operation" class="alert alert-danger mt-3 mb-0">{{ errors.operation }}</div>
      <div v-if="errors.mode" class="alert alert-danger mt-3 mb-0">{{ errors.mode }}</div>
      <div v-if="errors.status" class="alert alert-danger mt-3 mb-0">{{ errors.status }}</div>
      <div v-if="errors.apiError" class="alert alert-danger mt-3 mb-0">{{ errors.apiError }}</div>
      <div v-if="alertStore.alert" class="mt-3">
        <div :class="['alert', alertStore.alert.type]" role="alert">{{ alertStore.alert.message }}</div>
      </div>
    </Form>
  </div>
</template>
