// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, watch, ref, unref } from 'vue'
import { createRegisterActionHandlers } from '@/helpers/registers.list.helpers.js'

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

  const runExportAllXml = async () => {
    if (generalActionsDisabled.value) return
    await runWithLock(exportAllXml, true)
  }

  const runExportAllXmlWithoutExcise = async () => {
    if (generalActionsDisabled.value) return
    await runWithLock(exportAllXmlWithoutExcise, true)
  }

  const runExportAllXmlExcise = async () => {
    if (generalActionsDisabled.value) return
    await runWithLock(exportAllXmlExcise, true)
  }

  const runDownloadRegister = async () => {
    if (generalActionsDisabled.value) return
    await runWithLock(downloadRegister, true)
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
  }

  return {
    validationState,
    progressPercent,
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
