<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { watch, ref, onMounted, onUnmounted, reactive, computed } from 'vue'
import { OZON_COMPANY_ID, WBR_COMPANY_ID, WBR2_REGISTER_ID } from '@/helpers/company.constants.js'
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
import { useWarehousesStore } from '@/stores/warehouses.store.js'
import { useRegisterStatusesStore } from '@/stores/register.statuses.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { OP_MODE_PAPERWORK, OP_MODE_WAREHOUSE, getRegisterNouns } from '@/helpers/op.mode.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { formatWeight, formatPrice, formatIntegerThousands } from '@/helpers/number.formatters.js'
import { mdiMagnify } from '@mdi/js'
import { storeToRefs } from 'pinia'
import router from '@/router'
import { useConfirm } from 'vuetify-use-dialog'
import { useDebouncedFilterSync } from '@/composables/useDebouncedFilterSync.js'
import ClickableCell from '@/components/ClickableCell.vue'
import ActionButton from '@/components/ActionButton.vue'
import ActionButton2L from '@/components/ActionButton2L.vue'
import { formatParcelsByCheckStatusTooltip } from '@/helpers/parcel.stats.helpers.js'

const props = defineProps({
  mode: {
    type: String,
    default: OP_MODE_PAPERWORK
  }
})

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

const warehousesStore = useWarehousesStore()
const registerStatusesStore = useRegisterStatusesStore()

const alertStore = useAlertStore()
const { alert } = storeToRefs(alertStore)
const confirm = useConfirm()

const {
  validationState,
  progressPercent,
  stopPolling
} = createRegisterActionHandlers(registersStore, alertStore, { mode: computed(() => props.mode) })

const authStore = useAuthStore()
const { registers_per_page, 
  registers_search, 
  registers_sort_by, 
  registers_page, 
  isShiftLeadPlus, 
  isSrLogistPlus,
  hasWhRole } = storeToRefs(authStore)

const fileInput = ref(null)
const selectedRegisterType = ref(null)

const isWarehouseMode = computed(() => props.mode === OP_MODE_WAREHOUSE)
const registerNouns = computed(() => getRegisterNouns(props.mode))

// State for bulk status change
const bulkStatusState = reactive({})

// Local search variable and loading state for debounced calls
const localSearch = ref('')
localSearch.value = registers_search.value || ''

// Available customers for register upload
const uploadCustomers = computed(() => {
  if (!companies.value) return []
  const list = companies.value
    .filter((company) => company.id === OZON_COMPANY_ID || company.id === WBR_COMPANY_ID)
    .map((company) => ({
      id: company.id,
      name: getCustomerName(company.id)
    }))

  // Add extra WBR2 register option (Wildberries format 2 for TJ, GE)
  if (list.find((c) => c.id === WBR_COMPANY_ID)) {
    list.push({
      id: WBR2_REGISTER_ID,
      name: getCustomerName(WBR_COMPANY_ID) + ' (Грузия, Таджикистан)'
    })
  }

  return list
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
  await applyBulkStatusToAllOrders(
    registerId,
    statusId,
    bulkStatusState,
    registersStore,
    alertStore,
    { mode: props.mode }
  )
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
  if (!countryCode || !countries?.value) return 'Неизвестно'
  const num = Number(countryCode)
  if (num == 643) return 'Россия' // Special case for Russia
  const country = countries.value.find(c => c.isoNumeric === num)
  if (!country) return countryCode
  return country.nameRuShort || country.nameRuOfficial || countryCode
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

    await warehousesStore.ensureLoaded()
    if (!isComponentMounted.value) return

    await registerStatusesStore.ensureLoaded()
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
  stopFilterSync()
  if (watcherStop) {
    watcherStop()
  }
  if (modeWatcherStop) {
    modeWatcherStop()
  }
  stopPolling()
})

