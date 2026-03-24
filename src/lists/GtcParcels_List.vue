<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { watch, ref, computed, onMounted, onUnmounted, provide, nextTick } from 'vue'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { useRegistersStore} from '@/stores/registers.store.js'
import { useParcelStatusesStore } from '@/stores/parcel.statuses.store.js'
import { useKeyWordsStore } from '@/stores/key.words.store.js'
import { useStopWordsStore } from '@/stores/stop.words.store.js'
import { useFeacnOrdersStore } from '@/stores/feacn.orders.store.js'
import { useCountriesStore } from '@/stores/countries.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import router from '@/router'
import { useRoute } from 'vue-router'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { buildParcelListHeading } from '@/helpers/register.heading.helpers.js'
import RegisterHeadingWithStats from '@/components/RegisterHeadingWithStats.vue'
import { storeToRefs } from 'pinia'
import { gtcRegisterColumnTitles } from '@/helpers/gtc.register.mapping.js'
import { getCheckStatusClass } from '@/helpers/parcels.check.helpers.js'
import { CheckStatusCode, SWCheckStatusNames, FCCheckStatusNames } from '@/helpers/check.status.code.js'
import { formatWeight, formatPrice } from '@/helpers/number.formatters.js'
import { formatDate } from '@/helpers/date.formatters.js'
import { ensureHttps } from '@/helpers/url.helpers.js'
import {
  navigateToEditParcel,
  getRowPropsForParcel,
  filterGenericTemplateHeadersForParcel,
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
import AssignTnvedDialog from '@/components/AssignTnvedDialog.vue'
import PaginationFooter from '@/components/PaginationFooter.vue'
import ParcelFilterSelectors from '@/components/ParcelFilterSelectors.vue'
import { useDebouncedFilterSync } from '@/composables/useDebouncedFilterSync.js'
import { useParcelSelectionRestore } from '@/composables/useParcelSelectionRestore.js'
import { useParcelMultiSelect } from '@/composables/useParcelMultiSelect.js'

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
const route = useRoute()

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
  parcels_product_name,
  selectedParcelId,
} = storeToRefs(authStore)

const localTnvedSearch = ref(parcels_tnved.value || '')
const localParcelNumberSearch = ref(parcels_number.value || '')
const localProductNameSearch = ref(parcels_product_name.value || '')

function parseSelectedParcelIdFromQuery(value) {
  const rawValue = Array.isArray(value) ? value[0] : value
  const parsedValue = Number(rawValue)
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null
}

const selectedParcelIdFromQuery = parseSelectedParcelIdFromQuery(route.query.selectedParcelId)
if (selectedParcelIdFromQuery != null) {
  selectedParcelId.value = selectedParcelIdFromQuery
}

// Template ref for the data table
const dataTableRef = ref(null)

const {
  selectedParcelIds,
  lastClickedId,
  handleRowClick,
  handleRowContextMenu,
  updateSelectedParcelIds,
  scrollToSelectedItem,
  getRowProps: getRowPropsForGtcParcel,
  stop: stopMultiSelect,
} = useParcelMultiSelect({
  items,
  loading,
  selectedParcelId,
  page: parcels_page,
  dataTableRef,
  getBaseRowClass: (data) => getRowPropsForParcel(data).class,
  onContextMenu: () => { showAssignTnvedDialog.value = true },
})

const showAssignTnvedDialog = ref(false)

async function handleAssignTnvedConfirm(ids, tnVed) {
  if (runningAction.value) return
  runningAction.value = true
  try {
    await parcelsStore.bulkAssignTnved(ids, tnVed)
    showAssignTnvedDialog.value = false
    selectedParcelIds.value = new Set()
    selectedParcelId.value = null
    lastClickedId.value = null
    await loadOrdersWrapper()
  } finally {
    runningAction.value = false
  }
}

const maxPage = computed(() => Math.max(1, Math.ceil((totalCount.value || 0) / parcels_per_page.value)))
const isReProcedure = computed(() => {
  const procedureId = registersStore.item?.customsProcedureCode
  if (procedureId == null) return false
  const procedure = registersStore.ops?.customsProcedures?.find((proc) => Number(proc.value) === Number(procedureId))
  return procedure?.isRe
})

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

