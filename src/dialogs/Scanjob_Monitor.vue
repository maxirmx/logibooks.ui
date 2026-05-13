<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, onMounted, onUnmounted, ref } from 'vue'
import router from '@/router'
import { storeToRefs } from 'pinia'
import { useAlertStore } from '@/stores/alert.store.js'
import { useScanjobsStore } from '@/stores/scanjobs.store.js'
import { useScanjobHeading } from '@/composables/useScanjobHeading.js'
import ActionButton from '@/components/ActionButton.vue'

const props = defineProps({
  scanjobId: { type: Number, required: true }
})

const MODE_REGISTER = 'register'
const MODE_BOX = 'box'
const MONITOR_THROTTLE_MS = 150

const scanJobsStore = useScanjobsStore()
const alertStore = useAlertStore()
const { alert } = storeToRefs(alertStore)
const { monitorLoading, monitorError, monitorClosed } = storeToRefs(scanJobsStore)
const isComponentMounted = ref(true)
const { scanjobHeading, loadScanjob } = useScanjobHeading(props.scanjobId, { isComponentMounted })

const mode = ref(MODE_REGISTER)
const selectedBoxId = ref(null)
const visibleSnapshot = ref(null)
const closedStatus = ref(null)
const switchingScope = ref(false)
const scopeVersion = ref(0)

let pendingSnapshot = null
let throttleTimer = null

const isRegisterMode = computed(() => mode.value === MODE_REGISTER)
const isBoxMode = computed(() => mode.value === MODE_BOX)
const isLoading = computed(() => monitorLoading.value || switchingScope.value)
const boxes = computed(() => visibleSnapshot.value?.boxes ?? [])
const selectedBox = computed(() => visibleSnapshot.value?.box ?? null)
const selectedParcels = computed(() => selectedBox.value?.parcels ?? [])
const closedInfo = computed(() => closedStatus.value || monitorClosed.value)

const aggregateCards = computed(() => {
  const snapshot = visibleSnapshot.value
  if (!snapshot) return []

  return [
    {
      label: 'Коробки',
      value: `${snapshot.boxesWithStickerScanned ?? 0} / ${snapshot.totalBoxes ?? 0}`,
      hint: `Не сканировано: ${snapshot.boxesWithStickerNotScanned ?? 0}`
    },
    {
      label: 'Посылки',
      value: `${snapshot.parcelsWithStickerScanned ?? 0} / ${snapshot.totalParcels ?? 0}`,
      hint: `Не сканировано: ${snapshot.parcelsWithStickerNotScanned ?? 0}`
    },
    {
      label: 'Не в реестре',
      value: String(snapshot.scannedItemsNotInRegister ?? 0),
      hint: 'Сканированные вне реестра'
    }
  ]
})

function close() {
  router.back()
}

function formatCount(value) {
  return Number(value ?? 0).toLocaleString('ru-RU')
}

function stickerText(scanned) {
  return scanned ? 'Сканирована' : 'Не сканирована'
}

