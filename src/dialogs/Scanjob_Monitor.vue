<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, onMounted, onUnmounted, ref } from 'vue'
import router from '@/router'
import { storeToRefs } from 'pinia'
import { useAlertStore } from '@/stores/alert.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useScanjobsStore } from '@/stores/scanjobs.store.js'
import { useScanjobHeading } from '@/composables/useScanjobHeading.js'
import ActionButton from '@/components/ActionButton.vue'
import ClickableCell from '@/components/ClickableCell.vue'
import { buildParcelListHeading } from '@/helpers/register.heading.helpers.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { navigateToEditParcel } from '@/helpers/parcels.list.helpers.js'

const props = defineProps({
  scanjobId: { type: Number, required: true }
})

const MODE_REGISTER = 'register'
const MODE_BOX = 'box'
const MONITOR_THROTTLE_MS = 150
const SCAN_JOB_STATUS_IN_PROGRESS = 15

const scanJobsStore = useScanjobsStore()
const registersStore = useRegistersStore()
const authStore = useAuthStore()
const alertStore = useAlertStore()
const { alert } = storeToRefs(alertStore)
const { scanjob, monitorLoading, monitorError, monitorClosed } = storeToRefs(scanJobsStore)
const {
  scanjobmonitor_boxes_per_page,
  scanjobmonitor_boxes_sort_by,
  scanjobmonitor_boxes_page,
  scanjobmonitor_parcels_per_page,
  scanjobmonitor_parcels_sort_by,
  scanjobmonitor_parcels_page
} = storeToRefs(authStore)
const isComponentMounted = ref(true)
const { loadScanjob } = useScanjobHeading(props.scanjobId, { isComponentMounted })

const mode = ref(MODE_REGISTER)
const selectedBoxId = ref(null)
const visibleSnapshot = ref(null)
const closedStatus = ref(null)
const switchingScope = ref(false)
const monitorStatusOnly = ref(false)
const scopeVersion = ref(0)
const registerLoading = ref(true)

let pendingSnapshot = null
let throttleTimer = null

const boxHeaders = [
  { title: '', key: 'boxStickerScanned', align: 'start' },
  { title: 'Номер коробки', key: 'boxCode', align: 'center' },
  { title: 'Сканированный код', key: 'boxScannedSticker', align: 'center' },
  { title: 'Пользователь', key: 'boxScannedUserName', align: 'start' },
  { title: 'Время сканирования', key: 'boxScannedTime', align: 'start' },
  { title: 'Посылки всего / сканировано / не сканировано', key: 'parcelsProgress', align: 'center', sortable: false }
]

const parcelHeaders = [
  { title: '', key: 'stickerScanned', align: 'start' },
  { title: 'Посылка', key: 'parcelNumber', align: 'start' },
  { title: 'Сканированный код', key: 'scannedSticker', align: 'start' },
  { title: 'Пользователь', key: 'scannedUserName', align: 'start' },
  { title: 'Время сканирования', key: 'scannedTime', align: 'start' },
  { title: 'Зона', key: 'zoneName', align: 'start' },
  { title: 'Статус', key: 'statusTitle', align: 'start' }
]

