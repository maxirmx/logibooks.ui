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
import { useAuthStore } from '@/stores/auth.store.js'
import ActionButton from '@/components/ActionButton.vue'

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
const authStore = useAuthStore()
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
const runningAction = ref(false)
const currentScanjob = ref(null)

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

const { errors, handleSubmit, resetForm } = useForm({
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

const { value: name } = useField('name')
const { value: type } = useField('type')
const { value: operation } = useField('operation')
const { value: fieldMode } = useField('mode')
const { value: status } = useField('status')
const { value: fieldWarehouseId } = useField('warehouseId')
const { value: fieldRegisterId } = useField('registerId')

const warehouseDisplayName = computed(() => warehousesStore.getWarehouseName(fieldWarehouseId.value))
const resolvedDealNumber = computed(() => currentScanjob.value?.dealNumber || props.dealNumber || '')
const statusDisplay = computed(() => {
  if (status.value === null || status.value === undefined) return '—'
  return scanJobsStore.getOpsLabel(ops.value?.statuses, status.value)
})

const canStart = computed(() => currentScanjob.value?.allowStart === true)
const canPause = computed(() => currentScanjob.value?.allowPause === true)
const canFinish = computed(() => currentScanjob.value?.allowFinish === true)

onMounted(async () => {
  loading.value = true
  try {
    await scanJobsStore.ensureOpsLoaded()
    await warehousesStore.ensureLoaded()

    if (isCreate.value) {
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
      currentScanjob.value = null
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
      currentScanjob.value = loaded
    }
  } catch (err) {
    alertStore.error('Ошибка при инициализации формы:' + err.message)
    router.push('/scanjobs')
  } finally {
    loading.value = false
  }
})

function getTitle() {
  return isCreate.value ? 'Создание задания на сканирование' : 'Редактировать задание на сканирование'
}

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null
  return Number(value)
}

function buildPayload(values) {
  return {
    ...values,
    type: toNumberOrNull(values.type),
    operation: toNumberOrNull(values.operation),
    mode: toNumberOrNull(values.mode),
    status: toNumberOrNull(values.status),
    warehouseId: toNumberOrNull(values.warehouseId ?? props.warehouseId),
    registerId: toNumberOrNull(values.registerId ?? props.registerId)
  }
}

// Save without redirecting, returns true on success
async function saveScanjobQuiet() {
  const values = {
    id: currentScanjob.value?.id ?? 0,
    name: name.value,
    type: type.value,
    operation: operation.value,
    mode: fieldMode.value,
    status: status.value,
    warehouseId: fieldWarehouseId.value,
    registerId: fieldRegisterId.value
  }
  const payload = buildPayload(values)
  if (!payload.registerId) {
    alertStore.error('Не выбран реестр')
    return false
  }
  try {
    if (isCreate.value) {
      await scanJobsStore.create(payload)
    } else {
      await scanJobsStore.update(props.scanjobId, payload)
    }
    return true
  } catch (error) {
    if (error?.message?.includes && error.message.includes('409')) {
      alertStore.error('Такое задание на сканирование уже существует')
    } else {
      alertStore.error(error.message || 'Ошибка при сохранении задания на сканирование')
    }
    return false
  }
}

const onSubmit = handleSubmit(async (values, { setErrors }) => {
  saving.value = true
  try {
    const payload = buildPayload(values)

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

async function refreshScanjobStatus() {
  if (!props.scanjobId) return
  const updated = await scanJobsStore.getById(props.scanjobId)
  if (!updated) {
    alertStore.error('Не удалось обновить задание на сканирование')
    return
  }
  currentScanjob.value = updated
  if (updated.status !== null && updated.status !== undefined) {
    status.value = updated.status
  }
}

async function startScanjob() {
  if (runningAction.value || isCreate.value) return
  runningAction.value = true
  try {
    const saved = await saveScanjobQuiet()
    if (!saved) return
    await scanJobsStore.start(props.scanjobId)
    await refreshScanjobStatus()
  } catch (error) {
    if (error.message?.includes('403')) {
      alertStore.error('Нет прав для запуска сканирования')
    } else if (error.message?.includes('404')) {
      alertStore.error('Задание на сканирование не найдено')
    } else {
      alertStore.error('Ошибка при запуске сканирования')
    }
  } finally {
    runningAction.value = false
  }
}

async function pauseScanjob() {
  if (runningAction.value || isCreate.value) return
  runningAction.value = true
  try {
    const saved = await saveScanjobQuiet()
    if (!saved) return
    await scanJobsStore.pause(props.scanjobId)
    await refreshScanjobStatus()
  } catch (error) {
    if (error.message?.includes('403')) {
      alertStore.error('Нет прав для приостановки сканирования')
    } else if (error.message?.includes('404')) {
      alertStore.error('Задание на сканирование не найдено')
    } else {
      alertStore.error('Ошибка при приостановке сканирования')
    }
  } finally {
    runningAction.value = false
  }
}

async function finishScanjob() {
  if (runningAction.value || isCreate.value) return
  runningAction.value = true
  try {
    const saved = await saveScanjobQuiet()
    if (!saved) return
    await scanJobsStore.finish(props.scanjobId)
    await refreshScanjobStatus()
  } catch (error) {
    if (error.message?.includes('403')) {
      alertStore.error('Нет прав для завершения сканирования')
    } else if (error.message?.includes('404')) {
      alertStore.error('Задание на сканирование не найдено')
    } else {
      alertStore.error('Ошибка при завершении сканирования')
    }
  } finally {
    runningAction.value = false
  }
}

defineExpose({ onSubmit, cancel })
</script>

<template>
  <div class="settings form-3">
    <div class="header-with-actions">
      <h1 class="primary-heading">{{ getTitle() }}</h1>
      <div style="display:flex; align-items:center;">
        <div v-if="authStore.hasWhRole && !isCreate" class="header-actions header-actions-group">
          <ActionButton
            :item="{}"
            icon="fa-solid fa-play"
            icon-size="2x"
            tooltip-text="Начать сканирование"
            data-testid="scanjob-start-action"
            :disabled="saving || loading || runningAction || !canStart"
            @click="startScanjob"
          />
          <ActionButton
            :item="{}"
            icon="fa-solid fa-pause"
            icon-size="2x"
            tooltip-text="Приостановить сканирование"
            data-testid="scanjob-pause-action"
            :disabled="saving || loading || runningAction || !canPause"
            @click="pauseScanjob"
          />
          <ActionButton
            :item="{}"
            icon="fa-solid fa-check-circle"
            icon-size="2x"
            tooltip-text="Завершить сканирование"
            data-testid="scanjob-finish-action"
            :disabled="saving || loading || runningAction || !canFinish"
            @click="finishScanjob"
          />
        </div>
        <div class="header-actions header-actions-group">
          <ActionButton
            :item="{}"
            icon="fa-solid fa-check-double"
            icon-size="2x"
            tooltip-text="Сохранить"
            data-testid="scanjob-save-action"
            :disabled="saving || loading || runningAction"
            @click="() => onSubmit()"
          />
          <ActionButton
            :item="{}"
            icon="fa-solid fa-xmark"
            icon-size="2x"
            tooltip-text="Отменить"
            data-testid="scanjob-cancel-action"
            :disabled="saving || loading || runningAction"
            @click="cancel"
          />
        </div>
      </div>
    </div>
    <hr class="hr" />
    <div v-if="loading" class="text-center m-5">
      <span class="spinner-border spinner-border-lg align-center"></span>
    </div>

    <form v-else @submit.prevent="onSubmit">
      <input type="hidden" name="registerId" v-model="fieldRegisterId" />
      <input type="hidden" name="warehouseId" v-model="fieldWarehouseId" />

      <div class="form-row">
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

      </div>

      <div class="form-row">
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
      </div>

      <div class="form-row">
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
          v-model="fieldMode"
        >
          <option v-for="item in ops?.modes" :key="item.value" :value="item.value">
            {{ item.name }}
          </option>
        </select>
      </div>
      </div>

      <div class="form-row">
      <div class="form-group">
        <label for="status" class="label">Статус:</label>
        <input
          id="status"
          type="text"
          class="form-control input"
          :class="{ 'is-invalid': errors.status }"
          :value="statusDisplay"
          readonly
          data-testid="status-display"
        />
      </div>
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
