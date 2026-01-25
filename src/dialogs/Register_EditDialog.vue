<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import router from '@/router'
import { Form, Field } from 'vee-validate'
import * as Yup from 'yup'
import { storeToRefs } from 'pinia'
import { watch, ref, computed, onMounted, onUnmounted } from 'vue'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useCountriesStore } from '@/stores/countries.store.js'
import { useTransportationTypesStore } from '@/stores/transportation.types.store.js'
import { useCustomsProceduresStore } from '@/stores/customs.procedures.store.js'
import { useCompaniesStore } from '@/stores/companies.store.js'
import { useAirportsStore } from '@/stores/airports.store.js'
import { useWarehousesStore } from '@/stores/warehouses.store.js'
import { WBR2_REGISTER_ID } from '@/helpers/company.constants.js'
import ActionButton from '@/components/ActionButton.vue'
import ActionDialog from '@/components/ActionDialog.vue'
import ErrorDialog from '@/components/ErrorDialog.vue'
import { useActionDialog } from '@/composables/useActionDialog.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { generateRegisterName } from '@/helpers/parcels.list.helpers.js'
import AirportSelectField from '@/components/AirportSelectField.vue'

const props = defineProps({
  id: { type: Number, required: false },
  create: { type: Boolean, default: false }
})

const alertStore = useAlertStore()

const registersStore = useRegistersStore()
const { item, uploadFile, items } = storeToRefs(registersStore)

const countriesStore = useCountriesStore()
const { countries } = storeToRefs(countriesStore)

const transportationTypesStore = useTransportationTypesStore()

const customsProceduresStore = useCustomsProceduresStore()

const companiesStore = useCompaniesStore()
const { companies } = storeToRefs(companiesStore)

const airportsStore = useAirportsStore()
const { airports } = storeToRefs(airportsStore)

const warehousesStore = useWarehousesStore()
const { warehouses } = storeToRefs(warehousesStore)

const { actionDialogState, showActionDialog, hideActionDialog } = useActionDialog()

// Error dialog state
const errorDialogState = ref({
  show: false,
  title: '',
  message: '',
  missingHeaders: [],
  missingColumns: []
})

function hideErrorDialog() {
  errorDialogState.value.show = false
}

// Id = 1 --> Code = 10 (Экспорт) 
const isExport = ref(true)
const procedureCodeLoaded = ref(false)
const isComponentMounted = ref(true)
const isInitializing = ref(true)
const isSubmitting = ref(false)
const transferRegisterId = ref('')

const registerOptions = computed(() => {
  if (!Array.isArray(items.value)) return []

  // Only include registers of the same register type as the one we are editing/creating for
  const registerType = item.value?.registerType ?? null
  if (!registerType) return []

  return items.value
    .filter((register) => register && typeof register === 'object' && (register.registerType == registerType))
    .map((register) => ({
      id: register.id,
      name: generateRegisterName(register.dealNumber, register.fileName)
    }))
})

const airportOptions = computed(() => (Array.isArray(airports.value) ? airports.value : []))
const warehouseOptions = computed(() => {
  const available = Array.isArray(warehouses.value) ? warehouses.value : []
  return [{ id: 0, name: 'Не задано' }, ...available]
})
const isWbr2Register = computed(() => item.value?.registerType === WBR2_REGISTER_ID)

const AVIA_TRANSPORT_CODE = 0

function getTransportationTypeById(typeId) {
  const numericId = typeof typeId === 'string' ? parseInt(typeId, 10) : typeId
  if (numericId === null || numericId === undefined || Number.isNaN(numericId)) {
    return null
  }
  return transportationTypesStore.types?.find((type) => type.id === numericId) || null
}

// Track current form transportation type for reactive UI updates
const currentTransportationTypeId = ref(null)

function isAviaTransportationId(typeId) {
  return getTransportationTypeById(typeId)?.code === AVIA_TRANSPORT_CODE
}

const isAviaTransportation = computed(() => {
  // Use current form value if available, otherwise fall back to item value
  const typeId = currentTransportationTypeId.value ?? item.value?.transportationTypeId
  if (!typeId) return false
  return isAviaTransportationId(typeId)
})

