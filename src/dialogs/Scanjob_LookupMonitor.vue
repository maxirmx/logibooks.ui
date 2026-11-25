<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application.

import { computed, onMounted, onUnmounted, provide, ref, watch } from 'vue'
import { isNavigationFailure, useRoute, useRouter } from 'vue-router'
import CorrectedWeightDisplay from '@/components/CorrectedWeightDisplay.vue'
import PaginationFooter from '@/components/PaginationFooter.vue'
import ParcelWhFilterSelectors from '@/components/ParcelWhFilterSelectors.vue'
import ScanjobMonitorSummary from '@/components/ScanjobMonitorSummary.vue'
import { OZON_COMPANY_ID } from '@/helpers/company.constants.js'
import { reportError } from '@/helpers/error.helpers.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { recoverPageLoad } from '@/helpers/login.navigation.js'
import { OP_MODE_WAREHOUSE } from '@/helpers/op.mode.js'
import { ozonRegisterColumnTitles } from '@/helpers/ozon.register.mapping.js'
import { REMOVED_PARCEL_FILTER_MESSAGE } from '@/helpers/parcel.filters.js'
import { buildParcelEditLocation, getCurrentInternalRoute, navigateParcel } from '@/helpers/parcel.navigation.helpers.js'
import { hasParcelEditRouteAccess } from '@/helpers/parcels.list.helpers.js'
import {
  buildScanjobProgressCards, formatCount, formatScannedInfoLines, scanjobMonitorArea,
  scanjobParcelScannedInfoHeader, stickerClass, valueOrDash
} from '@/helpers/scanjob.monitor.helpers.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useParcelFiltersStore } from '@/stores/parcel.filters.store.js'
import { useScanjobsStore } from '@/stores/scanjobs.store.js'
import '@/assets/styles/scanjob-monitor.css'

const props = defineProps({
  scanjobId: { type: Number, required: true },
  selectedParcelId: { type: Number, default: null },
  navigateToBox: { type: Function, required: true }
})
const route = useRoute()
const router = useRouter()
const store = useScanjobsStore()
const alertStore = useAlertStore()
const authStore = useAuthStore()
const filterStore = useParcelFiltersStore()
const inProgressStatus = 15
const loadFailure = 'Не удалось загрузить посылки для поиска'

const snapshot = ref(null)
const busy = ref(true)
const liveReady = ref(false)
const closed = ref(false)
const lookupContent = ref(null)
const pageCurrent = ref(false)
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
  numberPrefix: textFilter(route.query.numberPrefix),
  boxNumberPrefix: textFilter(route.query.boxNumberPrefix),
  stickerPrefix: textFilter(route.query.stickerPrefix),
  productName: textFilter(route.query.productName)
})

const ozon = computed(() => snapshot.value?.registerType === OZON_COMPANY_ID)
const numberKey = computed(() => ozon.value ? 'postingNumber' : 'shk')
const headers = computed(() => [
  { title: 'Поиск', key: 'found', sortable: false },
  { title: ozon.value ? 'Номер отправления' : 'ШК', key: numberKey.value },
  ...(ozon.value ? [
    { title: ozonRegisterColumnTitles.ozonId, key: 'ozonId', sortable: false },
    { title: ozonRegisterColumnTitles.barcode, key: 'barcode', sortable: false }
  ] : [
    { title: 'Стикер (УИН)', key: 'sticker', sortable: false },
    { title: 'Код стикера', key: 'stickerCode', sortable: false },
    { title: 'Баркод', key: 'barcode', sortable: false }
  ]),
  { title: 'Номер коробки', key: 'box', sortable: false, cellProps: getBoxCellProps },
  { title: 'Статус', key: 'statusTitle', sortable: false },
  scanjobParcelScannedInfoHeader,
  { title: 'Описание', key: 'description', sortable: false },
  { title: 'Вес, кг', key: 'weight', sortable: false, align: 'end' },
  { title: 'Количество', key: 'quantity', sortable: false, align: 'end' }
])
const sortBy = computed(() => [{ key: controls.value.sortBy, order: controls.value.sortOrder }])
const lookupPage = computed(() => snapshot.value?.lookupPage)
const summaryCards = computed(() => snapshot.value
  ? buildScanjobProgressCards(snapshot.value, { includeRestrictions: false })
  : [])
