<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application.

import { computed, nextTick, onMounted, onUnmounted, provide, ref, watch } from 'vue'
import { isNavigationFailure, NavigationFailureType, onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
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
  scanjobMonitorLocation, scanjobMonitorMode, scanjobParcelScannedInfoHeader, stickerClass, valueOrDash
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
const lookupRouteName = scanjobMonitorLocation(props.scanjobId, scanjobMonitorMode.Lookup).name

const snapshot = ref(null)
const busy = ref(true)
const liveReady = ref(false)
const closed = ref(false)
const lookupContent = ref(null)
const pageCurrent = ref(false)
const blocking = computed(() => busy.value && !pageCurrent.value)
const followedParcelId = ref(null)
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
function readControls(query) {
  return {
    page: positiveInt(query.page) ?? 1,
    pageSize: itemsPerPageOptions.find(option => option.value === Number(query.pageSize))?.value ?? 50,
    sortBy: sortKeys.includes(query.sortBy) ? query.sortBy : 'id',
    sortOrder: query.sortOrder === 'desc' ? 'desc' : 'asc',
    parcelFilterId: positiveInt(query.parcelFilterId),
    numberPrefix: textFilter(query.numberPrefix),
    boxNumberPrefix: textFilter(query.boxNumberPrefix),
    stickerPrefix: textFilter(query.stickerPrefix),
    productName: textFilter(query.productName)
  }
}
const controls = ref(readControls(route.query))

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
  const id = followedParcelId.value ?? props.selectedParcelId
  return pageCurrent.value && id != null && lookupPage.value?.items.some(item => item.parcel.parcelId === id) ? id : null
})

function scrollToSelection() {
  lookupContent.value?.querySelector('.monitor-followed-parcel-row')?.scrollIntoView?.({ block: 'nearest' })
}