async function fileSelected(files) {
  const file = Array.isArray(files) ? files[0] : files
  if (!file) return

  if (!selectedRegisterType.value) {
    alertStore.error(`Не выбран тип ${registerNouns.value.genitiveSingular} для загрузки`)
    return
  }

  const customerId = selectedRegisterType.value === WBR2_REGISTER_ID ? WBR_COMPANY_ID : selectedRegisterType.value
  registersStore.item = {
    fileName: file.name,
    registerType: selectedRegisterType.value,
    companyId: customerId
  }
  registersStore.uploadFile = file
  router.push('/register/load')

  if (fileInput.value) {
    fileInput.value.value = null
  }
}

function startRegisterUpload(registerType) {
  if (!registerType) {
    alertStore.error(`Не выбран тип ${registerNouns.value.genitiveSingular} для загрузки`)
    return
  }

  selectedRegisterType.value = registerType
  const input = fileInput.value
  if (input && typeof input.click === 'function') {
    input.click()
  }
}

async function loadRegisters() {
  await registersStore.getAll({ mode: props.mode })
}

const { triggerLoad, stop: stopFilterSync } = useDebouncedFilterSync({
  filters: [{ local: localSearch, store: registers_search }],
  loadFn: loadRegisters,
  isComponentMounted,
  debounceMs: 300
})

const watcherStop = watch([registers_page, registers_per_page, registers_sort_by], () => {
  triggerLoad()
}, { immediate: false })

// Watch for mode changes and reload data
const modeWatcherStop = watch(() => props.mode, () => {
  loadRegisters()
}, { immediate: false })

function openParcels(item) {
  router.push(`/registers/${item.id}/parcels?mode=${props.mode}`)
}

function editRegister(item) {
  router.push(`/register/edit/${item.id}?mode=${props.mode}`)
}

async function deleteRegister(item) {
  if (runningAction.value) return
  runningAction.value = true
  try {
    const content = `Удалить ${registerNouns.value.accusative} "${item.fileName}" ?`
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
        alertStore.error(
          `Ошибка при удалении ${registerNouns.value.genitiveSingular}` +
          (err.message ? `: ${err.message}` : '')
        )
      }
    }
  } finally {
    runningAction.value = false
  }
}

