<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { computed, nextTick, onMounted, onUnmounted, provide, ref, watch } from 'vue'
import { isNavigationFailure, NavigationFailureType } from 'vue-router'
import router from '@/router'
import { storeToRefs } from 'pinia'
import { useAlertStore } from '@/stores/alert.store.js'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useScanjobsStore } from '@/stores/scanjobs.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useScanjobHeading } from '@/composables/useScanjobHeading.js'
import LocalLabelPrinting from '@/components/LocalLabelPrinting.vue'
import { LABEL_PRINTING_KEY } from '@/helpers/label.printing.helpers.js'
import ActionButton from '@/components/ActionButton.vue'
import FieldError from '@/components/FieldError.vue'
import ScanjobBoxesMonitor from '@/dialogs/Scanjob_Boxes_Monitor.vue'
import ScanjobParcelsMonitor from '@/dialogs/Scanjob_Parcels_Monitor.vue'
import { buildParcelListHeading } from '@/helpers/register.heading.helpers.js'
import { navigateToEditParcel } from '@/helpers/parcels.list.helpers.js'
import { getCurrentInternalRoute } from '@/helpers/parcel.navigation.helpers.js'
import { OP_MODE_WAREHOUSE } from '@/helpers/op.mode.js'
import { reportError } from '@/helpers/error.helpers.js'
import {
  getClearParcelDefectErrorMessage,
  getSetParcelDefectErrorMessage
} from '@/helpers/parcel.defect.helpers.js'
import {
  isUnassignedMonitorBox,
  scanjobMonitorArea,
  scanjobMonitorTargetKind
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
const authStore = useAuthStore()
const parcelsStore = useParcelsStore()
const registersStore = useRegistersStore()
const alertStore = useAlertStore()
const { scanjob, monitorLoading, monitorError, monitorClosed } = storeToRefs(scanJobsStore)
const isComponentMounted = ref(true)
const scanjobIdRef = computed(() => props.scanjobId)
const { loadScanjob } = useScanjobHeading(scanjobIdRef, { isComponentMounted })

const printingPanel = ref(null)
provide(LABEL_PRINTING_KEY, {
  busy: computed(() => printingPanel.value?.busy ?? true),
  print: (target) => printingPanel.value?.printParcel(target)
})

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
const followUsers = ref([])
const followUsersLoading = ref(false)
const selectedFollowUserId = ref(authStore.scanjobmonitor_follow_user_id ?? null)
const followSubscriptionActive = ref(false)
const draftFollowUserId = ref(selectedFollowUserId.value)
const activeEditor = ref(null)
const followApplyLoading = ref(false)
const jumpInput = ref(null)
const followInput = ref(null)
const jumpValidation = ref({})
const defectActionRunning = ref(false)
const scanjobLoaded = ref(false)
const loadedScanjobId = ref(null)
const jumpNumber = ref('')
const jumpLoading = ref(false)
const selectedParcelId = ref(null)
const lastJumpNotificationId = ref(null)

const JUMP_EMPTY_MESSAGE = 'Введите номер посылки или коробки'
const JUMP_NOT_FOUND_MESSAGE = 'Посылка или коробка не найдена'
const JUMP_FALLBACK_ERROR_MESSAGE = 'Ошибка при поиске посылки или коробки'

let pendingSnapshot = null
let throttleTimer = null

const isRegisterMode = computed(() => mode.value === MODE_REGISTER)
const isBoxMode = computed(() => mode.value === MODE_BOX)
const isLoading = computed(() => monitorLoading.value || switchingScope.value)
const toolbarBusy = computed(() => isLoading.value || jumpLoading.value || followUsersLoading.value ||
  followApplyLoading.value || defectActionRunning.value || printingPanel.value?.operationInProgress)
const printQueue = computed(() => printingPanel.value?.queueStatus ?? { queued: 0, paused: false })
const boxes = computed(() => visibleSnapshot.value?.boxes ?? [])
const selectedBox = computed(() => visibleSnapshot.value?.box ?? null)
const closedInfo = computed(() => {
  if (closedStatus.value) {
    return closedStatus.value
  }

  return Number(monitorClosed.value?.scanJobId) === Number(props.scanjobId)
    ? monitorClosed.value
    : null
})
const scanjobStatusText = computed(() => getScanJobStatusText(scanjob.value?.status))
const registerId = computed(() => scanjob.value?.registerId ?? null)
const readOnly = computed(
  () =>
    visibleSnapshot.value?.readOnly === true ||
    scanjob.value?.readOnly === true ||
    activeRegisterItem.value?.readOnly === true
)
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
  if (registerLoading.value || !activeRegisterItem.value) return 'Загрузка...'
  return buildParcelListHeading(activeRegisterItem.value, (id) =>
    registersStore.getTransportationDocument(id)
  )
})
const scopeHeading = computed(() => {
  if (isBoxMode.value) {
    if (
      Number(selectedArea.value) === scanJobsStore.scanjobMonitorArea.Unassigned ||
      isUnassignedMonitorBox(selectedBox.value)
    ) {
      return selectedBox.value?.boxCode || 'Без коробки'
    }

    return `Коробка ${selectedBox.value?.boxCode || ''}`.trim()
  }

  return 'Коробки'
})
const monitorHeading = computed(
  () => `Сканирование | ${basicHeading.value} | ${scopeHeading.value}`
)
const monitorWeightRegister = computed(() => {
  const snapshot = visibleSnapshot.value
  const register = activeRegisterItem.value
  return {
    realWeightKg: hasOwnProperty(snapshot, 'realWeightKg')
      ? snapshot.realWeightKg
      : register?.realWeightKg ?? null,
    totalWeightKgToRelease: hasOwnProperty(snapshot, 'totalWeightKgToRelease')
      ? snapshot.totalWeightKgToRelease
      : register?.totalWeightKgToRelease ?? null
  }
})
const followUserOptions = computed(() => [
  { title: 'Не следить (Esc)', value: null },
  ...followUsers.value.map((user) => ({
    title: getFollowUserLabel(user),
    value: toNumberOrNull(user?.id)
  }))
])
const isJumpDisabled = computed(
  () => isLoading.value || jumpLoading.value || !jumpNumber.value.trim()
)

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