const registerFileName = ref('')
const registerDealNumber = ref('')
const registerLoading = ref(true)
const runningAction = ref(false)
const isInitializing = ref(true)
const isComponentMounted = ref(true)
const registerHeading = computed(() => {
  if (registerLoading.value) return 'Загрузка реестра...'
  return buildParcelListHeading(registersStore.item, (id) => registersStore.getTransportationDocument(id))
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

// refreshAfterReportUpload handler removed per request

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
  exportAllXmlOrdinary: exportRegisterXmlOrdinary,
  exportAllXmlExcise: exportRegisterXmlExcise,
  exportAllXmlNotifications: exportRegisterXmlNotifications,
  downloadRegister: downloadRegisterFile,
  downloadTechdoc: downloadTechdocFile,
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

const { triggerLoad, stop: stopFilterSync } = useDebouncedFilterSync({
  filters: [
    { local: localTnvedSearch, store: parcels_tnved },
    { local: localParcelNumberSearch, store: parcels_number },
    { local: localProductNameSearch, store: parcels_product_name }
  ],
  loadFn: loadOrdersWrapper,
  isComponentMounted
})

const watcherStop = watch(
  [parcels_page, parcels_per_page, parcels_sort_by, parcels_status, parcels_check_status_sw, parcels_check_status_fc],
  () => triggerLoad(),
  { immediate: false }
)

onMounted(async () => {
  try {
    if (!isComponentMounted.value) return

  // previously listened for DEC_REPORT_UPLOADED_EVENT; removed per request

    await registersStore.ensureOpsLoaded()
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

    if (items.value?.length > 0) {
      updateSelectedParcelIds()
      if (selectedParcelIds.value?.size > 0) {
        await nextTick()
        scrollToSelectedItem()
      }
    }

    // Restore parcel selection from extension snapshot after all cleanups
    // This ensures that if the user invoked an extension and returned,
    // the previously selected parcel will be highlighted with the dashed border
    const { restoreSelectedParcelIdSnapshot } = useParcelSelectionRestore()
    const restoredParcelId = restoreSelectedParcelIdSnapshot()
    if (restoredParcelId != null && items.value?.some(item => item.id === restoredParcelId)) {
      selectedParcelIds.value = new Set([restoredParcelId])
      selectedParcelId.value = restoredParcelId
      lastClickedId.value = restoredParcelId
      // Scroll to the restored selection
      await nextTick()
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
  stopMultiSelect()
  stopRegisterHeaderActions()
  stopFilterSync()
  if (watcherStop) {
    watcherStop()
  }
  // event listener for DEC_REPORT_UPLOADED_EVENT removed
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
  const feacnLookupColumn = { title: 'Подбор ТН ВЭД', key: 'feacnLookup', sortable: true, align: 'center', width: '120px' }
  // Вероятно, потребуется, когда дело дойдёт до реэкспорта
  // const previousDTagCommentColumn = { title: 'Комментарий', key: 'previousDTagComment', sortable: true, align: 'center', width: '170px' }

  const baseHeaders = [
    // Actions 
    { title: '', key: 'actions', sortable: false, align: 'center', width: '200px' },

    // Order Identification & Status - Key identifiers and current state
    { title: '№', key: 'id', align: 'start', width: '120px' },
    { title: gtcRegisterColumnTitles.postingNumber, key: 'postingNumber', align: 'start', width: '120px' },
    { title: gtcRegisterColumnTitles.checkStatus, key: 'checkStatus', align: 'start', width: '170px' },
    { title: gtcRegisterColumnTitles.tnVed, key: 'tnVed', align: 'start', width: '120px' },
    // Insert FEACN lookup column only when not reimport procedure
    ...(!isReProcedure.value ? [feacnLookupColumn] : []),
    { title: gtcRegisterColumnTitles.productName, key: 'productName', sortable: false, align: 'start', width: '200px' },
    { title: gtcRegisterColumnTitles.productLink, key: 'productLink', sortable: false, align: 'start', width: '150px' },
    { title: gtcRegisterColumnTitles.lastName, key: 'lastName', sortable: false, align: 'start', width: '120px' },
    { title: gtcRegisterColumnTitles.firstName, key: 'firstName', sortable: false, align: 'start', width: '120px' },
    { title: gtcRegisterColumnTitles.patronymic, key: 'patronymic', sortable: false, align: 'start', width: '120px' },
    { title: gtcRegisterColumnTitles.phone, key: 'phone', sortable: false, align: 'start', width: '120px' },
    { title: gtcRegisterColumnTitles.email, key: 'email', sortable: false, align: 'start', width: '120px' },
    { title: gtcRegisterColumnTitles.postalCode, key: 'postalCode', sortable: false, align: 'start', width: '120px' },
    { title: gtcRegisterColumnTitles.city, key: 'city', sortable: false, align: 'start', width: '120px' },
    { title: gtcRegisterColumnTitles.address, key: 'address', sortable: false, align: 'start', width: '120px' },
    { title: "Паспорт", key: 'passport', sortable: false, align: 'start', width: '120px' },
    { title: gtcRegisterColumnTitles.inn, key: 'inn', sortable: false, align: 'start', width: '120px' },
    { title: gtcRegisterColumnTitles.weightKg, key: 'weightKg', sortable: false, align: 'start', width: '100px' },
    { title: gtcRegisterColumnTitles.unitPrice, key: 'unitPrice', sortable: false, align: 'start', width: '100px' },
    { title: gtcRegisterColumnTitles.currency, key: 'currency', sortable: false, align: 'start', width: '80px' },
    { title: gtcRegisterColumnTitles.quantity, key: 'quantity', sortable: false, align: 'start', width: '80px' },
    { title: gtcRegisterColumnTitles.sender, key: 'sender', sortable: false, align: 'start', width: '120px' },
    { title: gtcRegisterColumnTitles.senderPhone, key: 'senderPhone', sortable: false, align: 'start', width: '120px' },
    { title: gtcRegisterColumnTitles.senderEmail, key: 'senderEmail', sortable: false, align: 'start', width: '120px' },
    { title: gtcRegisterColumnTitles.senderAddress, key: 'senderAddress', sortable: false, align: 'start', width: '120px' },
    { title: gtcRegisterColumnTitles.countryCode, key: 'countryCode', sortable: false, align: 'start', width: '100px' },
    { title: gtcRegisterColumnTitles.senderCountryCode, key: 'senderCountryCode', sortable: false, align: 'start', width: '100px' },
    { title: gtcRegisterColumnTitles.tradingCountryCode, key: 'tradingCountryCode', sortable: false, align: 'start', width: '100px' },

    // Status Information - Current state of the order
    { title: gtcRegisterColumnTitles.statusId, key: 'statusId', align: 'start', width: '120px' },
    { title: 'ДТЭГ/ПТДЭГ', key: 'dTag', align: 'start', width: '120px' },
  ]

  // Вероятно, потребуется, когда дело дойдёт до реэкспорта
  // Append previousDTagComment at the end only for reimport procedure
  // if (isReProcedure.value) {
  //   baseHeaders.push(previousDTagCommentColumn)
  // }

  return baseHeaders
})

function editParcel(item) {
  selectedParcelId.value = item.id
  navigateToEditParcel(router, item, 'Редактирование посылки', { registerId: props.registerId })
}

function handleFellows(item) {
  handleFellowsClick(item.registerId, item.postingNumber)
}

// Function to filter headers that need generic templates
function getGenericTemplateHeaders() {
  return filterGenericTemplateHeadersForParcel(headers.value)
}

function formatPassport(item) {
  const parts = [item.passportSeries, item.passportNumber]
  if (item.passportIssuedBy || item.passportIssueDate) {
    parts.push('выдан')
    if (item.passportIssuedBy) parts.push(item.passportIssuedBy)
    if (item.passportIssueDate) parts.push(formatDate(item.passportIssueDate))
  }
  return parts.filter(Boolean).join(' ')
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
          :item="registersStore.item"
          :disabled="generalActionsDisabled"
          :loading="runningAction || loading || isInitializing"
          :no-historic-data="true"
          @validate-sw="validateRegisterSwHeader"
          @validate-sw-ex="validateRegisterSwHeaderEx"
          @validate-fc="validateRegisterFcHeader"
          @lookup="lookupRegisterFeacnCodes"
          @lookup-ex="lookupRegisterFeacnCodesEx"
          @export-ordinary="exportRegisterXmlOrdinary"
          @export-excise="exportRegisterXmlExcise"
          @export-notifications="exportRegisterXmlNotifications"
          @download="downloadRegisterFile"
          @download-techdoc="downloadTechdocFile"
        />
    </div>
    <hr class="hr" />


    <div class="d-flex mb-2 align-center flex-wrap-reverse justify-space-between" style="width: 100%; gap: 10px;">
      <ParcelFilterSelectors
        v-model:parcels-status="parcels_status"
        v-model:parcels-check-status-sw="parcels_check_status_sw"
        v-model:parcels-check-status-fc="parcels_check_status_fc"
        v-model:local-tnved-search="localTnvedSearch"
        v-model:local-parcel-number-search="localParcelNumberSearch"
        v-model:local-product-name-search="localProductNameSearch"
        :status-options="statusOptions"
        :check-status-options-sw="checkStatusOptionsSw"
        :check-status-options-fc="checkStatusOptionsFc"
        :running-action="runningAction"
        :loading="loading"
        :is-initializing="isInitializing"
      />
    </div>

    <v-card class="table-card">
      <v-data-table-server
        ref="dataTableRef"
        v-model:items-per-page="parcels_per_page"
        items-per-page-text="Посылок на странице"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="parcels_page"
        v-model:sort-by="parcels_sort_by"
        :headers="headers"
        :items="items"
        :row-props="getRowPropsForGtcParcel"
        @click:row="handleRowClick"
        @contextmenu:row="handleRowContextMenu"
        :items-length="totalCount"
        :loading="loading || isInitializing"
        density="compact"
        hide-default-footer
        class="elevation-1 single-line-table interlaced-table gtc-parcels-table"
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
            cell-class="truncated-cell clickable-cell" 
            :display-value="item.dTag || ''" 
            @click="editParcel" 
          />
        </template>

        <template #[`item.weightKg`]="{ item }">
          <ClickableCell
            :item="item"
            :display-value="formatWeight(item.weightKg)"
            cell-class="truncated-cell clickable-cell numeric-panel"
            @click="editParcel"
          />
        </template>

        <template #[`item.quantity`]="{ item }">
          <ClickableCell
            :item="item"
            :display-value="item.quantity"
            cell-class="truncated-cell clickable-cell numeric-panel"
            @click="editParcel"
          />
        </template>

        <template #[`item.unitPrice`]="{ item }">
          <ClickableCell
            :item="item"
            :display-value="formatPrice(item.unitPrice)"
            cell-class="truncated-cell clickable-cell numeric-panel"
            @click="editParcel"
          />
        </template>

        <!-- Special template for checkStatus to display check status title -->
        <template #[`item.checkStatus`]="{ item }">
          <ClickableCell 
            :item="item" 
            :display-value="new CheckStatusCode(item.checkStatus).toString()" 
            :cell-class="`truncated-cell status-cell clickable-cell ${getCheckStatusClass(item.checkStatus)}`"
            :show-bookmark="CheckStatusCode.isInheritedSw(item.checkStatus)"
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

        <template #[`item.senderCountryCode`]="{ item }">
          <ClickableCell 
            :item="item" 
            :display-value="countriesStore.getCountryAlpha2(item.senderCountryCode)" 
            cell-class="truncated-cell clickable-cell" 
            @click="editParcel" 
          />
        </template>

        <template #[`item.tradingCountryCode`]="{ item }">
          <ClickableCell 
            :item="item" 
            :display-value="countriesStore.getCountryAlpha2(item.tradingCountryCode)" 
            cell-class="truncated-cell clickable-cell" 
            @click="editParcel" 
          />
        </template>

        <template #[`item.passport`]="{ item }">
          <ClickableCell
            :item="item"
            :display-value="formatPassport(item)"
            cell-class="truncated-cell clickable-cell"
            @click="editParcel"
          />
        </template>

        <template #[`item.previousDTagComment`]="{ item }">
          <ClickableCell
            :item="item"
            :display-value="item.previousDTagComment"
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
          </div>
        </template>
      </v-data-table-server>

      <!-- Custom pagination controls outside the scrollable area -->
      <div class="v-data-table-footer">
        <PaginationFooter
          v-model:items-per-page="parcels_per_page"
          v-model:page="parcels_page"
          :items-per-page-options="itemsPerPageOptions"
          :page-options="pageOptions"
          :total-count="totalCount"
          :max-page="maxPage"
        />
      </div>
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

    <AssignTnvedDialog
      :show="showAssignTnvedDialog"
      :selected-ids="[...selectedParcelIds]"
      @update:show="showAssignTnvedDialog = $event"
      @confirm="handleAssignTnvedConfirm"
    />
  </div>
</template>

<style scoped>
.gtc-parcels-table {
  user-select: none;
}

:deep(.selected-parcel-row) {
  background-color: #b7d5fe !important;
}

.header-actions-group + .header-actions-group {
  margin-left: 8px;
  padding-left: 8px;
  border-left: 1px solid #d0d7de;
}

/* Right-align numeric stacked panels (weight, price, etc.).
   Use deep selector so styles apply to ClickableCell's internal DOM when
   the component renders the slot or display-value text. */
:deep(.numeric-panel) {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  width: 100%;
  text-align: right;
}

</style>
