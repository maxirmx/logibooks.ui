<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { watch, ref, computed, onMounted, onUnmounted, provide, nextTick } from 'vue'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useParcelStatusesStore } from '@/stores/parcel.statuses.store.js'
import { useKeyWordsStore } from '@/stores/key.words.store.js'
import { useStopWordsStore } from '@/stores/stop.words.store.js'
import { useFeacnOrdersStore } from '@/stores/feacn.orders.store.js'
import { useCountriesStore } from '@/stores/countries.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import router from '@/router'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { useTransportationTypesStore } from '@/stores/transportation.types.store.js'
import { buildParcelListHeading } from '@/helpers/register.heading.helpers.js'
import RegisterHeadingWithStats from '@/components/RegisterHeadingWithStats.vue'
import { storeToRefs } from 'pinia'
import { wbrRegisterColumnTitles } from '@/helpers/wbr.register.mapping.js'
import { getCheckStatusClass } from '@/helpers/parcels.check.helpers.js'
import { CheckStatusCode, SWCheckStatusNames, FCCheckStatusNames } from '@/helpers/check.status.code.js'
import { ensureHttps } from '@/helpers/url.helpers.js'
import {
  navigateToEditParcel,
  validateParcelData,
  approveParcelData,
  getRowPropsForParcel,
  filterGenericTemplateHeadersForParcel,
  exportParcelXmlData,
  lookupFeacn,
  getFeacnCodesForKeywords,
  loadOrders,
} from '@/helpers/parcels.list.helpers.js'
import { handleFellowsClick } from '@/helpers/parcel.number.ext.helpers.js'
import { useRegisterHeaderActions } from '@/helpers/register.actions.js'
import ClickableCell from '@/components/ClickableCell.vue'
import ActionButton from '@/components/ActionButton.vue'
import RegisterHeaderActionsBar from '@/components/RegisterHeaderActionsBar.vue'
import FeacnCodeSelector from '@/components/FeacnCodeSelector.vue'
import FeacnCodeCurrent from '@/components/FeacnCodeCurrent.vue'
import ParcelNumberExt from '@/components/ParcelNumberExt.vue'
import RegisterActionsDialogs from '@/components/RegisterActionsDialogs.vue'
import PaginationFooter from '@/components/PaginationFooter.vue'
// Removed DEC_REPORT_UPLOADED_EVENT import

const props = defineProps({
  registerId: { type: Number, required: true }
})

const parcelsStore = useParcelsStore()
const registersStore = useRegistersStore()
const parcelStatusStore = useParcelStatusesStore()
const stopWordsStore = useStopWordsStore()
const keyWordsStore = useKeyWordsStore()
const feacnOrdersStore = useFeacnOrdersStore()
const countriesStore = useCountriesStore()
const authStore = useAuthStore()
const transportationTypesStore = useTransportationTypesStore()

const alertStore = useAlertStore()
const { alert } = storeToRefs(alertStore)

const { items, loading, error, totalCount } = storeToRefs(parcelsStore)
const {
  parcels_per_page,
  parcels_sort_by,
  parcels_page,
  parcels_status,
  parcels_check_status_sw,
  parcels_check_status_fc,
  parcels_tnved,
  parcels_number,
  selectedParcelId,
  isAdminOrSrLogist
} = storeToRefs(authStore)

// Template ref for the data table
const dataTableRef = ref(null)
const maxPage = computed(() => Math.max(1, Math.ceil((totalCount.value || 0) / parcels_per_page.value)))

// Selected parcel management
function updateSelectedParcelId() {
  if (items.value?.length > 0) {
    // Check if current selection is on the page
    const isCurrentOnPage = items.value.some(item => item.id === selectedParcelId.value)
    if (!isCurrentOnPage) {
      selectedParcelId.value = null
    }
  } else {
    selectedParcelId.value = null
  }
}

// Watch for items changes to update selection and scroll to selected item
watch(
  () => items.value,
  () => {
    updateSelectedParcelId()
  },
  { immediate: true }
)

// Watch for page changes to set selection to null
watch(
  parcels_page,
  () => {
    selectedParcelId.value = null
  }
)

// Custom row props function with selection highlighting
function getRowPropsForWbrParcel(data) {
  const baseClass = getRowPropsForParcel(data).class
  const selectedClass = data.item.id === selectedParcelId.value ? 'selected-parcel-row' : ''
  return { class: `${baseClass} ${selectedClass}`.trim() }
}

