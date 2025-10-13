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
import { storeToRefs } from 'pinia'
import { ozonRegisterColumnTitles } from '@/helpers/ozon.register.mapping.js'
import { getCheckStatusClass } from '@/helpers/parcels.check.helpers.js'
import { CheckStatusCode, SWCheckStatusNames, FCCheckStatusNames } from '@/helpers/check.status.code.js'
import { ensureHttps } from '@/helpers/url.helpers.js'
import {
  navigateToEditParcel,
  validateParcelData,
  approveParcelData,
  getRowPropsForParcel,
  filterGenericTemplateHeadersForParcel,
  generateRegisterName,
  exportParcelXmlData,
  lookupFeacn,
  getFeacnCodesForKeywords,
  loadOrders,
} from '@/helpers/parcels.list.helpers.js'
import { handleFellowsClick } from '@/helpers/parcel.number.ext.helpers.js'
import { useRegisterHeaderActions } from '@/helpers/register.actions.js'
import ClickableCell from '@/components/ClickableCell.vue'
import ActionButton from '@/components/ActionButton.vue'
import FeacnCodeSelector from '@/components/FeacnCodeSelector.vue'
import FeacnCodeCurrent from '@/components/FeacnCodeCurrent.vue'
import ParcelNumberExt from '@/components/ParcelNumberExt.vue'
import RegisterActionsDialogs from '@/components/RegisterActionsDialogs.vue'
import PaginationFooter from '@/components/PaginationFooter.vue'

const props = defineProps({
  registerId: { type: Number, required: true }
})

const parcelsStore = useParcelsStore()
const registersStore = useRegistersStore()
const parcelStatusStore = useParcelStatusesStore()
const keyWordsStore = useKeyWordsStore()
const stopWordsStore = useStopWordsStore()
const feacnOrdersStore = useFeacnOrdersStore()
const countriesStore = useCountriesStore()
const authStore = useAuthStore()
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

// Provide page options for a select control. For very large page counts, return a compact set
const pageOptions = computed(() => {
  const mp = maxPage.value
  const current = parcels_page.value || 1
  if (mp <= 200) {
    return Array.from({ length: mp }, (_, i) => ({ value: i + 1, title: String(i + 1) }))
  }

  const set = new Set()
  // first 10
  for (let i = 1; i <= 10; i++) set.add(i)
  // last 10
  for (let i = Math.max(1, mp - 9); i <= mp; i++) set.add(i)
  // around current
  for (let i = Math.max(1, current - 10); i <= Math.min(mp, current + 10); i++) set.add(i)

  return Array.from(set).sort((a, b) => a - b).map(n => ({ value: n, title: String(n) }))
})

// When max page decreases (e.g. due to filters), clamp current page
watch(maxPage, (v) => {
  if (parcels_page.value > v) parcels_page.value = v
})

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
function getRowPropsForOzonParcel(data) {
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
const runningAction = ref(false)
const isInitializing = ref(true)
const isComponentMounted = ref(true)
const registerName = computed(() => {
  if (registerLoading.value) {
    return 'Загрузка реестра...'
  }
  return generateRegisterName(registerDealNumber.value, registerFileName.value)
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
  validateRegisterFc: validateRegisterFcHeader,
  lookupFeacnCodes: lookupRegisterFeacnCodes,
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
    
    await parcelStatusStore.ensureLoaded()
    if (!isComponentMounted.value) return
    
    await feacnOrdersStore.ensureLoaded()
    if (!isComponentMounted.value) return
    
    await countriesStore.ensureLoaded()
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
    { title: ozonRegisterColumnTitles.postingNumber, key: 'postingNumber', align: 'start', width: '120px' },
    { title: ozonRegisterColumnTitles.checkStatus, key: 'checkStatus', align: 'start', width: '170px' },
    { title: ozonRegisterColumnTitles.tnVed, key: 'tnVed', align: 'start', width: '120px' },
    { title: 'Подбор ТН ВЭД', key: 'feacnLookup', sortable: true, align: 'start', width: '120px' },
    { title: ozonRegisterColumnTitles.productName, key: 'productName', sortable: false, align: 'start', width: '200px' },
    { title: ozonRegisterColumnTitles.article, key: 'article', sortable: false, align: 'start', width: '120px' },
    { title: ozonRegisterColumnTitles.countryCode, key: 'countryCode', sortable: false, align: 'start', width: '100px' },
    { title: ozonRegisterColumnTitles.placesCount, key: 'placesCount', sortable: false, align: 'start', width: '120px' },
    { title: ozonRegisterColumnTitles.weightKg, key: 'weightKg', sortable: false, align: 'start', width: '100px' },
    { title: ozonRegisterColumnTitles.unitPrice, key: 'unitPrice', sortable: false, align: 'start', width: '100px' },
    { title: ozonRegisterColumnTitles.currency, key: 'currency', sortable: false, align: 'start', width: '80px' },
    { title: ozonRegisterColumnTitles.quantity, key: 'quantity', sortable: false, align: 'start', width: '80px' },
    { title: ozonRegisterColumnTitles.productLink, key: 'productLink', sortable: false, align: 'start', width: '150px' },
    { title: ozonRegisterColumnTitles.lastName, key: 'lastName', sortable: false, align: 'start', width: '120px' },
    { title: ozonRegisterColumnTitles.firstName, key: 'firstName', sortable: false, align: 'start', width: '120px' },
    { title: ozonRegisterColumnTitles.patronymic, key: 'patronymic', sortable: false, align: 'start', width: '120px' },
    { title: ozonRegisterColumnTitles.passportNumber, key: 'passportNumber', sortable: false, align: 'start', width: '120px' },
    // Status Information - Current state of the order
    { title: ozonRegisterColumnTitles.statusId, key: 'statusId', align: 'start', width: '120px' }
  ]
})

