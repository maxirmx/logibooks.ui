<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { computed, ref, unref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import router from '@/router'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useRegisterHistoryStore } from '@/stores/register.history.store.js'
import { useRegisterStatusesStore } from '@/stores/register.statuses.store.js'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useCountriesStore } from '@/stores/countries.store.js'
import { useCompaniesStore } from '@/stores/companies.store.js'
import { useAirportsStore } from '@/stores/airports.store.js'
import { useWarehousesStore } from '@/stores/warehouses.store.js'
import { buildParcelListHeading } from '@/helpers/register.heading.helpers.js'
import { formatRegisterHistoryValue } from '@/helpers/register.history.formatters.js'
import { formatDateTime } from '@/helpers/date.formatters.js'
import { formatIntegerThousands, formatWeight } from '@/helpers/number.formatters.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { getRegisterNouns, OP_MODE_PAPERWORK } from '@/helpers/op.mode.js'
import ActionButton from '@/components/ActionButton.vue'

const props = defineProps({
  registerId: {
    type: Number,
    required: true
  },
  mode: {
    type: String,
    default: OP_MODE_PAPERWORK
  }
})

const authStore = useAuthStore()
const alertStore = useAlertStore()
const historyStore = useRegisterHistoryStore()
const registerStatusesStore = useRegisterStatusesStore()
const registersStore = useRegistersStore()
const countriesStore = useCountriesStore()
const companiesStore = useCompaniesStore()
const airportsStore = useAirportsStore()
const warehousesStore = useWarehousesStore()
const { items, totalCount, userOptions, reasonOptions, loading } = storeToRefs(historyStore)

const page = ref(1)
const itemsPerPage = ref(50)
const sortBy = ref([{ key: 'changedAt', order: 'desc' }])
const selectedUserId = ref(null)
const selectedReason = ref(null)
const pageLoading = ref(false)
const canView = computed(() => Boolean(authStore.isShiftLeadPlus))
const registerHeading = computed(() =>
  buildParcelListHeading(
    registersStore.item,
    (id) => registersStore.getTransportationDocument(id),
    getRegisterNouns(props.mode).singular
  )
)
const historyItemsPerPageOptions = itemsPerPageOptions.filter(
  (option) => option.value > 0 && option.value <= 100
)
let referenceDataPromise = null
let latestLoadRequestId = 0

const headers = [
  { title: 'Дата и время', key: 'changedAt', sortable: true },
  { title: 'Пользователь', key: 'user', sortable: true },
  { title: 'Причина', key: 'reason', sortable: true },
  { title: 'Что изменилось', key: 'changes', sortable: false }
]

const activeSort = computed(() => {
  const candidate = sortBy.value?.[0]
  const key = ['changedAt', 'user', 'reason'].includes(candidate?.key)
    ? candidate.key
    : 'changedAt'
  return {
    key,
    order: candidate?.order === 'asc' ? 'asc' : 'desc'
  }
})

function getUserOptionTitle(option) {
  const name = typeof option?.userName === 'string' ? option.userName.trim() : ''
  const email = typeof option?.userEmail === 'string' ? option.userEmail.trim() : ''
  if (name && email && name !== email) return `${name} (${email})`
  return name || email || `Пользователь ${option?.userId}`
}

const userFilterItems = computed(() => [
  { title: 'Все пользователи', value: null },
  ...(userOptions.value ?? []).map((option) => ({
    title: getUserOptionTitle(option),
    value: option.userId
  }))
])
const reasonFilterItems = computed(() => [
  { title: 'Все причины', value: null },
  ...(reasonOptions.value ?? []).map((reason) => ({ title: reason, value: reason }))
])