// Scroll to selected item function
function scrollToSelectedItem() {
  if (!selectedParcelId.value || !dataTableRef.value) return
  
  nextTick(() => {
    try {
      // Find the selected row by looking for the selected-parcel-row class
      const tableElement = dataTableRef.value.$el || dataTableRef.value
      const selectedRow = tableElement.querySelector('.selected-parcel-row')
      
      if (selectedRow) {
        // Scroll the row into view with smooth behavior
        selectedRow.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        })
      }
    } catch (error) {
      console.warn('Could not scroll to selected item:', error)
    }
  })
}

const registerFileName = ref('')
const registerDealNumber = ref('')
const registerLoading = ref(true)
const isInitializing = ref(true)
const isComponentMounted = ref(true)
const runningAction = ref(false)
const registerHeading = computed(() => {
  if (registerLoading.value) return 'Загрузка реестра...'
  return buildParcelListHeading(registersStore.item, transportationTypesStore.getDocument)
})

async function fetchRegister() {
  if (!isComponentMounted.value) return
  try {
    await registersStore.getById(props.registerId)
    if (!isComponentMounted.value) return
    if (registersStore.item && !registersStore.item.error && !registersStore.item.loading) {
      registerFileName.value = registersStore.item.fileName || ''
      registerDealNumber.value = registersStore.item.dealNumber || ''
    }
  } finally {
    if (isComponentMounted.value) {
      registerLoading.value = false
    }
  }
}

async function loadOrdersWrapper() {
  await loadOrders(props.registerId, parcelsStore, isComponentMounted, alertStore)
}

// Provide the loadOrders function for child components
provide('loadOrders', loadOrdersWrapper)


const {
  validationState,
  progressPercent,
  actionDialog: actionDialogState,
  generalActionsDisabled,
  validateRegisterSw: validateRegisterSwHeader,
  validateRegisterSwEx: validateRegisterSwHeaderEx,
  validateRegisterFc: validateRegisterFcHeader,
  lookupFeacnCodes: lookupRegisterFeacnCodes,
  lookupFeacnCodesEx: lookupRegisterFeacnCodesEx,
  exportAllXmlWithoutExcise: exportRegisterXmlWithoutExcise,
  exportAllXmlExcise: exportRegisterXmlExcise,
  downloadRegister: downloadRegisterFile,
  cancelValidation: cancelRegisterValidation,
  stop: stopRegisterHeaderActions
} = useRegisterHeaderActions({
  registersStore,
  alertStore,
  runningAction,
  tableLoading: loading,
  registerLoading,
  loadOrders: loadOrdersWrapper,
  isComponentMounted
})

const watcherStop = watch(
  [parcels_page, parcels_per_page, parcels_sort_by, parcels_status, parcels_check_status_sw, parcels_check_status_fc, parcels_tnved, parcels_number],
  loadOrdersWrapper,
  { immediate: true }
)

onMounted(async () => {
  try {
    if (!isComponentMounted.value) return

  // DEC_REPORT_UPLOADED_EVENT listener removed per request

    await parcelStatusStore.ensureLoaded()
    if (!isComponentMounted.value) return
    
    await feacnOrdersStore.ensureLoaded()
    if (!isComponentMounted.value) return
    
  await countriesStore.ensureLoaded()
    if (!isComponentMounted.value) return
    
  await transportationTypesStore.ensureLoaded()
  if (!isComponentMounted.value) return

    await stopWordsStore.ensureLoaded()
    if (!isComponentMounted.value) return
    
    await keyWordsStore.ensureLoaded()
    if (!isComponentMounted.value) return
    
    await fetchRegister()

    updateSelectedParcelId()
    // Scroll to selected item if it exists on current page
    if (selectedParcelId.value) {
      scrollToSelectedItem()
    }

  } catch (error) {
    if (isComponentMounted.value) {
      alertStore.error('Ошибка при инициализации компонента')
      parcelsStore.error = error?.message || 'Ошибка при загрузке данных'
    }
  } finally {
    if (isComponentMounted.value) {
      isInitializing.value = false
    }
  }
})

onUnmounted(() => {
  isComponentMounted.value = false
  stopRegisterHeaderActions()
  if (watcherStop) {
    watcherStop()
  }
  // DEC_REPORT_UPLOADED_EVENT listener removed
})

const statusOptions = computed(() => [
  { value: null, title: 'Все' },
  ...parcelStatusStore.parcelStatuses.map(status => ({
    value: status.id,
    title: status.title
  }))
])