const isRegisterMode = computed(() => mode.value === MODE_REGISTER)
const isBoxMode = computed(() => mode.value === MODE_BOX)
const isLoading = computed(() => monitorLoading.value || switchingScope.value)
const boxes = computed(() => visibleSnapshot.value?.boxes ?? [])
const selectedBox = computed(() => visibleSnapshot.value?.box ?? null)
const selectedParcels = computed(() => selectedBox.value?.parcels ?? [])
const closedInfo = computed(() => closedStatus.value || monitorClosed.value)
const scanjobStatusText = computed(() => getScanJobStatusText(scanjob.value?.status))
const registerId = computed(() => scanjob.value?.registerId ?? null)
const activeRegisterItem = computed(() => {
  const currentRegisterId = scanjob.value?.registerId
  const storeRegister = registersStore.item

  if (!currentRegisterId) return null
  if (!storeRegister || storeRegister.loading || storeRegister.error) return null
  if (storeRegister.id !== currentRegisterId) return null

  return storeRegister
})
const basicHeading = computed(() => {
  if (!registerId.value) return 'Реестр не указан'
  if (registerLoading.value || !activeRegisterItem.value) return 'Загрузка реестра...'
  return buildParcelListHeading(activeRegisterItem.value, (id) => registersStore.getTransportationDocument(id))
})
const scopeHeading = computed(() => {
  if (isBoxMode.value) {
    return `Коробка ${selectedBox.value?.boxCode || ''}`.trim()
  }

  return 'Коробки'
})
const monitorHeading = computed(() => `Сканирование | ${basicHeading.value} | ${scopeHeading.value}`)

const aggregateCards = computed(() => {
  const snapshot = visibleSnapshot.value
  if (!snapshot) return []

  return [
    {
      key: 'boxes',
      label: 'Коробки всего / сканировано / не сканировано',
      value: `${snapshot.totalBoxes ?? 0} / ${snapshot.boxesWithStickerScanned ?? 0} / ${snapshot.boxesWithStickerNotScanned ?? 0}`,
    },
    {
      key: 'parcels',
      label: 'Посылки всего / сканировано / не сканировано',
      value: `${snapshot.totalParcels ?? 0} / ${snapshot.parcelsWithStickerScanned ?? 0} / ${snapshot.parcelsWithStickerNotScanned ?? 0}`,
    },
    {
      key: 'unregistered',
      label: 'Посылки не в реестре',
      value: String(snapshot.scannedItemsNotInRegister ?? 0),
    }
  ]
})

function close() {
  router.back()
}

async function handleCloseAction() {
  if (isLoading.value) {
    return
  }

  if (isBoxMode.value) {
    await openRegisterMonitor()
    return
  }

  close()
}

function openUnregisteredParcels() {
  if (!registerId.value) {
    return
  }

  router.push({
    path: `/registers/${registerId.value}/unregistered-parcels`,
    query: {
      returnUrl: router.currentRoute.value.fullPath
    }
  })
}

async function loadRegister(scanjobData) {
  const scanjobRegisterId = scanjobData?.registerId
  if (!scanjobRegisterId) {
    registerLoading.value = false
    return
  }

  registerLoading.value = true
  try {
    await registersStore.getById(scanjobRegisterId)
  } finally {
    if (isComponentMounted.value) {
      registerLoading.value = false
    }
  }
}

function canSubscribeToMonitor(job) {
  return Number(job?.status) === SCAN_JOB_STATUS_IN_PROGRESS
}

function getScanJobStatusText(status) {
  switch (Number(status)) {
    case 10:
      return 'Создано'
    case 15:
      return 'Выполняется'
    case 18:
      return 'Приостановлено'
    case 20:
      return 'Завершено'
    default:
      return status == null ? 'Неизвестно' : String(status)
  }
}

function formatCount(value) {
  return Number(value ?? 0).toLocaleString('ru-RU')
}

function valueOrDash(value) {
  return value || '-'
}

const dateTimeRuFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
})

function formatScanTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return dateTimeRuFormatter.format(date)
}

function stickerText(scanned) {
  return scanned ? 'Сканирована' : 'Не сканирована'
}

function stickerClass(scanned, notFound = false) {
  if (notFound) return 'monitor-status monitor-status-not-found'
  return scanned ? 'monitor-status monitor-status-scanned' : 'monitor-status monitor-status-waiting'
}

function editParcel(item) {
  const parcelId = item?.id ?? item?.parcelId
  if (!parcelId || !registerId.value || isLoading.value) {
    return
  }

  navigateToEditParcel(
    router,
    { ...item, id: parcelId },
    'Редактирование посылки',
    { registerId: registerId.value }
  )
}

