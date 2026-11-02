// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, watch, ref, unref, reactive } from 'vue'
import { useAppConfirm } from '@/composables/useAppConfirm.js'
import { useActionDialog } from '@/composables/useActionDialog.js'
import { useRegisterDownloadFlow } from '@/composables/useRegisterDownloadFlow.js'
import { COMPANY_REGISTER_OUTPUT_TYPES } from '@/helpers/company.constants.js'
import { FeacnMatchMode } from '@/models/feacn.match.mode.js'
import { SwValidationMatchMode } from '@/models/sw.validation.match.mode.js'
import {
  chooseOutputWeightCorrection,
  getWeightCorrection,
  WEIGHT_CORRECTION_CHOICE
} from '@/helpers/weight.correction.helpers.js'
import { getErrorMessage, reportError } from '@/helpers/error.helpers.js'
import {
  buildFinishPassportCheckWarning,
  buildRestartPassportCheckWarning
} from '@/helpers/lifecycle.warning.helpers.js'

export const POLLING_INTERVAL_MS = 1000

async function runCustomsChargeOperations(operations) {
  const failures = []
  let succeeded = true
  // The calculation may have saved charges before its detail refresh failed.
  // Complete the remaining reads before reporting the operation's first failure.
  for (const operation of operations) {
    try {
      if ((await operation()) === false) succeeded = false
    } catch (error) {
      failures.push(error)
    }
  }
  for (const error of failures.slice(1)) {
    reportError(error, { context: 'customs charges follow-up refresh' })
  }
  if (failures.length) {
    throw new Error(getErrorMessage(failures[0], 'Не удалось обновить таможенные платежи'), { cause: failures[0] })
  }
  return succeeded
}

export async function refreshAfterCheckStatusFreeze({
  succeeded,
  hideLegacyRestrictions,
  fetchRegister,
  loadParcels,
  isComponentMounted,
  alertStore
}) {
  if (!succeeded || !(unref(isComponentMounted) ?? true)) return false

  try {
    await fetchRegister()
    if (!(unref(isComponentMounted) ?? true)) return false

    if (unref(hideLegacyRestrictions)) {
      const parcelsRefreshSucceeded = await loadParcels()
      if (parcelsRefreshSucceeded === false) return false
    } else {
      hideLegacyRestrictions.value = true
    }

    return true
  } catch (error) {
    if ((unref(isComponentMounted) ?? true) && alertStore) {
      alertStore.error(error, {
        fallback: 'Запреты применены, но не удалось обновить данные'
      })
    } else {
      reportError(error, { context: 'check status freeze refresh' })
    }
    return false
  }
}

export function createValidationState() {
  return {
    show: false,
    handleId: null,
    total: 0,
    processed: 0,
    phase: 'processing'
  }
}

function applyValidationProgress(state, progress) {
  state.total = progress.total
  state.processed = progress.processed
  const finished = progress.finished || progress.total === -1 || progress.processed === -1
  state.phase = finished ? 'refreshing-totals'
    : progress.total >= 0 && progress.processed >= progress.total ? 'finalizing' : 'processing'
  return finished
}

export function calculateValidationProgress(validationState) {
  if (['finalizing', 'refreshing-totals'].includes(validationState.phase) ||
      !Number.isFinite(validationState.total) || validationState.total <= 0 ||
      !Number.isFinite(validationState.processed) || validationState.processed < 0) return null
  return Math.min(100, Math.round((validationState.processed / validationState.total) * 100))
}

export async function pollValidation(
  validationState,
  registersStore,
  alertStore,
  stopPollingFn,
  getAllOptions = {},
  refreshTotals = (registerId) => registersStore.refreshDerived?.(registerId)
) {
  if (!validationState.handleId || validationState.phase === 'refreshing-totals') return

  const handleId = validationState.handleId
  let refreshingTotals = false
  try {
    const progress = await registersStore.getValidationProgress(handleId)
    if (validationState.handleId !== handleId || validationState.phase === 'refreshing-totals') return

    if (applyValidationProgress(validationState, progress)) {
      refreshingTotals = true
      stopPollingFn()
      await registersStore.getAll(getAllOptions)
      if (validationState.handleId !== handleId) return
      await refreshTotals(validationState.registerId)
      if (validationState.handleId !== handleId) return
      // Keep the final phase throughout the dialog's leave transition.
      validationState.show = false
      validationState.handleId = null
    }
  } catch (err) {
    if (validationState.handleId !== handleId || (!refreshingTotals && validationState.phase === 'refreshing-totals')) {
      // Cancellation or a newer operation owns the UI now.
      reportError(err, { context: 'register validation poll after cancellation' })
      return
    }
    alertStore.error(err, { fallback: 'Не удалось выполнить проверку реестра' })
    validationState.show = false
    validationState.handleId = null
    stopPollingFn()
    if (!refreshingTotals) await registersStore.getAll(getAllOptions)
  }
}