// Watch for form field changes to update UI reactively
function handleTransportationTypeChange(e, setFieldValue) {
  const newValue = e.target.value
  currentTransportationTypeId.value = newValue ? parseInt(newValue, 10) : null
  
  // Handle airport field updates based on transportation type
  const type = getTransportationTypeById(currentTransportationTypeId.value)
  
  if (!type || type.code !== AVIA_TRANSPORT_CODE) {
    // Clear form fields only (not item.value) when switching to non-aviation transport
    if (setFieldValue && typeof setFieldValue === 'function') {
      setFieldValue('departureAirportId', 0)
      setFieldValue('arrivalAirportId', 0)
    }
  } else {
    // If switching back to aviation, restore airport codes from item.value if they exist
    if (item.value) {
      const departureId = item.value.departureAirportId || 0
      const arrivalId = item.value.arrivalAirportId || 0
      // Update form fields if setFieldValue is available (real form, not test stub)
      if (setFieldValue && typeof setFieldValue === 'function') {
        setFieldValue('departureAirportId', departureId)
        setFieldValue('arrivalAirportId', arrivalId)
      }
    }
  }
}

function normalizeAirportField(fieldName) {
  watch(
    () => item.value?.[fieldName],
    (newVal) => {
      if (!item.value) return
      if (typeof newVal === 'string') {
        const parsed = parseInt(newVal, 10)
        item.value[fieldName] = Number.isNaN(parsed) ? 0 : parsed
        return
      }
      if (newVal === null || newVal === undefined) {
        item.value[fieldName] = 0
      }
    },
    { immediate: true }
  )
}

normalizeAirportField('departureAirportId')
normalizeAirportField('arrivalAirportId')

watch(
  () => item.value?.transportationTypeId,
  (newVal) => {
    if (!item.value) return
    if (typeof newVal === 'string') {
      const parsed = parseInt(newVal, 10)
      item.value.transportationTypeId = Number.isNaN(parsed) ? null : parsed
      return
    }
    if (newVal === null || newVal === undefined) {
      item.value.departureAirportId = 0
      item.value.arrivalAirportId = 0
      return
    }
    const type = getTransportationTypeById(newVal)
    if (!type) return
    if (type.code !== AVIA_TRANSPORT_CODE) {
      item.value.departureAirportId = 0
      item.value.arrivalAirportId = 0
    }
  },
  { immediate: true }
)

    if (!props.create) {
      await registersStore.getById(props.id)
      // Ensure lookupByArticle has a default value if not set
      if (item.value.lookupByArticle === undefined || item.value.lookupByArticle === null) {
        item.value.lookupByArticle = false
      }
      if (item.value.warehouseId === undefined || item.value.warehouseId === null) {
        item.value.warehouseId = 0
      }
    } else {
      try {
        await registersStore.getAll()
      } catch (error) {
        alertStore.error('Не удалось загрузить список реестров: ' + (error?.message || String(error)))
      }
      // Set default values for new records
      if (!item.value.customsProcedureId) {
        item.value.customsProcedureId = 1
      }
      if (!item.value.transportationTypeId) {
        item.value.transportationTypeId = 1
      }
      if (item.value.departureAirportId === undefined || item.value.departureAirportId === null) {
        item.value.departureAirportId = 0
      }
      if (item.value.arrivalAirportId === undefined || item.value.arrivalAirportId === null) {
        item.value.arrivalAirportId = 0
      }
      if (item.value.lookupByArticle === undefined || item.value.lookupByArticle === null) {
        item.value.lookupByArticle = false
      }
      if (item.value.warehouseId === undefined || item.value.warehouseId === null) {
        item.value.warehouseId = 0
      }
    }


onMounted(async () => {
  try {
    if (!isComponentMounted.value) return
    
    await countriesStore.ensureLoaded()
    if (!isComponentMounted.value) return
    
    await transportationTypesStore.ensureLoaded()
    if (!isComponentMounted.value) return

    await customsProceduresStore.ensureLoaded()
    if (!isComponentMounted.value) return

    await companiesStore.getAll()
    if (!isComponentMounted.value) return

    await airportsStore.getAll()
    if (!isComponentMounted.value) return

    if (isWbr2Register.value) {
      await warehousesStore.ensureLoaded()
      if (!isComponentMounted.value) return
    }

    if (isComponentMounted.value) {
      updateExportStatusFromProc()
    }
  } catch (error) {
    if (isComponentMounted.value) {
      alertStore.error('Не удалось инициализировать компоненту: ' + (error?.message || String(error)))
      registersStore.error = error?.message || 'Ошибка при загрузке данных'
    }
  } finally {
    if (isComponentMounted.value) {
      isInitializing.value = false
    }
  }
})