const checkStatusOptionsSw = computed(() => [
  { value: null, title: 'Все' },
  ...Object.entries(SWCheckStatusNames).map(([value, title]) => ({
    value: parseInt(value),
    title
  }))
])

const checkStatusOptionsFc = computed(() => [
  { value: null, title: 'Все' },
  ...Object.entries(FCCheckStatusNames).map(([value, title]) => ({
    value: parseInt(value),
    title
  }))
])

const headers = computed(() => {
  return [
    // Actions - Always first for easy access
    { title: '', key: 'actions', sortable: false, align: 'center', width: '200px' },

    // Order Identification & Status - Key identifiers and current state
    { title: '№', key: 'id', align: 'start', width: '120px' },
    { title: wbrRegisterColumnTitles.shk, sortable: true, key: 'shk', align: 'start', width: '120px' },
    { title: wbrRegisterColumnTitles.checkStatus, key: 'checkStatus', align: 'start', width: '170px' },
    { title: wbrRegisterColumnTitles.tnVed, key: 'tnVed', align: 'start', width: '120px' },
    { title: 'Подбор ТН ВЭД', key: 'feacnLookup', sortable: true, align: 'center', width: '120px' },

    // Product Identification & Details - What the order contains
    { title: wbrRegisterColumnTitles.productName, sortable: false, key: 'productName', align: 'start', width: '200px' },
    { title: wbrRegisterColumnTitles.productLink, sortable: false, key: 'productLink', align: 'start', width: '150px' },

    // Physical Properties - Tangible characteristics
    { title: wbrRegisterColumnTitles.countryCode, sortable: false, key: 'countryCode', align: 'start', width: '100px' },
    { title: wbrRegisterColumnTitles.weightKg, sortable: false, key: 'weightKg', align: 'start', width: '100px' },
    { title: wbrRegisterColumnTitles.quantity, sortable: false, key: 'quantity', align: 'start', width: '80px' },

    // Financial Information - Pricing and currency
    { title: wbrRegisterColumnTitles.unitPrice, sortable: false, key: 'unitPrice', align: 'start', width: '100px' },
    { title: wbrRegisterColumnTitles.currency, sortable: false, key: 'currency', align: 'start', width: '80px' },

    // Recipient Information - Who receives the order
    { title: wbrRegisterColumnTitles.recipientName, sortable: false, key: 'recipientName', align: 'start', width: '200px' },
    { title: wbrRegisterColumnTitles.passportNumber, sortable: false, key: 'passportNumber', align: 'start', width: '120px' },

    // Status Information - Current state of the order
    { title: wbrRegisterColumnTitles.statusId, key: 'statusId', align: 'start', width: '120px' },
    { title: 'ДТЭГ/ПТДЭГ', key: 'dTag', align: 'start', width: '120px' }
  ]
})

function editParcel(item) {
  selectedParcelId.value = item.id
  navigateToEditParcel(router, item, 'Редактирование посылки', { registerId: props.registerId })
}

function handleFellows(item) {
  handleFellowsClick(item.registerId, item.shk)
}

async function exportParcelXml(item) {
  if (runningAction.value) return
  runningAction.value = true
  try {
    selectedParcelId.value = item.id
    const filename = String(item.shk || '').padStart(20, '0')
    await exportParcelXmlData(item, parcelsStore, filename)
  } finally {
    runningAction.value = false
  }
}

async function validateParcelSw(item) {
  if (runningAction.value) return
  runningAction.value = true
  try {
    selectedParcelId.value = item.id
    await validateParcelData(item, parcelsStore, loadOrdersWrapper, true)
  } finally {
    runningAction.value = false
  }
}

async function validateParcelFc(item) {
  if (runningAction.value) return
  runningAction.value = true
  try {
    selectedParcelId.value = item.id
    await validateParcelData(item, parcelsStore, loadOrdersWrapper, false)
  } finally {
    runningAction.value = false
  }
}

async function lookupFeacnCodes(item) {
  if (runningAction.value) return
  runningAction.value = true
  try {
    selectedParcelId.value = item.id
    await lookupFeacn(item, parcelsStore, loadOrdersWrapper)
  } finally {
    runningAction.value = false
  }
}

async function approveParcel(item) {
  if (runningAction.value) return
  runningAction.value = true
  try {
    selectedParcelId.value = item.id
    await approveParcelData(item, parcelsStore, loadOrdersWrapper)
  } finally {
    runningAction.value = false
  }
}