function editParcel(item) {
  selectedParcelId.value = item.id
  navigateToEditParcel(router, item, 'Редактирование посылки', { registerId: props.registerId })
}

function handleFellows(item) {
  handleFellowsClick(item.registerId, item.postingNumber)
}

async function exportParcelXml(item) {
  if (runningAction.value) return
  runningAction.value = true
  try {
    selectedParcelId.value = item.id
    const filename = item.postingNumber
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
      <h1 class="primary-heading">
        {{ registerName }}
      </h1>
      <div v-if="isAdminOrSrLogist" class="header-actions">
        <ActionButton
          :item="registersStore.item"
          icon="fa-solid fa-spell-check"
          tooltip-text="Проверить по стоп-словам"
          :iconSize="'2x'"
          @click="validateRegisterSwHeader"
          :disabled="generalActionsDisabled"
        />
        <ActionButton
          :item="registersStore.item"
          icon="fa-solid fa-anchor-circle-check"
          tooltip-text="Проверить по кодам ТН ВЭД"
          :iconSize="'2x'"
          @click="validateRegisterFcHeader"
          :disabled="generalActionsDisabled"
        />
        <ActionButton
          :item="registersStore.item"
          icon="fa-solid fa-magnifying-glass"
          tooltip-text="Подбор кодов ТН ВЭД"
          :iconSize="'2x'"
          @click="lookupRegisterFeacnCodes"
          :disabled="generalActionsDisabled"
        />
        <ActionButton
          :item="registersStore.item"
          icon="fa-solid fa-upload"
          tooltip-text="Выгрузить XML накладные для реестра (без акциза)"
          :iconSize="'2x'"
          variant="green"
          @click="exportRegisterXmlWithoutExcise"
          :disabled="generalActionsDisabled"
        />
        <ActionButton
          :item="registersStore.item"
          icon="fa-solid fa-upload"
          tooltip-text="Выгрузить XML накладные для реестра (акциз)"
          :iconSize="'2x'"
          variant="orange"
          @click="exportRegisterXmlExcise"
          :disabled="generalActionsDisabled"
        />
        <ActionButton
          :item="registersStore.item"
          icon="fa-solid fa-file-export"
          tooltip-text="Экспортировать реестр"
          :iconSize="'2x'"
          @click="downloadRegisterFile"
          :disabled="generalActionsDisabled"
        />
      </div>
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
          :row-props="getRowPropsForOzonParcel"
          @click:row="(event, { item }) => { selectedParcelId = item.id }"
          :items-length="totalCount"
          :loading="loading"
          density="compact"
          fixed-header
          hide-default-footer
          class="elevation-1 single-line-table interlaced-table ozon-parcels-table"
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

        <template #[`item.postingNumber`]="{ item }">
          <ParcelNumberExt 
            :item="item" 
            field-name="postingNumber"
            :disabled="runningAction || loading"
            @click="editParcel" 
            @fellows="handleFellows"
          />
        </template>

        <!-- Special template for statusId to display status title with color -->
        <template #[`item.statusId`]="{ item }">
          <ClickableCell 
            :item="item" 
            :display-value="parcelStatusStore.getStatusTitle(item.statusId)" 
            cell-class="truncated-cell status-cell clickable-cell" 
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
            @click="editParcel" 
          />
        </template>

        <template #[`item.actions`]="{ item }">
          <div class="actions-container">
            <ActionButton 
              :item="item" 
              icon="fa-solid fa-pen" 
              tooltip-text="Редактировать информацию о посылке" 
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
              @click="validateParcelFc" :disabled="runningAction || loading" 
            />
            <ActionButton 
              :item="item" 
              icon="fa-solid fa-magnifying-glass" 
              tooltip-text="Подобрать код ТН ВЭД" 
              @click="lookupFeacnCodes" :disabled="runningAction || loading"
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
        :page-options="pageOptions"
        :total-count="totalCount"
        :max-page="maxPage"
        :loading="loading"
        :initializing="isInitializing"
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

</style>






