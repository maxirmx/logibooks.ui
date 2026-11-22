<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application.

import { computed, onMounted, onUnmounted, provide, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CorrectedWeightDisplay from '@/components/CorrectedWeightDisplay.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import PaginationFooter from '@/components/PaginationFooter.vue'
import ParcelWhFilterSelectors from '@/components/ParcelWhFilterSelectors.vue'
import { OZON_COMPANY_ID } from '@/helpers/company.constants.js'
import { reportError } from '@/helpers/error.helpers.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { OP_MODE_WAREHOUSE } from '@/helpers/op.mode.js'
import { REMOVED_PARCEL_FILTER_MESSAGE } from '@/helpers/parcel.filters.js'
import { buildParcelEditLocation, getCurrentInternalRoute, navigateParcel } from '@/helpers/parcel.navigation.helpers.js'
import { hasParcelEditRouteAccess } from '@/helpers/parcels.list.helpers.js'
import { getScanjobCheckStatusClass, scanjobCheckStatusProjectionKind, scanjobCheckStatusReason, scanjobCheckStatusText } from '@/helpers/scanjob.check-status.helpers.js'
import { formatCount, scanjobMonitorArea, valueOrDash } from '@/helpers/scanjob.monitor.helpers.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useParcelFiltersStore } from '@/stores/parcel.filters.store.js'
import { useParcelStatusesStore } from '@/stores/parcel.statuses.store.js'
import { useScanjobsStore } from '@/stores/scanjobs.store.js'
import { useWarehousesStore } from '@/stores/warehouses.store.js'
import '@/assets/styles/scanjob-monitor.css'

const props = defineProps({ scanjobId: { type: Number, required: true } })
const route = useRoute()
const router = useRouter()
const store = useScanjobsStore()
const alertStore = useAlertStore()
const authStore = useAuthStore()
const filterStore = useParcelFiltersStore()
const statusStore = useParcelStatusesStore()
const warehousesStore = useWarehousesStore()
const inProgressStatus = 15
const loadFailure = 'Не удалось загрузить посылки для поиска'

const snapshot = ref(null)
const busy = ref(true)
const pageCurrent = ref(false)
const pageLoadFailed = ref(false)
const liveFailed = ref(false)
const optionsLoading = ref(true)

function positiveInt(value) {
  const number = Number(value)
  return Number.isInteger(number) && number > 0 && number <= 2147483647 ? number : null
}

function textFilter(value) {
  return typeof value === 'string' ? value : ''
}

const sortKeys = ['id', 'postingNumber', 'shk']
const controls = ref({
  page: positiveInt(route.query.page) ?? 1,
  pageSize: itemsPerPageOptions.find(option => option.value === Number(route.query.pageSize))?.value ?? 50,
  sortBy: sortKeys.includes(route.query.sortBy) ? route.query.sortBy : 'id',
  sortOrder: route.query.sortOrder === 'desc' ? 'desc' : 'asc',
  parcelFilterId: positiveInt(route.query.parcelFilterId),
  checkStatusProjectionKind: positiveInt(route.query.checkStatusProjectionKind),
  zone: positiveInt(route.query.zone),
  statusId: route.query.statusId === '0' ? 0 : positiveInt(route.query.statusId),
  numberPrefix: textFilter(route.query.numberPrefix),
  boxNumberPrefix: textFilter(route.query.boxNumberPrefix),
  stickerPrefix: textFilter(route.query.stickerPrefix),
  productName: textFilter(route.query.productName)
})

const ozon = computed(() => snapshot.value?.registerType === OZON_COMPANY_ID)
const numberKey = computed(() => ozon.value ? 'postingNumber' : 'shk')
const headers = computed(() => [
  { title: '№', key: 'id' },
  { title: 'Поиск', key: 'found', sortable: false },
  { title: ozon.value ? 'Номер отправления' : 'ШК', key: numberKey.value },
  { title: 'Стикеры', key: 'stickers', sortable: false },
  { title: 'Номер и стикер коробки', key: 'box', sortable: false },
  { title: 'Проверка, зона, статус', key: 'checks', sortable: false },
  { title: 'Описание', key: 'description', sortable: false },
  { title: 'Вес, кг', key: 'weight', sortable: false, align: 'end' },
  { title: 'Количество', key: 'quantity', sortable: false, align: 'end' }
])
const sortBy = computed(() => [{ key: controls.value.sortBy, order: controls.value.sortOrder }])
const lookupPage = computed(() => snapshot.value?.lookupPage)
const totalCount = computed(() => lookupPage.value?.totalCount ?? 0)
const maxPage = computed(() => controls.value.pageSize === -1 ? 1 : Math.max(1, Math.ceil(totalCount.value / controls.value.pageSize)))
const boxesRoute = computed(() => ({ name: 'scanjob-monitor-register', params: { id: props.scanjobId } }))
const canOpenParcel = computed(() => hasParcelEditRouteAccess(authStore))
const statusOptions = computed(() => [
  { value: null, title: 'Все' },
  ...statusStore.parcelStatuses.map(status => ({ value: status.id, title: status.title }))
])
const checkOptions = [
  { value: null, title: 'Все' },
  { value: scanjobCheckStatusProjectionKind.NotChecked, title: 'Не проверено' },
  { value: scanjobCheckStatusProjectionKind.Restriction, title: 'Запрет' },
  { value: scanjobCheckStatusProjectionKind.Defect, title: 'Брак' },
  { value: scanjobCheckStatusProjectionKind.Checked, title: 'Проверено' }
]
const zoneOptions = computed(() => [
  { value: null, title: 'Все' },
  { value: 1, title: 'Не задана' },
  ...warehousesStore.ops.zones.filter(zone => Number(zone.value) !== 1)
    .map(zone => ({ value: zone.value, title: zone.name || String(zone.value) }))
])

provide('savedParcelFilter', {
  id: computed(() => controls.value.parcelFilterId),
  options: computed(() => [
    { title: 'Нет', value: null },
    ...filterStore.filters.map(filter => ({ title: filter.name, value: filter.id }))
  ]),
  select: value => changeFilter('parcelFilterId', value)
})

let active = true
let observing = false
let closed = false
let version = 0
let running = false
let requested = false
let timer = null
let pendingLiveError = null
let routeUpdate = Promise.resolve()
const live = store.createLookupMonitorChannel(handleLiveFailure)

function showError(error, fallback) {
  if (active) alertStore.error(error, { fallback })
  reportError(error, { context: fallback })
}

function queryParams() {
  return Object.fromEntries(Object.entries(controls.value)
    .filter(([, value]) => value !== null && value !== '')
    .map(([key, value]) => [key, String(value)]))
}

function saveRoute() {
  routeUpdate = router.replace({ query: queryParams() }).catch(error => {
    showError(error, 'Не удалось сохранить параметры поиска')
  })
}

function changeControls(changes, delay = 0) {
  if (Object.entries(changes).every(([key, value]) => controls.value[key] === value)) return
  controls.value = { ...controls.value, ...changes }
  pageCurrent.value = false
  busy.value = true
  version++
  saveRoute()
  queueReload(delay)
}

function changeFilter(key, value, delay = 0) {
  changeControls({ [key]: value ?? null, page: 1 }, delay)
}

function changeSort(sort) {
  const column = sort[0]
  changeControls({ sortBy: column?.key ?? 'id', sortOrder: column?.order ?? 'asc', page: 1 })
}

function queueReload(delay) {
  clearTimeout(timer)
  timer = null
  if (delay === 0) {
    pageLoadFailed.value = false
    requested = true
    void loadPage()
    return
  }
  timer = setTimeout(() => queueReload(0), delay)
}

async function loadPage() {
  if (running || !active) return
  running = true
  busy.value = true
  while (active && requested) {
    requested = false
    const currentVersion = version
    try {
      await routeUpdate
      if (!active || currentVersion !== version) continue
      const refreshed = await store.loadLookupMonitorPage(props.scanjobId, queryParams())
      if (!active || currentVersion !== version) continue
      if (!refreshed?.lookupPage) throw new Error('Сервер не вернул список посылок для поиска')
      snapshot.value = refreshed
      pageCurrent.value = true
      if (controls.value.page !== refreshed.lookupPage.page) {
        controls.value.page = refreshed.lookupPage.page
        saveRoute()
      }
      if (pendingLiveError) {
        const error = pendingLiveError
        pendingLiveError = null
        if (refreshed.status === inProgressStatus) {
          showError(error, 'Не удалось подключить обновления монитора сканирования')
        } else {
          // The job can stop between the saved page response and live subscription.
          liveFailed.value = false
          reportError(error, { context: 'Подписка на остановленное задание' })
        }
      }
      if (refreshed.status === inProgressStatus && !observing && !closed && !liveFailed.value) void observe()
    } catch (error) {
      if (!active || currentVersion !== version) {
        reportError(error, { context: 'Ошибка устаревшего запроса посылок для поиска' })
      } else if (controls.value.parcelFilterId != null && error?.data?.code === 'parcel_filter_not_found') {
        changeFilter('parcelFilterId', null)
        const clearedVersion = version
        await routeUpdate
        if (active && version === clearedVersion) alertStore.warning(REMOVED_PARCEL_FILTER_MESSAGE)
      } else {
        pageLoadFailed.value = true
        if (pendingLiveError) {
          reportError(pendingLiveError, { context: 'Подключение обновлений монитора сканирования' })
          pendingLiveError = null
        }
        showError(error, loadFailure)
      }
    }
  }
  running = false
  busy.value = !pageCurrent.value && timer != null
}

function handleLiveFailure(error) {
  if (!active || closed) {
    // An obsolete connection cannot publish to the current page.
    reportError(error, { context: 'Подключение закрытого монитора сканирования' })
    return
  }
  liveFailed.value = true
  pendingLiveError = error
  void stopObserving()
  if (timer == null) queueReload(0)
}

function retry() {
  liveFailed.value = false
  queueReload(0)
}

async function observe() {
  observing = true
  try {
    await live.start(props.scanjobId, {
      onSnapshot: update => {
        if (active && timer == null && update.scanJobId === props.scanjobId && update.area === scanjobMonitorArea.Lookup) {
          queueReload(150)
        }
      },
      onClosed: jobId => {
        if (active && jobId === props.scanjobId) {
          closed = true
          liveFailed.value = false
          void stopObserving()
          queueReload(0)
        }
      }
    })
    liveFailed.value = false
  } catch (error) {
    handleLiveFailure(error)
  }
}

async function stopObserving() {
  observing = false
  try {
    await live.stop()
  } catch (error) {
    // A closed view cannot present the disconnect failure.
    reportError(error, { context: 'Отключение монитора поиска посылок' })
  }
}

async function loadOptions() {
  try {
    await Promise.all([statusStore.ensureLoaded(), warehousesStore.ensureOpsLoaded(), filterStore.getAll()])
  } catch (error) {
    showError(error, 'Не удалось загрузить фильтры посылок')
  } finally {
    optionsLoading.value = false
  }
}

async function editParcel(item) {
  await routeUpdate
  if (!active || !pageCurrent.value) return
  try {
    await navigateParcel(router, buildParcelEditLocation({
      routeName: 'Редактирование посылки',
      parcelId: item.parcel.parcelId,
      registerId: snapshot.value.registerId,
      mode: OP_MODE_WAREHOUSE,
      returnUrl: getCurrentInternalRoute(router)
    }))
  } catch (error) {
    showError(error, 'Не удалось открыть посылку')
  }
}

function stickers(item) {
  const values = ozon.value
    ? [['Штрихкод', item.parcel.barcode], ['ID отправления', item.ozonId]]
    : [['Стикер (УИН)', item.parcel.sticker], ['Код стикера', item.parcel.stickerCode], ['Баркод', item.parcel.barcode]]
  return values.filter(([, value]) => value)
}

onMounted(() => {
  queueReload(0)
  void loadOptions()
})

onUnmounted(() => {
  active = false
  clearTimeout(timer)
  void stopObserving()
})
</script>

<template>
  <div class="settings table-3 list-with-filters">
    <div class="header-with-actions">
      <h1 class="primary-heading">{{ snapshot?.scanJobName || `Задание № ${scanjobId}` }} | Посылки для поиска</h1>
      <div v-if="busy" class="header-actions-bar">
        <div class="header-actions header-actions-group" role="status" aria-label="Загрузка посылок">
          <span class="spinner-border spinner-border-m"></span>
        </div>
      </div>
    </div>
    <hr class="hr" />
    <PageAlertRegion />

    <nav class="scanjob-monitor-view-switch" aria-label="Режим монитора сканирования">
      <v-btn :to="boxesRoute">Коробки</v-btn>
      <v-btn variant="tonal" aria-current="page" disabled>Посылки для поиска</v-btn>
    </nav>

    <template v-if="snapshot">
      <p v-if="snapshot.lookupFoundCount != null">
        Найдено {{ formatCount(snapshot.lookupFoundCount) }} · Не найдено {{ formatCount(snapshot.lookupNotFoundCount) }}
      </p>
      <p v-else-if="snapshot.lookupRemainingCount != null">Осталось найти {{ formatCount(snapshot.lookupRemainingCount) }}</p>

      <ParcelWhFilterSelectors
        class="list-filters"
        :number-label="ozon ? 'Номер отправления' : 'ШК'"
        :status-options="statusOptions"
        :check-status-projection-options="checkOptions"
        :zone-options="zoneOptions"
        :is-initializing="optionsLoading"
        :parcels-wh-status="controls.statusId"
        :parcels-wh-check-status-projection="controls.checkStatusProjectionKind"
        :parcels-wh-zone="controls.zone"
        :local-parcel-number-search="controls.numberPrefix"
        :local-box-number-search="controls.boxNumberPrefix"
        :local-sticker-search="controls.stickerPrefix"
        :local-product-name-search="controls.productName"
        @update:parcels-wh-status="changeFilter('statusId', $event)"
        @update:parcels-wh-check-status-projection="changeFilter('checkStatusProjectionKind', $event)"
        @update:parcels-wh-zone="changeFilter('zone', $event)"
        @update:local-parcel-number-search="changeFilter('numberPrefix', $event, 250)"
        @update:local-box-number-search="changeFilter('boxNumberPrefix', $event, 250)"
        @update:local-sticker-search="changeFilter('stickerPrefix', $event, 250)"
        @update:local-product-name-search="changeFilter('productName', $event, 250)"
      />

      <v-card v-if="pageCurrent || busy" class="table-card">
        <v-data-table-server
          class="interlaced-table"
          item-value="parcel.parcelId"
          :headers="headers"
          :items="pageCurrent ? lookupPage.items : []"
          :items-length="pageCurrent ? totalCount : 0"
          :page="controls.page"
          :items-per-page="controls.pageSize"
          :sort-by="sortBy"
          :loading="busy"
          density="compact"
          hide-default-footer
          loading-text="Загрузка посылок…"
          no-data-text="Нет посылок по заданным условиям"
          @update:sort-by="changeSort"
        >
          <template #[`item.id`]="{ item }">
            <button v-if="canOpenParcel" type="button" class="link lookup-parcel-link" :aria-label="`Открыть посылку № ${item.parcel.parcelId}`" @click="editParcel(item)">
              {{ item.parcel.parcelId }}
            </button>
            <span v-else>{{ item.parcel.parcelId }}</span>
          </template>
          <template #[`item.found`]="{ item }">
            <span class="status-cell" :class="item.found === true ? 'no-issues' : item.found === false ? 'lookup-pending' : ''">
              {{ item.found === true ? 'Найдено' : item.found === false ? 'Не найдено' : 'Нет данных' }}
            </span>
          </template>
          <template #[`item.${numberKey}`]="{ item }">{{ valueOrDash(item.parcel.parcelNumber) }}</template>
          <template #[`item.stickers`]="{ item }">
            <div v-for="[label, value] in stickers(item)" :key="label">{{ label }}: {{ value }}</div>
            <span v-if="stickers(item).length === 0">—</span>
          </template>
          <template #[`item.box`]="{ item }">
            <template v-if="item.boxNumber">
              <div>{{ item.boxNumber }}</div>
              <v-tooltip location="top" :text="item.boxStickerScanned ? 'Коробка отсканирована' : 'Коробка не отсканирована'">
                <template #activator="{ props: tooltipProps }">
                  <span v-bind="tooltipProps" tabindex="0" class="status-cell" :class="item.boxStickerScanned ? 'no-issues' : 'lookup-box-unscanned'">
                    {{ valueOrDash(item.boxSticker) }}
                  </span>
                </template>
              </v-tooltip>
            </template>
            <span v-else>Без коробки</span>
          </template>
          <template #[`item.checks`]="{ item }">
            <div>
              <v-tooltip v-if="scanjobCheckStatusReason(item.parcel.checkStatusProjection)" location="top" :text="scanjobCheckStatusReason(item.parcel.checkStatusProjection)">
                <template #activator="{ props: tooltipProps }">
                  <span v-bind="tooltipProps" tabindex="0" class="status-cell" :class="getScanjobCheckStatusClass(item.parcel.checkStatusProjection)">
                    {{ scanjobCheckStatusText(item.parcel.checkStatusProjection) }}
                  </span>
                </template>
              </v-tooltip>
              <span v-else class="status-cell" :class="getScanjobCheckStatusClass(item.parcel.checkStatusProjection)">
                {{ scanjobCheckStatusText(item.parcel.checkStatusProjection) }}
              </span>
            </div>
            <div>{{ valueOrDash(item.parcel.zoneName) }}</div>
            <div>{{ valueOrDash(item.parcel.statusTitle) }}</div>
          </template>
          <template #[`item.description`]="{ item }">{{ valueOrDash(item.parcel.productName) }}</template>
          <template #[`item.weight`]="{ item }">
            <CorrectedWeightDisplay :weight="item.parcel.weightKg" :adjusted-weight="item.parcel.adjustedWeightKg"
              :derived-totals-pending="item.parcel.derivedTotalsPending === true" />
          </template>
          <template #[`item.quantity`]="{ item }">{{ valueOrDash(item.parcel.quantity) }}</template>
        </v-data-table-server>
        <div class="v-data-table-footer">
          <PaginationFooter
            :page="controls.page"
            :items-per-page="controls.pageSize"
            :items-per-page-options="itemsPerPageOptions"
            :total-count="pageCurrent ? totalCount : 0"
            :max-page="maxPage"
            :loading="busy"
            @update:page="changeControls({ page: $event })"
            @update:items-per-page="changeControls({ pageSize: $event, page: 1 })"
          />
        </div>
      </v-card>
    </template>
    <v-btn v-if="(pageLoadFailed || liveFailed) && !busy" @click="retry">Повторить загрузку</v-btn>
  </div>
</template>

<style scoped>
.lookup-pending {
  background: #fff2d6;
  color: #6c4300;
}
.lookup-box-unscanned {
  background: #eee;
  color: #464646;
}
.lookup-parcel-link {
  color: var(--primary-color);
  font: inherit;
  text-decoration: underline;
}
</style>
