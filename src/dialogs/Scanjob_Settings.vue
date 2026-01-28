<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { ref, computed, onMounted, nextTick } from 'vue'
import router from '@/router'
import { storeToRefs } from 'pinia'
import { useForm, useField } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/yup'
import * as Yup from 'yup'
import { useScanjobsStore } from '@/stores/scanjobs.store.js'
import { useWarehousesStore } from '@/stores/warehouses.store.js'
import { useAlertStore } from '@/stores/alert.store.js'

const props = defineProps({
  mode: {
    type: String,
    required: true,
    validator: (value) => ['create', 'edit'].includes(value)
  },
  registerId: {
    type: Number,
    required: false,
    default: null
  },
  warehouseId: {
    type: Number,
    required: false,
    default: null
  },
  dealNumber: {
    type: String,
    required: false,
    default: ''
  },
  scanjobId: {
    type: Number,
    required: false
  }
})

const scanJobsStore = useScanjobsStore()
const warehousesStore = useWarehousesStore()
const alertStore = useAlertStore()
const { ops } = storeToRefs(scanJobsStore)

const isCreate = computed(() => props.mode === 'create')

// Runtime guard: fail fast if scanjobId is missing in edit mode
if (props.mode === 'edit' && (props.scanjobId === null || props.scanjobId === undefined)) {
  alertStore.error('Невозможно редактировать задание на сканирование: отсутствует идентификатор')
  router.push('/scanjobs')
  throw new Error('scanjobId is required when mode is edit')
}

const loading = ref(false)
const saving = ref(false)

const schema = toTypedSchema(Yup.object().shape({
  id: Yup.number().required(),
  name: Yup.string().required('Название обязательно'),
  type: Yup.number().required('Тип обязателен'),
  operation: Yup.number().required('Операция обязательна'),
  mode: Yup.number().required('Режим обязателен'),
  status: Yup.number().required('Статус обязателен'),
  warehouseId: Yup.number().nullable().required('Склад обязателен'),
  registerId: Yup.number().nullable().required('Реестр обязателен')
}))

const { errors, handleSubmit, resetForm, setFieldValue } = useForm({
  validationSchema: schema,
  initialValues: {
    id: 0,
    name: '',
    type: null,
    operation: null,
    mode: null,
    status: null,
    warehouseId: props.warehouseId ?? null,
    registerId: props.registerId ?? null
  }
})

const { value: id } = useField('id')
const { value: name } = useField('name')
const { value: type } = useField('type')
const { value: operation } = useField('operation')
const { value: mode } = useField('mode')
const { value: status } = useField('status')
const { value: warehouseId } = useField('warehouseId')
const { value: registerId } = useField('registerId')

const warehouseDisplayName = computed(() => warehousesStore.getWarehouseName(warehouseId.value))
const resolvedDealNumber = computed(() => props.dealNumber || '')

onMounted(async () => {
  loading.value = true
  try {
    await scanJobsStore.ensureOpsLoaded()
    await warehousesStore.ensureLoaded()

    if (isCreate.value) {
      // set sensible defaults once ops are loaded
      const defaults = {
        id: 0,
        name: props.dealNumber ? `Сканирование сделки ${props.dealNumber}` : '',
        type: ops.value?.types?.[0]?.value ?? null,
        operation: ops.value?.operations?.[0]?.value ?? null,
        mode: ops.value?.modes?.[0]?.value ?? null,
        status: ops.value?.statuses?.[0]?.value ?? null,
        warehouseId: props.warehouseId ?? null,
        registerId: props.registerId ?? null
      }
      resetForm({ values: defaults })
      await nextTick()
    } else {
      const loaded = await scanJobsStore.getById(props.scanjobId)
      if (!loaded) {
        alertStore.error('Не удалось загрузить задание на сканирование')
        router.push('/scanjobs')
        return
      }
      resetForm({ values: {
        id: loaded.id,
        name: loaded.name || (props.dealNumber ? `Сканирование сделки ${props.dealNumber}` : ''),
        type: loaded.type,
        operation: loaded.operation,
        mode: loaded.mode,
        status: loaded.status,
        warehouseId: loaded.warehouseId ?? props.warehouseId ?? null,
        registerId: loaded.registerId ?? props.registerId ?? null
      }})
      await nextTick()
    }
  } catch (err) {
    alertStore.error('Ошибка при инициализации формы')
    router.push('/scanjobs')
  } finally {
    loading.value = false
  }
})