const fieldLabels = {
  FileName: 'Имя файла',
  DTime: 'Дата загрузки',
  DealNumber: 'Номер сделки',
  CompanyId: 'Компания',
  RegisterType: 'Тип реестра',
  StatusId: 'Статус',
  TheOtherCompanyId: 'Контрагент',
  InvoiceNumber: 'Номер ТСД',
  InvoiceDate: 'Дата ТСД',
  TheOtherCountryCode: 'Страна',
  DepartureAirportId: 'Аэропорт отправления',
  ArrivalAirportId: 'Аэропорт прибытия',
  TransportationTypeCode: 'Тип транспорта',
  CustomsProcedureCode: 'Таможенная процедура',
  IncotermsCode: 'Условия поставки',
  LookupByArticle: 'Поиск по артикулу',
  InspectionsCount: 'Количество досмотренных посылок',
  WithTransit: 'Транзит',
  PlacesTotal: 'Количество мест',
  TotalWeightKg: 'Общий вес',
  RealWeightKg: 'Фактический вес',
  TotalWeightKgToRelease: 'Вес к оформлению',
  TotalPrice: 'Общая стоимость',
  TotalPriceToRelease: 'Стоимость к оформлению',
  WarehouseId: 'Склад',
  WarehouseArrivalDate: 'Дата прибытия на склад',
  CustomsFee: 'Таможенные сборы',
  CustomsDuty: 'Таможенные пошлины',
  OzonWeightUpdateProcessedRows: 'Обработано строк файла',
  OzonWeightUpdateUpdatedParcels: 'Обновлено посылок',
  OzonWeightUpdateUnchangedParcels: 'Посылок без изменения веса',
  OzonWeightUpdateSkippedRows: 'Пропущено строк',
  OzonWeightUpdateUnmatchedRows: 'Строк без совпадений',
  OzonWeightUpdateSupersededRows: 'Переопределено последующими строками'
}

const weightUpdateSummaryFields = new Set([
  'OzonWeightUpdateProcessedRows',
  'OzonWeightUpdateUpdatedParcels',
  'OzonWeightUpdateUnchangedParcels',
  'OzonWeightUpdateSkippedRows',
  'OzonWeightUpdateUnmatchedRows',
  'OzonWeightUpdateSupersededRows'
])

const weightFields = new Set([
  'TotalWeightKg',
  'RealWeightKg',
  'TotalWeightKgToRelease'
])

function ensureReferenceData() {
  if (!referenceDataPromise) {
    referenceDataPromise = Promise.all([
      registerStatusesStore.ensureLoaded(),
      countriesStore.ensureLoaded(),
      companiesStore.getAll(),
      airportsStore.getAll(),
      warehousesStore.ensureLoaded(),
      registersStore.ensureOpsLoaded()
    ]).catch((error) => {
      referenceDataPromise = null
      throw error
    })
  }
  return referenceDataPromise
}

async function loadHistory() {
  const requestId = ++latestLoadRequestId
  if (!canView.value || !Number.isInteger(props.registerId) || props.registerId <= 0) {
    if (requestId === latestLoadRequestId) pageLoading.value = false
    return
  }

  pageLoading.value = true
  try {
    await Promise.all([
      ensureReferenceData(),
      registersStore.getById(props.registerId),
      historyStore.getHistory(props.registerId, {
        page: page.value,
        pageSize: itemsPerPage.value,
        sortBy: activeSort.value.key,
        sortOrder: activeSort.value.order,
        userId: selectedUserId.value,
        reason: selectedReason.value
      })
    ])
  } catch (error) {
    if (requestId === latestLoadRequestId) {
      alertStore.error(error, {
        fallback: 'Не удалось загрузить историю реестра',
        action: { label: 'Повторить', handler: loadHistory }
      })
    }
  } finally {
    if (requestId === latestLoadRequestId) pageLoading.value = false
  }
}

function onUserFilterChange(value) {
  selectedUserId.value = value === null || value === undefined || value === '' ? null : Number(value)
  page.value = 1
}

function onReasonFilterChange(value) {
  selectedReason.value = value === null || value === undefined || value === '' ? null : String(value)
  page.value = 1
}

function getFieldLabel(field) {
  return fieldLabels[field] || field
}

function formatValue(change, value) {
  if (weightUpdateSummaryFields.has(change?.field)) {
    return formatIntegerThousands(value)
  }
  if (weightFields.has(change?.field)) {
    return formatWeight(value)
  }

  const operations = unref(registersStore.ops)
  return formatRegisterHistoryValue(change?.field, value, {
    companies: unref(companiesStore.companies),
    airports: unref(airportsStore.airports),
    getCountryName: countriesStore.getCountryShortName,
    getTransportationTypeName: (id) =>
      registersStore.getOpsLabel(operations?.transportationTypes, id),
    getCustomsProcedureName: (id) => registersStore.getOpsLabel(operations?.customsProcedures, id),
    getIncotermsName: (id) => {
      const term = operations?.incoterms?.find((item) => Number(item.value) === Number(id))
      return term ? `${term.charCode} — ${term.name}` : String(id)
    },
    getWarehouseName: warehousesStore.getWarehouseName,
    getStatusName: (id) => registerStatusesStore.getStatusById(Number(id))?.title
  })
}

