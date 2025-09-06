<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { watch, ref, onMounted, onUnmounted, reactive, computed } from 'vue'
import { OZON_COMPANY_ID, WBR_COMPANY_ID } from '@/helpers/company.constants.js'
import {
  toggleBulkStatusEditMode,
  cancelBulkStatusChange,
  applyBulkStatusToAllOrders,
  isBulkStatusEditMode,
  getBulkStatusSelectedId,
  setBulkStatusSelectedId,
  createValidationState,
  calculateValidationProgress,
  pollValidation,
  validateRegister,
  cancelValidation,
  createPollingTimer
} from '@/helpers/registers.list.helpers.js'

import { useRegistersStore } from '@/stores/registers.store.js'
import { useParcelStatusesStore } from '@/stores/parcel.statuses.store.js'
import { useParcelCheckStatusStore } from '@/stores/parcel.checkstatuses.store.js'
import { useCompaniesStore } from '@/stores/companies.store.js'
import { useCountriesStore } from '@/stores/countries.store.js'
import { useTransportationTypesStore } from '@/stores/transportation.types.store.js'
import { useCustomsProceduresStore } from '@/stores/customs.procedures.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { mdiMagnify } from '@mdi/js'
import { storeToRefs } from 'pinia'
import router from '@/router'
import { useConfirm } from 'vuetify-use-dialog'
import ClickableCell from '@/components/ClickableCell.vue'
import ActionButton from '@/components/ActionButton.vue'

const validationState = reactive(createValidationState())
validationState.operation = null
let pollingFunction = null
const pollingTimer = createPollingTimer(() => {
  if (pollingFunction) {
    // Allow async functions; errors are handled inside the polling functions
    pollingFunction()
  }
})
const progressPercent = computed(() => calculateValidationProgress(validationState))

const registersStore = useRegistersStore()
const { items, loading, error, totalCount } = storeToRefs(registersStore)

const parcelStatusesStore = useParcelStatusesStore()
const parcelCheckStatusStore = useParcelCheckStatusStore()

const isInitializing = ref(true)
const isComponentMounted = ref(true)
const runningAction = ref(false)

const companiesStore = useCompaniesStore()
const { companies } = storeToRefs(companiesStore)

const countriesStore = useCountriesStore()
const { countries } = storeToRefs(countriesStore)

const transportationTypesStore = useTransportationTypesStore()
const { types: transportationTypes } = storeToRefs(transportationTypesStore)

const customsProceduresStore = useCustomsProceduresStore()

const alertStore = useAlertStore()
const { alert } = storeToRefs(alertStore)
const confirm = useConfirm()

const authStore = useAuthStore()
const { registers_per_page, registers_search, registers_sort_by, registers_page } =
  storeToRefs(authStore)

const fileInput = ref(null)
const selectedCustomerId = ref(WBR_COMPANY_ID)

// State for bulk status change
const bulkStatusState = reactive({})

// Available customers for register upload
const uploadCustomers = computed(() => {
  if (!companies.value) return []
  return companies.value
    .filter((company) => company.id === OZON_COMPANY_ID || company.id === WBR_COMPANY_ID)
    .map((company) => ({
      id: company.id,
      name: getCustomerName(company.id)
    }))
})

// Bulk status change functions - using helpers
function bulkChangeStatus(registerId) {
  toggleBulkStatusEditMode(registerId, bulkStatusState, loading.value)
}

function cancelStatusChange(registerId) {
  cancelBulkStatusChange(registerId, bulkStatusState)
}

async function applyStatusToAllOrders(registerId, statusId) {
  await applyBulkStatusToAllOrders(registerId, statusId, bulkStatusState, registersStore, alertStore)
}

// Helper wrapper functions for template
function isInEditMode(registerId) {
  return isBulkStatusEditMode(registerId, bulkStatusState)
}

function getSelectedStatusId(registerId) {
  return getBulkStatusSelectedId(registerId, bulkStatusState)
}

function setSelectedStatusId(registerId, statusId) {
  setBulkStatusSelectedId(registerId, statusId, bulkStatusState)
}

// Function to get customer name by customerId
function getCustomerName(customerId) {
  if (!customerId || !companies?.value) return 'Неизвестно'
  const company = companies.value.find((c) => c.id === customerId)
  if (!company) return 'Неизвестно'
  return company.shortName || company.name || 'Неизвестно'
}


