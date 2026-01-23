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
    required: false
  }
})

const scanJobsStore = useScanJobsStore()
const warehousesStore = useWarehousesStore()
const alertStore = useAlertStore()

const { warehouses } = storeToRefs(warehousesStore)

const isCreate = computed(() => props.mode === 'create')

await warehousesStore.getAll()

const typeOptions = [
  { value: 0, label: 'Посылка' },
  { value: 1, label: 'Мешок' }
]

const operationOptions = [
  { value: 0, label: 'Входящее' },
  { value: 1, label: 'Исходящее' },
  { value: 2, label: 'Поиск' }
]

const modeOptions = [
  { value: 0, label: 'Ручное' },
  { value: 1, label: 'Автоматическое' }
]

const statusOptions = [
  { value: 0, label: 'В работе' },
  { value: 1, label: 'Завершено' }
]

let scanJob = ref({
  id: 0,
  name: '',
  type: 0,
  operation: 0,
  mode: 0,
  status: 0,
  warehouseId: null
})

if (!isCreate.value) {
  ;({ scanJob } = storeToRefs(scanJobsStore))
  await scanJobsStore.getById(props.scanjobId)
}

function getTitle() {
  return isCreate.value ? 'Создание задания сканирования' : 'Редактировать задание сканирования'
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
          setErrors({ apiError: 'Задание с таким названием уже существует' })
        } else {
          setErrors({ apiError: error.message || 'Ошибка при создании задания сканирования' })
        }
      })
  }

  return scanJobsStore
    .update(props.scanjobId, payload)
    .then(() => {
      router.push('/scanjobs')
    })
    .catch((error) => {
      setErrors({ apiError: error.message || 'Ошибка при сохранении задания сканирования' })
    })
}
</script>

<template>
  <div class="settings form-2">
    <h1 class="primary-heading">{{ getTitle() }}</h1>
    <hr class="hr" />
    <Form
      @submit="onSubmit"
      :initial-values="scanJob"
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
          <option
            v-for="warehouse in warehouses"
            :key="warehouse.id"
            :value="warehouse.id"
          >
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
          <option
            v-for="typeOption in typeOptions"
            :key="typeOption.value"
            :value="typeOption.value"
          >
            {{ typeOption.label }}
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
          <option
            v-for="operationOption in operationOptions"
            :key="operationOption.value"
            :value="operationOption.value"
          >
            {{ operationOption.label }}
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
          <option
            v-for="modeOption in modeOptions"
            :key="modeOption.value"
            :value="modeOption.value"
          >
            {{ modeOption.label }}
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
          <option
            v-for="statusOption in statusOptions"
            :key="statusOption.value"
            :value="statusOption.value"
          >
            {{ statusOption.label }}
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