onUnmounted(() => {
  isComponentMounted.value = false
})

const schema = Yup.object().shape({
  dealNumber: Yup.string().nullable(),
  invoiceDate: Yup.date().nullable(),
  invoiceNumber: Yup.string()
    .nullable()
    .test(
      'avia-invoice-format',
      'Номер накладной для авиаперевозки должен быть в формате <три цифры>-<восемь цифр>',
      function (value) {
        const typeId = this?.parent?.transportationTypeId ?? item.value?.transportationTypeId
        if (!isAviaTransportationId(typeId)) return true
        if (value === null || value === undefined || value === '') return true
        return /^\d{3}-\d{8}$/.test(value)
      }
    ),
  transportationTypeId: Yup.number().nullable(),
  customsProcedureId: Yup.number().nullable(),
  theOtherCompanyId: Yup.number().nullable(),
  theOtherCountryCode: Yup.number().nullable(),
  departureAirportId: Yup.number().transform(parseNumberOrZero).min(0).nullable(),
  arrivalAirportId: Yup.number().transform(parseNumberOrZero).min(0).nullable(),
  warehouseId: Yup.number().transform(parseNumberOrZero).min(0).nullable(),
  lookupByArticle: Yup.boolean().default(false)
})

// This computed property only checks if procedures are loaded and if we have a valid procedure
const shouldUpdateExportStatus = computed(() => {
  return Array.isArray(customsProceduresStore.procedures) && 
         customsProceduresStore.procedures.length > 0 && 
         !procedureCodeLoaded.value
})

// Function to update export status based on the procedure code
function updateExportStatusFromProc() {
  if (Array.isArray(customsProceduresStore.procedures) && customsProceduresStore.procedures.length > 0) {
    const proc = customsProceduresStore.procedures.find(p => p.id === (item.value?.customsProcedureId || 1))
    if (proc) {
      isExport.value = proc.code === 10
      updateDirection()
      procedureCodeLoaded.value = true
    }
  }
}

// Watch for changes that should trigger an update to export status
watch(shouldUpdateExportStatus, (shouldUpdate) => {
  if (shouldUpdate) {
    updateExportStatusFromProc()
  }
})

const proceduresLoaded = computed(
  () => Array.isArray(customsProceduresStore.procedures) && customsProceduresStore.procedures.length > 0
)

const typesLoaded = computed(
  () => Array.isArray(transportationTypesStore.types) && transportationTypesStore.types.length > 0
)

function updateDirection() {
  if (isExport.value) {
    item.value.destCountryCode = item.value.theOtherCountryCode
    item.value.origCountryCode = 643
    item.value.recipientId = item.value.theOtherCompanyId
    item.value.senderId = item.value.companyId
  } else {
    item.value.destCountryCode = 643
    item.value.origCountryCode = item.value.theOtherCountryCode
    item.value.recipientId = item.value.companyId
    item.value.senderId = item.value.theOtherCompanyId
  }
}

watch(
  () => item.value.theOtherCountryCode,
  () => updateDirection()
)

watch(
  () => item.value.theOtherCompanyId,
  () => updateDirection()
)

watch(proceduresLoaded, (loaded) => {
  if (loaded && !item.value.customsProcedureId) {
    item.value.customsProcedureId = 1
  }
})

watch(typesLoaded, (loaded) => {
  if (loaded && !item.value.transportationTypeId) {
    item.value.transportationTypeId = 1
  }
})

function handleProcedureChange(e) {
  item.value.customsProcedureId = parseInt(e.target.value)
  const proc = customsProceduresStore.procedures?.find((p) => p.id === item.value.customsProcedureId)
  isExport.value = proc && proc.code === 10
  updateDirection()
}

function onLookupForReimportChange(e) {
  // Field may emit a boolean or a DOM event
  const checked = typeof e === 'boolean' ? e : (e?.target?.checked ?? false)
  if (checked) {
    transferRegisterId.value = ''
  }
}