function buildScope(area, boxId = null) {
  return {
    area,
    boxId
  }
}

function currentArea() {
  return isBoxMode.value
    ? scanJobsStore.scanJobMonitorArea.Box
    : scanJobsStore.scanJobMonitorArea.Boxes
}

function snapshotMatchesScope(snapshot) {
  if (!snapshot || Number(snapshot.scanJobId) !== Number(props.scanjobId)) {
    return false
  }

  if (Number(snapshot.area) !== Number(currentArea())) {
    return false
  }

  if (isBoxMode.value) {
    return Number(snapshot.box?.boxId) === Number(selectedBoxId.value)
  }

  return true
}

function clearPendingSnapshot() {
  pendingSnapshot = null
  if (throttleTimer) {
    clearTimeout(throttleTimer)
    throttleTimer = null
  }
}

function applySnapshot(snapshot, { version = scopeVersion.value, immediate = false } = {}) {
  if (!isComponentMounted.value || version !== scopeVersion.value || !snapshotMatchesScope(snapshot)) {
    return
  }

  if (immediate) {
    clearPendingSnapshot()
    visibleSnapshot.value = snapshot
    return
  }

  pendingSnapshot = snapshot
  if (throttleTimer) {
    return
  }

  throttleTimer = setTimeout(() => {
    const nextSnapshot = pendingSnapshot
    pendingSnapshot = null
    throttleTimer = null
    if (nextSnapshot) {
      applySnapshot(nextSnapshot, { version, immediate: true })
    }
  }, MONITOR_THROTTLE_MS)
}

function handleMonitorClosed(scanJobId, status, version) {
  if (
    !isComponentMounted.value ||
    version !== scopeVersion.value ||
    Number(scanJobId) !== Number(props.scanjobId)
  ) {
    return
  }

  closedStatus.value = { scanJobId, status }
  clearPendingSnapshot()
  scanJobsStore.stopMonitor().catch(() => {})
}

function getMonitorErrorMessage(error) {
  if (error?.status === 400) {
    return 'Монитор доступен только для активного задания сканирования коробок и посылок'
  }

  return error?.message || 'Ошибка при загрузке монитора сканирования'
}

async function observeScope(scope, { subscribe = true } = {}) {
  const version = scopeVersion.value + 1
  scopeVersion.value = version
  switchingScope.value = true
  closedStatus.value = null
  monitorStatusOnly.value = false
  visibleSnapshot.value = null
  clearPendingSnapshot()

  try {
    await scanJobsStore.clearMonitor().catch(() => {})

    const snapshot = await scanJobsStore.loadMonitorSnapshot(props.scanjobId, scope)
    applySnapshot(snapshot, { version, immediate: true })

    if (subscribe) {
      await scanJobsStore.startMonitor(props.scanjobId, {
        ...scope,
        onSnapshot: (nextSnapshot) => applySnapshot(nextSnapshot, { version }),
        onClosed: (scanJobId, status) => handleMonitorClosed(scanJobId, status, version)
      })
    }
  } catch (error) {
    if (isComponentMounted.value && version === scopeVersion.value) {
      alertStore.error(getMonitorErrorMessage(error))
    }
  } finally {
    if (isComponentMounted.value && version === scopeVersion.value) {
      switchingScope.value = false
    }
  }
}

async function openRegisterMonitor({ subscribe = canSubscribeToMonitor(scanjob.value) } = {}) {
  mode.value = MODE_REGISTER
  selectedBoxId.value = null
  await observeScope(buildScope(scanJobsStore.scanJobMonitorArea.Boxes), { subscribe })
}

async function openBoxMonitor(box) {
  if (!box?.boxId || isLoading.value) {
    return
  }

  mode.value = MODE_BOX
  selectedBoxId.value = box.boxId
  await observeScope(buildScope(scanJobsStore.scanJobMonitorArea.Box, box.boxId), {
    subscribe: canSubscribeToMonitor(scanjob.value)
  })
}