export async function validateRegister(
  item,
  validationState,
  registersStore,
  alertStore,
  stopPollingFn,
  startPollingFn,
  sw,
  swMatchMode,
  getAllOptions = {},
  refreshTotals
) {
  try {
    stopPollingFn()
    const res = await registersStore.validate(item.id, sw, swMatchMode)
    validationState.registerId = item.id
    validationState.handleId = res.id
    validationState.total = 0
    validationState.processed = 0
    validationState.phase = 'processing'
    validationState.show = true
    await pollValidation(validationState, registersStore, alertStore, stopPollingFn, getAllOptions, refreshTotals)
    if (validationState.show) startPollingFn()
  } catch (err) {
    alertStore.error(err.message || String(err))
  }
}

export async function cancelValidation(
  validationState,
  registersStore,
  stopPollingFn,
  cancel = (handleId) => registersStore.cancelValidation(handleId)
) {
  if (validationState.phase === 'refreshing-totals') return false
  const handleId = validationState.handleId
  validationState.handleId = null
  validationState.show = false
  validationState.phase = 'processing'
  stopPollingFn()
  if (!handleId) return false

  registersStore.invalidateDerived?.(validationState.registerId)
  await cancel(handleId)
  return true
}

export function createPollingTimer(pollFunction, interval = POLLING_INTERVAL_MS) {
  let timer = null

  return {
    start() {
      if (!timer) {
        timer = setInterval(pollFunction, interval)
      }
    },
    stop() {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
    },
    isRunning() {
      return timer !== null
    }
  }
}

