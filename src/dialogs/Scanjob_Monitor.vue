<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import router from '@/router'
import { storeToRefs } from 'pinia'
import { useAlertStore } from '@/stores/alert.store.js'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useScanjobsStore } from '@/stores/scanjobs.store.js'
import { useScanjobHeading } from '@/composables/useScanjobHeading.js'
import ActionButton from '@/components/ActionButton.vue'
import ScanjobBoxesMonitor from '@/dialogs/Scanjob_Boxes_Monitor.vue'
import ScanjobParcelsMonitor from '@/dialogs/Scanjob_Parcels_Monitor.vue'
import { buildParcelListHeading } from '@/helpers/register.heading.helpers.js'
import { navigateToEditParcel } from '@/helpers/parcels.list.helpers.js'
import {
  getClearParcelDefectErrorMessage,
  getSetParcelDefectErrorMessage
} from '@/helpers/parcel.defect.helpers.js'
import {
  isUnassignedMonitorBox,
  scanjobMonitorArea
} from '@/helpers/scanjob.monitor.helpers.js'
import '@/assets/styles/scanjob-monitor.css'

const props = defineProps({
  scanjobId: { type: Number, required: true },
  monitorScope: {
    type: Object,
    default: () => ({
      area: scanjobMonitorArea.Boxes,
      boxId: null,
      bucketIndex: null
    })
  }
})

const MODE_REGISTER = 'register'
const MODE_BOX = 'box'
const MONITOR_THROTTLE_MS = 150
const SCAN_JOB_STATUS_IN_PROGRESS = 15

const scanJobsStore = useScanjobsStore()
const parcelsStore = useParcelsStore()
const registersStore = useRegistersStore()
const alertStore = useAlertStore()
const { alert } = storeToRefs(alertStore)
const { scanjob, monitorLoading, monitorError, monitorClosed } = storeToRefs(scanJobsStore)
const isComponentMounted = ref(true)
const scanjobIdRef = computed(() => props.scanjobId)
const { loadScanjob } = useScanjobHeading(scanjobIdRef, { isComponentMounted })

const mode = ref(MODE_REGISTER)
const selectedArea = ref(scanJobsStore.scanjobMonitorArea.Boxes)
const selectedBoxId = ref(null)
const selectedBucketIndex = ref(null)
const visibleSnapshot = ref(null)
const closedStatus = ref(null)
const switchingScope = ref(false)
const monitorStatusOnly = ref(false)
const scopeVersion = ref(0)
const registerLoading = ref(true)
const autoFollowEnabled = ref(true)
const defectActionRunning = ref(false)
const scanjobLoaded = ref(false)
const loadedScanjobId = ref(null)

let pendingSnapshot = null
let throttleTimer = null

const isRegisterMode = computed(() => mode.value === MODE_REGISTER)
const isBoxMode = computed(() => mode.value === MODE_BOX)
const isLoading = computed(() => monitorLoading.value || switchingScope.value)
const boxes = computed(() => visibleSnapshot.value?.boxes ?? [])
const selectedBox = computed(() => visibleSnapshot.value?.box ?? null)
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
    if (
      Number(selectedArea.value) === scanJobsStore.scanjobMonitorArea.Unassigned
      || isUnassignedMonitorBox(selectedBox.value)
    ) {
      return selectedBox.value?.boxCode || 'Без коробки'
    }

    return `Коробка ${selectedBox.value?.boxCode || ''}`.trim()
  }

  return 'Коробки'
})
const monitorHeading = computed(() => `Сканирование | ${basicHeading.value} | ${scopeHeading.value}`)
const autoFollowActionIcon = computed(() => (
  autoFollowEnabled.value ? 'fa-solid fa-link-slash' : 'fa-solid fa-link'
))
const autoFollowActionTooltip = computed(() => (
  autoFollowEnabled.value ? 'Отключить автослежение' : 'Включить автослежение'
))

function close() {
  router.back()
}

