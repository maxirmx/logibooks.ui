<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import FieldError from '@/components/FieldError.vue'
import { focusFirstInvalidField } from '@/helpers/form.validation.helpers.js'
import { getErrorMessage, reportError, reportFormError } from '@/helpers/error.helpers.js'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { ref, computed, onBeforeUnmount, onMounted, nextTick, watch } from 'vue'
import router from '@/router'
import { storeToRefs } from 'pinia'
import { useForm, useField } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/yup'
import * as Yup from 'yup'
import { useScanjobsStore } from '@/stores/scanjobs.store.js'
import { useWarehousesStore } from '@/stores/warehouses.store.js'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useCompaniesStore } from '@/stores/companies.store.js'
import { useParcelStatusesStore } from '@/stores/parcel.statuses.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { GTC_COMPANY_ID } from '@/helpers/company.constants.js'
import { getCompanyDisplayName } from '@/helpers/register.display.helpers.js'
import { formatRegisterInvoice } from '@/helpers/register.heading.helpers.js'
import ActionButton from '@/components/ActionButton.vue'
import LookupParcelSelectionDialog from '@/dialogs/LookupParcelSelectionDialog.vue'
import { useAppConfirm } from '@/composables/useAppConfirm.js'
import { useScanjobFinishConfirmation } from '@/composables/useScanjobFinishConfirmation.js'

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
const registersStore = useRegistersStore()
const companiesStore = useCompaniesStore()
const parcelStatusesStore = useParcelStatusesStore()
const alertStore = useAlertStore()
const authStore = useAuthStore()
const confirm = useAppConfirm()
const finishConfirmation = useScanjobFinishConfirmation(scanJobsStore.getFinishOptions, confirm)
const { ops } = storeToRefs(scanJobsStore)
const { companies } = storeToRefs(companiesStore)

const isCreate = computed(() => props.mode === 'create')

// Title function must be defined before guards to prevent template render errors
function getTitle() {
  return isCreate.value
    ? 'Создание задания на сканирование'
    : 'Редактировать задание на сканирование'
}

// Runtime guard: fail fast if scanjobId is missing in edit mode
if (props.mode === 'edit' && (props.scanjobId === null || props.scanjobId === undefined)) {
  alertStore.error('Невозможно редактировать задание на сканирование: отсутствует идентификатор')
  router.back()
  throw new Error('scanjobId is required when mode is edit')
}

const loading = ref(false)
const saving = ref(false)
const runningAction = ref(false)
const settingsBusy = computed(() => saving.value || runningAction.value)
const currentScanjob = ref(null)
const nameManuallyEdited = ref(false)
let initializationVersion = 0

function formatDefaultScanjobName(operationValue) {
  const operationNames = {
    10: 'Входящее',
    15: 'Сортировка',
    20: 'Исходящее',
    30: 'Поиск'
  }
  const operationName = operationNames[operationValue]
  return props.dealNumber && operationName ? `${operationName} для сделки ${props.dealNumber}` : ''
}

function resolveLookupOperationValue() {
  const operations = ops.value?.operations
  if (!Array.isArray(operations) || operations.length === 0) return null
  // Lookup operation is the last in the array
  const lookupOperation = operations[operations.length - 1]
  return lookupOperation?.value ?? null
}

function getLookupTargetError(values) {
  if (Number(values.operation) !== Number(resolveLookupOperationValue())) return null
  if (values.lookupTargetSource === 'list') {
    return values.lookupParcelIds?.length ? null : {
      path: 'lookupParcelIds', message: 'Выберите посылки для поиска'
    }
  }
  return Number(values.lookupStatusId) > 0 ? null : {
    path: 'lookupStatusId', message: 'Статус для поиска обязателен'
  }
}