function stickerClass(scanned) {
  return scanned ? 'monitor-status monitor-status-ok' : 'monitor-status monitor-status-wait'
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

async function observeScope(scope) {
  const version = scopeVersion.value + 1
  scopeVersion.value = version
  switchingScope.value = true
  closedStatus.value = null
  visibleSnapshot.value = null
  clearPendingSnapshot()

  try {
    await scanJobsStore.clearMonitor().catch(() => {})

    const snapshot = await scanJobsStore.loadMonitorSnapshot(props.scanjobId, scope)
    applySnapshot(snapshot, { version, immediate: true })

    await scanJobsStore.startMonitor(props.scanjobId, {
      ...scope,
      onSnapshot: (nextSnapshot) => applySnapshot(nextSnapshot, { version }),
      onClosed: (scanJobId, status) => handleMonitorClosed(scanJobId, status, version)
    })
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

async function openRegisterMonitor() {
  mode.value = MODE_REGISTER
  selectedBoxId.value = null
  await observeScope(buildScope(scanJobsStore.scanJobMonitorArea.Boxes))
}

async function openBoxMonitor(box) {
  if (!box?.boxId || isLoading.value) {
    return
  }

  mode.value = MODE_BOX
  selectedBoxId.value = box.boxId
  await observeScope(buildScope(scanJobsStore.scanJobMonitorArea.Box, box.boxId))
}

onMounted(async () => {
  await loadScanjob()
  if (isComponentMounted.value) {
    await openRegisterMonitor()
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
      <h1 class="primary-heading">{{ scanjobHeading }}</h1>
      <div class="header-actions-bar">
        <div class="header-actions header-actions-group">
          <ActionButton
            :item="{}"
            icon="fa-solid fa-xmark"
            icon-size="2x"
            tooltip-text="Закрыть"
            data-testid="scanjob-monitor-close-action"
            @click="close"
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

      <div v-else-if="monitorError && !visibleSnapshot" class="monitor-empty" data-testid="scanjob-monitor-unavailable">
        {{ getMonitorErrorMessage(monitorError) }}
      </div>

      <template v-else>
        <div class="monitor-summary" data-testid="scanjob-monitor-summary">
          <div v-for="card in aggregateCards" :key="card.label" class="monitor-summary-item">
            <div class="monitor-summary-label">{{ card.label }}</div>
            <div class="monitor-summary-value">{{ card.value }}</div>
            <div class="monitor-summary-hint">{{ card.hint }}</div>
          </div>
        </div>

        <div v-if="isRegisterMode" class="monitor-section" data-testid="scanjob-monitor-register">
          <div class="monitor-section-heading">
            <h2>Коробки</h2>
          </div>

          <v-card class="table-card">
            <div v-if="boxes.length === 0" class="monitor-empty" data-testid="scanjob-monitor-empty-boxes">
              Коробки не найдены
            </div>

            <div v-else class="monitor-table-wrap">
              <table class="monitor-table" data-testid="scanjob-monitor-boxes-table">
                <thead>
                  <tr>
                    <th>Коробка</th>
                    <th>Стикер коробки</th>
                    <th>Посылки</th>
                    <th>Не сканировано</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="box in boxes" :key="box.boxId">
                    <td>
                      <button
                        type="button"
                        class="monitor-link-button"
                        data-testid="scanjob-monitor-box-row"
                        @click="openBoxMonitor(box)"
                        :disabled="isLoading"
                      >
                        {{ box.boxCode }}
                      </button>
                    </td>
                    <td>
                      <span :class="stickerClass(box.boxStickerScanned)">
                        {{ stickerText(box.boxStickerScanned) }}
                      </span>
                    </td>
                    <td>
                      {{ formatCount(box.parcelsWithStickerScanned) }} / {{ formatCount(box.totalParcels) }}
                    </td>
                    <td>{{ formatCount(box.parcelsWithStickerNotScanned) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </v-card>
        </div>

        <div v-if="isBoxMode" class="monitor-section" data-testid="scanjob-monitor-box">
          <div class="monitor-section-heading">
            <button
              type="button"
              class="monitor-back-button"
              data-testid="scanjob-monitor-back-action"
              @click="openRegisterMonitor"
              :disabled="isLoading"
            >
              ← К коробкам
            </button>
            <h2>{{ selectedBox?.boxCode || 'Коробка' }}</h2>
          </div>

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

            <div v-else class="monitor-table-wrap">
              <table class="monitor-table" data-testid="scanjob-monitor-parcels-table">
                <thead>
                  <tr>
                    <th>Посылка</th>
                    <th>Стикер</th>
                    <th>Зона</th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="parcel in selectedParcels" :key="parcel.parcelId || parcel.parcelNumber">
                    <td>{{ parcel.parcelNumber }}</td>
                    <td>
                      <span :class="stickerClass(parcel.stickerScanned)">
                        {{ stickerText(parcel.stickerScanned) }}
                      </span>
                    </td>
                    <td>{{ parcel.zoneName }}</td>
                    <td>{{ parcel.statusTitle }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
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
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.monitor-summary-item {
  border: 1px solid #d8dde6;
  border-radius: 6px;
  padding: 12px 14px;
  background: #fff;
}

.monitor-summary-label {
  font-size: 0.82rem;
  color: #5f6b7a;
}

.monitor-summary-value {
  margin-top: 4px;
  font-size: 1.35rem;
  font-weight: 700;
}

.monitor-summary-hint {
  margin-top: 2px;
  font-size: 0.82rem;
  color: #6b7280;
}

.monitor-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.monitor-section-heading {
  display: flex;
  align-items: center;
  gap: 14px;
}

.monitor-section-heading h2 {
  margin: 0;
  font-size: 1.2rem;
}

.monitor-table-wrap {
  overflow-x: auto;
}

.monitor-table {
  width: 100%;
  border-collapse: collapse;
}

.monitor-table th,
.monitor-table td {
  padding: 10px 12px;
  border-bottom: 1px solid #e5e7eb;
  text-align: left;
  vertical-align: middle;
}

.monitor-table th {
  font-weight: 700;
  color: #374151;
  background: #f8fafc;
}

.monitor-link-button,
.monitor-back-button {
  border: 0;
  background: transparent;
  color: #1976d2;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.monitor-link-button:disabled,
.monitor-back-button:disabled {
  color: #94a3b8;
  cursor: not-allowed;
}

.monitor-back-button {
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 6px 10px;
  background: #fff;
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
}

.monitor-status-ok {
  color: #166534;
  background: #dcfce7;
}

.monitor-status-wait {
  color: #92400e;
  background: #fef3c7;
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