onMounted(async () => {
  const loaded = await loadScanjob()
  if (isComponentMounted.value && loaded) {
    await loadRegister(loaded)
    if (!isComponentMounted.value) {
      return
    }
    await openRegisterMonitor({ subscribe: canSubscribeToMonitor(loaded) })
  } else if (isComponentMounted.value) {
    registerLoading.value = false
    monitorStatusOnly.value = true
  }
})

onUnmounted(() => {
  isComponentMounted.value = false
  scopeVersion.value += 1
  clearPendingSnapshot()
  scanJobsStore.stopMonitor().catch(() => {})
})

defineExpose({
  close,
  openRegisterMonitor,
  openBoxMonitor,
  applySnapshot
})
</script>

<template>
  <div class="settings table-3">
    <div class="header-with-actions">
      <h1 class="primary-heading">{{ monitorHeading }}</h1>
      <div class="header-actions-bar">
        <div v-if="isLoading" class="header-actions header-actions-group">
            <span class="spinner-border spinner-border-m"></span>
        </div>
        <div v-if="!isBoxMode" class="header-actions header-actions-group">
          <ActionButton           
            :item="{}"
            icon="fa-solid fa-rectangle-list"
            icon-size="2x"
            tooltip-text="Посылки не в реестре"
            aria-label="Посылки не в реестре"
            title="Посылки не в реестре"
            data-testid="scanjob-monitor-unregistered-action"
            class="monitor-summary-action"
            :disabled="!registerId"
            @click="openUnregisteredParcels"
          />
        </div>

        <div class="header-actions header-actions-group">
          <ActionButton
            :item="{}"
            icon="fa-solid fa-xmark"
            icon-size="2x"
            tooltip-text="Закрыть"
            aria-label="Закрыть"
            title="Закрыть"
            data-testid="scanjob-monitor-close-action"
            :disabled="isLoading"
            @click="handleCloseAction"
          />
        </div>
      </div>
    </div>

    <hr class="hr" />

    <div class="scanjob-monitor-panel">
      <div v-if="isLoading && !visibleSnapshot" class="monitor-empty" data-testid="scanjob-monitor-loading">
        <span class="spinner-border spinner-border-m"></span>
        <span>Загрузка монитора сканирования...</span>
      </div>

      <div v-else-if="closedInfo" class="monitor-empty monitor-closed" data-testid="scanjob-monitor-closed">
        Мониторинг остановлен. Задание больше не выполняется.
      </div>

      <div v-else-if="monitorStatusOnly" class="monitor-empty monitor-closed" data-testid="scanjob-monitor-status-only">
        Задание сканирования: {{ scanjobStatusText }}. Онлайн-обновления отключены.
      </div>

      <div v-else-if="monitorError && !visibleSnapshot" class="monitor-empty" data-testid="scanjob-monitor-unavailable">
        {{ getMonitorErrorMessage(monitorError) }}
      </div>

      <template v-else>
        <div class="monitor-summary" data-testid="scanjob-monitor-summary">
          <div v-for="card in aggregateCards" :key="card.key" class="monitor-summary-item">
            <div class="monitor-summary-content">
              <div class="monitor-summary-label">{{ card.label }}</div>
              <div class="monitor-summary-value">{{ card.value }}</div>
            </div>
          </div>
        </div>

        <div v-if="isRegisterMode" class="monitor-section" data-testid="scanjob-monitor-register">
          <v-card class="table-card">
            <div v-if="boxes.length === 0" class="monitor-empty" data-testid="scanjob-monitor-empty-boxes">
              Коробки не найдены
            </div>

            <v-data-table
              v-model:items-per-page="scanjobmonitor_boxes_per_page"
              v-model:page="scanjobmonitor_boxes_page"
              v-model:sort-by="scanjobmonitor_boxes_sort_by"
              v-else
              :headers="boxHeaders"
              :items="boxes"
              :items-per-page-options="itemsPerPageOptions"
              items-per-page-text="Коробок на странице"
              page-text="{0}-{1} из {2}"
              :loading="isLoading"
              density="compact"
              class="elevation-1 interlaced-table"
              data-testid="scanjob-monitor-boxes-table"
            >
              <template #[`item.boxCode`]="{ item }">
                <ClickableCell
                  :item="item"
                  :display-value="item.boxCode"
                  cell-class="clickable-cell"
                  data-testid="scanjob-monitor-box-row"
                  :disabled="isLoading"
                  @click="openBoxMonitor(item)"
                />
              </template>

              <template #[`item.boxStickerScanned`]="{ item }">
                <ClickableCell
                  :item="item"
                  :display-value="stickerText(item.boxStickerScanned)"
                  :cell-class="`${stickerClass(item.boxStickerScanned)} clickable-cell`"
                  :disabled="isLoading"
                  @click="openBoxMonitor(item)"
                />
              </template>

              <template #[`item.boxScannedSticker`]="{ item }">
                <ClickableCell
                  :item="item"
                  :display-value="valueOrDash(item.boxScannedSticker)"
                  cell-class="clickable-cell"
                  :disabled="isLoading"
                  @click="openBoxMonitor(item)"
                />
              </template>

              <template #[`item.boxScannedUserName`]="{ item }">
                <ClickableCell
                  :item="item"
                  :display-value="valueOrDash(item.boxScannedUserName)"
                  cell-class="clickable-cell"
                  :disabled="isLoading"
                  @click="openBoxMonitor(item)"
                />
              </template>

              <template #[`item.boxScannedTime`]="{ item }">
                <ClickableCell
                  :item="item"
                  :display-value="valueOrDash(formatScanTime(item.boxScannedTime))"
                  cell-class="clickable-cell"
                  :disabled="isLoading"
                  @click="openBoxMonitor(item)"
                />
              </template>

              <template #[`item.parcelsProgress`]="{ item }">
                <ClickableCell
                  :item="item"
                  :display-value="`${formatCount(item.totalParcels)} / ${formatCount(item.parcelsWithStickerScanned)} / ${formatCount(item.parcelsWithStickerNotScanned)}`"
                  cell-class="clickable-cell"
                  :disabled="isLoading"
                  @click="openBoxMonitor(item)"
                />
              </template>

            </v-data-table>
          </v-card>
        </div>

        <div v-if="isBoxMode" class="monitor-section" data-testid="scanjob-monitor-box">
          <div v-if="selectedBox" class="monitor-box-summary">
            <span :class="stickerClass(selectedBox.boxStickerScanned)">
              {{ stickerText(selectedBox.boxStickerScanned) }}
            </span>
            <span>
              Посылки: {{ formatCount(selectedBox.parcelsWithStickerScanned) }} /
              {{ formatCount(selectedBox.totalParcels) }}
            </span>
            <span>Не сканировано: {{ formatCount(selectedBox.parcelsWithStickerNotScanned) }}</span>
          </div>

          <v-card class="table-card">
            <div v-if="selectedParcels.length === 0" class="monitor-empty" data-testid="scanjob-monitor-empty-parcels">
              В коробке нет посылок
            </div>

            <v-data-table
              v-model:items-per-page="scanjobmonitor_parcels_per_page"
              v-model:page="scanjobmonitor_parcels_page"
              v-model:sort-by="scanjobmonitor_parcels_sort_by"
              v-else
              :headers="parcelHeaders"
              :items="selectedParcels"
              :items-per-page-options="itemsPerPageOptions"
              items-per-page-text="Посылок на странице"
              page-text="{0}-{1} из {2}"
              :loading="isLoading"
              density="compact"
              class="elevation-1 interlaced-table"
              data-testid="scanjob-monitor-parcels-table"
            >
              <template #[`item.stickerScanned`]="{ item }">
                <ClickableCell
                  :item="item"
                  :display-value="stickerText(item.stickerScanned)"
                  :cell-class="`${stickerClass(item.stickerScanned)} clickable-cell`"
                  :disabled="isLoading"
                  @click="editParcel(item)"
                />
              </template>

              <template #[`item.scannedSticker`]="{ item }">
                <ClickableCell
                  :item="item"
                  :display-value="valueOrDash(item.scannedSticker)"
                  cell-class="clickable-cell"
                  :disabled="isLoading"
                  @click="editParcel(item)"
                />
              </template>

              <template #[`item.scannedUserName`]="{ item }">
                <ClickableCell
                  :item="item"
                  :display-value="valueOrDash(item.scannedUserName)"
                  cell-class="clickable-cell"
                  :disabled="isLoading"
                  @click="editParcel(item)"
                />
              </template>

              <template #[`item.scannedTime`]="{ item }">
                <ClickableCell
                  :item="item"
                  :display-value="valueOrDash(formatScanTime(item.scannedTime))"
                  cell-class="clickable-cell"
                  :disabled="isLoading"
                  @click="editParcel(item)"
                />
              </template>

              <template #[`item.parcelNumber`]="{ item }">
                <ClickableCell
                  :item="item"
                  :display-value="valueOrDash(item.parcelNumber)"
                  cell-class="clickable-cell"
                  :disabled="isLoading"
                  @click="editParcel(item)"
                />
              </template>

              <template #[`item.zoneName`]="{ item }">
                <ClickableCell
                  :item="item"
                  :display-value="valueOrDash(item.zoneName)"
                  cell-class="clickable-cell"
                  :disabled="isLoading"
                  @click="editParcel(item)"
                />
              </template>

              <template #[`item.statusTitle`]="{ item }">
                <ClickableCell
                  :item="item"
                  :display-value="valueOrDash(item.statusTitle)"
                  cell-class="clickable-cell"
                  :disabled="isLoading"
                  @click="editParcel(item)"
                />
              </template>
            </v-data-table>
          </v-card>
        </div>
      </template>
    </div>

    <div v-if="alert" class="alert alert-dismissable text-center m-5" :class="alert.type">
      <button @click="alertStore.clear()" class="btn btn-link close">×</button>
      {{ alert.message }}
    </div>
  </div>