const schema = toTypedSchema(
  Yup.object().shape({
    id: Yup.number().required(),
    name: Yup.string().required('Название обязательно'),
    type: Yup.number().required('Тип обязателен'),
    operation: Yup.number().required('Операция обязательна'),
    mode: Yup.number().required('Режим обязателен'),
    status: Yup.number().required('Статус обязателен'),
    warehouseId: Yup.number().nullable().required('Склад обязателен'),
    registerId: Yup.number().nullable().required('Реестр обязателен'),
    lookupStatusId: Yup.number().nullable(),
    lookupTargetSource: Yup.string().oneOf(['status', 'list']),
    lookupParcelIds: Yup.array().of(Yup.number().integer().positive())
  }).test('lookup-target', function (values) {
    const error = getLookupTargetError(values)
    return error ? this.createError(error) : true
  })
)

const { errors, handleSubmit, resetForm, setErrors } = useForm({
  validationSchema: schema,
  initialValues: {
    id: 0,
    name: '',
    type: null,
    operation: null,
    mode: null,
    status: null,
    warehouseId: props.warehouseId ?? null,
    registerId: props.registerId ?? null,
    lookupStatusId: null,
    lookupTargetSource: 'status',
    lookupParcelIds: []
  }
})

const { value: name } = useField('name')
const { value: type } = useField('type')
const { value: operation } = useField('operation')
const { value: fieldMode } = useField('mode')
const { value: status } = useField('status')
const { value: fieldWarehouseId } = useField('warehouseId')
const { value: fieldRegisterId } = useField('registerId')
const { value: lookupStatusId } = useField('lookupStatusId')
const { value: lookupTargetSource } = useField('lookupTargetSource')
const { value: lookupParcelIds } = useField('lookupParcelIds')
const lookupSelectionOpen = ref(false)
const createdStatus = 10
const boxOnlyType = 20
const boxesAndParcelsType = 30
const isListLookup = computed(() => isLookupOperation.value && lookupTargetSource.value === 'list')
const savedListLookup = computed(() => (currentScanjob.value?.lookupParcelIds?.length ?? 0) > 0)
const canChooseListLookup = computed(() => isCreate.value || Number(currentScanjob.value?.status) === createdStatus)
const lookupSettingsLocked = computed(() => savedListLookup.value && !canChooseListLookup.value)
const lookupSettingsDisabled = computed(() => settingsBusy.value || readOnly.value ||
  isLookupOnlyRegisterType.value || lookupSettingsLocked.value)
const scanTypeOptions = computed(() => (ops.value?.types ?? []).filter(item =>
  !isListLookup.value || Number(item.value) !== boxOnlyType
))

const currentRegister = ref(null)

const lookupOperationValue = computed(() => resolveLookupOperationValue())

const isLookupOperation = computed(
  () =>
    lookupOperationValue.value !== null &&
    Number(operation.value) === Number(lookupOperationValue.value)
)

const isLookupOnlyRegisterType = computed(() => {
  const registerType = currentRegister.value?.registerType
  return registerType === GTC_COMPANY_ID
})

const operationOptions = computed(() => {
  if (!Array.isArray(ops.value?.operations)) return []
  // For lookup-only register types, fail closed when lookupOperationValue cannot be resolved.
  if (!isLookupOnlyRegisterType.value) {
    return ops.value.operations
  }
  if (lookupOperationValue.value === null) {
    return []
  }
  return ops.value.operations.filter(
    (item) => Number(item.value) === Number(lookupOperationValue.value)
  )
})

const warehouseDisplayName = computed(() =>
  warehousesStore.getWarehouseName(fieldWarehouseId.value)
)
const resolvedDealNumber = computed(
  () => currentScanjob.value?.dealNumber || props.dealNumber || ''
)
function getPresentationValue(fieldName) {
  return currentScanjob.value?.[fieldName] ?? currentRegister.value?.[fieldName] ?? null
}

