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
import { reportError } from '@/helpers/error.helpers.js'
import {
  buildFinishPassportCheckWarning,
  buildRestartPassportCheckWarning
} from '@/helpers/lifecycle.warning.helpers.js'

export const POLLING_INTERVAL_MS = 1000
const progressVersions = new WeakMap()

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
    cancelling: false
  }
}

export function calculateValidationProgress(validationState) {
  if (!validationState.total || validationState.total <= 0) return 0
  return Math.round((validationState.processed / validationState.total) * 100)
}

export async function pollValidation(
  validationState,
  registersStore,
  alertStore,
  stopPollingFn,
  reloadData = (registerId) => registersStore.refreshDerived(registerId),
  getProgress = (handleId) => registersStore.getValidationProgress(handleId)
) {
  const handleId = validationState.handleId
  if (!handleId) return
  const progressVersion = progressVersions.get(validationState)
  let terminalProgress = false
  let operationError = null
  try {
    const progress = await getProgress(handleId)
    if (validationState.handleId !== handleId || progressVersions.get(validationState) !== progressVersion) return
    validationState.total = progress.total
    validationState.processed = progress.processed

    if (progress.finished || progress.total === -1 || progress.processed === -1) {
      terminalProgress = true
      stopPollingFn()
      operationError = progress.error
      if (operationError) alertStore.error(operationError, { fallback: 'Не удалось завершить обработку реестра' })
      // Terminal progress means Core has finalized committed changes, including cancellation.
      // Reload the register, visible boxes, and current parcel page once; do not poll totals.
      await reloadData(validationState.registerId)
      if (validationState.handleId !== handleId) return
      validationState.handleId = null
      validationState.cancelling = false
      validationState.show = false
    }
  } catch (error) {
    reportError(error, { context: 'register operation progress or reload' })
    if (validationState.handleId !== handleId ||
        (!terminalProgress && progressVersions.get(validationState) !== progressVersion)) {
      // Cancellation or teardown superseded this read. Keep diagnostics, but let the
      // current poll own presentation and cleanup; a confirmed terminal reload still owns failures.
      return
    }
    if (!operationError) alertStore.error(error, { fallback: 'Не удалось обновить данные обработки реестра' })
    validationState.handleId = null
    validationState.cancelling = false
    validationState.show = false
    stopPollingFn()
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
  reloadData,
  isActive = () => true
) {
  try {
    stopPollingFn()
    const res = await registersStore.validate(item.id, sw, swMatchMode)
    if (!isActive()) return
    progressVersions.set(validationState, {})
    validationState.registerId = item.id
    validationState.handleId = res.id
    validationState.total = 0
    validationState.processed = 0
    validationState.cancelling = false
    validationState.show = true
    await pollValidation(validationState, registersStore, alertStore, stopPollingFn, reloadData)
    if (validationState.show) startPollingFn()
  } catch (err) {
    reportError(err, { context: 'register validation start' })
    if (isActive()) alertStore.error(err, { fallback: 'Не удалось запустить проверку реестра' })
  }
}

export async function cancelValidation(
  validationState,
  registersStore,
  stopPollingFn,
  cancel = (handleId) => registersStore.cancelValidation(handleId)
) {
  const handleId = validationState.handleId
  if (!handleId) {
    validationState.show = false
    stopPollingFn()
    return false
  }
  if (validationState.cancelling) return false
  // In-flight reads predate cancellation and must not close its dialog or stop its polling.
  progressVersions.set(validationState, {})
  validationState.cancelling = true
  stopPollingFn()
  try {
    // DELETE acknowledges the request only. Keep the handle/dialog until terminal progress.
    await cancel(handleId)
    return true
  } catch (error) {
    if (validationState.handleId === handleId) validationState.cancelling = false
    throw error
  }
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
  let active = true
  let pollingPending = false
  const pollingTimer = createPollingTimer(async () => {
    if (pollingPending || !active) return
    pollingPending = true
    try {
      // pollValidation owns progress/reload failures and always observes their rejection.
      await pollingFunction()
    } finally {
      pollingPending = false
    }
  })

  async function reloadCompletedRegister(registerId) {
    if (active) await registersStore.refreshDerived(registerId)
  }

  const progressPercent = computed(() => calculateValidationProgress(validationState))

  const getAllOptions = () => {
    if (mode === undefined) {
      return {}
    }
    return { mode: unref(mode) }
  }

  async function pollFeacnLookup() {
    await pollValidation(validationState, registersStore, alertStore, () => pollingTimer.stop(),
      reloadCompletedRegister, (handleId) => registersStore.getLookupFeacnCodesProgress(handleId))
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
          reloadCompletedRegister
        )

      await validateRegister(
        item,
        validationState,
        registersStore,
        alertStore,
        () => pollingTimer.stop(),
        () => active && pollingTimer.start(),
        sw,
        extended ? SwValidationMatchMode.SwMatch : SwValidationMatchMode.NoSwMatch,
        reloadCompletedRegister,
        () => active
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
      if (!active) return
      progressVersions.set(validationState, {})
      validationState.handleId = res.id
      validationState.total = 0
      validationState.processed = 0
      validationState.cancelling = false
      validationState.show = true
      await pollFeacnLookup()
      if (active && validationState.show) pollingTimer.start()
    } catch (err) {
      reportError(err, { context: 'register code lookup start' })
      if (active) alertStore.error(err, { fallback: 'Не удалось запустить подбор кодов ТН ВЭД' })
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
      await registersStore.calculateCustomsCharges(item.id)
      await registersStore.getAll(getAllOptions())
    } catch (err) {
      alertStore.error(err?.message || String(err))
    }
  }

  async function cancelValidationWrapper() {
    if (!active || !validationState.handleId || validationState.cancelling) return false
    const handleId = validationState.handleId
    const cancel = validationState.operation === 'lookup-feacn-codes'
      ? (id) => registersStore.cancelLookupFeacnCodes(id)
      : (id) => registersStore.cancelValidation(id)
    try {
      return await cancelValidation(validationState, registersStore, () => pollingTimer.stop(), cancel)
    } catch (error) {
      reportError(error, { context: 'register operation cancellation' })
      if (active && validationState.handleId === handleId) {
        alertStore.error(error, { fallback: 'Не удалось отменить обработку реестра' })
      }
      return false
    } finally {
      // Continue observing the same operation even if the cancellation acknowledgement was lost.
      if (active && validationState.handleId === handleId) pollingTimer.start()
    }
  }

  function stopPolling() {
    active = false
    pollingTimer.stop()
    validationState.handleId = null
    validationState.cancelling = false
    validationState.show = false
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
    await registersStore.calculateCustomsCharges(register.id)
    await registersStore.getById(register.id)

    if ((isComponentMounted?.value ?? true) && typeof loadParcels === 'function') {
      await loadParcels()
    }
  }

  const runcalculateCustomsCharges = async () => {
    await runActionWithDialog(
      calculateCustomsChargesForCurrentRegister,
      'calculate-customs-charges'
    )
  }

  function stop() {
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