function formatChange(change) {
  if (
    weightUpdateSummaryFields.has(change?.field) &&
    (change.oldValue === null || change.oldValue === undefined || change.oldValue === '')
  ) {
    return `${getFieldLabel(change.field)}: ${formatValue(change, change.newValue)}`
  }

  return `${getFieldLabel(change.field)}: ${formatValue(change, change.oldValue)} → ${formatValue(
    change,
    change.newValue
  )}`
}

function returnToRegisters() {
  router.push({
    path: '/registers',
    query: { mode: props.mode }
  })
}

watch(
  () => props.registerId,
  () => {
    latestLoadRequestId += 1
    page.value = 1
    sortBy.value = [{ key: 'changedAt', order: 'desc' }]
    selectedUserId.value = null
    selectedReason.value = null
    pageLoading.value = false
    historyStore.reset()
  },
  { immediate: true, flush: 'sync' }
)

watch(
  [
    () => props.registerId,
    page,
    itemsPerPage,
    () => activeSort.value.key,
    () => activeSort.value.order,
    selectedUserId,
    selectedReason,
    canView
  ],
  loadHistory,
  { immediate: true }
)
</script>

<template>
  <div class="settings table-3">
    <div class="header-with-actions">
      <h1 class="primary-heading">История изменений: {{ registerHeading }}</h1>
      <div class="header-actions-bar">
        <div v-if="pageLoading || loading" class="header-actions header-actions-group">
          <span
            class="spinner-border spinner-border-m"
            data-testid="register-history-spinner"
          ></span>
        </div>
        <div class="header-actions header-actions-group">
          <ActionButton
            :item="{}"
            icon="fa-solid fa-xmark"
            iconSize="2x"
            tooltip-text="Закрыть"
            :disabled="pageLoading || loading"
            data-testid="register-history-back"
            @click="returnToRegisters"
          />
        </div>
      </div>
    </div>

    <hr class="hr" />

    <PageAlertRegion />

    <div v-if="!canView" class="alert alert-danger">
      История реестра доступна только администраторам и старшим смены.
    </div>

    <div v-else class="history-filter-row">
      <v-select
        :model-value="selectedUserId"
        :items="userFilterItems"
        item-title="title"
        item-value="value"
        label="Пользователь"
        variant="solo"
        hide-details
        :loading="pageLoading || loading"
        :disabled="pageLoading || loading"
        class="history-filter"
        data-testid="register-history-user-filter"
        @update:model-value="onUserFilterChange"
      />
      <v-select
        :model-value="selectedReason"
        :items="reasonFilterItems"
        item-title="title"
        item-value="value"
        label="Причина"
        variant="solo"
        hide-details
        :loading="pageLoading || loading"
        :disabled="pageLoading || loading"
        class="history-filter"
        data-testid="register-history-reason-filter"
        @update:model-value="onReasonFilterChange"
      />
    </div>

    <v-card v-if="canView" class="table-card">
      <v-data-table-server
        v-model:items-per-page="itemsPerPage"
        v-model:page="page"
        v-model:sort-by="sortBy"
        :headers="headers"
        :items="items"
        :items-length="totalCount"
        :loading="pageLoading || loading"
        :items-per-page-options="historyItemsPerPageOptions"
        items-per-page-text="Записей на странице"
        page-text="{0}-{1} из {2}"
        density="compact"
        must-sort
        class="elevation-1 interlaced-table"
        data-testid="register-history-table"
      >
        <template #[`item.changedAt`]="{ item }">
          {{ formatDateTime(item.changedAt) }}
        </template>

        <template #[`item.user`]="{ item }">
          <div>{{ item.userName }}</div>
          <div class="text-medium-emphasis">{{ item.userEmail }}</div>
        </template>

        <template #[`item.changes`]="{ item }">
          <ul v-if="item.changes?.length" class="history-changes">
            <li v-for="(change, index) in item.changes" :key="`${item.id}-${index}`">
              {{ formatChange(change) }}
            </li>
          </ul>
          <span v-else>Нет данных</span>
        </template>
      </v-data-table-server>
    </v-card>
  </div>
</template>

<style scoped>
.history-filter-row {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.history-filter {
  flex: 1 1 0;
  min-width: 0;
}

.history-changes {
  margin: 0;
  padding: 4px 0 4px 20px;
}

.history-changes li {
  margin: 2px 0;
}

@media (max-width: 700px) {
  .history-filter-row {
    flex-direction: column;
  }
}
</style>
