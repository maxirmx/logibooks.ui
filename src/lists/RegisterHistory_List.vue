<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import router from '@/router'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useRegisterHistoryStore } from '@/stores/register.history.store.js'
import { useRegisterStatusesStore } from '@/stores/register.statuses.store.js'
import { formatDateTime } from '@/helpers/date.formatters.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { OP_MODE_PAPERWORK } from '@/helpers/op.mode.js'

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
const { items, totalCount, loading } = storeToRefs(historyStore)

const page = ref(1)
const itemsPerPage = ref(50)
const canView = computed(() => Boolean(authStore.isShiftLeadPlus))
const historyItemsPerPageOptions = itemsPerPageOptions
  .filter(option => option.value > 0 && option.value <= 100)

const headers = [
  { title: 'Дата и время', key: 'changedAt', sortable: false, width: '180px' },
  { title: 'Пользователь', key: 'user', sortable: false, width: '240px' },
  { title: 'Причина', key: 'reason', sortable: false, width: '260px' },
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

async function loadHistory() {
  if (!canView.value || !Number.isInteger(props.registerId) || props.registerId <= 0) {
    return
  }

  try {
    await Promise.all([
      registerStatusesStore.ensureLoaded(),
      historyStore.getHistory(props.registerId, {
        page: page.value,
        pageSize: itemsPerPage.value
      })
    ])
  } catch (error) {
    alertStore.error(error?.message || 'Не удалось загрузить историю реестра')
  }
}

function getFieldLabel(field) {
  return fieldLabels[field] || field
}

function formatValue(change, value) {
  if (value === null || value === undefined || value === '') {
    return 'не указано'
  }
  if (change?.field === 'StatusId') {
    return registerStatusesStore.getStatusTitle(Number(value))
  }
  if (value === 'True' || value === 'true') return 'Да'
  if (value === 'False' || value === 'false') return 'Нет'
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
      <h1 class="primary-heading">История изменений реестра №{{ registerId }}</h1>
      <div class="header-actions-bar">
        <v-btn variant="text" prepend-icon="fa-solid fa-arrow-left" @click="returnToRegisters">
          К списку реестров
        </v-btn>
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
        :loading="loading"
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
