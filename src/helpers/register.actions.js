// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, watch, ref, unref, reactive } from 'vue'
import { useConfirm } from 'vuetify-use-dialog'
import { useActionDialog } from '@/composables/useActionDialog.js'
import { FeacnMatchMode } from '@/models/feacn.match.mode.js'
import { SwValidationMatchMode } from '@/models/sw.validation.match.mode.js'
import {
  chooseOutputWeightCorrection,
  getWeightCorrection,
  WEIGHT_CORRECTION_CHOICE
} from '@/helpers/weight.correction.helpers.js'

export const POLLING_INTERVAL_MS = 1000

export function createValidationState() {
  return {
    show: false,
    handleId: null,
    total: 0,
    processed: 0
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
  getAllOptions = {}
) {
  if (!validationState.handleId) return

  try {
    const progress = await registersStore.getValidationProgress(validationState.handleId)
    validationState.total = progress.total
    validationState.processed = progress.processed

    if (progress.finished || progress.total === -1 || progress.processed === -1) {
      validationState.show = false
      stopPollingFn()
      await registersStore.getAll(getAllOptions)
    }
  } catch (err) {
    alertStore.error(err.message || String(err))
    validationState.show = false
    stopPollingFn()
    await registersStore.getAll(getAllOptions)
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
  getAllOptions = {}
) {
  try {
    stopPollingFn()
    const res = await registersStore.validate(item.id, sw, swMatchMode)
    validationState.handleId = res.id
    validationState.total = 0
    validationState.processed = 0
    validationState.show = true
    await pollValidation(validationState, registersStore, alertStore, stopPollingFn, getAllOptions)
    startPollingFn()
  } catch (err) {
    alertStore.error(err.message || String(err))
  }
}

export function cancelValidation(validationState, registersStore, stopPollingFn) {
  if (validationState.handleId) {
    registersStore.cancelValidation(validationState.handleId).catch(() => {})
  }
  validationState.show = false
  stopPollingFn()
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
    if (!validationState.handleId) return

    try {
      const progress = await registersStore.getLookupFeacnCodesProgress(validationState.handleId)
      validationState.total = progress.total
      validationState.processed = progress.processed

      if (progress.finished || progress.total === -1 || progress.processed === -1) {
        validationState.show = false
        pollingTimer.stop()
        await registersStore.getAll(getAllOptions())
      }
    } catch (err) {
      alertStore.error(err?.message || String(err))
      validationState.show = false
      pollingTimer.stop()
      await registersStore.getAll(getAllOptions())
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
          getAllOptions()
        )

      await validateRegister(
        item,
        validationState,
        registersStore,
        alertStore,
        () => pollingTimer.stop(),
        () => pollingTimer.start(),
        sw,
        extended ? SwValidationMatchMode.SwMatch : SwValidationMatchMode.NoSwMatch,
        getAllOptions()
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
      pollingTimer.stop()
      pollingFunction = pollFeacnLookup
      const res = await registersStore.lookupFeacnCodes(
        item.id,
        extended ? FeacnMatchMode.FCMatchAndAssign : FeacnMatchMode.FCMatch
      )
      validationState.handleId = res.id
      validationState.total = 0
      validationState.processed = 0
      validationState.show = true
      await pollFeacnLookup()
      pollingTimer.start()
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

  async function downloadTechdoc(item) {
    await registersStore.downloadTechdoc(item.id, item.invoiceNumber)
  }

  async function freezeTnVedOrder(item) {
    await registersStore.freezeTnVedOrder(item.id)
  }

  async function freezeCheckStatus(item) {
    await registersStore.freezeCheckStatus(item.id)
  }

  async function calculateCustomsCharges(item) {
    try {
      await registersStore.calculateCustomsCharges(item.id)
      await registersStore.getAll(getAllOptions())
    } catch (err) {
      alertStore.error(err?.message || String(err))
    }
  }

  function cancelValidationWrapper() {
    const isFeacnLookup =
      validationState.operation === 'lookup-feacn-codes'

    if (isFeacnLookup) {
      if (validationState.handleId) {
        registersStore.cancelLookupFeacnCodes(validationState.handleId).catch(() => {})
      }
      validationState.show = false
      pollingTimer.stop()
      return
    }
    // Fallback to regular validation cancellation
    cancelValidation(validationState, registersStore, () => pollingTimer.stop())
  }

  function stopPolling() {
    pollingTimer.stop()
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
    downloadTechdoc,
    freezeCheckStatus,
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
    downloadTechdoc,
    freezeCheckStatus,
    freezeTnVedOrder,
    cancelValidation,
    stopPolling
  } = createRegisterActionHandlers(registersStore, alertStore)

  const registerLoadingRef = registerLoading ?? ref(false)
  const tableLoadingRef = tableLoading ?? ref(false)
  const runningActionRef = runningAction ?? ref(false)

  const { actionDialogState, showActionDialog, hideActionDialog } = useActionDialog()
  const confirm = useConfirm()
  const weightCorrectionChoicePending = ref(false)

  const currentRegister = computed(() => {
    const register = unref(registersStore?.item)
    if (!register || register.loading || register.error) {
      return null
    }
    return register
  })

  const registerReady = computed(() => !!currentRegister.value && !registerLoadingRef.value)

  const generalActionsDisabled = computed(() =>
    !registerReady.value ||
    tableLoadingRef.value ||
    runningActionRef.value ||
    validationState.show ||
    actionDialogState.show ||
    weightCorrectionChoicePending.value
  )

  async function runWithLock(action, { lock = true, checkDisabled = true } = {}) {
    const register = currentRegister.value
    if (!register) return
    if (checkDisabled && generalActionsDisabled.value) return
    if (lock && runningActionRef.value) return

    if (lock) {
      runningActionRef.value = true
    }

    try {
      await action(register)
    } catch (err) {
      alertStore.error(err?.message || String(err))
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
    if (generalActionsDisabled.value) return
    showActionDialog(operation)
    try {
      await runWithLock(action, { lock: true, checkDisabled: false })
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
    if (generalActionsDisabled.value) return

    let applyWeightCorrection = false
    if (getWeightCorrection(currentRegister.value).canCorrect) {
      applyWeightCorrection = await chooseWeightCorrectionForCurrentRegister()
    }

    showActionDialog(operation)
    try {
      await runWithLock(
        (register) => action(register, applyWeightCorrection),
        { lock: true, checkDisabled: false }
      )
    } finally {
      hideActionDialog()
    }
  }

  const runDownloadActionWithDialog = async (action, operation) => {
    if (generalActionsDisabled.value) return

    let applyWeightCorrection = false
    if (getWeightCorrection(currentRegister.value).canCorrect) {
      applyWeightCorrection = await chooseWeightCorrectionForCurrentRegister()
    }

    showActionDialog(operation)
    try {
      await runWithLock(
        (register) => action(register, applyWeightCorrection),
        { lock: true, checkDisabled: false }
      )
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

  const runDownloadRegister = async () => {
    await runDownloadActionWithDialog(downloadRegister, 'download-register')
  }

  const runDownloadAdditionalRestrictions = async () => {
    await runActionWithDialog(downloadAdditionalRestrictions, 'download-additional-restrictions')
  }

  const runDownloadTechdoc = async () => {
    await runActionWithDialog(downloadTechdoc, 'download-techdoc')
  }

  const runFreezeTnVedOrder = async () => {
    await runActionWithDialog(freezeTnVedOrder, 'freeze-tnved-order')
  }

  const runFreezeCheckStatus = async () => {
    await runActionWithDialog(freezeCheckStatus, 'freeze-check-status')
  }

  async function calculateCustomsChargesForCurrentRegister(register) {
    await registersStore.calculateCustomsCharges(register.id)
    await registersStore.getById(register.id)

    if ((isComponentMounted?.value ?? true) && typeof loadParcels === 'function') {
      await loadParcels()
    }
  }

  const runcalculateCustomsCharges = async () => {
    await runActionWithDialog(calculateCustomsChargesForCurrentRegister, 'calculate-customs-charges')
  }

  function handleValidationDialogClose(show, previous) {
    const dialogClosed = previous && !show
    const componentMounted = isComponentMounted?.value ?? true
    const canReloadParcels = typeof loadParcels === 'function'

    if (dialogClosed && componentMounted && canReloadParcels) {
      Promise.resolve(loadParcels()).catch(() => {})
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
  }

  return {
    validationState,
    progressPercent,
    actionDialog: actionDialogState,
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
    downloadTechdoc: runDownloadTechdoc,
    freezeCheckStatus: runFreezeCheckStatus,
    freezeTnVedOrder: runFreezeTnVedOrder,
    calculateCustomsCharges: runcalculateCustomsCharges,
    cancelValidation,
    stop
  }
}
