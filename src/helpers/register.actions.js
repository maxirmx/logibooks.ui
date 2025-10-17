// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, watch, ref, unref, reactive } from 'vue'
import { useActionDialog } from '@/composables/useActionDialog.js'

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

export async function pollValidation(validationState, registersStore, alertStore, stopPollingFn) {
  if (!validationState.handleId) return

  try {
    const progress = await registersStore.getValidationProgress(validationState.handleId)
    validationState.total = progress.total
    validationState.processed = progress.processed

    if (progress.finished || progress.total === -1 || progress.processed === -1) {
      validationState.show = false
      stopPollingFn()
      await registersStore.getAll()
    }
  } catch (err) {
    alertStore.error(err.message || String(err))
    validationState.show = false
    stopPollingFn()
    await registersStore.getAll()
  }
}

export async function validateRegister(
  item,
  validationState,
  registersStore,
  alertStore,
  stopPollingFn,
  startPollingFn,
  sw
) {
  try {
    stopPollingFn()
    const res = await registersStore.validate(item.id, sw)
    validationState.handleId = res.id
    validationState.total = 0
    validationState.processed = 0
    validationState.show = true
    await pollValidation(validationState, registersStore, alertStore, stopPollingFn)
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

export function createRegisterActionHandlers(registersStore, alertStore) {
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

  async function pollFeacnLookup() {
    if (!validationState.handleId) return

    try {
      const progress = await registersStore.getLookupFeacnCodesProgress(validationState.handleId)
      validationState.total = progress.total
      validationState.processed = progress.processed

      if (progress.finished || progress.total === -1 || progress.processed === -1) {
        validationState.show = false
        pollingTimer.stop()
        await registersStore.getAll()
      }
    } catch (err) {
      alertStore.error(err?.message || String(err))
      validationState.show = false
      pollingTimer.stop()
      await registersStore.getAll()
    }
  }

  async function runValidation(item, sw) {
    try {
      validationState.operation = 'validation'
      pollingFunction = () =>
        pollValidation(validationState, registersStore, alertStore, () => pollingTimer.stop())

      await validateRegister(
        item,
        validationState,
        registersStore,
        alertStore,
        () => pollingTimer.stop(),
        () => pollingTimer.start(),
        sw
      )
    } catch (err) {
      alertStore.error(err?.message || String(err))
    }
  }

  async function validateRegisterSw(item) {
    await runValidation(item, true)
  }

  async function validateRegisterFc(item) {
    await runValidation(item, false)
  }

  async function performFeacnLookup(item, { extended = false } = {}) {
    try {
      validationState.operation = 'lookup-feacn-codes'
      pollingTimer.stop()
      pollingFunction = pollFeacnLookup
      const res = await registersStore.lookupFeacnCodes(item.id, extended)
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

  async function exportAllXmlWithoutExcise(item) {
    await registersStore.generateWithoutExcise(item.id, item.invoiceNumber)
  }

  async function exportAllXmlExcise(item) {
    await registersStore.generateExcise(item.id, item.invoiceNumber)
  }

  async function downloadRegister(item) {
    await registersStore.download(item.id, item.fileName)
  }

  function cancelValidationWrapper() {
    const isFeacnLookup =
      validationState.operation === 'lookup-feacn-codes' ||
      validationState.operation === 'lookup-feacn-codes-ex'

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
    validateRegisterFc,
    lookupFeacnCodes,
    lookupFeacnCodesEx,
    exportAllXmlWithoutExcise,
    exportAllXmlExcise,
    downloadRegister,
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
  loadOrders,
  isComponentMounted
}) {
  const {
    validationState,
    progressPercent,
    validateRegisterSw,
    validateRegisterFc,
    lookupFeacnCodes,
    lookupFeacnCodesEx,
    exportAllXmlWithoutExcise,
    exportAllXmlExcise,
    downloadRegister,
    cancelValidation,
    stopPolling
  } = createRegisterActionHandlers(registersStore, alertStore)

  const registerLoadingRef = registerLoading ?? ref(false)
  const tableLoadingRef = tableLoading ?? ref(false)
  const runningActionRef = runningAction ?? ref(false)

  const { actionDialogState, showActionDialog, hideActionDialog } = useActionDialog()

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
    actionDialogState.show
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
    } finally {
      if (lock) {
        runningActionRef.value = false
      }
    }
  }

  const runValidateRegisterSw = async () => {
    await runWithLock(validateRegisterSw)
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

  const runExportAllXmlWithoutExcise = async () => {
    await runActionWithDialog(exportAllXmlWithoutExcise, 'export-all-xml-without-excise')
  }

  const runExportAllXmlExcise = async () => {
    await runActionWithDialog(exportAllXmlExcise, 'export-all-xml-excise')
  }

  const runDownloadRegister = async () => {
    await runActionWithDialog(downloadRegister, 'download-register')
  }

  function handleValidationDialogClose(show, previous) {
    const dialogClosed = previous && !show
    const componentMounted = isComponentMounted?.value ?? true
    const canReloadOrders = typeof loadOrders === 'function'

    if (dialogClosed && componentMounted && canReloadOrders) {
      Promise.resolve(loadOrders()).catch(() => {})
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
  }

  return {
    validationState,
    progressPercent,
    actionDialog: actionDialogState,
    generalActionsDisabled,
    validateRegisterSw: runValidateRegisterSw,
    validateRegisterFc: runValidateRegisterFc,
    lookupFeacnCodes: runLookupFeacnCodes,
    lookupFeacnCodesEx: runLookupFeacnCodesEx,
    exportAllXmlWithoutExcise: runExportAllXmlWithoutExcise,
    exportAllXmlExcise: runExportAllXmlExcise,
    downloadRegister: runDownloadRegister,
    cancelValidation,
    stop
  }
}