function openScanjobCreate(item) {
  if (!item) return
  router.push({
    path: '/scanjob/create',
    query: {
      registerId: item.id,
      warehouseId: item.warehouseId,
      dealNumber: item.dealNumber
    }
  })
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

const defaultHeaders = [
  { title: '', key: 'actions', sortable: false, align: 'center' },
  { title: 'Номер сделки', key: 'dealNumber' },
  { title: 'ТСД', key: 'invoice' },
  { title: 'Страны', key: 'countries' },
  { title: 'Отправитель/Получатель', key: 'senderRecipient' },
  { title: 'Товаров/Посылок', key: 'parcelsTotal' },
  { title: 'Вес, кг, общий / К оформлению', key: 'weight', minWidth: '180px', width: '180px' },
  { title: 'Стоимость общая / К оформлению', key: 'price', minWidth: '200px', width: '200px' },
  { title: 'Дата загрузки', key: 'date' }
]

const warehouseHeaders = [
  { title: '', key: 'actions', sortable: false, align: 'center' },
  { title: 'Номер сделки', key: 'dealNumber' },
  { title: 'ТСД', key: 'invoice' },
  { title: 'Страны', key: 'countries' },
  { title: 'Отправитель/Получатель', key: 'senderRecipient' },
  { title: 'Статус', key: 'statusId' },
  { title: 'Склад', key: 'warehouseId' },
  { title: 'Дата прибытия', key: 'warehouseArrivalDate' }
]

const headers = computed(() => (isWarehouseMode.value ? warehouseHeaders : defaultHeaders))

defineExpose({
  validationState,
  progressPercent
})

</script>

<template>
  <div class="settings table-3">
    <div class="header-with-actions">
      <h1 class="primary-heading">{{ registerNouns.plural }}</h1>
      <div style="display:flex; align-items:center;">
        <div v-if="runningAction || loading || isInitializing" class="header-actions header-actions-group">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <div class="header-actions header-actions-group" v-if="isSrLogistPlus && !isWarehouseMode">
          <ActionButton2L
            :item="{}"
            icon="fa-solid fa-file-import"
            :tooltip-text="`Загрузить ${registerNouns.accusative}`"
            iconSize="2x"
            :disabled="runningAction || loading || isInitializing || isUploadDisabled"
            :options="uploadMenuOptions"
          />
        </div>
      </div>
    </div>
    <v-file-input
      v-if="isSrLogistPlus && !isWarehouseMode"
      ref="fileInput"
      style="display: none"
      accept=".xls,.xlsx,.zip,.rar"
      :loading-text="`Идёт загрузка ${registerNouns.genitiveSingular}...`"
      @update:model-value="fileSelected"
    />

    <hr class="hr" />

    <div>
      <v-text-field
        v-model="localSearch"
        :append-inner-icon="mdiMagnify"
        :label="`Поиск по любой информации о ${registerNouns.prepositional}`"
        variant="solo"
        hide-details
        :loading="loading || isInitializing"
        :disabled="runningAction || isInitializing"
      />
    </div>

    <v-card class="table-card">
      <v-data-table-server
        v-model:items-per-page="registers_per_page"
        :items-per-page-text="`${registerNouns.genitivePluralCapitalized} на странице`"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="registers_page"
        v-model:sort-by="registers_sort_by"
        :headers="headers"
        :items="items"
        :items-length="totalCount"
        :loading="loading || isInitializing"
        density="compact"
        class="elevation-1 interlaced-table"
        fixed-header
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
        <template #[`item.statusId`]="{ item }">
          <span class="truncated-cell">{{ registerStatusesStore.getStatusTitle(item.statusId) }}</span>
        </template>
        <template #[`item.warehouseId`]="{ item }">
          <span class="truncated-cell">{{ warehousesStore.getWarehouseName(item.warehouseId) }}</span>
        </template>
        <template #[`item.warehouseArrivalDate`]="{ item }">
          <span class="truncated-cell">{{ formatDate(item.warehouseArrivalDate) }}</span>
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
              <div style="white-space: pre-line">{{ formatParcelsByCheckStatusTooltip(item) }}</div>
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

        <template #[`header.warehouseArrivalDate`]>
          <div class="multiline-header">
            <div>Дата</div>
            <div>прибытия</div>
          </div>
        </template>

        <template #[`item.actions`]="{ item }">
          <div class="actions-container">
            <ActionButton 
              :item="item" 
              icon="fa-solid fa-list" 
              tooltip-text="Открыть список посылок" 
              @click="openParcels" 
              :disabled="runningAction || loading" 
            />

            <ActionButton  v-if="isSrLogistPlus"
              :item="item"
              icon="fa-solid fa-pen"
              :tooltip-text="`Редактировать ${registerNouns.accusative}`"
              @click="editRegister"
              :disabled="runningAction || loading"
            />
            
            <div class="bulk-status-inline" v-if="isSrLogistPlus">
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
                :tooltip-text="`Изменить статус всех посылок в ${registerNouns.prepositional}`"
                :disabled="runningAction || loading" 
                @click="() => bulkChangeStatus(item.id)" 
              />
            </div>
           <ActionButton
              v-if="hasWhRole"
              :item="item"
              icon="fa-solid fa-barcode"
              :tooltip-text="`Создать задание на сканирование`"
              @click="openScanjobCreate"
              :disabled="runningAction || loading"
            />
            <ActionButton
              v-if="isShiftLeadPlus && !isWarehouseMode"
              :item="item"
              icon="fa-solid fa-trash-can"
              :tooltip-text="`Удалить ${registerNouns.accusative}`"
              @click="deleteRegister"
              :disabled="runningAction || loading"
            />
          </div>
        </template>
      </v-data-table-server>
    </v-card>
    <div v-if="error" class="text-center m-5">
      <div class="text-danger">
        Ошибка при загрузке списка {{ registerNouns.genitivePlural }}: {{ error }}
      </div>
    </div>
    <div v-if="alert" class="alert alert-dismissable mt-3 mb-0" :class="alert.type">
      <button @click="alertStore.clear()" class="btn btn-link close">×</button>
      {{ alert.message }}
    </div>
  </div>
</template>

<style scoped>
@import '@/assets/styles/scrollable-table.css';

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

</style>