const registerPresentationItem = computed(() => ({
  invoiceNumber: getPresentationValue('invoiceNumber'),
  transportationTypeCode: getPresentationValue('transportationTypeCode'),
  senderId: getPresentationValue('senderId'),
  recipientId: getPresentationValue('recipientId')
}))

const invoiceDisplay = computed(() => {
  const item = registerPresentationItem.value
  const value = formatRegisterInvoice(item, (transportationTypeCode) =>
    transportationTypeCode === null ||
    transportationTypeCode === undefined ||
    transportationTypeCode === ''
      ? ''
      : registersStore.getTransportationDocument(transportationTypeCode)
  )
  return value || 'Не задан'
})

const senderRecipientDisplay = computed(() => {
  const item = registerPresentationItem.value
  const sender = getCompanyDisplayName(companies.value, item.senderId)
  const recipient = getCompanyDisplayName(companies.value, item.recipientId)
  return `${sender} / ${recipient}`
})

const statusDisplay = computed(() => {
  if (status.value === null || status.value === undefined) return '—'
  return scanJobsStore.getOpsLabel(ops.value?.statuses, status.value)
})

const canStart = computed(() => currentScanjob.value?.allowStart === true)
const canPause = computed(() => currentScanjob.value?.allowPause === true)
const canFinish = computed(() => currentScanjob.value?.allowFinish === true)
const readOnly = computed(
  () => currentScanjob.value?.readOnly === true || currentRegister.value?.readOnly === true
)

watch(operation, (value) => {
  if (isCreate.value && !nameManuallyEdited.value) {
    name.value = formatDefaultScanjobName(value)
  }
})

watch(isLookupOperation, (lookup) => {
  if (!lookup) {
    lookupStatusId.value = null
    lookupTargetSource.value = 'status'
    clearLookupSelection()
  }
})

function clearLookupSelection() {
  lookupSelectionOpen.value = false
  lookupParcelIds.value = []
}

watch(fieldRegisterId, () => {
  if (!loading.value) clearLookupSelection()
}, { flush: 'sync' })
watch(() => props.registerId, () => {
  if (!isCreate.value) return
  clearLookupSelection()
  currentRegister.value = null
  return initialize()
})

function changeLookupTargetSource(event) {
  clearLookupSelection()
  if (event.target.value === 'list') {
    lookupStatusId.value = null
    type.value = boxesAndParcelsType
  }
}

function confirmLookupParcels(ids, registerId) {
  if (lookupSettingsDisabled.value || !isListLookup.value || registerId !== Number(fieldRegisterId.value)) return
  lookupParcelIds.value = ids
}

watch(
  operationOptions,
  (options) => {
    if (!Array.isArray(options) || options.length === 0) return
    const selectedValue = Number(operation.value)
    const existsInOptions = options.some((item) => Number(item.value) === selectedValue)
    if (!existsInOptions) {
      operation.value = options[0].value
    }
  },
  { immediate: true }
)

async function resolveRegister(registerId) {
  if (!(Number(registerId) > 0)) return null
  const register = (await registersStore.getById(registerId)) ?? registersStore.item
  return Number(register?.id) === Number(registerId) && !register.error ? register : null
}