function getTitle() {
  return props.create
    ? 'Загрузка реестра'
    : 'Редактирование информации о реестре'
}

function getButton() {
  return props.create ? 'Загрузить' : 'Сохранить'
}

function parseNumberOrZero(_, value) {
  return parseNumber(value, 0)
}

// Generic parsing helper used by the two wrappers above.
function parseNumber(value, defaultValue) {
  if (value === '' || value === null || value === undefined) {
    return defaultValue
  }
  if (typeof value === 'number') {
    return Number.isNaN(value) ? defaultValue : value
  }
  const parsed = parseInt(value, 10)
  return Number.isNaN(parsed) ? defaultValue : parsed
}

function prepareRegisterPayload(formValues) {
  const payload = { ...formValues }

  const selectedTransportationTypeId = parseNumber(formValues.transportationTypeId ?? item.value?.transportationTypeId, null)
  payload.transportationTypeId = selectedTransportationTypeId
  payload.theOtherCompanyId = parseNumber(formValues.theOtherCompanyId, null)
  payload.theOtherCountryCode = parseNumber(formValues.theOtherCountryCode, null)
  payload.customsProcedureId = parseNumber(formValues.customsProcedureId, null)

  // Handle boolean checkbox value
  payload.lookupByArticle = Boolean(formValues.lookupByArticle ?? item.value?.lookupByArticle ?? false)

  const isAviaSelected =
    selectedTransportationTypeId !== null &&
    getTransportationTypeById(selectedTransportationTypeId)?.code === AVIA_TRANSPORT_CODE

  payload.departureAirportId = isAviaSelected
    ? parseNumberOrZero(null, formValues.departureAirportId ?? item.value?.departureAirportId)
    : 0
  payload.arrivalAirportId = isAviaSelected
    ? parseNumberOrZero(null, formValues.arrivalAirportId ?? item.value?.arrivalAirportId)
    : 0
  payload.warehouseId = parseNumber(formValues.warehouseId ?? item.value?.warehouseId, 0)

  return payload
}

async function onSubmit(values) {
  if (!isComponentMounted.value) return

  // Guard against multiple submissions
  if (isSubmitting.value) return

  // Set submitting state
  isSubmitting.value = true

  const payload = prepareRegisterPayload(values)

  try {
    if (props.create) {
      showActionDialog('upload-register')
      try {
        const sourceRegisterId = transferRegisterId.value === ''
          ? 0
          : parseInt(transferRegisterId.value, 10)
        const result = await registersStore.upload(
          uploadFile.value,
          item.value.registerType,
          Number.isNaN(sourceRegisterId) ? 0 : sourceRegisterId,
          Boolean(values.lookupForReimport)
        )
        if (!isComponentMounted.value) return
        if (result?.success) {
          try {
            await registersStore.update(result.registerId, payload)
          } catch (updateError) {
            if (isComponentMounted.value) {
              hideActionDialog()
              await showErrorAndAwaitClose('Ошибка при сохранении информации о реестре', updateError?.message )
            }
          }
        } else {
          if (isComponentMounted.value) {
            await showErrorAndAwaitClose(
              'Ошибка загрузки файла реестра',  
              result?.errMsg,
              result?.missingHeaders || [],
              result?.missingColumns || []
            )
          }
        }
        return 
      } catch (uploadError) {
        // Handle upload failures with modal message box
        if (isComponentMounted.value) {
          await showErrorAndAwaitClose('Ошибка загрузки файла реестра',  uploadError?.message )
        }
        return // Exit early, don't continue with normal error handling
      }
    } else {
      await registersStore.update(props.id, payload)
    }
  } catch (updateError) {
    if (isComponentMounted.value) {
       await showErrorAndAwaitClose('Ошибка при сохранении информации о реестре', updateError?.message )
    }
  } finally {
    hideActionDialog()
    // Always reset submitting state
    isSubmitting.value = false
    await router.push('/registers')
  }
}


