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
import ActionButton from '@/components/ActionButton.vue'
import ActionDialog from '@/components/ActionDialog.vue'
import { useActionDialog } from '@/composables/useActionDialog.js'

const props = defineProps({
  id: { type: Number, required: false },
  create: { type: Boolean, default: false }
})

const registersStore = useRegistersStore()
const { item, uploadFile } = storeToRefs(registersStore)

const countriesStore = useCountriesStore()
const { countries } = storeToRefs(countriesStore)

const transportationTypesStore = useTransportationTypesStore()

const customsProceduresStore = useCustomsProceduresStore()

const companiesStore = useCompaniesStore()
const { companies } = storeToRefs(companiesStore)

const { actionDialogState, showActionDialog, hideActionDialog } = useActionDialog()

// Id = 1 --> Code = 10 (Экспорт) 
const isExport = ref(true)
const procedureCodeLoaded = ref(false)
const isComponentMounted = ref(true)
const isInitializing = ref(true)
const isSubmitting = ref(false)

    if (!props.create) {
      await registersStore.getById(props.id)
    } else {
      // Set default values for new records
      if (!item.value.customsProcedureId) {
        item.value.customsProcedureId = 1
      }
      if (!item.value.transportationTypeId) {
        item.value.transportationTypeId = 1
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

    if (isComponentMounted.value) {
      updateExportStatusFromProc()
    }
  } catch (error) {
    if (isComponentMounted.value) {
      console.error('Failed to initialize component:', error)
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
  invoiceNumber: Yup.string().nullable(),
  transportationTypeId: Yup.number().nullable(),
  customsProcedureId: Yup.number().nullable(),
  theOtherCompanyId: Yup.number().nullable(),
  theOtherCountryCode: Yup.number().nullable()
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

function getTitle() {
  return props.create
    ? 'Загрузка реестра'
    : 'Редактирование информации о реестре'
}

function getButton() {
  return props.create ? 'Загрузить' : 'Сохранить'
}

async function onSubmit(values, actions = {}) {
  if (!isComponentMounted.value) return
  
  // Guard against multiple submissions
  if (isSubmitting.value) return
  
  // Handle both form submission and direct calls
  const { setErrors } = actions || {}
  
  // Set submitting state
  isSubmitting.value = true
  
  try {
    if (props.create) {
      showActionDialog('upload-register')
      try {
        const result = await registersStore.upload(uploadFile.value, item.value.companyId)
        if (!isComponentMounted.value) return
        // If upload returns Reference object with id, call update
        if (result && typeof result.id === 'number') {
          await registersStore.update(result.id, values)
          if (!isComponentMounted.value) return
        }
        await router.push('/registers')
      } finally {
        hideActionDialog()
      }
    } else {
      await registersStore.update(props.id, values)
      if (!isComponentMounted.value) return
      await router.push('/registers')
    }
  } catch (error) {
    if (isComponentMounted.value) {
      // Use setErrors if available (form submission), otherwise use store error
      if (setErrors && typeof setErrors === 'function') {
        setErrors({ apiError: error.message || String(error) })
      } else {
        // For ActionButton clicks, use store error
        registersStore.error = error.message || String(error)
      }
    }
  } finally {
    // Always reset submitting state
    isSubmitting.value = false
  }
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
      v-slot="{ errors, values }"
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
          @click="onSubmit(values)"
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
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="invoiceNumber" class="label">Номер накладной:</label>
            <Field name="invoiceNumber" id="invoiceNumber" type="text" class="form-control input" />
          </div>
          <div class="form-group">
            <label for="invoiceDate" class="label">Дата накладной:</label>
            <Field name="invoiceDate" id="invoiceDate" type="date" class="form-control input" />
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
          <div class="form-group">
            <label for="transportationTypeId" class="label">Транспорт:</label>
            <Field
              as="select"
              name="transportationTypeId"
              id="transportationTypeId"
              class="form-control input"
              :disabled="!typesLoaded"
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
            <label class="label">Файл:</label>
            <div class="readonly-field">{{ item.fileName }}</div>
          </div>
          <div class="form-group">
            <label class="label">Дата загрузки:</label>
            <div class="readonly-field">{{ item.date ? item.date.slice(0, 10) : '' }}</div>
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
    </Form>
    <div v-if="item?.loading" class="text-center m-5">
      <span class="spinner-border spinner-border-lg align-center"></span>
    </div>
    <div v-if="item?.error" class="text-center m-5">
      <div class="text-danger">Ошибка при загрузке реестра: {{ item.error }}</div>
    </div>
    <ActionDialog :action-dialog="actionDialogState" />
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
</style>