// Function to filter headers that need generic templates
function getGenericTemplateHeaders() {
  return filterGenericTemplateHeadersForParcel(headers.value)
}
</script>

<template>
  <div class="settings table-3">
    <div class="header-with-actions">
      <RegisterHeadingWithStats
        :register-id="props.registerId"
        :register="registersStore.item"
        :heading="registerHeading"
      />
      <RegisterHeaderActionsBar
        v-if="isAdminOrSrLogist"
        :item="registersStore.item"
        :disabled="generalActionsDisabled"
        @validate-sw="validateRegisterSwHeader"
        @validate-sw-ex="validateRegisterSwHeaderEx"
        @validate-fc="validateRegisterFcHeader"
        @lookup="lookupRegisterFeacnCodes"
        @lookup-ex="lookupRegisterFeacnCodesEx"
        @export-noexcise="exportRegisterXmlWithoutExcise"
        @export-excise="exportRegisterXmlExcise"
        @download="downloadRegisterFile"
      />
    </div>
    <hr class="hr" />


    <div class="d-flex mb-2 align-center flex-wrap-reverse justify-space-between" style="width: 100%; gap: 10px;">
      <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
        <v-select
          v-model="parcels_status"
          :items="statusOptions"
          label="Статус"
          density="compact"
          style="min-width: 250px"
        />
        <v-select
          v-model="parcels_check_status_sw"
          :items="checkStatusOptionsSw"
          label="Статус проверки по стоп-словам"
          density="compact"
          style="min-width: 250px"
        />
        <v-select
          v-model="parcels_check_status_fc"
          :items="checkStatusOptionsFc"
          label="Статус проверки по ТН ВЭД"
          density="compact"
          style="min-width: 250px"
        />
        <v-text-field
          v-model="parcels_tnved"
          label="ТН ВЭД"
          density="compact"
          style="min-width: 200px;"
        />
        <v-text-field
          v-model="parcels_number"
          label="Номер посылки"
          density="compact"
          style="min-width: 200px;"
        />
      </div>
    </div>

    <v-card>
      <div style="overflow-x: auto;">
        <v-data-table-server
          ref="dataTableRef"
          v-if="items?.length || loading"
          v-model:items-per-page="parcels_per_page"
          items-per-page-text="Посылок на странице"
          :items-per-page-options="itemsPerPageOptions"
          page-text="{0}-{1} из {2}"
          v-model:page="parcels_page"
          v-model:sort-by="parcels_sort_by"
          :headers="headers"
          :items="items"
          :row-props="getRowPropsForWbrParcel"
          @click:row="(event, { item }) => { selectedParcelId = item.id }"
          :items-length="totalCount"
          :loading="loading"
          density="compact"
          fixed-header
          hide-default-footer
          class="elevation-1 single-line-table interlaced-table wbr-parcels-table"
          style="min-width: fit-content;"
        >
        <!-- Add tooltip templates for each data field -->
        <template v-for="header in getGenericTemplateHeaders()" :key="header.key" #[`item.${header.key}`]="{ item }">
          <ClickableCell 
            :item="item" 
            :display-value="item[header.key] || ''" 
            cell-class="truncated-cell clickable-cell" 
            @click="editParcel" 
          />
        </template>

        <!-- Special template for statusId -->
        <template #[`item.statusId`]="{ item }">
          <ClickableCell 
            :item="item" 
            :display-value="parcelStatusStore.getStatusTitle(item.statusId)" 
            cell-class="truncated-cell clickable-cell" 
            @click="editParcel" 
          />
        </template>

        <template #[`item.dTag`]="{ item }">
          <ClickableCell 
            :item="item"
            :display-value="item.dTag || ''" 
            cell-class="truncated-cell clickable-cell" 
            @click="editParcel" 
          />
        </template>

        <!-- Special template for checkStatus to display check status title -->
        <template #[`item.checkStatus`]="{ item }">
          <ClickableCell 
            :item="item" 
            :display-value="new CheckStatusCode(item.checkStatus).toString()" 
            :cell-class="`truncated-cell status-cell clickable-cell ${getCheckStatusClass(item.checkStatus)}`" 
            @click="editParcel" 
          />
        </template>

        <!-- Special template for tnVed to display with FEACN tooltip -->
        <template #[`item.tnVed`]="{ item }">
          <FeacnCodeCurrent
            :item="item"
            :feacn-codes="getFeacnCodesForKeywords(item.keyWordIds, keyWordsStore)"
            data-test="editable-cell"
            @click="editParcel"
          />
        </template>

        <!-- Special template for feacnLookup to display FEACN codes vertically -->
        <template #[`item.feacnLookup`]="{ item }">
          <FeacnCodeSelector :item="item" />
        </template>

        <!-- Special template for productLink to display as clickable URL -->
        <template #[`item.productLink`]="{ item }">
          <div class="product-link-in-list">
            <a
              v-if="item.productLink"
              :href="ensureHttps(item.productLink)"
              target="_blank"
              rel="noopener noreferrer"
              class="product-link-in-list"
              :title="ensureHttps(item.productLink)"
            >
              {{ ensureHttps(item.productLink) }}
            </a>
            <span v-else>-</span>
          </div>
        </template>
        <template #[`item.countryCode`]="{ item }">
          <ClickableCell 
            :item="item" 
            :display-value="countriesStore.getCountryAlpha2(item.countryCode)" 
            cell-class="truncated-cell clickable-cell" 
            @click="editParcel" />
        </template>

        <template #[`item.shk`]="{ item }">
          <ParcelNumberExt 
            :item="item" 
            field-name="shk"
            :disabled="runningAction || loading"
            @click="editParcel" 
            @fellows="handleFellows"
          />
        </template>

        <template #[`item.actions`]="{ item }">
          <div class="actions-container">
            <ActionButton 
              :item="item" 
              icon="fa-solid fa-pen" 
              tooltip-text="Редактировать посылку" 
              @click="editParcel" 
              :disabled="runningAction || loading" 
            />
            <ActionButton 
              :item="item" 
              icon="fa-solid fa-spell-check" 
              tooltip-text="Проверить по стоп-словам" 
              @click="validateParcelSw" 
              :disabled="runningAction || loading" 
            />
            <ActionButton 
              :item="item" 
              icon="fa-solid fa-anchor-circle-check" 
              tooltip-text="Проверить по кодам ТН ВЭД" 
              @click="validateParcelFc" 
              :disabled="runningAction || loading" 
            />
            <ActionButton 
              :item="item" 
              icon="fa-solid fa-magnifying-glass" 
              tooltip-text="Подобрать код ТН ВЭД" 
              @click="lookupFeacnCodes" 
              :disabled="runningAction || loading" 
            />
            <ActionButton 
              :item="item" 
              icon="fa-solid fa-upload" 
              tooltip-text="Выгрузить XML накладную для посылки" 
              @click="exportParcelXml" 
              :disabled="runningAction || loading || CheckStatusCode.hasIssues(item?.checkStatus) || item?.blockedByFellowItem" 
            />
            <ActionButton 
              :item="item" 
              icon="fa-solid fa-check-circle" 
              tooltip-text="Согласовать" 
              @click="approveParcel" 
              :disabled="runningAction || loading" 
            />
          </div>
        </template>
      </v-data-table-server>
    </div>

    <!-- Custom pagination controls outside the scrollable area -->
    <div v-if="items?.length || loading" class="v-data-table-footer">
      <PaginationFooter
        v-model:items-per-page="parcels_per_page"
        v-model:page="parcels_page"
        :items-per-page-options="itemsPerPageOptions"
        :total-count="totalCount"
        :max-page="maxPage"
        :loading="loading"
        :initializing="isInitializing"
        page-control="input"
      />
    </div>

    <div v-if="!items?.length && !loading && !isInitializing" class="text-center m-5">Реестр пуст</div>
    </v-card>
    <div v-if="error" class="text-center m-5">
      <div class="text-danger">Ошибка при загрузке реестра: {{ error }}</div>
    </div>
    <div v-if="alert" class="alert alert-dismissable text-center m-5" :class="alert.type">
      <button @click="alertStore.clear()" class="btn btn-link close">×</button>
      {{ alert.message }}
    </div>

    <RegisterActionsDialogs
      :validation-state="validationState"
      :progress-percent="progressPercent"
      :cancel-validation="cancelRegisterValidation"
      :action-dialog="actionDialogState"
    />

  </div>
</template>

<style scoped>
:deep(.selected-parcel-row) {
  border: 2px dashed #5d798f !important;
}

.header-actions-group + .header-actions-group {
  margin-left: 8px;
  padding-left: 8px;
  border-left: 1px solid #d0d7de;
}
</style>