// Helper: show the error dialog and wait until it's closed by the user
async function showErrorAndAwaitClose(title, message, missingHeaders = [], missingColumns = []) {
  // Ensure any action dialog is hidden first
  try {
    hideActionDialog()
  } catch {
    // ignore if not available or already hidden
  }

  errorDialogState.value = {
    show: true,
    title,
    message: message || 'Неизвестная ошибка',
    missingHeaders: missingHeaders,
    missingColumns: missingColumns
  }

  // Wait until dialog is closed (watch for show -> false)
  await new Promise((resolve) => {
    const unwatch = watch(() => errorDialogState.value.show, (newShow) => {
      if (!newShow) {
        unwatch()
        resolve()
      }
    })
  })
}


function getCustomerName(customerId) {
  if (!customerId || !companies.value) return 'Неизвестно'
  const company = companies.value.find((c) => c.id === customerId)
  if (!company) return 'Неизвестно'
  return company.shortName || company.name || 'Неизвестно'
}

</script>

<template>
  <div class="settings form-3 form-compact">
   
    <Form
      @submit="onSubmit"
      :initial-values="item"
      :validation-schema="schema"
      v-slot="{ errors, setFieldValue, handleSubmit }"
    >
      <div class="header-with-actions">
        <h1 class="primary-heading">
          {{ getTitle() }}
      </h1>
      <!-- Action buttons moved inside Form scope -->
      <div class="header-actions">
        <ActionButton 
          :item="{}" 
          icon="fa-solid fa-check-double" 
          :iconSize="'2x'"
          tooltip-text="Сохранить"
          :disabled="isSubmitting"
          @click="handleSubmit(onSubmit)"
        />
        <ActionButton 
          :item="{}" 
          icon="fa-solid fa-xmark" 
          :iconSize="'2x'"
          tooltip-text="Отменить"
          :disabled="isSubmitting"
          @click="router.push(`/registers`)"
        />
      </div>
    </div>
    
    <hr class="hr" />
      <div class="form-section">
        <div class="form-row">
          <div class="form-group">
            <label for="dealNumber" class="label">Номер сделки:</label>
            <Field name="dealNumber" id="dealNumber" type="text" class="form-control input" />
          </div>
          <div class="form-group"  v-if="isWbr2Register">
            <label for="warehouseId" class="label">Склад:</label>
            <Field
              as="select"
              name="warehouseId"
              id="warehouseId"
              class="form-control input"
            >
              <option v-for="warehouse in warehouseOptions" :key="warehouse.id" :value="warehouse.id">
                {{ warehouse.name }}
              </option>
            </Field>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="invoiceNumber" class="label">Номер накладной:</label>
            <Field 
              name="invoiceNumber" 
              id="invoiceNumber" 
              type="text" 
              class="form-control input" 
              :class="{ 'is-invalid': errors.invoiceNumber }"
            />
          </div>
          <div class="form-group">
            <label for="invoiceDate" class="label">Дата накладной:</label>
            <Field 
              name="invoiceDate" 
              id="invoiceDate" 
              type="date" 
              class="form-control input" 
              :class="{ 'is-invalid': errors.invoiceDate }"
            />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="label">Отправитель:</label>
            <template v-if="!isExport">
              <Field
                as="select"
                name="theOtherCompanyId"
                id="theOtherCompanyId"
                class="form-control input"
              >
                <option value="">Выберите компанию</option>
                <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.shortName }}</option>
              </Field>
            </template>
            <div v-else class="readonly-field">{{ getCustomerName(item.companyId) }}</div>
          </div>
          <div class="form-group">
            <label class="label">Страна отправления:</label>
            <template v-if="!isExport">
              <Field
                as="select"
                name="theOtherCountryCode"
                id="theOtherCountryCode"
                class="form-control input"
              >
                <option value="">Выберите страну</option>
                <option v-for="c in countries" :key="c.id" :value="c.isoNumeric">
                  {{ c.nameRuOfficial }}
                </option>
              </Field>
            </template>
            <div v-else class="readonly-field">Россия</div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="label">Получатель:</label>
            <template v-if="isExport">
              <Field
                as="select"
                name="theOtherCompanyId"
                id="theOtherCompanyId"
                class="form-control input"
              >
                <option value="">Выберите компанию</option>
                <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.shortName }}</option>
              </Field>
            </template>
            <div v-else class="readonly-field">{{ getCustomerName(item.companyId) }}</div>
          </div>
          <div class="form-group">
            <label class="label">Страна назначения:</label>
            <template v-if="isExport">
              <Field
                as="select"
                name="theOtherCountryCode"
                id="theOtherCountryCode"
                class="form-control input"
              >
                <option value="">Выберите страну</option>
                <option v-for="c in countries" :key="c.id" :value="c.isoNumeric">
                  {{ c.nameRuOfficial }}
                </option>
              </Field>
            </template>
            <div v-else class="readonly-field">Россия</div>
          </div>
        </div>

        <div class="form-row">
          <AirportSelectField
            label="Аэропорт отправления:"
            name="departureAirportId"
            :airports="airportOptions"
            :disabled="!isAviaTransportation"
          />
          <AirportSelectField
            label="Аэропорт назначения:"
            name="arrivalAirportId"
            :airports="airportOptions"
            :disabled="!isAviaTransportation"
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="transportationTypeId" class="label">Транспорт:</label>
            <Field
              as="select"
              name="transportationTypeId"
              id="transportationTypeId"
              class="form-control input"
              :disabled="!typesLoaded"
              @change="(e) => handleTransportationTypeChange(e, setFieldValue)"
            >
              <option value="">Выберите тип</option>
              <option v-for="t in transportationTypesStore.types" :key="t.id" :value="t.id">
                {{ t.name }}
              </option>
            </Field>
          </div>
          <div class="form-group">
            <label for="customsProcedureId" class="label">Процедура:</label>
            <Field
              as="select"
              name="customsProcedureId"
              id="customsProcedureId"
              class="form-control input"
              :disabled="!proceduresLoaded"
              @change="handleProcedureChange"
            >
              <option value="">Выберите процедуру</option>
              <option v-for="p in customsProceduresStore.procedures" :key="p.id" :value="p.id">
                {{ p.name }}
              </option>
            </Field>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="fileName" class="label">Файл:</label>
            <div id="fileName" class="readonly-field">{{ item.fileName }}</div>
          </div>
          <div class="form-group">
            <label for="uploadDate" class="label">Дата загрузки:</label>
            <div id="uploadDate" class="readonly-field">{{ item.date ? item.date.slice(0, 10) : '' }}</div>
          </div>
        </div>

        <div class="form-row" v-if="props.create">
          <div class="form-group">
            <label for="transferRegisterId" class="label">Перенести статусы из реестра:</label>
            <Field name="lookupForReimport" v-slot="{ value }">
              <select
                id="transferRegisterId"
                class="form-control input"
                v-model="transferRegisterId"
                :disabled="value"
              >
                <option value="">Не выбрано</option>
                <option
                  v-for="register in registerOptions"
                  :key="register.id"
                  :value="register.id"
                >
                  {{ register.name }}
                </option>
              </select>
            </Field>
          </div>

          <div class="form-group">
            <label for="lookupForReimport" class="custom-checkbox" :class="{ 'disabled': isExport }">
              <Field
                id="lookupForReimport"
                type="checkbox"
                name="lookupForReimport"
                :value="true"
                :unchecked-value="false"
                class="custom-checkbox-input"
                :disabled="isExport"
                @change="onLookupForReimportChange"
              />
              <span class="custom-checkbox-box"></span>
              <span class="label custom-checkbox-label">Для реимпорта использовать предшествующие данные</span>
            </label>
          </div>
        </div>
       
        <div class="form-row-1" v-else>
          <div class="form-group lookup-by-article-group">
            <label class="custom-checkbox">
              <Field
                id="lookupByArticle"
                type="checkbox"
                name="lookupByArticle"
                :value="true"
                :unchecked-value="false"
                class="custom-checkbox-input"
              />
              <span class="custom-checkbox-box"></span>
              <span class="label custom-checkbox-label">Использовать для подбора кода ТН ВЭД и анализа стоп-слов</span>
            </label>
          </div>
        </div>
      </div>

      <!-- actions moved to header -->
      <div class="form-actions" style="display: none;">
        <button class="button primary" type="submit" :disabled="isSubmitting">
          <span v-show="isSubmitting" class="spinner-border spinner-border-sm mr-1"></span>
          <font-awesome-icon size="1x" icon="fa-solid fa-check-double" class="mr-1" />
          {{ getButton() }}
        </button>
        <button class="button secondary" type="button" @click="router.push('/registers')" :disabled="isSubmitting">
          <font-awesome-icon size="1x" icon="fa-solid fa-xmark" class="mr-1" />
          Отменить
        </button>
      </div>
      <div v-if="errors.apiError" class="alert alert-danger mt-3 mb-0">{{ errors.apiError }}</div>
      <div v-if="errors.invoiceNumber" class="alert alert-danger mt-3 mb-0">{{ errors.invoiceNumber }}</div>
      <div v-if="errors.invoiceDate" class="alert alert-danger mt-3 mb-0">{{ errors.invoiceDate }}</div>
    </Form>
    <div v-if="item?.loading" class="text-center m-5">
      <span class="spinner-border spinner-border-lg align-center"></span>
    </div>
    <div v-if="item?.error" class="text-center m-5">
      <div class="text-danger">Ошибка при загрузке реестра: {{ item.error }}</div>
    </div>

    <ActionDialog :action-dialog="actionDialogState" />
    <ErrorDialog 
      :show="errorDialogState.show"
      :title="errorDialogState.title"
      :message="errorDialogState.message"
      :missing-headers="errorDialogState.missingHeaders"
      :missing-columns="errorDialogState.missingColumns"
      @close="hideErrorDialog"
    />
  </div>