function getFollowUserLabel(user) {
  return (
    user?.displayName || user?.userName || user?.email || `Пользователь ${user?.id ?? ''}`.trim()
  )
}

async function startEditor(editor) {
  if (isLoading.value || jumpLoading.value || followApplyLoading.value) return
  jumpNumber.value = ''
  jumpValidation.value = {}
  draftFollowUserId.value = selectedFollowUserId.value
  activeEditor.value = editor
  await nextTick()
  const input = editor === 'jump' ? jumpInput.value : followInput.value
  input?.focus?.()
}

function cancelEditor() {
  activeEditor.value = null
  jumpNumber.value = ''
  jumpValidation.value = {}
  draftFollowUserId.value = selectedFollowUserId.value
}

async function applyFollowUserSelection() {
  if (isLoading.value || followApplyLoading.value || followUsersLoading.value) return
  followApplyLoading.value = true
  selectedFollowUserId.value = toNumberOrNull(draftFollowUserId.value)
  try {
    const applied = await startFollowUserSubscription({ subscribe: canSubscribeToMonitor(scanjob.value) })
    if (applied && isComponentMounted.value) {
      authStore.setScanjobMonitorFollowUserId(selectedFollowUserId.value)
      cancelEditor()
    }
  } catch (error) {
    if (isComponentMounted.value) alertStore.error(error)
  } finally {
    followApplyLoading.value = false
  }
}

async function clearFollowUserSelection() {
  draftFollowUserId.value = null
  await applyFollowUserSelection()
}