async function initialize() {
  const version = ++initializationVersion
  const registerId = props.registerId
  loading.value = true
  try {
    await scanJobsStore.ensureOpsLoaded()
    await registersStore.ensureOpsLoaded()
    await companiesStore.getAll()
    await warehousesStore.ensureLoaded()
    await parcelStatusesStore.ensureLoaded()

    if (isCreate.value) {
      const register = await resolveRegister(registerId)
      if (version !== initializationVersion) return
      currentRegister.value = register

      const initialOperation = isLookupOnlyRegisterType.value
        ? lookupOperationValue.value
        : ops.value?.operations?.[0]?.value ?? null
      const defaults = {
        id: 0,
        name: formatDefaultScanjobName(initialOperation),
        type: ops.value?.types?.[0]?.value ?? null,
        operation: initialOperation,
        mode: ops.value?.modes?.[0]?.value ?? null,
        status: ops.value?.statuses?.[0]?.value ?? null,
        warehouseId: props.warehouseId ?? null,
        registerId: props.registerId ?? null,
        lookupStatusId: null,
        lookupTargetSource: 'status',
        lookupParcelIds: []
      }
      nameManuallyEdited.value = false
      resetForm({ values: defaults })
      await nextTick()
      currentScanjob.value = null
    } else {
      const loaded = await scanJobsStore.getById(props.scanjobId)
      if (version !== initializationVersion) return
      if (!loaded) {
        alertStore.error('Не удалось загрузить задание на сканирование')
        return
      }
      const register = await resolveRegister(loaded.registerId ?? registerId)
      if (version !== initializationVersion) return
      currentRegister.value = register
      resetForm({
        values: {
          id: loaded.id,
          name: loaded.name || (props.dealNumber ? `Сканирование сделки ${props.dealNumber}` : ''),
          type: loaded.type,
          operation: loaded.operation,
          mode: loaded.mode,
          status: loaded.status,
          warehouseId: loaded.warehouseId ?? props.warehouseId ?? null,
          registerId: loaded.registerId ?? props.registerId ?? null,
          lookupStatusId: loaded.lookupStatusId ?? null,
          lookupTargetSource: loaded.lookupParcelIds?.length ? 'list' : 'status',
          lookupParcelIds: loaded.lookupParcelIds ?? []
        }
      })
      await nextTick()
      currentScanjob.value = loaded
    }
  } catch (error) {
    if (version === initializationVersion) {
      alertStore.error(error, { fallback: 'Ошибка при инициализации формы' })
    } else {
      reportError(error, { context: 'obsolete scan job settings initialization' })
    }
  } finally {
    if (version === initializationVersion) loading.value = false
  }
}

onMounted(initialize)
onBeforeUnmount(() => { initializationVersion++ })

function toNumberOrNull(value) {
  if (value === null || value === undefined || value === '') return null
  return Number(value)
}

function buildPayload(values) {
  const { lookupTargetSource: source, lookupParcelIds: ids, ...settings } = values
  const list = Number(values.operation) === lookupOperationValue.value && source === 'list'
  return {
    ...settings,
    type: toNumberOrNull(values.type),
    operation: toNumberOrNull(values.operation),
    mode: toNumberOrNull(values.mode),
    status: toNumberOrNull(values.status),
    warehouseId: toNumberOrNull(values.warehouseId ?? props.warehouseId),
    registerId: toNumberOrNull(values.registerId ?? props.registerId),
    lookupStatusId: list ? null : toNumberOrNull(values.lookupStatusId),
    ...(list ? { lookupParcelIds: ids } : savedListLookup.value ? { lookupParcelIds: null } : {})
  }
}

function validateLookupChoice(values) {
  if (isLookupOnlyRegisterType.value) {
    alertStore.error('Задания сканирования недоступны для реестров GTC')
    return false
  }
  const error = getLookupTargetError(values)
  if (error) setErrors({ [error.path]: error.message })
  return !error
}

function reportSaveError(error) {
  if (handleReadOnlyConflict(error)) return
  if (!error?.data?.code && (error?.status === 409 || String(error?.message || '').includes('409'))) {
    alertStore.error('Такое задание на сканирование уже существует')
    return
  }
  reportFormError(error, { setErrors, alertStore, fallback: 'Ошибка при сохранении задания на сканирование' })
}

function handleReadOnlyConflict(error) {
  if (error?.status !== 409 || !getErrorMessage(error).includes('Изменения запрещены')) return false
  if (currentScanjob.value) currentScanjob.value = { ...currentScanjob.value, readOnly: true }
  if (currentRegister.value) currentRegister.value = { ...currentRegister.value, readOnly: true }
  alertStore.error('Изменения запрещены для выбранного реестра')
  return true
}