</template>

<style scoped>
/* Header with actions layout */
.header-with-actions {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
  white-space: nowrap;
  
  /* Control panel styling */
  background: #ffffff;
  border: 1px solid #74777c;
  border-radius: 0.5rem;
  padding: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2), 0 1px 2px rgba(0, 0, 0, 0.1);
  
  /* Ensure it flows below heading on narrow screens */
  min-width: min-content;
}

/* Primary heading with ellipsis */
.primary-heading {
  margin: 0;
  flex: 1;
  min-width: 0; /* Allow shrinking */
  
  /* Ellipsis on overflow */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  
  /* Ensure it takes available space but can shrink */
  max-width: calc(100% - 300px); /* Reserve space for buttons */
}

.form-section,
.form-row,
.form-group {
  overflow: visible !important;
}

/* On small screens, ensure full width for heading and buttons flow below */
@media (max-width: 768px) {
  .header-with-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .primary-heading {
    max-width: 100%;
    margin-bottom: 0.5rem;
  }
  
  .header-actions {
    align-self: flex-end;
  }
}

/* Product name styling */
.product-name-label {
  width: calc(18.5% - 50px);
  min-width: 140px;
}

/* Override product name row alignment */
.product-name-row {
  display: flex;
  align-items: center;
}

/* Overlay state styling */
.form-disabled .form-control,
.form-disabled button,
.form-disabled select,
.form-disabled textarea,
.form-disabled .v-field,
.form-disabled .v-btn {
  pointer-events: none;
  opacity: 0.5;
  cursor: not-allowed;
}