const visibleFollowedParcelId = computed(() => {
  const id = props.selectedParcelId
  return pageCurrent.value && id != null && lookupPage.value?.items.some(item => item.parcel.parcelId === id) ? id : null
})
watch(visibleFollowedParcelId, id => {
  if (id != null) lookupContent.value?.querySelector('.selected-parcel-row')?.scrollIntoView?.({ block: 'nearest' })
}, { flush: 'post' })
function getRowProps({ item }) {
  return {
    class: item.parcel.parcelId === visibleFollowedParcelId.value ? 'selected-parcel-row' : '',
    ...(canOpenParcel.value ? {
      tabindex: 0,
      onClick: () => editParcel(item),
      onKeydown: event => {
        if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return
        event.preventDefault()
        void editParcel(item)
      }
    } : {})
  }
}

function getBoxCellProps({ item }) {
  if (!item.boxNumber) return
  return {
    class: item.boxId == null ? 'lookup-box-cell-unavailable' : 'lookup-box-cell',
    onClick: event => {
      event.stopPropagation()
      if (item.boxId != null) void openBox(item)
    }
  }
}
const totalCount = computed(() => lookupPage.value?.totalCount ?? 0)
const maxPage = computed(() => controls.value.pageSize === -1 ? 1 : Math.max(1, Math.ceil(totalCount.value / controls.value.pageSize)))
const canOpenParcel = computed(() => hasParcelEditRouteAccess(authStore))

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
          await recoverPageLoad(router, error, 'Не удалось подключить обновления монитора сканирования')
          break
        } else {
          // The job can stop between the saved page response and live subscription.
          liveFailed.value = false
          reportError(error, { context: 'Подписка на остановленное задание' })
        }
      }
      if (refreshed.status === inProgressStatus && !observing && !closed.value && !liveFailed.value) void observe()
    } catch (error) {
      if (!active || currentVersion !== version) {
        reportError(error, { context: 'Ошибка устаревшего запроса посылок для поиска' })
      } else if (controls.value.parcelFilterId != null && error?.data?.code === 'parcel_filter_not_found') {
        changeFilter('parcelFilterId', null)
        const clearedVersion = version
        await routeUpdate
        if (active && version === clearedVersion) alertStore.warning(REMOVED_PARCEL_FILTER_MESSAGE)
      } else {
        if (pendingLiveError) {
          reportError(pendingLiveError, { context: 'Подключение обновлений монитора сканирования' })
          pendingLiveError = null
        }
        await recoverPageLoad(router, error, loadFailure)
        break
      }
    }
  }
  running = false
  busy.value = !pageCurrent.value && timer != null
}

function handleLiveFailure(error) {
  if (!active || closed.value) {
    // An obsolete connection cannot publish to the current page.
    reportError(error, { context: 'Подключение закрытого монитора сканирования' })
    return
  }
  liveFailed.value = true
  pendingLiveError = error
  void stopObserving()
  if (timer == null) queueReload(0)
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
          closed.value = true
          liveFailed.value = false
          void stopObserving()
          queueReload(0)
        }
      }
    })
    if (!active || !observing) return
    liveFailed.value = false
    liveReady.value = true
  } catch (error) {
    handleLiveFailure(error)
  }
}

async function stopObserving() {
  observing = false
  liveReady.value = false
  try {
    await live.stop()
  } catch (error) {
    // A closed view cannot present the disconnect failure.
    reportError(error, { context: 'Отключение монитора поиска посылок' })
  }
}

async function loadOptions() {
  try {
    await filterStore.getAll()
  } catch (error) {
    showError(error, 'Не удалось загрузить фильтры посылок')
  } finally {
    optionsLoading.value = false
  }
}

async function navigateFromLookup(navigate, failureMessage) {
  await routeUpdate
  if (!active || !pageCurrent.value) return
  try {
    const result = await navigate()
    if (isNavigationFailure(result)) throw result
  } catch (error) {
    showError(error, failureMessage)
  }
}