</template>

<style scoped>
.scanjob-monitor-panel {
  min-height: 320px;
}

.monitor-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.monitor-summary-item {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid #d8dde6;
  border-radius: 6px;
  padding: 12px 14px;
  background: #fff;
}

.monitor-summary-content {
  min-width: 0;
}

.monitor-summary-action {
  margin-left: auto;
  flex: 0 0 auto;
}

.monitor-summary-label {
  font-size: 0.95rem;
  font-weight: 500;
}

.monitor-summary-value {
  margin-top: 4px;
  font-size: 1.35rem;
  font-weight: 700;
}

.monitor-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.monitor-status {
  display: inline-flex;
  align-items: center;
  min-width: 112px;
  justify-content: center;
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 0.8rem;
  font-weight: 700;
  white-space: nowrap;
}

.monitor-status-scanned {
  background-color: rgba(76, 175, 80, 0.25);
  color: #2e7d32;
  border: 1px solid rgba(76, 175, 80, 0.5);
}

.monitor-status-waiting {
  background-color: rgba(33, 150, 243, 0.25);
  color: #1976d2;
  border: 1px solid rgba(33, 150, 243, 0.3);
}

.monitor-status-not-found {
  background-color: rgba(244, 67, 54, 0.25);
  color: #d32f2f;
  border: 1px solid rgba(201, 17, 4, 0.3);
}

.monitor-empty {
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #5f6b7a;
  text-align: center;
}

.monitor-closed {
  border: 1px solid #d8dde6;
  border-radius: 6px;
  background: #f8fafc;
}

.monitor-box-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  color: #374151;
}
</style>
