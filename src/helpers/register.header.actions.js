// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, watch, ref, unref, reactive } from 'vue'
import { createRegisterActionHandlers } from '@/helpers/registers.list.helpers.js'

const ACTION_DIALOG_TITLES = {
  'export-all-xml': 'Подготовка XML накладных',
  'export-all-xml-without-excise': 'Подготовка XML накладных (без акциза)',
  'export-all-xml-excise': 'Подготовка XML накладных (акциз)',
  'download-register': 'Подготовка файла реестра'
}

/**
 * Composable that wires register-level actions (validation, FEACN lookup, exports)
 * for register parcel lists.
 *
 * @param {Object} options - Configuration options
 * @param {Object} options.registersStore - Registers store instance
 * @param {Object} options.alertStore - Alert store instance
 * @param {import('vue').Ref<boolean>} options.runningAction - Ref tracking running actions
 * @param {import('vue').Ref<boolean>} options.tableLoading - Ref tracking parcels table loading state
 * @param {import('vue').Ref<boolean>} options.registerLoading - Ref tracking register loading state
 * @param {Function} options.loadOrders - Function to reload parcels for the current register
 * @param {import('vue').Ref<boolean>} options.isComponentMounted - Ref indicating component mounted state
 * @returns {Object} Register header action handlers
 */
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
    exportAllXml,
    exportAllXmlWithoutExcise,
    exportAllXmlExcise,
    downloadRegister,
    cancelValidation,
    stopPolling
  } = createRegisterActionHandlers(registersStore, alertStore)

  const registerLoadingRef = registerLoading ?? ref(false)
  const tableLoadingRef = tableLoading ?? ref(false)
  const runningActionRef = runningAction ?? ref(false)

  const actionDialogState = reactive({
    show: false,
    operation: null,
    title: ''
  })

  const currentRegister = computed(() => {
    const register = unref(registersStore?.item)
    if (!register || register.loading || register.error) {
      return null
    }
    return register
  })

  const registerReady = computed(() => !!currentRegister.value && !registerLoadingRef.value)

  const generalActionsDisabled = computed(() =>
    !registerReady.value || tableLoadingRef.value || runningActionRef.value
  )

  function showActionDialog(operation) {
    actionDialogState.operation = operation
    actionDialogState.title = ACTION_DIALOG_TITLES[operation] ?? 'Пожалуйста, подождите'
    actionDialogState.show = true
  }

  function hideActionDialog() {
    actionDialogState.show = false
    actionDialogState.operation = null
    actionDialogState.title = ''
  }

  async function runWithLock(action, lock = true) {
    const register = currentRegister.value
    if (!register) return
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
    if (generalActionsDisabled.value) return
    await runWithLock(validateRegisterSw, false)
  }

  const runValidateRegisterFc = async () => {
    if (generalActionsDisabled.value) return
    await runWithLock(validateRegisterFc, false)
  }

  const runLookupFeacnCodes = async () => {
    if (generalActionsDisabled.value) return
    await runWithLock(lookupFeacnCodes, false)
  }

  const runActionWithDialog = async (action, operation) => {
    if (generalActionsDisabled.value) return
    showActionDialog(operation)
    try {
      await runWithLock(action, true)
    } finally {
      hideActionDialog()
    }
  }

  const runExportAllXml = async () => {
    await runActionWithDialog(exportAllXml, 'export-all-xml')
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
    exportAllXml: runExportAllXml,
    exportAllXmlWithoutExcise: runExportAllXmlWithoutExcise,
    exportAllXmlExcise: runExportAllXmlExcise,
    downloadRegister: runDownloadRegister,
    cancelValidation,
    stop
  }
}
