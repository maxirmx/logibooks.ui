<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

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
import {
  WBR_COMPANY_ID,
  WBR2_REGISTER_ID,
  WBRN_REGISTER_ID
} from '@/helpers/company.constants.js'
import { buildParcelListHeading } from '@/helpers/register.heading.helpers.js'
import { formatDate, formatDateTime } from '@/helpers/date.formatters.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { OP_MODE_PAPERWORK } from '@/helpers/op.mode.js'
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
const { items, totalCount, loading } = storeToRefs(historyStore)

const page = ref(1)
const itemsPerPage = ref(50)
const pageLoading = ref(false)
const canView = computed(() => Boolean(authStore.isShiftLeadPlus))
const registerHeading = computed(() =>
  buildParcelListHeading(
    registersStore.item,
    (id) => registersStore.getTransportationDocument(id),
    'Реестр'
  )
)
const historyItemsPerPageOptions = itemsPerPageOptions
  .filter(option => option.value > 0 && option.value <= 100)
let referenceDataPromise = null

const headers = [
  { title: 'Дата и время', key: 'changedAt', sortable: false },
  { title: 'Пользователь', key: 'user', sortable: false },
  { title: 'Причина', key: 'reason', sortable: false },
  { title: 'Что изменилось', key: 'changes', sortable: false }
]

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
  LookupByArticle: 'Поиск по артикулу',
  PlacesTotal: 'Количество мест',
  TotalWeightKg: 'Общий вес',
  RealWeightKg: 'Фактический вес',
  TotalWeightKgToRelease: 'Вес к оформлению',
  TotalPrice: 'Общая стоимость',
  TotalPriceToRelease: 'Стоимость к оформлению',
  WarehouseId: 'Склад',
  WarehouseArrivalDate: 'Дата прибытия на склад',
  CustomsFee: 'Таможенные сборы',
  CustomsDuty: 'Таможенные пошлины'
}

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
  if (!canView.value || !Number.isInteger(props.registerId) || props.registerId <= 0) {
    return
  }

  pageLoading.value = true
  try {
    await Promise.all([
      ensureReferenceData(),
      registersStore.getById(props.registerId),
      historyStore.getHistory(props.registerId, {
        page: page.value,
        pageSize: itemsPerPage.value
      })
    ])
  } catch (error) {
    alertStore.error(error?.message || 'Не удалось загрузить историю реестра')
  } finally {
    pageLoading.value = false
  }
}

function getFieldLabel(field) {
  return fieldLabels[field] || field
}

function getList(value) {
  const list = unref(value)
  return Array.isArray(list) ? list : []
}

function isEmptyReference(value) {
  return value === null || value === undefined || value === '' || Number(value) === 0
}

function findByNumericValue(list, value, key = 'id') {
  const numericValue = Number(value)
  return getList(list).find((entry) => Number(entry?.[key]) === numericValue) || null
}

function getCompanyName(value) {
  const company = findByNumericValue(companiesStore.companies, value)
  return company?.shortName || company?.name || 'Неизвестная компания'
}

function getRegisterTypeName(value) {
  const registerType = Number(value)
  const wbrName = getCompanyName(WBR_COMPANY_ID)
  if (registerType === WBR2_REGISTER_ID) return `${wbrName}, формат 2`
  if (registerType === WBRN_REGISTER_ID) return `${wbrName}, новый формат`
  return getCompanyName(registerType)
}

function getCountryName(value) {
  const country = findByNumericValue(countriesStore.countries, value, 'isoNumeric')
  if (country) {
    return country.nameRuShort || country.nameRuOfficial || 'Неизвестная страна'
  }
  return Number(value) === 643 ? 'Россия' : 'Неизвестная страна'
}

function getAirportName(value) {
  const airport = findByNumericValue(airportsStore.airports, value)
  if (!airport) return 'Неизвестный аэропорт'
  const name = airport.name || 'Неизвестный аэропорт'
  return airport.codeIata ? `${name} (${airport.codeIata})` : name
}

function getOperationName(value, operationKey, unknownLabel) {
  const operations = unref(registersStore.ops)
  const operation = findByNumericValue(operations?.[operationKey], value, 'value')
  return operation?.name || unknownLabel
}

function getWarehouseName(value) {
  const warehouse = findByNumericValue(warehousesStore.warehouses, value)
  return warehouse?.name || 'Неизвестный склад'
}

function getStatusName(value) {
  return registerStatusesStore.getStatusById(Number(value))?.title || 'Неизвестный статус'
}

const referenceFormatters = {
  CompanyId: getCompanyName,
  RegisterType: getRegisterTypeName,
  StatusId: getStatusName,
  TheOtherCompanyId: getCompanyName,
  TheOtherCountryCode: getCountryName,
  DepartureAirportId: getAirportName,
  ArrivalAirportId: getAirportName,
  TransportationTypeCode: (value) =>
    getOperationName(value, 'transportationTypes', 'Неизвестный тип транспорта'),
  CustomsProcedureCode: (value) =>
    getOperationName(value, 'customsProcedures', 'Неизвестная таможенная процедура'),
  WarehouseId: getWarehouseName
}

function formatValue(change, value) {
  if (value === null || value === undefined || value === '') {
    return 'не указано'
  }
  const referenceFormatter = referenceFormatters[change?.field]
  if (referenceFormatter) {
    return isEmptyReference(value) ? 'не указано' : referenceFormatter(value)
  }
  if (value === 'True' || value === 'true') return 'Да'
  if (value === 'False' || value === 'false') return 'Нет'
  if (change?.field === 'DTime') return formatDateTime(value)
  if (['InvoiceDate', 'WarehouseArrivalDate'].includes(change?.field)) {
    return formatDate(value)
  }
  return value
}

function formatChange(change) {
  return `${getFieldLabel(change.field)}: ${formatValue(change, change.oldValue)} → ${formatValue(change, change.newValue)}`
}

function returnToRegisters() {
  router.push({
    path: '/registers',
    query: { mode: props.mode }
  })
}

watch(
  [() => props.registerId, page, itemsPerPage, canView],
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
          <span class="spinner-border spinner-border-m" data-testid="register-history-spinner"></span>
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

    <div v-if="!canView" class="alert alert-danger">
      История реестра доступна только администраторам и старшим смены.
    </div>

    <v-card v-else class="table-card">
      <v-data-table-server
        v-model:items-per-page="itemsPerPage"
        v-model:page="page"
        :headers="headers"
        :items="items"
        :items-length="totalCount"
        :loading="pageLoading || loading"
        :items-per-page-options="historyItemsPerPageOptions"
        items-per-page-text="Записей на странице"
        page-text="{0}-{1} из {2}"
        density="compact"
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
.history-changes {
  margin: 0;
  padding: 4px 0 4px 20px;
}

.history-changes li {
  margin: 2px 0;
}
</style>