// Helper functions to get country short names (reactive to countries store changes)
function getCountryShortName(countryCode) {
  if (!countryCode || !countries?.value) return countryCode
  const num = Number(countryCode)
  if (num == 643) return 'Россия' // Special case for Russia
  const country = countries.value.find(c => c.isoNumeric === num)
  if (!country) return countryCode
  return country.nameRuShort || country.nameRuOfficial || countryCode
}

function getParcelsByCheckStatusTooltip(item) {
  if (!item?.parcelsByCheckStatus) return ''
  return Object.entries(item.parcelsByCheckStatus)
    .map(([statusId, count]) => `${parcelCheckStatusStore.getStatusTitle(Number(statusId)) ?? 'Неизвестно'}: ${count}`)
    .join('\n')
}

// Load companies and parcel statuses on component mount
onMounted(async () => {
  try {
    if (!isComponentMounted.value) return
    
    await parcelStatusesStore.ensureLoaded()
    if (!isComponentMounted.value) return
    
    await parcelCheckStatusStore.ensureLoaded()
    if (!isComponentMounted.value) return
    
    await countriesStore.ensureLoaded()
    if (!isComponentMounted.value) return
    
    await transportationTypesStore.ensureLoaded()
    if (!isComponentMounted.value) return
    
    await customsProceduresStore.ensureLoaded()
    if (!isComponentMounted.value) return
    
    await companiesStore.getAll()
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
  pollingTimer.stop()
  if (watcherStop) {
    watcherStop()
  }
})

function openFileDialog() {
  if (!selectedCustomerId.value) {
    alertStore.error('Пожалуйста, выберите клиента')
    return
  }
  fileInput.value?.click()
}

async function fileSelected(files) {
  const file = Array.isArray(files) ? files[0] : files
  if (!file) return

  if (!selectedCustomerId.value) {
    alertStore.error('Не выбран клиент для загрузки реестра')
    return
  }

  registersStore.item = {
    fileName: file.name,
    companyId: selectedCustomerId.value
  }
  registersStore.uploadFile = file
  router.push('/register/load')

  if (fileInput.value) {
    fileInput.value.value = null
  }
}

// Watch for changes in pagination, sorting, or search
const watcherStop = watch(
  [registers_page, registers_per_page, registers_sort_by, registers_search],
  () => {
    loadRegisters()
  },
  { immediate: true, deep: true }
)

function loadRegisters() {
  if (isComponentMounted.value) {
    registersStore.getAll()
  }
}

function openParcels(item) {
  router.push(`/registers/${item.id}/parcels`)
}

function editRegister(item) {
  router.push('/register/edit/' + item.id)
}

function exportAllXml(item) {
  if (runningAction.value) return
  runningAction.value = true
  try {
    registersStore.generate(item.id, item.invoiceNumber)
  } finally {
    runningAction.value = false
  }
}

async function downloadRegister(item) {
  if (runningAction.value) return
  runningAction.value = true
  try {
    await registersStore.download(item.id, item.fileName)
  } finally {
    runningAction.value = false
  }
}

async function deleteRegister(item) {
  if (runningAction.value) return
  runningAction.value = true
  try {
    const content = `Удалить реестр "${item.fileName}" ?`
    const confirmed = await confirm({
      title: 'Подтверждение',
      confirmationText: 'Удалить',
      cancellationText: 'Не удалять',
      dialogProps: {
        width: '30%',
        minWidth: '250px'
      },
      confirmationButtonProps: {
        color: 'orange-darken-3'
      },
      content: content
    })

    if (confirmed) {
      try {
        await registersStore.remove(item.id)
      } catch (err) {
        alertStore.error('Ошибка при удалении реестра' + (err.message ? `: ${err.message}` : ''))
      }
    }
  } finally {
    runningAction.value = false
  }
}

async function validateRegisterSw(item) {
  try {
    validationState.operation = 'validation'
    pollingFunction = () =>
      pollValidation(validationState, registersStore, alertStore, () => pollingTimer.stop())
    await validateRegister(
      item,
      validationState,
      registersStore,
      alertStore,
      () => pollingTimer.stop(),
      () => pollingTimer.start(),
      true
    )
  } catch (err) {
    alertStore.error(err.message || String(err))
  }
}

async function validateRegisterFc(item) {
  try {
    validationState.operation = 'validation'
    pollingFunction = () =>
      pollValidation(validationState, registersStore, alertStore, () => pollingTimer.stop())
    await validateRegister(
      item,
      validationState,
      registersStore,
      alertStore,
      () => pollingTimer.stop(),
      () => pollingTimer.start(),
      false
    )
  } catch (err) {
    alertStore.error(err.message || String(err))
  }
}

async function pollFeacnLookup() {
  if (!validationState.handleId) return
  try {
    const progress = await registersStore.getLookupFeacnCodesProgress(validationState.handleId)
    validationState.total = progress.total
    validationState.processed = progress.processed

    if (progress.finished || progress.total === -1 || progress.processed === -1) {
      validationState.show = false
      pollingTimer.stop()
      await registersStore.getAll()
    }
  } catch (err) {
    alertStore.error(err.message || String(err))
    validationState.show = false
    pollingTimer.stop()
    await registersStore.getAll()
  }
}

async function lookupFeacnCodes(item) {
  try {
    validationState.operation = 'lookup-feacn'
    pollingTimer.stop()
    pollingFunction = pollFeacnLookup
    const res = await registersStore.lookupFeacnCodes(item.id)
    validationState.handleId = res.id
    validationState.total = 0
    validationState.processed = 0
    validationState.show = true
    await pollFeacnLookup()
    pollingTimer.start()
  } catch (err) {
    alertStore.error(err.message || String(err))
  }
}

function cancelValidationWrapper() {
  if (validationState.operation === 'lookup-feacn') {
    if (validationState.handleId) {
      registersStore
        .cancelLookupFeacnCodes(validationState.handleId)
        .catch(() => {})
    }
    validationState.show = false
    pollingTimer.stop()
  } else {
    cancelValidation(validationState, registersStore, () => pollingTimer.stop())
  }
}

function formatInvoiceInfo(item) {
  const { invoiceNumber, invoiceDate, transportationTypeId } = item
  // Access the reactive transportation types to ensure reactivity
  const transportationDocument = transportationTypes?.value ? 
    transportationTypesStore.getDocument(transportationTypeId) : 
    `[Тип ${transportationTypeId}]`
  const formattedDate = invoiceDate ? ` от ${formatDate(invoiceDate)}` : ''
  const invN = invoiceNumber ? ` ${invoiceNumber}${formattedDate}` : ''
  return `${transportationDocument}${invN}`
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d)) return dateStr
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}.${mm}.${yyyy}`
}

const headers = [
  { title: '', key: 'actions', sortable: false, align: 'center', width: '280px' },
  { title: 'Номер сделки', key: 'dealNumber', align: 'center' },
  { title: 'ТСД', key: 'invoice', align: 'center' },
  { title: 'Страны', key: 'countries', align: 'center' },
  { title: 'Отправитель/Получатель', key: 'senderRecepient', align: 'center' },
  { title: 'Посылки/Места', key: 'parcelsTotal', align: 'center' },
  { title: 'Дата загрузки', key: 'date', align: 'center' }
]

</script>

<template>
  <div class="settings table-3">
    <h1 class="primary-heading">Реестры</h1>
    <hr class="hr" />

    <div class="link-crt d-flex upload-links">
      <a @click="openFileDialog" class="link" tabindex="0">
        <font-awesome-icon
          size="1x"
          icon="fa-solid fa-file-import"
          class="link"
        />&nbsp;&nbsp;&nbsp;Загрузить реестр
      </a>

      <v-select
        v-model="selectedCustomerId"
        :items="uploadCustomers"
        item-title="name"
        item-value="id"
        placeholder="Выберите клиента"
        variant="outlined"
        density="compact"
        hide-details
        hide-no-data
        class="customer-select"
        style="max-width: 280px; min-width: 150px; margin-left: 16px"
      />

      <v-file-input
        ref="fileInput"
        style="display: none"
        accept=".xls,.xlsx,.zip,.rar"
        loading-text="Идёт загрузка реестра..."
        @update:model-value="fileSelected"
      />
    </div>

    <div v-if="items?.length || loading || registers_search">
      <v-text-field
        v-model="registers_search"
        :append-inner-icon="mdiMagnify"
        label="Поиск по любой информации о реестре"
        variant="solo"
        hide-details
      />
    </div>

    <v-card>
      <v-data-table-server
        v-if="items?.length || loading"
        v-model:items-per-page="registers_per_page"
        items-per-page-text="Реестров на странице"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="registers_page"
        v-model:sort-by="registers_sort_by"
        :headers="headers"
        :items="items"
        :items-length="totalCount"
        :loading="loading"
        density="compact"
        class="elevation-1 interlaced-table"
      >
        <template #[`item.dealNumber`]="{ item }">
          <ClickableCell 
            :item="item" 
            :display-value="item.dealNumber" 
            cell-class="truncated-cell clickable-cell open-parcels-link" 
            @click="openParcels" 
          />
        </template>
        <template #[`item.senderRecepient`]="{ item }">
          <ClickableCell 
            :item="item" 
            cell-class="truncated-cell clickable-cell edit-register-link" 
            @click="editRegister" 
          >
            <template #default>
              <span>{{ getCustomerName(item.senderId) }}</span>
              <font-awesome-icon icon="fa-solid fa-arrow-right" class="mx-1 arrow-icon" />
              <span>{{ getCustomerName(item.recipientId) }}</span>
            </template>
          </ClickableCell>
        </template>
        <template #[`item.countries`]="{ item }">
          <ClickableCell 
            :item="item" 
            cell-class="truncated-cell clickable-cell edit-register-link" 
            @click="editRegister" 
          >
            <template #default>
              <span>{{ customsProceduresStore.getName(item.customsProcedureId) }}: </span>
              <span>{{ getCountryShortName(item.origCountryCode) }}</span>
              <font-awesome-icon icon="fa-solid fa-arrow-right" class="mx-1 arrow-icon" />
              <span>{{ getCountryShortName(item.destCountryCode) }}</span>
            </template>
          </ClickableCell>
        </template>
        <template #[`item.date`]="{ item }">
          <ClickableCell 
            :item="item" 
            :display-value="formatDate(item.date)" 
            cell-class="truncated-cell clickable-cell edit-register-link" 
            @click="editRegister" 
          />
        </template>
        <template #[`item.invoice`]="{ item }">
          <ClickableCell 
            :item="item" 
            :display-value="formatInvoiceInfo(item)" 
            cell-class="truncated-cell clickable-cell open-parcels-link" 
            @click="openParcels" 
          />
        </template>
        <template #[`item.parcelsTotal`]="{ item }">
          <v-tooltip>
            <template #activator="{ props }">
              <span class="truncated-cell" v-bind="props">{{ item.parcelsTotal }}/{{ item.placesTotal }}</span>
            </template>
            <template #default>
              <div style="white-space: pre-line">{{ getParcelsByCheckStatusTooltip(item) }}</div>
            </template>
          </v-tooltip>
        </template>

        <template #[`item.actions`]="{ item }">
          <div class="actions-container">
            <ActionButton :item="item" icon="fa-solid fa-list" tooltip-text="Открыть список посылок" @click="openParcels" :disabled="runningAction || loading" />
            <ActionButton :item="item" icon="fa-solid fa-pen" tooltip-text="Редактировать реестр" @click="editRegister" :disabled="runningAction || loading" />
            
            <div class="bulk-status-inline">
              <div v-if="isInEditMode(item.id)" class="status-selector-inline">
                <v-select 
                  :model-value="getSelectedStatusId(item.id)" 
                  @update:model-value="(value) => setSelectedStatusId(item.id, value)"
                  :items="parcelStatusesStore.parcelStatuses" 
                  item-title="title" 
                  item-value="id" 
                  placeholder="Статус" 
                  variant="outlined" 
                  density="compact" 
                  hide-details 
                  hide-no-data 
                  :disabled="runningAction || loading" 
                />
                <ActionButton 
                  :item="item" 
                  icon="fa-solid fa-check" 
                  tooltip-text="Применить статус" 
                  :disabled="runningAction || loading || !getSelectedStatusId(item.id)" 
                  @click="() => applyStatusToAllOrders(item.id, getSelectedStatusId(item.id))" 
                />
                <ActionButton 
                  :item="item" 
                  icon="fa-solid fa-xmark" 
                  tooltip-text="Отменить" 
                  :disabled="runningAction || loading" 
                  @click="() => cancelStatusChange(item.id)" 
                />
              </div>
              <ActionButton 
                v-else 
                :item="item" 
                icon="fa-solid fa-pen-to-square" 
                tooltip-text="Изменить статус всех посылок в реестре" 
                :disabled="runningAction || loading" 
                @click="() => bulkChangeStatus(item.id)" 
              />
            </div>

            <ActionButton :item="item" icon="fa-solid fa-spell-check" tooltip-text="Проверить по стоп-словам" @click="validateRegisterSw" :disabled="runningAction || loading" />
            <ActionButton :item="item" icon="fa-solid fa-anchor-circle-check" tooltip-text="Проверить по кодам ТН ВЭД" @click="validateRegisterFc" :disabled="runningAction || loading" />
            <ActionButton :item="item" icon="fa-solid fa-magnifying-glass" tooltip-text="Подбор кодов ТН ВЭД" @click="lookupFeacnCodes" :disabled="runningAction || loading" />
            <ActionButton :item="item" icon="fa-solid fa-upload" tooltip-text="Выгрузить XML накладные для всех посылок в реестре" @click="exportAllXml" :disabled="runningAction || loading" />
            <ActionButton :item="item" icon="fa-solid fa-file-export" tooltip-text="Экспортировать реестр" @click="downloadRegister" :disabled="runningAction || loading" />
            <ActionButton :item="item" icon="fa-solid fa-trash-can" tooltip-text="Удалить реестр" @click="deleteRegister" :disabled="runningAction || loading" />
          </div>
        </template>
      </v-data-table-server>
      <div v-if="!items?.length && !loading && !isInitializing" class="text-center m-5">Список реестров пуст</div>
      <div v-if="loading || isInitializing" class="text-center m-5">
        <span class="spinner-border spinner-border-lg"></span>
      </div>
    </v-card>
    <div v-if="error" class="text-center m-5">
      <div class="text-danger">Ошибка при загрузке списка реестров: {{ error }}</div>
    </div>
    <div v-if="alert" class="alert alert-dismissable mt-3 mb-0" :class="alert.type">
      <button @click="alertStore.clear()" class="btn btn-link close">×</button>
      {{ alert.message }}
    </div>

    <v-dialog v-model="validationState.show" width="300">
      <v-card>
        <v-card-title class="primary-heading">
          {{ validationState.operation === 'lookup-feacn' ? 'Подбор кодов ТН ВЭД' : 'Проверка реестра' }}
        </v-card-title>
        <v-card-text class="text-center">
          <v-progress-circular :model-value="progressPercent" :size="70" :width="7" color="primary">
            {{ progressPercent }}%
          </v-progress-circular>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="cancelValidationWrapper">Отменить</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.bulk-status-container {
  min-width: 60px;
  padding: 2px;
  transition: min-width 0.2s ease;
}

.bulk-status-container:has(.status-selector) {
  min-width: 200px;
}

.status-selector {
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-selector .v-select {
  font-size: 0.875rem;
}

.status-selector .v-select :deep(.v-field__input) {
  font-size: 0.875rem;
  min-height: 32px;
}

.status-selector .v-select :deep(.v-field__field) {
  font-size: 0.875rem;
}

.status-selector .v-select :deep(.v-list-item) {
  font-size: 0.875rem;
  min-height: 36px;
}

.status-selector .v-select :deep(.v-list-item__title) {
  font-size: 0.875rem;
}

.action-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.arrow-icon {
  opacity: 0.8;
}

.upload-links {
  align-items: center;
  gap: 16px;
}

.customer-select {
  font-size: 1rem;
  font-weight: 500;
  color: var(--primary-color, #333333);
}

.customer-select :deep(.v-field__input) {
  font-size: 1rem;
  font-weight: 500;
  color: var(--primary-color, #333333);
}

.customer-select :deep(.v-field__field) {
  border-color: var(--primary-color, #333333);
}

.customer-select :deep(.v-field__outline) {
  border-color: var(--primary-color, #333333);
}

.customer-select :deep(.v-select__selection) {
  color: var(--primary-color, #333333);
}

.customer-select :deep(.v-field__append-inner) {
  color: var(--primary-color, #333333);
}

.customer-select :deep(.v-list-item) {
  color: var(--primary-color, #333333) !important;
}

.customer-select :deep(.v-list-item-title) {
  color: var(--primary-color, #333333) !important;
}

.customer-select :deep(.v-list-item__title) {
  color: var(--primary-color, #333333) !important;
}

.customer-select :deep(.v-list-item__content) {
  color: var(--primary-color, #333333) !important;
}
</style>

<style>
/* Global styles for customer select dropdown */
.v-overlay .v-list .v-list-item {
  color: var(--primary-color, #333333) !important;
}

.v-overlay .v-list .v-list-item .v-list-item__title {
  color: var(--primary-color, #333333) !important;
}

.v-overlay .v-list .v-list-item .v-list-item__content {
  color: var(--primary-color, #333333) !important;
}
</style>