.form-disabled .feacn-search-wrapper {
  pointer-events: auto;
  opacity: 1;
}

/* Lookup by article checkbox styling */
.lookup-by-article-group {
  width: 100% !important;
  flex: 1 1 100%;
  max-width: none !important;
  margin-top: 1rem;
}

.custom-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  cursor: pointer;
  width: 100%;
  line-height: 1.4;
}

.custom-checkbox-input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.custom-checkbox-box {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  background-color: #1976d2;
  border-radius: 3px;
  position: relative;
  margin-top: 0.2rem;
}

.custom-checkbox-box:after {
  content: '';
  position: absolute;
  left: 2px;
  top: 2px;
  width: 12px;
  height: 12px;
  background-image: url('@/assets/check-solid.svg');
  background-size: cover;
  opacity: 0;
  transition: opacity 0.3s, transform 0.3s;
  transform: translateY(-2px);
}

.custom-checkbox-input:checked ~ .custom-checkbox-box:after {
  opacity: 1;
  transform: translateY(0);
}

.custom-checkbox-label {
  flex: 1;
  white-space: normal;
  word-wrap: break-word;
}

.custom-checkbox:hover .custom-checkbox-box {
  background-color: #1565c0;
}

.custom-checkbox.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.custom-checkbox.disabled .custom-checkbox-box {
  background-color: #ccc;
}

#fileName.readonly-field { 
  overflow: hidden; 
  text-overflow: ellipsis; 
  white-space: nowrap; 
  display: block; 
  max-width: 100%; 
}
</style>