function monitorScopeKey(scope = props.monitorScope) {
  const normalized = normalizeMonitorScope(scope)
  return [normalized.area, normalized.boxId ?? '', normalized.bucketIndex ?? ''].join(':')
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
  const navigate = replace ? router.replace(route) : router.push(route)
  return Promise.resolve(navigate).catch((error) => {
    if (isNavigationFailure(error, NavigationFailureType.duplicated)) {
      return false
    }

    throw error
  })
}

function navigateToRegisterMonitor({ replace = false } = {}) {
  selectedParcelId.value = null
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

  selectedParcelId.value = null
  return updateMonitorRoute(
    {
      area: isUnassigned ? scanjobMonitorArea.Unassigned : scanjobMonitorArea.Box,
      boxId: isUnassigned ? null : boxId,
      bucketIndex: isUnassigned ? bucketIndex : null
    },
    { replace }
  )
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

  navigateToEditParcel(router, { ...item, id: parcelId }, 'Редактирование посылки', {
    registerId: registerId.value,
    mode: OP_MODE_WAREHOUSE,
    returnUrl: getCurrentInternalRoute(router)
  })
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
  if (readOnly.value || defectActionRunning.value || isLoading.value || !parcelId) {
    return
  }

  defectActionRunning.value = true
  try {
    await action(parcelId)
  } catch (error) {
    if (isComponentMounted.value) {
      alertStore.error(getErrorMessage(error))
      defectActionRunning.value = false
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

function scopesAreEqual(left, right) {
  const normalizedLeft = normalizeMonitorScope(left)
  const normalizedRight = normalizeMonitorScope(right)
  return (
    Number(normalizedLeft.area) === Number(normalizedRight.area) &&
    toNumberOrNull(normalizedLeft.boxId) === toNumberOrNull(normalizedRight.boxId) &&
    (toNumberOrNull(normalizedLeft.bucketIndex) ?? null) ===
      (toNumberOrNull(normalizedRight.bucketIndex) ?? null)
  )
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

async function resetMonitorObservation() {
  scopeVersion.value += 1
  clearPendingSnapshot()
  await clearFollowUserSubscription()
  closedStatus.value = null
  visibleSnapshot.value = null
  await scanJobsStore.stopMonitor().catch((error) => {
    reportError(error, { context: 'scan job monitor reset cleanup' })
  })
}

function toNumberOrNull(value) {
  if (value == null || value === '') {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function hasOwnProperty(value, key) {
  return value != null && Object.prototype.hasOwnProperty.call(value, key)
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

async function loadFollowUsers() {
  followUsersLoading.value = true
  try {
    const users = await scanJobsStore.loadMonitorFollowUsers(props.scanjobId)
    followUsers.value = Array.isArray(users) ? users : []
    const selectedUserId = toNumberOrNull(selectedFollowUserId.value)
    if (
      selectedUserId != null &&
      !followUsers.value.some((user) => Number(user?.id) === selectedUserId)
    ) {
      selectedFollowUserId.value = null
      authStore.setScanjobMonitorFollowUserId(null)
    }
  } catch (error) {
    followUsers.value = []
    if (isComponentMounted.value) {
      alertStore.error(getMonitorErrorMessage(error))
    }
  } finally {
    if (isComponentMounted.value) {
      followUsersLoading.value = false
    }
  }
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

function getMonitorTargetErrorMessage(error) {
  return error?.message || JUMP_FALLBACK_ERROR_MESSAGE
}

function showJumpError(message) {
  if (lastJumpNotificationId.value != null) {
    alertStore.dismiss(lastJumpNotificationId.value)
  }
  lastJumpNotificationId.value = alertStore.error(message)
}

function clearJumpError() {
  if (lastJumpNotificationId.value != null) {
    alertStore.dismiss(lastJumpNotificationId.value)
  }
  lastJumpNotificationId.value = null
}

async function navigateToResolvedScope(scope, { reloadIfSame = false } = {}) {
  const normalizedScope = normalizeMonitorScope(scope)

  if (scopesAreEqual(normalizedScope, getCurrentScope())) {
    if (reloadIfSame) {
      await refreshCurrentScopeSnapshot()
    }
    return false
  }

  const result = await updateMonitorRoute(normalizedScope)
  if (isNavigationFailure(result) && !isNavigationFailure(result, NavigationFailureType.duplicated)) {
    throw result
  }
  return result
}

async function handleJumpToNumber() {
  if (jumpLoading.value || isLoading.value) {
    return
  }

  const number = jumpNumber.value.trim()
  if (!number) {
    jumpValidation.value = { jumpNumber: JUMP_EMPTY_MESSAGE }
    return
  }

  jumpValidation.value = {}
  jumpLoading.value = true
  try {
    const target = await scanJobsStore.resolveMonitorTarget(props.scanjobId, number)
    const kind = Number(target?.kind)

    if (kind === scanjobMonitorTargetKind.Box) {
      const boxId = toNumberOrNull(target?.boxId)
      if (boxId == null) {
        showJumpError(JUMP_NOT_FOUND_MESSAGE)
        return
      }

      selectedParcelId.value = null
      await navigateToResolvedScope({
        area: scanjobMonitorArea.Box,
        boxId,
        bucketIndex: null
      })
      clearJumpError()
      cancelEditor()
      return
    }

    if (kind === scanjobMonitorTargetKind.Parcel) {
      const parcelId = toNumberOrNull(target?.parcelId)
      const targetScope = normalizeMonitorScope({
        area: target?.area,
        boxId: target?.boxId,
        bucketIndex: target?.bucketIndex
      })

      if (parcelId == null || targetScope.area === scanjobMonitorArea.Boxes) {
        showJumpError(JUMP_NOT_FOUND_MESSAGE)
        return
      }

      selectedParcelId.value = parcelId
      await navigateToResolvedScope(targetScope, { reloadIfSame: true })
      clearJumpError()
      cancelEditor()
      return
    }

    selectedParcelId.value = null
    showJumpError(JUMP_NOT_FOUND_MESSAGE)
  } catch (error) {
    if (isComponentMounted.value) {
      showJumpError(getMonitorTargetErrorMessage(error))
    }
  } finally {
    if (isComponentMounted.value) {
      jumpLoading.value = false
    }
  }
}

function normalizeFollowTarget(target) {
  const area = toNumberOrNull(target?.area)
  if (area === scanjobMonitorArea.Box) {
    const boxId = toNumberOrNull(target?.boxId)
    return boxId == null
      ? { area: scanjobMonitorArea.Boxes, boxId: null, bucketIndex: null }
      : { area: scanjobMonitorArea.Box, boxId, bucketIndex: null }
  }

  if (area === scanjobMonitorArea.Unassigned) {
    return {
      area: scanjobMonitorArea.Unassigned,
      boxId: null,
      bucketIndex: toNumberOrNull(target?.bucketIndex) ?? 0
    }
  }

  return { area: scanjobMonitorArea.Boxes, boxId: null, bucketIndex: null }
}

async function clearFollowUserSubscription() {
  followSubscriptionActive.value = false
  await scanJobsStore.clearMonitorFollowUser().catch((error) => {
    reportError(error, { context: 'scan job follow-user cleanup' })
  })
}

async function startFollowUserSubscription({
  subscribe = true,
  version = scopeVersion.value
} = {}) {
  followSubscriptionActive.value = false
  try {
    await scanJobsStore.clearMonitorFollowUser()
    const userId = toNumberOrNull(selectedFollowUserId.value)
    if (!subscribe || userId == null || !canSubscribeToMonitor(scanjob.value)) return true
    await scanJobsStore.startMonitorFollowUser(props.scanjobId, userId, {
      onFollowEvent: (followEvent) => handleFollowEvent(followEvent, version)
    })
    if (isComponentMounted.value && version === scopeVersion.value && !closedInfo.value) {
      followSubscriptionActive.value = true
    }
    return true
  } catch (error) {
    if (isComponentMounted.value && version === scopeVersion.value) {
      alertStore.error(getMonitorErrorMessage(error))
    }
    return false
  }
}

async function handleFollowEvent(followEvent, version = scopeVersion.value) {
  const selectedUserId = toNumberOrNull(selectedFollowUserId.value)
  if (
    !isComponentMounted.value ||
    version !== scopeVersion.value ||
    switchingScope.value ||
    Number(followEvent?.scanJobId) !== Number(props.scanjobId) ||
    selectedUserId == null ||
    Number(followEvent?.userId) !== selectedUserId
  ) {
    return
  }

  const targetScope = normalizeFollowTarget(followEvent?.followTarget)
  const targetParcelId = toNumberOrNull(followEvent?.followTarget?.parcelId)

  if (targetScope.area === scanjobMonitorArea.Boxes) {
    selectedParcelId.value = null
    if (isRegisterMode.value) {
      await refreshCurrentScopeSnapshot()
      return
    }

    await navigateToRegisterMonitor({ replace: true })
    return
  }

  selectedParcelId.value = targetParcelId
  if (scopesAreEqual(targetScope, getCurrentScope())) {
    await refreshCurrentScopeSnapshot()
    return
  }

  await updateMonitorRoute(targetScope, { replace: true })
}

function applySnapshot(
  snapshot,
  { version = scopeVersion.value, immediate = false, source = 'manual' } = {}
) {
  if (
    !isComponentMounted.value ||
    version !== scopeVersion.value ||
    !snapshotMatchesScope(snapshot)
  ) {
    return
  }

  if (immediate) {
    clearPendingSnapshot()
    visibleSnapshot.value = snapshot
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
      applySnapshot(nextSnapshot.snapshot, {
        version,
        immediate: true,
        source: nextSnapshot.source
      })
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
  clearFollowUserSubscription().catch((error) => {
    reportError(error, { context: 'scan job route follow-user cleanup' })
  })
  scanJobsStore.stopMonitor().catch((error) => {
    reportError(error, { context: 'scan job route monitor cleanup' })
  })
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
    await clearFollowUserSubscription()
    await scanJobsStore.clearMonitor().catch((error) => {
      reportError(error, { context: 'scan job scope monitor cleanup' })
    })

    const snapshot = await scanJobsStore.loadMonitorSnapshot(props.scanjobId, scope)
    applySnapshot(snapshot, { version, immediate: true, source: 'initial' })

    if (subscribe) {
      await scanJobsStore.startMonitor(props.scanjobId, {
        ...scope,
        onSnapshot: (nextSnapshot) => applySnapshot(nextSnapshot, { version, source: 'live' }),
        onClosed: (scanJobId, status) => handleMonitorClosed(scanJobId, status, version)
      })
      await startFollowUserSubscription({ subscribe, version })
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
    await observeScope(buildScope(selectedArea.value, null, selectedBucketIndex.value), {
      subscribe
    })
    return
  }

  await openRegisterMonitor({ subscribe })
}

async function initializeMonitor() {
  try {
    const loaded = await loadScanjobAndRegister()
    if (loaded) {
      await loadFollowUsers()
      await openMonitorScope(props.monitorScope, { subscribe: canSubscribeToMonitor(loaded) })
    } else if (isComponentMounted.value) {
      registerLoading.value = false
      monitorStatusOnly.value = true
    }
  } catch (error) {
    if (isComponentMounted.value) {
      alertStore.error(error, {
        fallback: 'Не удалось открыть монитор задания на сканирование',
        action: { label: 'Повторить', handler: initializeMonitor }
      })
    }
  }
}

onMounted(initializeMonitor)

watch(
  () => monitorRouteKey(),
  async () => {
    if (!scanjobLoaded.value || !isComponentMounted.value) {
      return
    }

    if (Number(loadedScanjobId.value) !== Number(props.scanjobId)) {
      scanjobLoaded.value = false
      await resetMonitorObservation()
      const loaded = await loadScanjobAndRegister()
      if (loaded) {
        await loadFollowUsers()
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
  clearFollowUserSubscription().catch((error) => {
    reportError(error, { context: 'scan job unmount follow-user cleanup' })
  })
  scanJobsStore.stopMonitor().catch((error) => {
    reportError(error, { context: 'scan job unmount monitor cleanup' })
  })
})

defineExpose({
  close,
  openRegisterMonitor,
  openMonitorScope,
  applySnapshot
})
</script>

<template>
  <div class="settings table-3">
    <div class="header-with-actions">
      <h1 class="primary-heading">{{ monitorHeading }}</h1>
      <div class="header-actions-bar">
        <div v-if="toolbarBusy" class="header-actions header-actions-group" data-testid="scanjob-monitor-operation-loading" role="status" aria-label="Операция выполняется">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <LocalLabelPrinting ref="printingPanel" :scan-job-id="props.scanjobId" :user-id="selectedFollowUserId"
          :active="scanjob?.status === SCAN_JOB_STATUS_IN_PROGRESS && !closedInfo" />
        <div class="header-actions header-actions-group scanjob-monitor-navigation">
          <form v-if="activeEditor === 'jump'" class="scanjob-monitor-editor" data-testid="scanjob-monitor-jump" @submit.prevent="handleJumpToNumber">
            <div class="scanjob-monitor-editor-row">
              <v-text-field ref="jumpInput" id="scanjob-monitor-jump-input" v-model="jumpNumber"
                density="compact" class="scanjob-monitor-editor-input" label="Перейти к посылке или коробке"
                variant="outlined" hide-details autocomplete="off" data-testid="scanjob-monitor-jump-input"
                :disabled="isLoading || jumpLoading" @keydown.enter.prevent="handleJumpToNumber"
                @keydown.esc.prevent.stop="cancelEditor" />
              <ActionButton
                :item="{}"
                icon="fa-solid fa-check"
                icon-size="2x"
                tooltip-text="Перейти"
                aria-label="Перейти"
                data-testid="scanjob-monitor-jump-action"
                :disabled="isJumpDisabled"
                @click="handleJumpToNumber"
              />
              <ActionButton
                :item="{}"
                icon="fa-solid fa-xmark"
                icon-size="2x"
                tooltip-text="Отменить"
                aria-label="Отменить переход"
                data-testid="scanjob-monitor-jump-cancel"
                :disabled="isLoading || jumpLoading"
                @click="cancelEditor"
              />
            </div>
            <FieldError name="jumpNumber" :errors="jumpValidation" />
          </form>
          <ActionButton v-else :item="{}" icon="fa-solid fa-angles-right" icon-size="2x"
            tooltip-text="Перейти к посылке или коробке" aria-label="Перейти к посылке или коробке"
            data-testid="scanjob-monitor-jump-open" :disabled="isLoading || followApplyLoading" @click="startEditor('jump')" />
          <ActionButton
            v-if="!isBoxMode"
            :item="{}"
            icon="fa-solid fa-rectangle-list"
            icon-size="2x"
            tooltip-text="Стикеры не в реестре"
            aria-label="Стикеры не в реестре"
            data-testid="scanjob-monitor-unregistered-action"
            :disabled="!registerId"
            @click="openUnregisteredParcels"
          />
        </div>
        <div class="header-actions header-actions-group scanjob-monitor-follow-user">
          <div v-if="activeEditor === 'follow'" class="scanjob-monitor-editor-row">
            <v-select ref="followInput" v-model="draftFollowUserId" :items="followUserOptions" item-title="title" item-value="value"
              density="compact" variant="outlined" class="scanjob-monitor-editor-input" label="Следить за сканером"
              hide-details :disabled="isLoading || followUsersLoading || followApplyLoading"
              data-testid="scanjob-monitor-follow-user-select" @keydown.esc.prevent.stop="clearFollowUserSelection" />
            <ActionButton
              :item="{}"
              icon="fa-solid fa-check"
              icon-size="2x"
              tooltip-text="Применить выбор сканера"
              aria-label="Применить выбор сканера"
              data-testid="scanjob-monitor-follow-user-apply"
              :disabled="isLoading || followUsersLoading || followApplyLoading"
              @click="applyFollowUserSelection"
            />
            <ActionButton
              :item="{}"
              icon="fa-solid fa-xmark"
              icon-size="2x"
              tooltip-text="Отменить"
              aria-label="Отменить выбор сканера"
              data-testid="scanjob-monitor-follow-user-cancel"
              :disabled="isLoading || followApplyLoading"
              @click="cancelEditor"
            />
          </div>
          <ActionButton v-else :item="{}" icon="fa-solid fa-magnifying-glass-plus" icon-size="2x"
            :variant="followSubscriptionActive ? 'green' : 'default'"
            tooltip-text="Следить за сканером" aria-label="Следить за сканером" data-testid="scanjob-monitor-follow-user-open"
            :disabled="isLoading || followUsersLoading || jumpLoading" @click="startEditor('follow')" />
        </div>
        <div class="header-actions header-actions-group">
          <ActionButton
            :item="{}"
            icon="fa-solid fa-xmark"
            icon-size="2x"
            tooltip-text="Закрыть"
            aria-label="Закрыть"
            data-testid="scanjob-monitor-close-action"
            :disabled="isLoading"
            @click="handleCloseAction"
          />
        </div>
      </div>
    </div>

    <hr class="hr" />

    <PageAlertRegion v-if="!printingPanel?.configurationOpen" />
    <div v-if="readOnly" class="alert alert-warning read-only-notice">
      Изменения и операции сканирования запрещены. Мониторинг и просмотр посылок доступны.
    </div>

    <div class="scanjob-monitor-panel">
      <div
        v-if="isLoading && !visibleSnapshot"
        class="monitor-empty"
        data-testid="scanjob-monitor-loading"
      >
        <span class="spinner-border spinner-border-m"></span>
        <span>Загрузка монитора сканирования...</span>
      </div>

      <div
        v-else-if="closedInfo"
        class="monitor-empty monitor-closed"
        data-testid="scanjob-monitor-closed"
      >
        Мониторинг остановлен. Задание больше не выполняется.
      </div>

      <div
        v-else-if="monitorStatusOnly"
        class="monitor-empty monitor-closed"
        data-testid="scanjob-monitor-status-only"
      >
        Задание сканирования: {{ scanjobStatusText }}. Онлайн-обновления отключены.
      </div>

      <div
        v-else-if="monitorError && !visibleSnapshot"
        class="monitor-empty"
        data-testid="scanjob-monitor-unavailable"
      >
        {{ getMonitorErrorMessage(monitorError) }}
      </div>

      <template v-else>
        <ScanjobBoxesMonitor
          v-if="isRegisterMode"
          :snapshot="visibleSnapshot"
          :boxes="boxes"
          :loading="isLoading"
          :print-queue="printQueue"
          @open-box="navigateToBoxMonitor"
        />

        <ScanjobParcelsMonitor
          v-if="isBoxMode"
          :box="selectedBox"
          :register-type="visibleSnapshot?.registerType ?? 0"
          :register="monitorWeightRegister"
          :loading="isLoading"
          :defect-action-loading="defectActionRunning || readOnly"
          :selected-parcel-id="selectedParcelId"
          :print-queue="printQueue"
          @edit-parcel="editParcel"
          @set-defect="setParcelDefect"
          @clear-defect="clearParcelDefect"
        />
      </template>
    </div>
  </div>
</template>

<style scoped>
.scanjob-monitor-panel {
  min-height: 320px;
}

.scanjob-monitor-editor-row {
  display: flex;
  align-items: center;
  gap: 4px;
}
.scanjob-monitor-editor-input {
  width: min(300px, calc(100vw - 160px));
  min-width: 0;
}
</style>