async function handleCloseAction() {
  if (isLoading.value) {
    return
  }

  if (isBoxMode.value) {
    await navigateToRegisterMonitor({ replace: true })
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

function toggleAutoFollow() {
  autoFollowEnabled.value = !autoFollowEnabled.value
}

function monitorScopeKey(scope = props.monitorScope) {
  const normalized = normalizeMonitorScope(scope)
  return [
    normalized.area,
    normalized.boxId ?? '',
    normalized.bucketIndex ?? ''
  ].join(':')
}

function monitorRouteKey() {
  return `${props.scanjobId}:${monitorScopeKey(props.monitorScope)}`
}

function monitorRouteForScope(scope) {
  const normalized = normalizeMonitorScope(scope)
  const params = { id: props.scanjobId }

  if (normalized.area === scanjobMonitorArea.Box) {
    return {
      name: 'scanjob-monitor-box',
      params: { ...params, boxId: normalized.boxId }
    }
  }

  if (normalized.area === scanjobMonitorArea.Unassigned) {
    return {
      name: 'scanjob-monitor-unassigned',
      params: { ...params, bucketIndex: normalized.bucketIndex ?? 0 }
    }
  }

  return {
    name: 'scanjob-monitor-register',
    params
  }
}

function updateMonitorRoute(scope, { replace = false } = {}) {
  const route = monitorRouteForScope(scope)
  return replace ? router.replace(route) : router.push(route)
}

function navigateToRegisterMonitor({ replace = false } = {}) {
  return updateMonitorRoute({ area: scanjobMonitorArea.Boxes }, { replace })
}

function navigateToBoxMonitor(box, { replace = false } = {}) {
  if (!box || isLoading.value) {
    return Promise.resolve(false)
  }

  const isUnassigned = isUnassignedMonitorBox(box)
  const boxId = toNumberOrNull(box.boxId)
  const bucketIndex = toNumberOrNull(box.bucketIndex) ?? 0

  if (!isUnassigned && boxId == null) {
    return Promise.resolve(false)
  }

  return updateMonitorRoute({
    area: isUnassigned ? scanjobMonitorArea.Unassigned : scanjobMonitorArea.Box,
    boxId: isUnassigned ? null : boxId,
    bucketIndex: isUnassigned ? bucketIndex : null
  }, { replace })
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

function getCurrentScope() {
  return buildScope(selectedArea.value, selectedBoxId.value, selectedBucketIndex.value)
}

async function refreshCurrentScopeSnapshot() {
  const snapshot = await scanJobsStore.loadMonitorSnapshot(props.scanjobId, getCurrentScope())
  applySnapshot(snapshot, { immediate: true, source: 'manual' })
}

async function runParcelDefectAction(item, action, getErrorMessage) {
  const parcelId = item?.id ?? item?.parcelId
  if (defectActionRunning.value || isLoading.value || !parcelId) {
    return
  }

  defectActionRunning.value = true
  try {
    await action(parcelId)
  } catch (error) {
    if (isComponentMounted.value) {
      alertStore.error(getErrorMessage(error))
    }
    return
  }

  try {
    await refreshCurrentScopeSnapshot()
  } catch {
    if (isComponentMounted.value) {
      alertStore.error('Ошибка при обновлении данных')
    }
  } finally {
    if (isComponentMounted.value) {
      defectActionRunning.value = false
    }
  }
}

async function setParcelDefect(item) {
  await runParcelDefectAction(item, parcelsStore.setDefect, getSetParcelDefectErrorMessage)
}

async function clearParcelDefect(item) {
  await runParcelDefectAction(item, parcelsStore.clearDefect, getClearParcelDefectErrorMessage)
}

function buildScope(area, boxId = null, bucketIndex = null) {
  const scope = {
    area,
    boxId
  }
  if (bucketIndex != null) {
    scope.bucketIndex = bucketIndex
  }
  return scope
}

function currentArea() {
  return selectedArea.value
}

function snapshotMatchesScope(snapshot) {
  if (!snapshot || Number(snapshot.scanJobId) !== Number(props.scanjobId)) {
    return false
  }

  if (Number(snapshot.area) !== Number(currentArea())) {
    return false
  }

  if (Number(currentArea()) === scanJobsStore.scanjobMonitorArea.Box) {
    return Number(snapshot.box?.boxId) === Number(selectedBoxId.value)
  }

  if (Number(currentArea()) === scanJobsStore.scanjobMonitorArea.Unassigned) {
    return Number(snapshot.box?.bucketIndex ?? 0) === Number(selectedBucketIndex.value ?? 0)
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

function toNumberOrZero(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function toNumberOrNull(value) {
  if (value == null || value === '') {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

async function loadScanjobAndRegister() {
  const loaded = await loadScanjob()
  if (!isComponentMounted.value || !loaded) {
    return null
  }

  await loadRegister(loaded)
  if (!isComponentMounted.value) {
    return null
  }

  loadedScanjobId.value = props.scanjobId
  scanjobLoaded.value = true
  return loaded
}

function normalizeMonitorScope(scope = {}) {
  const area = toNumberOrNull(scope?.area)

  if (area === scanjobMonitorArea.Box) {
    const boxId = toNumberOrNull(scope?.boxId)
    if (boxId != null) {
      return {
        area: scanjobMonitorArea.Box,
        boxId,
        bucketIndex: null
      }
    }
  }

  if (area === scanjobMonitorArea.Unassigned) {
    return {
      area: scanjobMonitorArea.Unassigned,
      boxId: null,
      bucketIndex: toNumberOrNull(scope?.bucketIndex) ?? 0
    }
  }

  return {
    area: scanjobMonitorArea.Boxes,
    boxId: null,
    bucketIndex: null
  }
}

function getSnapshotBoxes(snapshot) {
  return Array.isArray(snapshot?.boxes) ? snapshot.boxes : []
}

function getSnapshotMonitorBoxes(snapshot) {
  const boxes = getSnapshotBoxes(snapshot)
  return snapshot?.box ? [...boxes, snapshot.box] : boxes
}

function getMonitorBoxKey(box) {
  if (isUnassignedMonitorBox(box)) {
    return `unassigned:${Number(box?.bucketIndex ?? 0)}`
  }

  const boxId = toNumberOrNull(box?.boxId)
  return boxId == null ? null : `box:${boxId}`
}

function getBoxMap(snapshot) {
  const map = new Map()
  getSnapshotBoxes(snapshot).forEach((box) => {
    const key = getMonitorBoxKey(box)
    if (key != null) {
      map.set(key, box)
    }
  })
  return map
}

function getLatestScanId(snapshot) {
  return toNumberOrNull(snapshot?.latestScan?.scanCodeId)
}

function findLatestScanBox(snapshot, predicate) {
  return getSnapshotMonitorBoxes(snapshot).find(predicate) ?? null
}

function resolveLatestScanTarget(latestScan, snapshot) {
  const latestScanArea = toNumberOrNull(latestScan?.area)
  if (latestScanArea === scanJobsStore.scanjobMonitorArea.Box) {
    const boxId = toNumberOrNull(latestScan?.boxId)
    if (boxId == null) {
      return { mode: MODE_REGISTER, boxId: null, hasDecision: true }
    }

    const box = findLatestScanBox(snapshot, (candidate) => {
      return toNumberOrNull(candidate?.boxId) === boxId
    }) ?? {
      area: scanJobsStore.scanjobMonitorArea.Box,
      boxId
    }

    return { mode: MODE_BOX, box, hasDecision: true }
  }

  if (latestScanArea === scanJobsStore.scanjobMonitorArea.Unassigned) {
    const bucketIndex = toNumberOrNull(latestScan?.bucketIndex) ?? 0
    const box = findLatestScanBox(snapshot, (candidate) => {
      return isUnassignedMonitorBox(candidate)
        && Number(toNumberOrNull(candidate?.bucketIndex) ?? 0) === Number(bucketIndex)
    }) ?? {
      area: scanJobsStore.scanjobMonitorArea.Unassigned,
      boxId: null,
      bucketIndex,
      boxCode: `Без коробки ${bucketIndex + 1}`
    }

    return { mode: MODE_BOX, box, hasDecision: true }
  }

  if (
    latestScanArea === scanJobsStore.scanjobMonitorArea.NotInRegister
    || latestScanArea === scanJobsStore.scanjobMonitorArea.Boxes
  ) {
    return { mode: MODE_REGISTER, boxId: null, hasDecision: true }
  }

  return null
}

function resolveAutoFollowTarget(previousSnapshot, nextSnapshot) {
  if (!autoFollowEnabled.value || !previousSnapshot || !nextSnapshot) {
    return { mode: MODE_REGISTER, boxId: null, hasDecision: false }
  }

  const previousLatestScanId = getLatestScanId(previousSnapshot)
  const nextLatestScanId = getLatestScanId(nextSnapshot)
  if (nextLatestScanId != null && nextLatestScanId !== previousLatestScanId) {
    const latestScanTarget = resolveLatestScanTarget(nextSnapshot.latestScan, nextSnapshot)
    if (latestScanTarget?.hasDecision) {
      return latestScanTarget
    }
  }

  const prevUnregistered = toNumberOrZero(previousSnapshot.scannedItemsNotInRegister)
  const nextUnregistered = toNumberOrZero(nextSnapshot.scannedItemsNotInRegister)
  if (nextUnregistered > prevUnregistered) {
    return { mode: MODE_REGISTER, boxId: null, hasDecision: true }
  }

  const previousBoxesById = getBoxMap(previousSnapshot)
  const nextBoxes = getSnapshotBoxes(nextSnapshot)

  for (const box of nextBoxes) {
    const boxId = toNumberOrNull(box?.boxId)
    if (boxId == null || !box?.boxStickerScanned) {
      continue
    }

    const previousBox = previousBoxesById.get(`box:${boxId}`)
    if (!previousBox?.boxStickerScanned) {
      return { mode: MODE_BOX, box, hasDecision: true }
    }
  }

  for (const box of nextBoxes) {
    const boxKey = getMonitorBoxKey(box)
    if (boxKey == null) {
      continue
    }

    const previousBox = previousBoxesById.get(boxKey)
    const previousScannedParcels = toNumberOrZero(previousBox?.parcelsWithStickerScanned)
    const nextScannedParcels = toNumberOrZero(box?.parcelsWithStickerScanned)
    if (nextScannedParcels > previousScannedParcels) {
      return { mode: MODE_BOX, box, hasDecision: true }
    }
  }

  const hasBoxesSnapshotContext = nextBoxes.length > 0 || previousBoxesById.size > 0
  const prevTotalScannedParcels = toNumberOrZero(previousSnapshot.parcelsWithStickerScanned)
  const nextTotalScannedParcels = toNumberOrZero(nextSnapshot.parcelsWithStickerScanned)
  if (hasBoxesSnapshotContext && nextTotalScannedParcels > prevTotalScannedParcels) {
    return { mode: MODE_REGISTER, boxId: null, hasDecision: true }
  }

  return { mode: MODE_REGISTER, boxId: null, hasDecision: false }
}

function runAutoFollow(previousSnapshot, nextSnapshot, source) {
  if (source !== 'live' || switchingScope.value || isLoading.value) {
    return
  }

  const target = resolveAutoFollowTarget(previousSnapshot, nextSnapshot)
  if (!target.hasDecision) {
    return
  }

  if (target.mode === MODE_BOX && target.box) {
    const targetArea = isUnassignedMonitorBox(target.box)
      ? scanJobsStore.scanjobMonitorArea.Unassigned
      : Number(target.box.area ?? scanJobsStore.scanjobMonitorArea.Box)
    const targetBoxId = toNumberOrNull(target.box.boxId)
    const targetBucketIndex = toNumberOrNull(target.box.bucketIndex) ?? 0
    const sameRealBox = targetArea === scanJobsStore.scanjobMonitorArea.Box
      && Number(selectedBoxId.value) === Number(targetBoxId)
    const sameUnassignedBucket = targetArea === scanJobsStore.scanjobMonitorArea.Unassigned
      && Number(selectedBucketIndex.value ?? 0) === Number(targetBucketIndex)

    if (isBoxMode.value && Number(selectedArea.value) === targetArea && (sameRealBox || sameUnassignedBucket)) {
      return
    }

    void navigateToBoxMonitor(target.box, { replace: true })
    return
  }

  if (isRegisterMode.value) {
    return
  }

  void navigateToRegisterMonitor({ replace: true })
}

function applySnapshot(snapshot, { version = scopeVersion.value, immediate = false, source = 'manual' } = {}) {
  if (!isComponentMounted.value || version !== scopeVersion.value || !snapshotMatchesScope(snapshot)) {
    return
  }

  if (immediate) {
    const previousSnapshot = visibleSnapshot.value
    clearPendingSnapshot()
    visibleSnapshot.value = snapshot
    runAutoFollow(previousSnapshot, snapshot, source)
    return
  }

  pendingSnapshot = { snapshot, source }
  if (throttleTimer) {
    return
  }

  throttleTimer = setTimeout(() => {
    const nextSnapshot = pendingSnapshot
    pendingSnapshot = null
    throttleTimer = null
    if (nextSnapshot?.snapshot) {
      applySnapshot(nextSnapshot.snapshot, { version, immediate: true, source: nextSnapshot.source })
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
    applySnapshot(snapshot, { version, immediate: true, source: 'initial' })

    if (subscribe) {
      await scanJobsStore.startMonitor(props.scanjobId, {
        ...scope,
        onSnapshot: (nextSnapshot) => applySnapshot(nextSnapshot, { version, source: 'live' }),
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
  selectedArea.value = scanJobsStore.scanjobMonitorArea.Boxes
  selectedBoxId.value = null
  selectedBucketIndex.value = null
  await observeScope(buildScope(scanJobsStore.scanjobMonitorArea.Boxes), { subscribe })
}

async function openBoxMonitor(box) {
  if (!box || isLoading.value) {
    return
  }

  const isUnassigned = isUnassignedMonitorBox(box)
  const boxId = toNumberOrNull(box.boxId)
  const bucketIndex = toNumberOrNull(box.bucketIndex) ?? 0

  if (!isUnassigned && boxId == null) {
    return
  }

  mode.value = MODE_BOX
  selectedArea.value = isUnassigned
    ? scanJobsStore.scanjobMonitorArea.Unassigned
    : scanJobsStore.scanjobMonitorArea.Box
  selectedBoxId.value = isUnassigned ? null : boxId
  selectedBucketIndex.value = isUnassigned ? bucketIndex : null
  await observeScope(buildScope(selectedArea.value, selectedBoxId.value, selectedBucketIndex.value), {
    subscribe: canSubscribeToMonitor(scanjob.value)
  })
}

async function openMonitorScope(scope, { subscribe = canSubscribeToMonitor(scanjob.value) } = {}) {
  const normalized = normalizeMonitorScope(scope)

  if (normalized.area === scanjobMonitorArea.Box) {
    mode.value = MODE_BOX
    selectedArea.value = scanjobMonitorArea.Box
    selectedBoxId.value = normalized.boxId
    selectedBucketIndex.value = null
    await observeScope(buildScope(selectedArea.value, selectedBoxId.value), { subscribe })
    return
  }

  if (normalized.area === scanjobMonitorArea.Unassigned) {
    mode.value = MODE_BOX
    selectedArea.value = scanjobMonitorArea.Unassigned
    selectedBoxId.value = null
    selectedBucketIndex.value = normalized.bucketIndex
    await observeScope(buildScope(selectedArea.value, null, selectedBucketIndex.value), { subscribe })
    return
  }

  await openRegisterMonitor({ subscribe })
}

onMounted(async () => {
  const loaded = await loadScanjobAndRegister()
  if (loaded) {
    await openMonitorScope(props.monitorScope, { subscribe: canSubscribeToMonitor(loaded) })
  } else if (isComponentMounted.value) {
    registerLoading.value = false
    monitorStatusOnly.value = true
  }
})

watch(
  () => monitorRouteKey(),
  async () => {
    if (!scanjobLoaded.value || !isComponentMounted.value) {
      return
    }

    if (Number(loadedScanjobId.value) !== Number(props.scanjobId)) {
      scanjobLoaded.value = false
      const loaded = await loadScanjobAndRegister()
      if (loaded) {
        await openMonitorScope(props.monitorScope, { subscribe: canSubscribeToMonitor(loaded) })
      } else if (isComponentMounted.value) {
        registerLoading.value = false
        monitorStatusOnly.value = true
      }
      return
    }

    await openMonitorScope(props.monitorScope)
  }
)

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
  openMonitorScope,
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
        <div class="header-actions header-actions-group">
          <ActionButton
            :item="{}"
            :icon="autoFollowActionIcon"
            icon-size="2x"
            :tooltip-text="autoFollowActionTooltip"
            :aria-label="autoFollowActionTooltip"
            :title="autoFollowActionTooltip"
            data-testid="scanjob-monitor-auto-follow-action"
            @click="toggleAutoFollow"
          />
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
        <ScanjobBoxesMonitor
          v-if="isRegisterMode"
          :snapshot="visibleSnapshot"
          :boxes="boxes"
          :loading="isLoading"
          @open-box="navigateToBoxMonitor"
        />

        <ScanjobParcelsMonitor
          v-if="isBoxMode"
          :box="selectedBox"
          :register-type="visibleSnapshot?.registerType ?? 0"
          :loading="isLoading"
          :defect-action-loading="defectActionRunning"
          @edit-parcel="editParcel"
          @set-defect="setParcelDefect"
          @clear-defect="clearParcelDefect"
        />
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

.monitor-summary-action {
  margin-left: auto;
  flex: 0 0 auto;
}
</style>