export function createRegisterActionHandlers(registersStore, alertStore, { mode } = {}) {
  const validationState = reactive({
    ...createValidationState(),
    operation: null
  })

  let pollingFunction = null
  let recoveryScopeActive = true
  const totalsRecoveries = new Map()

  function createTotalsRecovery(registerId, fallback) {
    const previous = totalsRecoveries.get(registerId)
    if (previous) {
      previous.active = false
      clearTimeout(previous.timer)
    }
    const recovery = { registerId, fallback, active: true, errorReported: false, timer: null }
    totalsRecoveries.set(registerId, recovery)
    return recovery
  }

  function reportRecoveryFailure(error, recovery, fallback) {
    // After teardown, retain diagnostics without publishing on another page.
    reportError(error, { context: 'register totals recovery' })
    if (recovery.active && !recovery.errorReported) {
      recovery.errorReported = true
      alertStore.error(error, { fallback })
    }
  }

  function scheduleTotalsRefresh(recovery) {
    recovery.timer = setTimeout(() => {
      void refreshRegisterTotals(recovery)
    }, POLLING_INTERVAL_MS)
  }

  async function refreshRegisterTotals(recovery) {
    if (!recovery.active) return false
    if (registersStore.isRefreshingDerived?.(recovery.registerId) === true) {
      // The initiating operation owns any failure from the request already in flight.
      scheduleTotalsRefresh(recovery)
      return false
    }
    let succeeded = true
    try {
      await registersStore.refreshDerived?.(recovery.registerId)
    } catch (error) {
      succeeded = false
      reportRecoveryFailure(error, recovery, recovery.fallback)
    }
    if (!recovery.active) return false

    const register = [unref(registersStore.item), ...unref(registersStore.items ?? [])]
      .find(item => Number(item?.id) === Number(recovery.registerId))
    if (!succeeded || register?.derivedTotalsPending === true) {
      scheduleTotalsRefresh(recovery)
    } else {
      totalsRecoveries.delete(recovery.registerId)
    }
    return succeeded
  }

  async function refreshCompletedRegister(registerId) {
    if (!recoveryScopeActive) return false
    const recovery = createTotalsRecovery(registerId, 'Не удалось обновить итоги реестра после проверки')
    registersStore.invalidateDerived?.(registerId)
    return await refreshRegisterTotals(recovery)
  }

  const pollingTimer = createPollingTimer(async () => {
    if (typeof pollingFunction === 'function') {
      try {
        await pollingFunction()
      } catch {
        pollingTimer.stop()
      }
    }
  })

  const progressPercent = computed(() => calculateValidationProgress(validationState))

  const getAllOptions = () => {
    if (mode === undefined) {
      return {}
    }
    return { mode: unref(mode) }
  }

  async function pollFeacnLookup() {
    if (!validationState.handleId || validationState.phase === 'refreshing-totals') return

    const handleId = validationState.handleId
    let refreshingTotals = false
    try {
      const progress = await registersStore.getLookupFeacnCodesProgress(handleId)
      if (validationState.handleId !== handleId || validationState.phase === 'refreshing-totals') return

      if (applyValidationProgress(validationState, progress)) {
        refreshingTotals = true
        pollingTimer.stop()
        await registersStore.getAll(getAllOptions())
        if (validationState.handleId !== handleId) return
        await refreshCompletedRegister(validationState.registerId)
        if (validationState.handleId !== handleId) return
        // Keep the final phase throughout the dialog's leave transition.
        validationState.show = false
        validationState.handleId = null
      }
    } catch (err) {
      if (validationState.handleId !== handleId || (!refreshingTotals && validationState.phase === 'refreshing-totals')) {
        // Cancellation or a newer operation owns the UI now.
        reportError(err, { context: 'FEACN lookup poll after cancellation' })
        return
      }
      alertStore.error(err, { fallback: 'Не удалось подобрать коды ТН ВЭД' })
      validationState.show = false
      validationState.handleId = null
      pollingTimer.stop()
      if (!refreshingTotals) await registersStore.getAll(getAllOptions())
    }
  }

  async function runValidation(item, sw, { extended = false } = {}) {
    try {
      validationState.operation = 'validation'
      pollingFunction = () =>
        pollValidation(
          validationState,
          registersStore,
          alertStore,
          () => pollingTimer.stop(),
          getAllOptions(),
          refreshCompletedRegister
        )

      await validateRegister(
        item,
        validationState,
        registersStore,
        alertStore,
        () => pollingTimer.stop(),
        () => recoveryScopeActive && pollingTimer.start(),
        sw,
        extended ? SwValidationMatchMode.SwMatch : SwValidationMatchMode.NoSwMatch,
        getAllOptions(),
        refreshCompletedRegister
      )
    } catch (err) {
      alertStore.error(err?.message || String(err))
    }
  }

  async function validateRegisterSw(item) {
    await runValidation(item, true, { extended: false })
  }

  async function validateRegisterSwEx(item) {
    await runValidation(item, true, { extended: true })
  }

  async function validateRegisterFc(item) {
    await runValidation(item, false)
  }

  async function performFeacnLookup(item, { extended = false } = {}) {
    try {
      validationState.operation = 'lookup-feacn-codes'
      validationState.registerId = item.id
      pollingTimer.stop()
      pollingFunction = pollFeacnLookup
      const res = await registersStore.lookupFeacnCodes(
        item.id,
        extended ? FeacnMatchMode.FCMatchAndAssign : FeacnMatchMode.FCMatch
      )
      validationState.handleId = res.id
      validationState.total = 0
      validationState.processed = 0
      validationState.phase = 'processing'
      validationState.show = true
      await pollFeacnLookup()
      if (recoveryScopeActive && validationState.show) pollingTimer.start()
    } catch (err) {
      alertStore.error(err?.message || String(err))
    }
  }

  async function lookupFeacnCodes(item) {
    await performFeacnLookup(item, { extended: false })
  }

  async function lookupFeacnCodesEx(item) {
    await performFeacnLookup(item, { extended: true })
  }

  async function exportAllXmlOrdinary(item, applyWeightCorrection = false) {
    await registersStore.generateOrdinary(item.id, item.invoiceNumber, applyWeightCorrection)
  }

  async function exportAllXmlExcise(item, applyWeightCorrection = false) {
    await registersStore.generateExcise(item.id, item.invoiceNumber, applyWeightCorrection)
  }

  async function exportAllXmlNotifications(item, applyWeightCorrection = false) {
    await registersStore.generateNotifications(item.id, item.invoiceNumber, applyWeightCorrection)
  }

  async function downloadRegister(item, applyWeightCorrection = false) {
    if (applyWeightCorrection) {
      await registersStore.download(item.id, item.fileName, null, null, true)
      return
    }

    await registersStore.download(item.id, item.fileName)
  }

  async function downloadAdditionalRestrictions(item) {
    await registersStore.downloadAdditionalRestrictions(item.id, item.invoiceNumber)
  }

  async function downloadPackingList(item) {
    await registersStore.downloadPackingList(item.id, item.invoiceNumber)
  }

  async function downloadTajikistanManifest(item) {
    await registersStore.downloadTajikistanManifestFile(item.id, item.invoiceNumber)
  }

  async function downloadTechdoc(item) {
    await registersStore.downloadTechdoc(item.id, item.invoiceNumber)
  }

  async function freezeTnVedOrder(item) {
    await registersStore.freezeTnVedOrder(item.id)
  }

  async function freezeCheckStatus(item) {
    await registersStore.freezeCheckStatus(item.id)
  }

  async function checkPassports(item) {
    await registersStore.checkPassports(item.id)
  }

  async function finishPassportCheck(item) {
    await registersStore.finishPassportCheck(item.id)
  }

  async function calculateCustomsCharges(item) {
    try {
      return await runCustomsChargeOperations([
        () => registersStore.calculateCustomsCharges(item.id),
        () => recoveryScopeActive ? registersStore.getAll(getAllOptions()) : undefined
      ])
    } catch (err) {
      if (recoveryScopeActive) alertStore.error(err)
      else reportError(err, { context: 'customs charges after register list teardown' })
      return false
    }
  }

  async function cancelValidationWrapper() {
    if (!recoveryScopeActive || !validationState.handleId || validationState.phase === 'refreshing-totals') return false
    const registerId = validationState.registerId
    const recovery = createTotalsRecovery(registerId, 'Не удалось обновить итоги реестра после отмены проверки')
    const cancel = validationState.operation === 'lookup-feacn-codes'
      ? (handleId) => registersStore.cancelLookupFeacnCodes(handleId)
      : (handleId) => registersStore.cancelValidation(handleId)
    let cancelled = true
    try {
      await cancelValidation(validationState, registersStore, () => pollingTimer.stop(), cancel)
    } catch (error) {
      cancelled = false
      reportRecoveryFailure(error, recovery, 'Не удалось отменить проверку реестра')
    }
    const refreshed = await refreshRegisterTotals(recovery)
    return cancelled && refreshed
  }

  function stopPolling() {
    pollingTimer.stop()
    recoveryScopeActive = false
    validationState.handleId = null
    validationState.show = false
    validationState.phase = 'processing'
    for (const recovery of totalsRecoveries.values()) {
      recovery.active = false
      clearTimeout(recovery.timer)
    }
    totalsRecoveries.clear()
  }

  return {
    validationState,
    progressPercent,
    validateRegisterSw,
    validateRegisterSwEx,
    validateRegisterFc,
    lookupFeacnCodes,
    lookupFeacnCodesEx,
    exportAllXmlOrdinary,
    exportAllXmlExcise,
    exportAllXmlNotifications,
    downloadRegister,
    downloadAdditionalRestrictions,
    downloadPackingList,
    downloadTajikistanManifest,
    downloadTechdoc,
    freezeCheckStatus,
    checkPassports,
    finishPassportCheck,
    freezeTnVedOrder,
    calculateCustomsCharges,
    cancelValidation: cancelValidationWrapper,
    stopPolling
  }
}