// Save without redirecting, returns true on success
async function saveScanjobQuiet() {
  if (readOnly.value) {
    alertStore.error('Изменения запрещены для выбранного реестра')
    return false
  }
  // Validate required fields before saving to match the schema requirements
  // This ensures status transitions only happen with valid data
  if (!name.value || !name.value.trim()) {
    alertStore.error('Название обязательно')
    return false
  }
  if (type.value === null || type.value === undefined || type.value === '') {
    alertStore.error('Тип обязателен')
    return false
  }
  if (operation.value === null || operation.value === undefined || operation.value === '') {
    alertStore.error('Операция обязательна')
    return false
  }
  if (fieldMode.value === null || fieldMode.value === undefined || fieldMode.value === '') {
    alertStore.error('Режим обязателен')
    return false
  }
  if (
    fieldWarehouseId.value === null ||
    fieldWarehouseId.value === undefined ||
    fieldWarehouseId.value === ''
  ) {
    alertStore.error('Склад обязателен')
    return false
  }
  if (
    fieldRegisterId.value === null ||
    fieldRegisterId.value === undefined ||
    fieldRegisterId.value === ''
  ) {
    alertStore.error('Реестр обязателен')
    return false
  }
  const values = {
    id: currentScanjob.value?.id ?? 0,
    name: name.value,
    type: type.value,
    operation: operation.value,
    mode: fieldMode.value,
    status: status.value,
    warehouseId: fieldWarehouseId.value,
    registerId: fieldRegisterId.value,
    lookupStatusId: lookupStatusId.value,
    lookupTargetSource: lookupTargetSource.value,
    lookupParcelIds: lookupParcelIds.value
  }
  if (!validateLookupChoice(values)) return false
  const payload = buildPayload(values)
  try {
    if (isCreate.value) {
      await scanJobsStore.create(payload)
    } else {
      await scanJobsStore.update(props.scanjobId, payload)
      currentScanjob.value = { ...currentScanjob.value, ...payload, lookupParcelIds: payload.lookupParcelIds ?? [] }
    }
    return true
  } catch (error) {
    reportSaveError(error)
    return false
  }
}

const onSubmit = handleSubmit(async (values) => {
  if (settingsBusy.value) return
  if (readOnly.value) {
    alertStore.error('Изменения запрещены для выбранного реестра')
    return
  }
  if (!validateLookupChoice(values)) return
  saving.value = true
  try {
    const payload = buildPayload(values)

    const resolvedRegisterId = payload.registerId
    if (!resolvedRegisterId) {
      alertStore.error('Не выбран реестр')
      return
    }

    if (isCreate.value) {
      await scanJobsStore.create(payload)
      // Navigate to scanjobs list after successfully creating
      router.push('/scanjobs')
    } else {
      await scanJobsStore.update(props.scanjobId, payload)
      // Return to caller after successfully updating
      router.back()
    }
  } catch (error) {
    reportSaveError(error)
  } finally {
    saving.value = false
  }
}, focusFirstInvalidField)