function editParcel(item) {
  return navigateFromLookup(() => navigateParcel(router, buildParcelEditLocation({
    routeName: 'Редактирование посылки',
    parcelId: item.parcel.parcelId,
    registerId: snapshot.value.registerId,
    mode: OP_MODE_WAREHOUSE,
    returnUrl: getCurrentInternalRoute(router)
  })), 'Не удалось открыть посылку')
}

function openBox(item) {
  return navigateFromLookup(() => props.navigateToBox({ area: scanjobMonitorArea.Box, boxId: item.boxId }),
    'Не удалось открыть коробку')
}

function lookupBoxClass(item) {
  if (item.boxTargetCount > 0 && item.boxFoundCount === item.boxTargetCount) return stickerClass(true)
  if (item.boxStickerScanned || item.boxFoundCount > 0) return 'monitor-status monitor-status-partial'
  return stickerClass(false)
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

defineExpose({ snapshot, busy, closed, liveReady, followUser: live.followUser, clearFollowUser: live.clearFollowUser })
</script>

<template>
  <div ref="lookupContent">
    <template v-if="snapshot">
      <ScanjobMonitorSummary :cards="summaryCards">
        <template v-if="snapshot.lookupNotFoundCount == null && snapshot.lookupRemainingCount != null" #card-lookupProgress>
          Осталось найти {{ formatCount(snapshot.lookupRemainingCount) }}
        </template>
      </ScanjobMonitorSummary>

      <ParcelWhFilterSelectors
        class="list-filters"
        :number-label="ozon ? 'Номер отправления' : 'ШК'"
        :is-initializing="optionsLoading"
        :local-parcel-number-search="controls.numberPrefix"
        :local-box-number-search="controls.boxNumberPrefix"
        :local-sticker-search="controls.stickerPrefix"
        :local-product-name-search="controls.productName"
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
          :row-props="getRowProps"
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
          <template #[`header.scannedInfo`]="{ column }">
            <span class="scanjob-monitor-scanned-info-header">{{ column.title }}</span>
          </template>
          <template #[`item.found`]="{ item }">
            <span :class="stickerClass(item.found === true)">
              {{ item.found === true ? 'Найдена' : 'Не сканирована' }}
            </span>
          </template>
          <template #[`item.${numberKey}`]="{ item }">{{ valueOrDash(item.parcel.parcelNumber) }}</template>
          <template #[`item.ozonId`]="{ item }">{{ valueOrDash(item.ozonId) }}</template>
          <template #[`item.sticker`]="{ item }">{{ valueOrDash(item.parcel.sticker) }}</template>
          <template #[`item.stickerCode`]="{ item }">{{ valueOrDash(item.parcel.stickerCode) }}</template>
          <template #[`item.barcode`]="{ item }">{{ valueOrDash(item.parcel.barcode) }}</template>
          <template #[`item.box`]="{ item }">
            <v-tooltip v-if="item.boxNumber" location="top" :text="`Найдено ${formatCount(item.boxFoundCount)} из ${formatCount(item.boxTargetCount)}`">
              <template #activator="{ props: tooltipProps }">
                <component
                  :is="item.boxId == null ? 'span' : 'button'"
                  v-bind="tooltipProps"
                  :type="item.boxId == null ? undefined : 'button'"
                  :tabindex="item.boxId == null ? 0 : undefined"
                  :aria-label="item.boxId == null ? undefined : `Открыть коробку № ${item.boxNumber}`"
                  :class="lookupBoxClass(item)"
                >{{ item.boxNumber }}</component>
              </template>
            </v-tooltip>
            <span v-else>Без коробки</span>
          </template>
          <template #[`item.statusTitle`]="{ item }">{{ valueOrDash(item.parcel.statusTitle) }}</template>
          <template #[`item.scannedInfo`]="{ item }">
            <span class="scanjob-monitor-scanned-info">
              <span v-for="(line, index) in formatScannedInfoLines(item.parcel)" :key="index">{{ line }}</span>
            </span>
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
  </div>
</template>

<style scoped>
/* The shared table styles set cursor: default !important on table cells. */
:deep(.v-data-table__tr--clickable > td:not(.lookup-box-cell-unavailable)),
:deep(td.lookup-box-cell) {
  cursor: pointer !important;
}
</style>