export function useRegisterHeaderActions({
  registersStore,
  alertStore,
  runningAction,
  tableLoading,
  registerLoading,
  loadParcels,
  isComponentMounted
}) {
  const {
    validationState,
    progressPercent,
    validateRegisterSw,
    validateRegisterSwEx,
    validateRegisterFc,
    lookupFeacnCodes,
    lookupFeacnCodesEx,
    exportAllXmlOrdinary,
    exportAllXmlExcise,
    exportAllXmlNotifications,
    downloadRegister,
    downloadAdditionalRestrictions,
    downloadPackingList,
    downloadTajikistanManifest,
    downloadTechdoc,
    freezeCheckStatus,
    checkPassports,
    finishPassportCheck,
    freezeTnVedOrder,
    cancelValidation,
    stopPolling
  } = createRegisterActionHandlers(registersStore, alertStore)

  const registerLoadingRef = registerLoading ?? ref(false)
  const tableLoadingRef = tableLoading ?? ref(false)
  const runningActionRef = runningAction ?? ref(false)

  const { actionDialogState, showActionDialog, hideActionDialog } = useActionDialog()
  const downloadFlow = useRegisterDownloadFlow(registersStore, alertStore)
  const confirm = useAppConfirm()
  const weightCorrectionChoicePending = ref(false)
  const passportConfirmationPending = ref(false)

  const currentRegister = computed(() => {
    const register = unref(registersStore?.item)
    if (!register || register.loading || register.error) {
      return null
    }
    return register
  })

  watch(() => currentRegister.value?.id, () => {
    void downloadFlow.loadFormats(currentRegister.value)
  }, { immediate: true })

  const registerReady = computed(() => !!currentRegister.value && !registerLoadingRef.value)

  const generalActionsDisabled = computed(
    () =>
      !registerReady.value ||
      tableLoadingRef.value ||
      runningActionRef.value ||
      validationState.show ||
      actionDialogState.show ||
      weightCorrectionChoicePending.value ||
      passportConfirmationPending.value
  )

  async function runWithLock(action, { lock = true, checkDisabled = true } = {}) {
    const register = currentRegister.value
    if (!register) return false
    if (checkDisabled && generalActionsDisabled.value) return false
    if (lock && runningActionRef.value) return false

    if (lock) {
      runningActionRef.value = true
    }

    try {
      const result = await action(register)
      return result !== false
    } catch (err) {
      alertStore.error(err?.message || String(err))
      return false
    } finally {
      if (lock) {
        runningActionRef.value = false
      }
    }
  }

  const runValidateRegisterSw = async () => {
    await runWithLock(validateRegisterSw)
  }

  const runValidateRegisterSwEx = async () => {
    await runWithLock(validateRegisterSwEx)
  }

  const runValidateRegisterFc = async () => {
    await runWithLock(validateRegisterFc)
  }

  const runLookupFeacnCodes = async () => {
    await runWithLock(lookupFeacnCodes)
  }

  const runLookupFeacnCodesEx = async () => {
    await runWithLock(lookupFeacnCodesEx)
  }

  const runActionWithDialog = async (action, operation) => {
    if (generalActionsDisabled.value) return false
    showActionDialog(operation)
    try {
      return await runWithLock(action, { lock: true, checkDisabled: false })
    } finally {
      hideActionDialog()
    }
  }

  async function chooseWeightCorrectionForCurrentRegister() {
    weightCorrectionChoicePending.value = true
    try {
      const choice = await chooseOutputWeightCorrection(confirm, currentRegister.value)
      return choice === WEIGHT_CORRECTION_CHOICE.Apply
    } finally {
      weightCorrectionChoicePending.value = false
    }
  }

  const runXmlActionWithDialog = async (action, operation) => {
    if (generalActionsDisabled.value || currentRegister.value?.derivedTotalsPending === true) return

    let applyWeightCorrection = false
    if (getWeightCorrection(currentRegister.value).canCorrect) {
      applyWeightCorrection = await chooseWeightCorrectionForCurrentRegister()
    }

    showActionDialog(operation)
    try {
      await runWithLock((register) => action(register, applyWeightCorrection), {
        lock: true,
        checkDisabled: false
      })
    } finally {
      hideActionDialog()
    }
  }

  const runDownloadActionWithDialog = async (action, operation) => {
    if (generalActionsDisabled.value || currentRegister.value?.derivedTotalsPending === true) return

    let applyWeightCorrection = false
    if (getWeightCorrection(currentRegister.value).canCorrect) {
      applyWeightCorrection = await chooseWeightCorrectionForCurrentRegister()
    }

    showActionDialog(operation)
    try {
      await runWithLock((register) => action(register, applyWeightCorrection), {
        lock: true,
        checkDisabled: false
      })
    } finally {
      hideActionDialog()
    }
  }

  const runExportAllXmlWithoutExcise = async () => {
    await runXmlActionWithDialog(exportAllXmlOrdinary, 'export-all-xml-without-excise')
  }

  const runExportAllXmlExcise = async () => {
    await runXmlActionWithDialog(exportAllXmlExcise, 'export-all-xml-excise')
  }

  const runExportAllXmlNotifications = async () => {
    await runXmlActionWithDialog(exportAllXmlNotifications, 'export-all-xml-notifications')
  }

  const runDownloadRegister = async (format = 'generic') => {
    if (currentRegister.value?.derivedTotalsPending === true) return false
    const registerType = Number(currentRegister.value?.registerType)
    if (!COMPANY_REGISTER_OUTPUT_TYPES.includes(registerType)) {
      return await runDownloadActionWithDialog(downloadRegister, 'download-register')
    }
    if (generalActionsDisabled.value) return false
    try {
      const applyWeightCorrection = getWeightCorrection(currentRegister.value).canCorrect
        ? await chooseWeightCorrectionForCurrentRegister()
        : false
      return await runWithLock((register) => downloadFlow.download({
        register,
        format,
        applyWeightCorrection,
        onDownloadStart: () => showActionDialog('download-register'),
        onDownloadEnd: hideActionDialog
      }), { lock: true, checkDisabled: false })
    } catch (error) {
      alertStore.error(error, { fallback: 'Не удалось выбрать параметры выгрузки' })
      return false
    }
  }

  const runDownloadAdditionalRestrictions = async () => {
    await runActionWithDialog(downloadAdditionalRestrictions, 'download-additional-restrictions')
  }

  const runDownloadPackingList = async () => {
    await runActionWithDialog(downloadPackingList, 'download-packing-list')
  }

  const runDownloadTajikistanManifest = async () => {
    await runActionWithDialog(downloadTajikistanManifest, 'download-tajikistan-manifest')
  }

  const runDownloadTechdoc = async () => {
    await runActionWithDialog(downloadTechdoc, 'download-techdoc')
  }

  const runFreezeTnVedOrder = async () => {
    await runActionWithDialog(freezeTnVedOrder, 'freeze-tnved-order')
  }

  const runFreezeCheckStatus = async () => {
    return await runActionWithDialog(freezeCheckStatus, 'freeze-check-status')
  }

  async function refreshPassportCheckData(register) {
    await registersStore.getById(register.id)
    if ((isComponentMounted?.value ?? true) && typeof loadParcels === 'function') {
      await loadParcels()
    }
  }

  async function checkPassportsForCurrentRegister(register) {
    await checkPassports(register)
    await refreshPassportCheckData(register)
  }

  async function finishPassportCheckForCurrentRegister(register) {
    await finishPassportCheck(register)
    await refreshPassportCheckData(register)
  }

  async function refreshRegisterForPassportDecision() {
    const registerId = currentRegister.value?.id
    if (!registerId) return false

    passportConfirmationPending.value = true
    try {
      await registersStore.getById(registerId)
      return true
    } catch (error) {
      alertStore.error(error, { fallback: 'Не удалось обновить данные реестра' })
      return false
    } finally {
      passportConfirmationPending.value = false
    }
  }

  const runCheckPassports = async () => {
    if (generalActionsDisabled.value) return
    if (!(await refreshRegisterForPassportDecision())) return

    if (currentRegister.value?.passportCheckWasFinished === true) {
      passportConfirmationPending.value = true
      let confirmed
      try {
        confirmed = await confirm({
          title: 'Подтверждение',
          confirmationText: 'Применить',
          cancellationText: 'Отменить',
          content: buildRestartPassportCheckWarning(currentRegister.value?.parcelsTotal)
        })
      } finally {
        passportConfirmationPending.value = false
      }
      if (!confirmed) return
    }

    await runActionWithDialog(checkPassportsForCurrentRegister, 'check-passports')
  }

  const runFinishPassportCheck = async () => {
    if (generalActionsDisabled.value) return

    if (!(await refreshRegisterForPassportDecision())) return

    const register = currentRegister.value
    const hasExactCounts =
      register?.passportChecksNotCheckedCount !== undefined &&
      register?.passportChecksInProgressCount !== undefined
    const exactWarning = hasExactCounts
      ? buildFinishPassportCheckWarning(
          register.passportChecksNotCheckedCount,
          register.passportChecksInProgressCount
        )
      : null
    const warning =
      exactWarning ??
      (register?.hasPendingPassportChecks
        ? 'Из таможенного оформления могут быть исключены посылки с незавершённой проверкой паспорта получателя. Продолжить?'
        : null)

    if (warning) {
      passportConfirmationPending.value = true
      let confirmed
      try {
        confirmed = await confirm({
          title: 'Подтверждение',
          confirmationText: 'Применить',
          cancellationText: 'Отменить',
          content: warning
        })
      } finally {
        passportConfirmationPending.value = false
      }

      if (!confirmed) return
    }
    await runActionWithDialog(finishPassportCheckForCurrentRegister, 'finish-passport-check')
  }

  async function calculateCustomsChargesForCurrentRegister(register) {
    try {
      return await runCustomsChargeOperations([
        () => registersStore.calculateCustomsCharges(register.id),
        () => (isComponentMounted?.value ?? true) ? registersStore.getById(register.id) : undefined,
        () => (isComponentMounted?.value ?? true) && typeof loadParcels === 'function' ? loadParcels() : undefined
      ])
    } catch (error) {
      if (isComponentMounted?.value ?? true) alertStore.error(error)
      else {
        // The initiating page has gone; do not publish on the destination page.
        reportError(error, { context: 'customs charges after parcel list teardown' })
      }
      return false
    }
  }

  const runcalculateCustomsCharges = async () => {
    return await runActionWithDialog(
      calculateCustomsChargesForCurrentRegister,
      'calculate-customs-charges'
    )
  }

  function handleValidationDialogClose(show, previous) {
    const dialogClosed = previous && !show
    const componentMounted = isComponentMounted?.value ?? true
    const canReloadParcels = typeof loadParcels === 'function'

    if (dialogClosed && componentMounted && canReloadParcels) {
      Promise.resolve(loadParcels()).catch((error) => {
        reportError(error, { context: 'register action parcel refresh' })
      })
    }
  }

  const stopValidationWatcher = watch(
    () => validationState.show,
    (show, previous) => {
      handleValidationDialogClose(show, previous)
    }
  )

  function stop() {
    stopValidationWatcher()
    stopPolling()
    hideActionDialog()
    weightCorrectionChoicePending.value = false
    passportConfirmationPending.value = false
  }

  return {
    validationState,
    progressPercent,
    actionDialog: actionDialogState,
    companyFormatName: downloadFlow.companyFormatName,
    generalActionsDisabled,
    validateRegisterSw: runValidateRegisterSw,
    validateRegisterSwEx: runValidateRegisterSwEx,
    validateRegisterFc: runValidateRegisterFc,
    lookupFeacnCodes: runLookupFeacnCodes,
    lookupFeacnCodesEx: runLookupFeacnCodesEx,
    exportAllXmlOrdinary: runExportAllXmlWithoutExcise,
    exportAllXmlExcise: runExportAllXmlExcise,
    exportAllXmlNotifications: runExportAllXmlNotifications,
    downloadRegister: runDownloadRegister,
    downloadAdditionalRestrictions: runDownloadAdditionalRestrictions,
    downloadPackingList: runDownloadPackingList,
    downloadTajikistanManifest: runDownloadTajikistanManifest,
    downloadTechdoc: runDownloadTechdoc,
    freezeCheckStatus: runFreezeCheckStatus,
    checkPassports: runCheckPassports,
    finishPassportCheck: runFinishPassportCheck,
    freezeTnVedOrder: runFreezeTnVedOrder,
    calculateCustomsCharges: runcalculateCustomsCharges,
    cancelValidation,
    stop
  }
}