function cancel() {
  router.back()
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
  if (settingsBusy.value || isCreate.value || readOnly.value) return
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
  if (settingsBusy.value || isCreate.value || readOnly.value) return
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
  if (settingsBusy.value || isCreate.value || readOnly.value) return
  runningAction.value = true
  let completed = false
  try {
    const choices = await finishConfirmation.request({
      id: props.scanjobId,
      name: name.value || currentScanjob.value?.name || props.scanjobId,
      operation: Number(operation.value)
    })
    if (!choices) return
    const saved = await saveScanjobQuiet()
    if (!saved) return
    await scanJobsStore.finish(props.scanjobId, choices)
    completed = true
    finishConfirmation.reset()
    status.value = 20
    currentScanjob.value = { ...currentScanjob.value, status: 20, allowStart: false, allowPause: false, allowFinish: false }
    await refreshScanjobStatus()
  } catch (error) {
    if (completed) {
      alertStore.error('Задание завершено, но не удалось обновить данные. Обновите страницу.')
    } else if (handleReadOnlyConflict(error)) {
      return
    } else if (error.status === 403 || error.message?.includes('403')) {
      alertStore.error('Нет прав для завершения сканирования')
    } else if (error.status === 404 || error.message?.includes('404')) {
      alertStore.error('Задание на сканирование не найдено')
    } else {
      alertStore.error(error, { fallback: 'Ошибка при завершении сканирования' })
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
      <div class="header-actions-bar">
        <div v-if="authStore.hasWhRole && !isCreate" class="header-actions header-actions-group">
          <ActionButton
            :item="{}"
            icon="fa-solid fa-play"
            icon-size="2x"
            tooltip-text="Начать сканирование"
            data-testid="scanjob-start-action"
            :disabled="readOnly || saving || loading || runningAction || !canStart"
            @click="startScanjob"
          />
          <ActionButton
            :item="{}"
            icon="fa-solid fa-pause"
            icon-size="2x"
            tooltip-text="Приостановить сканирование"
            data-testid="scanjob-pause-action"
            :disabled="readOnly || saving || loading || runningAction || !canPause"
            @click="pauseScanjob"
          />
          <ActionButton
            :item="{}"
            icon="fa-solid fa-check-circle"
            icon-size="2x"
            tooltip-text="Завершить сканирование"
            data-testid="scanjob-finish-action"
            :disabled="readOnly || saving || loading || runningAction || !canFinish"
            v-if="authStore.isShiftLeadPlus"
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
            :disabled="readOnly || isLookupOnlyRegisterType || saving || loading || runningAction"
            @click="onSubmit"
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

    <PageAlertRegion v-if="!lookupSelectionOpen" />
    <div v-if="isLookupOnlyRegisterType" class="alert alert-warning">Задания сканирования недоступны для реестров GTC</div>
    <div v-if="loading" class="text-center m-5">
      <span class="spinner-border spinner-border-lg align-center"></span>
    </div>

    <div v-if="readOnly" class="alert alert-warning read-only-notice">
      Изменения и операции сканирования запрещены. Просмотр задания доступен.
    </div>

    <form v-if="!loading" @submit.prevent="onSubmit" :class="{ 'read-only-form': readOnly }">
      <input type="hidden" name="registerId" v-model="fieldRegisterId" />
      <input type="hidden" name="warehouseId" v-model="fieldWarehouseId" />
      <FieldError name="warehouseId" :errors="errors" />

      <div class="form-row">
        <div class="form-group">
          <label for="invoiceDisplay" class="label">ТСД:</label>
          <input
            id="invoiceDisplay"
            type="text"
            class="form-control input"
            :value="invoiceDisplay"
            readonly
            data-testid="invoice-display"
          />
        </div>

        <div class="form-group">
          <label for="senderRecipientDisplay" class="label">Отправитель/Получатель:</label>
          <input
            id="senderRecipientDisplay"
            type="text"
            class="form-control input"
            :value="senderRecipientDisplay"
            readonly
            data-testid="sender-recipient-display"
          />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="dealNumber" class="label">Номер сделки:</label>
          <input
            id="dealNumber"
            type="text"
            class="form-control input"
            :value="resolvedDealNumber || 'Не задан'"
            readonly
          />
        </div>

        <div class="form-group">
          <label for="name" class="label">Название задания:</label>
          <input
            id="name"
            type="text"
            class="form-control input"
            :class="{ 'is-invalid': errors.name }"
            placeholder="Название"
            :readonly="readOnly"
            v-model="name"
            @input="nameManuallyEdited = true"
          />
          <FieldError name="name" :errors="errors" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="warehouseName" class="label">Склад:</label>
          <input
            id="warehouseName"
            type="text"
            class="form-control input"
            :value="warehouseDisplayName || 'Не задан'"
            readonly
          />
        </div>
        <div class="form-group">
          <label for="type" class="label">Тип:</label>
          <select
            id="type"
            class="form-control input"
            :class="{ 'is-invalid': errors.type }"
            :disabled="settingsBusy || readOnly || lookupSettingsLocked"
            v-model="type"
          >
            <option v-for="item in scanTypeOptions" :key="item.value" :value="item.value">
              {{ item.name }}
            </option>
          </select>
          <FieldError name="type" :errors="errors" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="mode" class="label">Режим:</label>
          <select
            id="mode"
            class="form-control input"
            :class="{ 'is-invalid': errors.mode }"
            :disabled="settingsBusy || readOnly || lookupSettingsLocked"
            v-model="fieldMode"
          >
            <option v-for="item in ops?.modes" :key="item.value" :value="item.value">
              {{ item.name }}
            </option>
          </select>
          <FieldError name="mode" :errors="errors" />
        </div>
        <div class="form-group">
          <label for="status" class="label">Статус сканирования:</label>
          <input
            id="status"
            type="text"
            class="form-control input"
            :class="{ 'is-invalid': errors.status }"
            :value="statusDisplay"
            readonly
            data-testid="status-display"
          />
          <FieldError name="status" :errors="errors" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="operation" class="label">Операция:</label>
          <select
            id="operation"
            class="form-control input"
            :class="{ 'is-invalid': errors.operation }"
            :disabled="lookupSettingsDisabled"
            v-model="operation"
          >
            <option v-for="item in operationOptions" :key="item.value" :value="item.value">
              {{ item.name }}
            </option>
          </select>
          <FieldError name="operation" :errors="errors" />
        </div>
        <div v-if="isLookupOperation" class="form-group">
          <label for="lookupTargetSource" class="label">Вид поиска:</label>
          <select
            id="lookupTargetSource"
            v-model="lookupTargetSource"
            class="form-control input"
            :disabled="lookupSettingsDisabled"
            @change="changeLookupTargetSource"
          >
            <option value="status">По статусу</option>
            <option value="list" :disabled="!canChooseListLookup && !savedListLookup">По списку посылок</option>
          </select>
        </div>
      </div>

      <div v-if="isLookupOperation" class="form-row">
        <div v-if="isListLookup" class="form-group">
          <label for="lookupParcelIds" class="label">Посылки для поиска:</label>
          <div class="d-flex align-center ga-2">
            <button
              id="lookupParcelIds"
              type="button"
              class="btn btn-outline-primary"
              :disabled="lookupSettingsDisabled || !currentRegister || !fieldRegisterId"
              @click="lookupSelectionOpen = true"
            >Выбрать посылки</button>
            <span>Выбрано: {{ lookupParcelIds?.length ?? 0 }}</span>
          </div>
          <FieldError name="lookupParcelIds" :errors="errors" />
        </div>
        <div v-else class="form-group">
          <label for="lookupStatusId" class="label">Статус для поиска:</label>
          <select
            id="lookupStatusId"
            class="form-control input"
            :class="{ 'is-invalid': errors.lookupStatusId }"
            :disabled="lookupSettingsDisabled"
            v-model="lookupStatusId"
            data-testid="lookup-status-select"
          >
            <option :value="null">Не выбран</option>
            <option
              v-for="parcelStatus in parcelStatusesStore.parcelStatuses"
              :key="parcelStatus.id"
              :value="parcelStatus.id"
            >
              {{ parcelStatus.title }}
            </option>
          </select>
          <FieldError name="lookupStatusId" :errors="errors" />
        </div>
      </div>
    </form>
    <LookupParcelSelectionDialog
      v-if="lookupSelectionOpen && currentRegister"
      v-model="lookupSelectionOpen"
      :register="currentRegister"
      :disabled="lookupSettingsDisabled"
      @selected="confirmLookupParcels"
    />
  </div>
</template>

<style scoped></style>
