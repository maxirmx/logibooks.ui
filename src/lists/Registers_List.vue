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
  setBulkStatusSelectedId
} from '@/helpers/registers.list.helpers.js'
import { createRegisterActionHandlers } from '@/helpers/register.actions.js'

import { useRegistersStore } from '@/stores/registers.store.js'
import { useParcelStatusesStore } from '@/stores/parcel.statuses.store.js'
import { useCompaniesStore } from '@/stores/companies.store.js'
import { useCountriesStore } from '@/stores/countries.store.js'
import { useTransportationTypesStore } from '@/stores/transportation.types.store.js'
import { useAirportsStore } from '@/stores/airports.store.js'
import { useCustomsProceduresStore } from '@/stores/customs.procedures.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { CheckStatusCode } from '@/helpers/check.status.code.js'
import { formatWeight, formatPrice, formatIntegerThousands } from '@/helpers/number.formatters.js'
import { mdiMagnify } from '@mdi/js'
import { storeToRefs } from 'pinia'
import router from '@/router'
import { useConfirm } from 'vuetify-use-dialog'
import ClickableCell from '@/components/ClickableCell.vue'
import ActionButton from '@/components/ActionButton.vue'
import ActionButton2L from '@/components/ActionButton2L.vue'

const registersStore = useRegistersStore()
const { items, loading, error, totalCount } = storeToRefs(registersStore)

const parcelStatusesStore = useParcelStatusesStore()

const isInitializing = ref(true)
const isComponentMounted = ref(true)
const runningAction = ref(false)

const companiesStore = useCompaniesStore()
const { companies } = storeToRefs(companiesStore)

const countriesStore = useCountriesStore()
const { countries } = storeToRefs(countriesStore)

const transportationTypesStore = useTransportationTypesStore()
const { types: transportationTypes } = storeToRefs(transportationTypesStore)

const airportsStore = useAirportsStore()
const { airports } = storeToRefs(airportsStore)

const customsProceduresStore = useCustomsProceduresStore()

const alertStore = useAlertStore()
const { alert } = storeToRefs(alertStore)
const confirm = useConfirm()

const {
  validationState,
  progressPercent,
  stopPolling
} = createRegisterActionHandlers(registersStore, alertStore)

const authStore = useAuthStore()
const { registers_per_page, registers_search, registers_sort_by, registers_page, isAdmin, isAdminOrSrLogist } = storeToRefs(authStore)

const fileInput = ref(null)
const selectedCustomerId = ref(null)

// State for bulk status change
const bulkStatusState = reactive({})

// Local search variable and loading state for debounced calls
const localSearch = ref('')
localSearch.value = registers_search.value || ''
const isLoadingRegisters = ref(false)
const hasPendingExecution = ref(false)
let loadRegistersTimeout = null
let pendingDebounceDelay = 0

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

const uploadMenuOptions = computed(() =>
  uploadCustomers.value.map((customer) => ({
    label: customer.name,
    action: () => startRegisterUpload(customer.id)
  }))
)

const isUploadDisabled = computed(() => uploadMenuOptions.value.length === 0)

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
    .map(([statusId, count]) => `${new CheckStatusCode(Number(statusId)).toString() ?? 'Неизвестно'}: ${formatIntegerThousands(count)}`)
    .join('\n')
}

const transportationTypesById = computed(() => {
  if (!Array.isArray(transportationTypes.value)) return new Map()
  return new Map(transportationTypes.value.map(type => [type.id, type]))
})

const airportsById = computed(() => {
  if (!Array.isArray(airports.value)) return new Map()
  return new Map(airports.value.map(airport => [airport.id, airport]))
})

const AVIA_TRANSPORT_CODE = 0

function isAviaTransportation(item) {
  const typeId = Number(item?.transportationTypeId)
  if (typeId == null || isNaN(typeId)) return false
  const type = transportationTypesById.value.get(typeId)
  return type?.code === AVIA_TRANSPORT_CODE
}