function getTitle() {
  return isCreate.value ? 'Создание задания на сканирование' : 'Редактировать задание на сканирование'
}

function getButtonText() {
  return isCreate.value ? 'Создать' : 'Сохранить'
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null
  return Number(value)
}

const onSubmit = handleSubmit(async (values, { setErrors }) => {
  saving.value = true
  try {
    const payload = {
      ...values,
      type: toNumberOrNull(values.type),
      operation: toNumberOrNull(values.operation),
      mode: toNumberOrNull(values.mode),
      status: toNumberOrNull(values.status),
      warehouseId: toNumberOrNull(values.warehouseId ?? props.warehouseId),
      registerId: toNumberOrNull(values.registerId ?? props.registerId)
    }

    const resolvedRegisterId = payload.registerId
    if (!resolvedRegisterId) {
      setErrors({ apiError: 'Не выбран реестр' })
      return
    }

    if (isCreate.value) {
      await scanJobsStore.create(payload)
    } else {
      await scanJobsStore.update(props.scanjobId, payload)
    }
    router.push('/scanjobs')
  } catch (error) {
    if (error?.message?.includes && error.message.includes('409')) {
      setErrors({ apiError: 'Такое задание на сканирование уже существует' })
    } else {
      setErrors({ apiError: error.message || 'Ошибка при сохранении задания на сканирование' })
    }
  } finally {
    saving.value = false
  }
})

function cancel() {
  router.push('/scanjobs')
}

defineExpose({ onSubmit, cancel })
</script>

<template>
  <div class="settings form-2">
    <h1 class="primary-heading">{{ getTitle() }}</h1>
    <hr class="hr" />
    <div v-if="loading" class="text-center m-5">
      <span class="spinner-border spinner-border-lg align-center"></span>
    </div>

    <form v-else @submit.prevent="onSubmit">
      <input type="hidden" name="registerId" v-model="registerId" />
      <input type="hidden" name="warehouseId" v-model="warehouseId" />

      <div class="form-group">
        <label for="name" class="label">Название:</label>
        <input
          id="name"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.name }"
          placeholder="Название"
          v-model="name"
        />
      </div>

      <div class="form-group">
        <label for="dealNumber" class="label">Номер сделки:</label>
        <input
          id="dealNumber"
          type="text"
          class="form-control input"
          :value="resolvedDealNumber || '—'"
          readonly
        />
      </div>

      <div class="form-group">
        <label for="warehouseName" class="label">Склад:</label>
        <input
          id="warehouseName"
          type="text"
          class="form-control input"
          :value="warehouseDisplayName || '—'"
          readonly
        />
      </div>

      <div class="form-group">
        <label for="type" class="label">Тип:</label>
        <select
          id="type"
          class="form-control input"
          :class="{ 'is-invalid': errors.type }"
          v-model="type"
        >
          <option v-for="item in ops?.types" :key="item.value" :value="item.value">
            {{ item.name }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label for="operation" class="label">Операция:</label>
        <select
          id="operation"
          class="form-control input"
          :class="{ 'is-invalid': errors.operation }"
          v-model="operation"
        >
          <option v-for="item in ops?.operations" :key="item.value" :value="item.value">
            {{ item.name }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label for="mode" class="label">Режим:</label>
        <select
          id="mode"
          class="form-control input"
          :class="{ 'is-invalid': errors.mode }"
          v-model="mode"
        >
          <option v-for="item in ops?.modes" :key="item.value" :value="item.value">
            {{ item.name }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label for="status" class="label">Статус:</label>
        <select
          id="status"
          class="form-control input"
          :class="{ 'is-invalid': errors.status }"
          v-model="status"
        >
          <option v-for="item in ops?.statuses" :key="item.value" :value="item.value">
            {{ item.name }}
          </option>
        </select>
      </div>

      <div class="form-group mt-8">
        <button class="button primary" type="submit" :disabled="saving">
          <span v-show="saving" class="spinner-border spinner-border-sm mr-1"></span>
          <font-awesome-icon size="1x" icon="fa-solid fa-check-double" class="mr-1" />
          {{ getButtonText() }}
        </button>
        <button
          class="button secondary"
          type="button"
          data-testid="cancel-button"
          @click="cancel"
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
    </form>
  </div>
</template>