function getRowProps({ item }) {
  return {
    class: item.parcel.parcelId === visibleFollowedParcelId.value ? 'monitor-followed-parcel-row' : '',
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
let pendingFollow = null
let followVersion = 0
let lastFollowScanId = null
let automaticRoute = null
let leaving = null
let historyDestination = null
let reloadAfterNavigation = false
const stopNavigationListeners = []
const live = store.createLookupMonitorChannel(handleLiveFailure)

function showError(error, fallback) {
  if (active) alertStore.error(error, { fallback })
  reportError(error, { context: fallback })
}

function queryParams(values = controls.value) {
  return Object.fromEntries(Object.entries(values)
    .filter(([, value]) => value !== null && value !== '')
    .map(([key, value]) => [key, String(value)]))
}

function saveRoute() {
  routeUpdate = router.replace({ query: queryParams() }).catch(error => {
    showError(error, 'Не удалось сохранить параметры поиска')
  })
}

function changeControls(changes, { delay = 0, updateRoute = true } = {}) {
  if (controlsMatch(controls.value, changes)) return
  invalidateFollow({ navigating: true })
  controls.value = { ...controls.value, ...changes }
  pageCurrent.value = false
  busy.value = true
  version++
  if (updateRoute) saveRoute()
  queueReload(delay)
}

function controlsMatch(values, expected) {
  return Object.entries(expected).every(([key, value]) => values[key] === value)
}

watch(() => route.query, query => {
  if (route.name === lookupRouteName && Number(route.params.id) === props.scanjobId) {
    const values = readControls(query)
    if (automaticRoute && !automaticRoute.supersededByNavigation && controlsMatch(values, automaticRoute.destination)) return
    changeControls(values, { updateRoute: false })
  }
}, { flush: 'sync' })

function invalidateFollow({ navigating = false } = {}) {
  pendingFollow = null
  followVersion++
  if (navigating && automaticRoute) automaticRoute.supersededByNavigation = true
}

function queueFollowEvent(event) {
  const scanId = positiveInt(event.scanCodeId)
  if (!active || leaving || historyDestination || closed.value || !liveReady.value || snapshot.value?.status !== inProgressStatus ||
      scanId == null || scanId <= lastFollowScanId) return
  lastFollowScanId = scanId
  invalidateFollow()
  const parcelId = event.lookupParcelMatched === true ? positiveInt(event.followTarget?.parcelId) : null
  if (parcelId == null) return
  pendingFollow = { parcelId, version: followVersion }
  if (timer == null) queueReload(150)
}

function deferReloadForNavigation() {
  if (!leaving && !historyDestination) return false
  reloadAfterNavigation = true
  return true
}

function resumeDeferredReload() {
  if (!reloadAfterNavigation || leaving || historyDestination || route.name !== lookupRouteName) return
  reloadAfterNavigation = false
  queueReload(0)
}

function clearFollowUser() {
  lastFollowScanId = null
  invalidateFollow()
  return live.clearFollowUser()
}

function isCurrentRequest(currentVersion, follow) {
  return active && currentVersion === version && (!follow || follow.version === followVersion)
}

async function positionFollow(refreshed, currentVersion, follow) {
  const { page, followedParcelId: parcelId } = refreshed.lookupPage
  if (controls.value.page !== page) {
    const attempt = {
      from: router.currentRoute.value,
      previousQuery: { ...route.query },
      destination: { ...controls.value, page },
      supersededByNavigation: false
    }
    automaticRoute = attempt
    const isDestination = to => to.name === lookupRouteName && Number(to.params.id) === props.scanjobId &&
      controlsMatch(readControls(to.query), attempt.destination)
    const removeGuard = router.beforeResolve((to, from) => {
      if (!attempt.supersededByNavigation && from === attempt.from && isDestination(to) &&
          !isCurrentRequest(currentVersion, follow)) return false
    })
    try {
      const result = await router.replace({ query: queryParams(attempt.destination) })
      if (!isCurrentRequest(currentVersion, follow)) {
        // A navigation may have finished just before the scan was superseded.
        if (!result && active && !attempt.supersededByNavigation && isDestination(router.currentRoute.value)) {
          const restored = await router.replace({ query: attempt.previousQuery })
          if (isNavigationFailure(restored, NavigationFailureType.aborted)) throw restored
        }
        return false
      }
      if (isNavigationFailure(result, NavigationFailureType.cancelled)) return false
      if (isNavigationFailure(result)) throw result
      if (!isDestination(router.currentRoute.value)) return false
    } catch (error) {
      if (isCurrentRequest(currentVersion, follow)) showError(error, 'Не удалось открыть страницу найденной посылки')
      else reportError(error, { context: 'Переход по устаревшему сканированию' })
      return false
    } finally {
      removeGuard()
      automaticRoute = null
    }
  }
  controls.value.page = page
  snapshot.value = refreshed
  pageCurrent.value = true
  followedParcelId.value = parcelId
  await nextTick()
  if (isCurrentRequest(currentVersion, follow) && visibleFollowedParcelId.value === parcelId) scrollToSelection()
  return true
}

function changeFilter(key, value, delay = 0) {
  const filter = key === 'parcelFilterId' ? value ?? null : textFilter(value)
  changeControls({ [key]: filter, page: 1 }, { delay })
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
    if (deferReloadForNavigation()) break
    const currentVersion = version
    let follow = null
    try {
      await routeUpdate
      if (!active || currentVersion !== version) continue
      follow = pendingFollow
      pendingFollow = null
      const params = queryParams()
      if (follow) params.followParcelId = String(follow.parcelId)
      const refreshed = await store.loadLookupMonitorPage(props.scanjobId, params)
      if (!isCurrentRequest(currentVersion, follow)) {
        if (active && currentVersion === version && timer == null) requested = true
        continue
      }
      if (deferReloadForNavigation()) continue
      if (!refreshed?.lookupPage) throw new Error('Сервер не вернул список посылок для поиска')
      if (follow && refreshed.status === inProgressStatus && refreshed.lookupPage.followedParcelId === follow.parcelId) {
        if (!await positionFollow(refreshed, currentVersion, follow) && active && currentVersion === version && timer == null) {
          requested = true
        }
        continue
      }
      const restoreSelection = !snapshot.value && props.selectedParcelId != null
      snapshot.value = refreshed
      pageCurrent.value = true
      if (controls.value.page !== refreshed.lookupPage.page) {
        controls.value.page = refreshed.lookupPage.page
        saveRoute()
      }
      if (restoreSelection) {
        await nextTick()
        if (isCurrentRequest(currentVersion, follow) && visibleFollowedParcelId.value != null) scrollToSelection()
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
      if (!isCurrentRequest(currentVersion, follow)) {
        reportError(error, { context: 'Ошибка устаревшего запроса посылок для поиска' })
        if (active && currentVersion === version && timer == null) requested = true
      } else if (deferReloadForNavigation()) {
        // Navigation owns the current route until it finishes.
        reportError(error, { context: loadFailure })
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
        // Core uses an uncoded 404 error envelope for unavailable scan jobs.
        if (error?.status === 404 && typeof error.data?.msg === 'string' && !error.data.code) {
          requested = false
          clearTimeout(timer)
          timer = null
          pageCurrent.value = false
          snapshot.value = null
          liveFailed.value = false
          if (observing) void stopObserving()
          alertStore.error(`Монитор поиска недоступен для задания «${props.scanjobId}»`)
        } else {
          await recoverPageLoad(router, error, loadFailure)
        }
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
  invalidateFollow()
  void stopObserving()
  if (timer == null) queueReload(0)
}

async function observe() {
  observing = true
  try {
    await live.start(props.scanjobId, {
      onReconnecting: () => invalidateFollow(),
      onSnapshot: update => {
        if (active && timer == null && update.scanJobId === props.scanjobId && update.area === scanjobMonitorArea.Lookup) {
          queueReload(150)
        }
      },
      onClosed: jobId => {
        if (active && jobId === props.scanjobId) {
          closed.value = true
          liveFailed.value = false
          invalidateFollow()
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
    const fallback = 'Не удалось загрузить фильтры посылок'
    if (active) await recoverPageLoad(router, error, fallback)
    else {
      // The monitor is closed, so this failure belongs only in diagnostics.
      reportError(error, { context: fallback })
    }
  } finally {
    optionsLoading.value = false
  }
}

async function navigateFromLookup(navigate, failureMessage) {
  await routeUpdate
  if (!active || !pageCurrent.value) return
  invalidateFollow({ navigating: true })
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

if (route.matched?.length) {
  // History can change the query within the same route record while authentication is pending.
  stopNavigationListeners.push(router.options.history.listen(to => {
    historyDestination = to
    invalidateFollow({ navigating: true })
  }))
  onBeforeRouteLeave(to => {
    leaving = to
    invalidateFollow({ navigating: true })
  })
  stopNavigationListeners.push(router.afterEach((to, _from, failure) => {
    if (failure && to === leaving) leaving = null
    if (to.fullPath === historyDestination) historyDestination = null
    resumeDeferredReload()
  }))
  stopNavigationListeners.push(router.onError((_error, to) => {
    if (to === leaving) leaving = null
    if (to.fullPath === historyDestination) historyDestination = null
    resumeDeferredReload()
  }))
}

onMounted(() => {
  queueReload(0)
  void loadOptions()
})

onUnmounted(() => {
  active = false
  for (const stopListening of stopNavigationListeners) stopListening()
  clearTimeout(timer)
  void stopObserving()
})

defineExpose({ snapshot, busy, blocking, closed, liveReady, reconnecting: live.reconnecting,
  followUser: live.followUser, clearFollowUser, queueFollowEvent })
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
          class="interlaced-table scanjob-lookup-table"
          item-value="parcel.parcelId"
          :headers="headers"
          :items="pageCurrent ? lookupPage.items : []"
          :row-props="getRowProps"
          :items-length="pageCurrent ? totalCount : 0"
          :page="controls.page"
          :items-per-page="controls.pageSize"
          :sort-by="sortBy"
          :loading="blocking"
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
            :loading="blocking"
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