function getAirportIata(airportId) {
  const id = Number(airportId)
  if (!id) return null
  const airport = airportsById.value.get(id)
  return airport?.codeIata || null
}

function getCountryDisplayName(item, countryCode, airportId) {
  const countryName = getCountryShortName(countryCode)
  if (!isAviaTransportation(item)) {
    return countryName
  }

  const airportCode = getAirportIata(airportId)
  if (!airportCode) {
    return countryName
  }

  return `${countryName} (${airportCode})`
}

// Load companies and parcel statuses on component mount
onMounted(async () => {
  try {
    if (!isComponentMounted.value) return
    
    await parcelStatusesStore.ensureLoaded()
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
  } catch (error) {
    if (isComponentMounted.value) {
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
  watcherStops.forEach((stop) => stop())
  if (loadRegistersTimeout) {
    clearTimeout(loadRegistersTimeout)
  }
  stopPolling()
})

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

function startRegisterUpload(customerId) {
  if (!customerId) {
    alertStore.error('Не выбран клиент для загрузки реестра')
    return
  }

  selectedCustomerId.value = customerId
  const input = fileInput.value
  if (input && typeof input.click === 'function') {
    input.click()
  }
}

const watcherStops = []

function triggerLoadRegisters({ debounceMs = 0, syncSearch = false } = {}) {
  if (!isComponentMounted.value) return

  if (syncSearch) {
    registers_search.value = localSearch.value
  }

  if (loadRegistersTimeout) {
    clearTimeout(loadRegistersTimeout)
    loadRegistersTimeout = null
  }

  if (isLoadingRegisters.value) {
    hasPendingExecution.value = true
    pendingDebounceDelay = debounceMs
    return
  }

  if (debounceMs > 0) {
    pendingDebounceDelay = 0
    loadRegistersTimeout = setTimeout(() => {
      loadRegistersTimeout = null
      triggerLoadRegisters({ debounceMs: 0 })
    }, debounceMs)
    return
  }

  pendingDebounceDelay = 0
  loadRegisters()
}

let isSearchWatcherInitialized = false
watcherStops.push(
  watch(
    localSearch,
    (newValue, oldValue) => {
      if (isSearchWatcherInitialized && newValue === oldValue) {
        return
      }

      const debounceMs = isSearchWatcherInitialized ? 300 : 0
      triggerLoadRegisters({ debounceMs, syncSearch: true })
      isSearchWatcherInitialized = true
    },
    { immediate: true }
  )
)

watcherStops.push(
  watch([registers_page, registers_per_page, registers_sort_by], () => {
    triggerLoadRegisters()
  })
)

async function loadRegisters() {
  if (!isComponentMounted.value || isLoadingRegisters.value) {
    return
  }
  
  isLoadingRegisters.value = true
  try {
    // Clear pending execution flag since we're about to execute
    hasPendingExecution.value = false
    
    await registersStore.getAll()
  } finally {
    if (isComponentMounted.value) {
      isLoadingRegisters.value = false

      // Check if there's a pending execution that was requested while we were loading
      if (hasPendingExecution.value) {
        hasPendingExecution.value = false
        const delay = pendingDebounceDelay
        pendingDebounceDelay = 0
        triggerLoadRegisters({ debounceMs: delay })
      }
    }
  }
}

function openParcels(item) {
  router.push(`/registers/${item.id}/parcels`)
}

function editRegister(item) {
  router.push('/register/edit/' + item.id)
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

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d)) return dateStr
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}.${mm}.${yyyy}`
}

function formatInvoiceInfo(item) {
  const { invoiceNumber, transportationTypeId } = item
  // Access the reactive transportation types to ensure reactivity
  const transportationDocument = transportationTypes?.value ? 
    transportationTypesStore.getDocument(transportationTypeId) : 
    `[Тип ${transportationTypeId}]`
  return `${transportationDocument} ${invoiceNumber || ''}`
}



const headers = [
  { title: '', key: 'actions', sortable: false, align: 'center' },
  { title: 'Номер сделки', key: 'dealNumber' },
  { title: 'ТСД', key: 'invoice' },
  { title: 'Страны', key: 'countries' },
  { title: 'Отправитель/Получатель', key: 'senderRecipient' },
  { title: 'Товаров/Посылок', key: 'parcelsTotal' },
  { title: 'Вес, кг, общий / К оформлению', key: 'weight', width: '180px' },
  { title: 'Стоимость общая / К оформлению', key: 'price', width: '200px' },
  { title: 'Дата загрузки', key: 'date' }
]

defineExpose({
  validationState,
  progressPercent
})

</script>

<template>
  <div class="settings table-3">
    <div class="header-with-actions">
      <h1 class="primary-heading">Реестры</h1>
      <div class="header-actions" v-if="isAdminOrSrLogist">
        <ActionButton2L
          :item="{}"
          icon="fa-solid fa-file-import"
          tooltip-text="Загрузить реестр"
          iconSize="2x"
          :disabled="isUploadDisabled"
          :options="uploadMenuOptions"
        />
        <v-file-input
          ref="fileInput"
          style="display: none"
          accept=".xls,.xlsx,.zip,.rar"
          loading-text="Идёт загрузка реестра..."
          @update:model-value="fileSelected"
        />
      </div>
    </div>

    <hr class="hr" />

    <div v-if="items?.length || loading || localSearch">
      <v-text-field
        v-model="localSearch"
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
          <font-awesome-icon class="bookmark-icon" icon="fa-solid fa-bookmark" v-if="item?.lookupByArticle" />
        </template>

        <template #[`item.invoice`]="{ item }">
          <ClickableCell 
            :item="item" 
            cell-class="truncated-cell clickable-cell open-parcels-link invoice-panel" 
            @click="openParcels" 
          >
            <template #default>
              <div class="invoice-box">
                <div class="invoice-number">{{ formatInvoiceInfo(item) }}</div>
                <div v-if="item.invoiceDate" class="invoice-date">от {{ formatDate(item.invoiceDate) }}</div>
              </div>
            </template>
          </ClickableCell>
        </template>

        <template #[`item.countries`]="{ item }">
          <ClickableCell 
            :item="item" 
            cell-class="truncated-cell clickable-cell edit-register-link countries-panel" 
            @click="editRegister" 
          >
            <template #default>
              <div class="countries-box">
                <div class="customs-procedure">{{ customsProceduresStore.getName(item.customsProcedureId) }}</div>
                <div class="country-route">
                  <span>{{ getCountryDisplayName(item, item.origCountryCode, item.departureAirportId) }}</span>
                  <font-awesome-icon icon="fa-solid fa-arrow-right" class="mx-1 arrow-icon" />
                  <span>{{ getCountryDisplayName(item, item.destCountryCode, item.arrivalAirportId) }}</span>
                </div>
              </div>
            </template>
          </ClickableCell>
        </template>

        <template #[`item.senderRecipient`]="{ item }">
          <ClickableCell 
            :item="item" 
            cell-class="truncated-cell clickable-cell edit-register-link data-panel" 
            @click="editRegister" 
          >
            <template #default>
              <div class="data-box">
                <div>{{ getCustomerName(item.senderId) }}</div>
                <div>{{ getCustomerName(item.recipientId) }}</div>
              </div>
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
        <template #[`item.parcelsTotal`]="{ item }">
          <v-tooltip>
            <template #activator="{ props }">
              <ClickableCell
                v-bind="props"
                :item="item"
                cell-class="truncated-cell clickable-cell data-panel numeric-panel"
                @click="openParcels"
              >
                <template #default>
                  <div class="data-box">
                      <div>{{ formatIntegerThousands(item.parcelsTotal) }}</div>
                      <div>{{ formatIntegerThousands(item.placesTotal) }}</div>
                  </div>
                </template>
              </ClickableCell>
            </template>
            <template #default>
              <div style="white-space: pre-line">{{ getParcelsByCheckStatusTooltip(item) }}</div>
            </template>
          </v-tooltip>
        </template>

        <template #[`item.weight`]="{ item }">
          <ClickableCell
            :item="item"
            cell-class="truncated-cell clickable-cell data-panel numeric-panel"
            @click="editRegister"
          >
            <template #default>
              <div class="data-box">
                <div>{{ formatWeight(item.totalWeightKg) }}</div>
                <div>{{ formatWeight(item.totalWeightKgToRelease) }}</div>
              </div>
            </template>
          </ClickableCell>
        </template>

        <template #[`item.price`]="{ item }">
          <ClickableCell
            :item="item"
            cell-class="truncated-cell clickable-cell data-panel numeric-panel"
            @click="editRegister"
          >
            <template #default>
              <div class="data-box">
                <div>{{ formatPrice(item.totalPrice) }}</div>
                <div>{{ formatPrice(item.totalPriceToRelease) }}</div>
              </div>
            </template>
          </ClickableCell>
        </template>

        <template #[`header.dealNumber`]>
          <div class="multiline-header">
            <div>Номер</div>
            <div>сделки</div>
          </div>
        </template>

        <template #[`header.senderRecipient`]>
          <div class="multiline-header">
            <div>Отправитель</div>
            <div>Получатель</div>
          </div>
        </template>

        <template #[`header.parcelsTotal`]>
          <div class="multiline-header">
            <div>Товаров</div>
            <div>Посылок</div>
          </div>
        </template>

        <template #[`header.weight`]>
          <div class="multiline-header">
            <div>Вес, кг, общий</div>
            <div>К оформлению</div>
          </div>
        </template>

        <template #[`header.price`]>
          <div class="multiline-header">
            <div>Стоимость общая</div>
            <div>К оформлению</div>
          </div>
        </template>

        <template #[`header.date`]>
          <div class="multiline-header">
            <div>Дата</div>
            <div>загрузки</div>
          </div>
        </template>

        <template #[`item.actions`]="{ item }">
          <div class="actions-container">
            <ActionButton :item="item" icon="fa-solid fa-list" tooltip-text="Открыть список посылок" @click="openParcels" :disabled="runningAction || loading" />
            <ActionButton :item="item" icon="fa-solid fa-pen" tooltip-text="Редактировать реестр" @click="editRegister" :disabled="runningAction || loading" />
            
            <div class="bulk-status-inline" v-if="isAdminOrSrLogist">
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
            <ActionButton
              v-if="isAdmin"
              :item="item" 
              icon="fa-solid fa-trash-can" 
              tooltip-text="Удалить реестр" 
              @click="deleteRegister" 
              :disabled="runningAction || loading" 
            />
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

.arrow-icon {
  opacity: 0.8;
}

/* Bookmark icon placed in table cell: green and aligned to right */
.bookmark-icon {
  color: #28a745; /* green */
  margin-left: 8px;
  margin-top: 2px;
  opacity: 0.95;
}

.bookmark-icon:hover {
  color: #218838;
}

/* Invoice panel: fixed width, two lines with smaller date font */
.invoice-panel .invoice-box {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.invoice-panel .invoice-number {
  font-size: 0.95rem;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.invoice-panel .invoice-date {
  font-size: 0.78rem;
  margin-top: 4px;
}

/* Data panel styling  */
.data-panel .data-box {
  display: flex;
  flex-direction: column;
  font-size: 0.9rem;
  margin-top: 4px;
}

.data-panel .data-box > div {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Right-align numeric stacked panels */
.numeric-panel .data-box {
  align-items: flex-end;
  text-align: right;
}

/* Countries panel styling */
.countries-panel .countries-box {
  display: flex;
  flex-direction: column;
  font-size: 0.9rem;
  margin-top: 4px;
}

.countries-panel .customs-procedure {
  font-size: 0.9rem;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}

.countries-panel .country-route {
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Multiline header styling */
.multiline-header {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
  color: white;
}

.multiline-header div {
  font-size: 1.1rem;
  font-weight: bold;
}
</style>
