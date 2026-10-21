// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, reactive, ref } from 'vue'
import { defineStore } from 'pinia'
import { useAlertStore } from './alert.store.js'
import { reportError } from '@/helpers/error.helpers.js'
import { getPrintingErrorCode, getPrintingErrorMessage } from '@/helpers/label.printing.helpers.js'
import { createQzPrinting, PRINTER_STORAGE_KEY, printingError } from '@/services/qz.printing.js'
import { printingApi, createPrintChannel } from '@/services/printing.api.js'
import { createPrintingOwnership } from '@/services/printing.ownership.js'
import { createLabelPrintingCoordinator } from '@/services/label.printing.coordinator.js'

export const PRINT_MODE_STORAGE_KEY = 'logibooks.localLabelPrintMode'
export const useLabelPrintingStore = defineStore('labelPrinting', () => {
  const alerts = useAlertStore()
  const qz = createQzPrinting()
  const settingsActive = ref(false)
  const controlBusy = ref(false)
  const checkingAvailability = ref(false)
  let availabilityCheck = null
  let qzAlertId = null
  const preferredMode = ref('Off')
  const scope = reactive({ scanJobId: null, userId: null, active: false })
  let scopeOwner = null
  let scopeVersion = 0
  let scopeTransition = Promise.resolve()
  let disposed = false
  function showError(error) {
    if (getPrintingErrorCode(error) === 'QzUnavailable') {
      qz.state.connected = false
      // Availability diagnostics belong to settings; other pages disable printing silently.
      if (!disposed && settingsActive.value) qzAlertId = alerts.error(getPrintingErrorMessage(error))
    } else if (!disposed) alerts.error(getPrintingErrorMessage(error))
  }
  function dismissQzAlert() {
    if (qzAlertId != null) alerts.dismiss(qzAlertId)
    qzAlertId = null
  }
  const channel = createPrintChannel((event) => coordinator.consume(event), (error) => coordinator.pause(error))
  const coordinator = createLabelPrintingCoordinator({ qz, api: printingApi, channel, ownership: createPrintingOwnership(),
    // Background queue failures have no initiating UI operation to catch them.
    onError: showError,
    onSent: () => { if (!disposed) alerts.success('Этикетка отправлена в очередь принтера. Физическая печать не подтверждена.') }
  })
  const state = coordinator.state
  const busy = computed(() => !qz.state.connected || !qz.state.printer || checkingAvailability.value || controlBusy.value || state.busy || state.paused || state.queued > 0)
  const operationInProgress = computed(() => controlBusy.value || state.busy)
  const queueStatus = computed(() => ({ queued: state.queued, paused: state.paused }))
  function readPreferences() {
    qz.restoreSelection()
    const saved = localStorage.getItem(PRINT_MODE_STORAGE_KEY)
    preferredMode.value = ['KGT', 'TJ'].includes(saved) ? saved : 'Off'
  }
  try { readPreferences() } catch (error) { showError(error) }

  function checkAvailability() {
    if (!availabilityCheck) {
      checkingAvailability.value = true
      availabilityCheck = qz.connect().then(() => {
        dismissQzAlert()
        return true
      }, (error) => { showError(error); return false })
        .finally(() => { checkingAvailability.value = false; availabilityCheck = null })
    }
    return availabilityCheck
  }
  async function refreshPrinters() {
    if (controlBusy.value || state.busy) return
    controlBusy.value = true
    try { await checkAvailability() }
    finally { await coordinator.stopIfPrinterMissing(); controlBusy.value = false }
  }
  function setSettingsActive(active) {
    disposed = false
    settingsActive.value = active
    if (!active) dismissQzAlert()
  }
  async function printTarget(target) {
    try { return await coordinator.manual(target) }
    catch (error) {
      if (getPrintingErrorCode(error) === 'QzUnavailable') qz.state.connected = false
      throw error
    }
  }
  async function printParcel(target) {
    if (busy.value) return
    const captured = { ...target, scanJobId: scope.scanJobId }
    return printTarget(captured)
  }
  async function saveSettings({ printer, mode: nextMode }) {
    if (controlBusy.value || state.busy) return false
    controlBusy.value = true
    let previous = null
    let changed = false
    try {
      if (!['Off', 'KGT', 'TJ'].includes(nextMode)) throw printingError('InvalidData')
      if (!printer && nextMode !== 'Off') throw printingError('NoSelection')
      if (printer && printer !== qz.state.printer && !qz.state.printers.includes(printer)) throw printingError('PrinterMissing')
      previous = { printer: localStorage.getItem(PRINTER_STORAGE_KEY), mode: localStorage.getItem(PRINT_MODE_STORAGE_KEY) }
      await coordinator.disarm()
      changed = true
      if (!printer) qz.clearSelection()
      else if (qz.state.connected || printer !== qz.state.printer) qz.select(printer)
      else localStorage.setItem(PRINTER_STORAGE_KEY, printer)
      localStorage.setItem(PRINT_MODE_STORAGE_KEY, nextMode)
      preferredMode.value = nextMode
      await restoreMode(scopeVersion)
      return true
    } catch (error) {
      if (changed) {
        try {
          for (const [key, value] of [[PRINTER_STORAGE_KEY, previous.printer], [PRINT_MODE_STORAGE_KEY, previous.mode]]) {
            if (value === null) localStorage.removeItem(key)
            else localStorage.setItem(key, value)
          }
          readPreferences()
        } catch (rollbackError) { reportError(rollbackError, { context: 'printing settings rollback' }) }
      }
      if (getPrintingErrorCode(error) === 'QzUnavailable') qz.state.connected = false
      throw error
    } finally { controlBusy.value = false }
  }
  async function retry(confirm) {
    if (!qz.state.connected || controlBusy.value || state.busy) return
    controlBusy.value = true
    try {
      if (state.failed && !await confirm({ title: 'Повторить отправку этикетки?', content: 'Этикетка могла уже попасть в очередь. Повтор может напечатать дубликат.', confirmationText: 'Повторить', cancellationText: 'Отмена' })) return
      await coordinator.retry()
    } catch (error) {
      if (getPrintingErrorCode(error) === 'QzUnavailable') qz.state.connected = false
      throw error
    } finally { controlBusy.value = false }
  }
  async function reprint() { if (!busy.value && state.last) return printTarget({ ...state.last }) }
  async function restoreMode(version) {
    if (version !== scopeVersion || !scope.active || !scope.userId || !qz.state.connected || !qz.state.printer || preferredMode.value === 'Off') return
    controlBusy.value = true
    try { await coordinator.arm(preferredMode.value) }
    finally { controlBusy.value = false }
  }
  function bindScope(owner, scanJobId, userId, active) {
    disposed = false
    scopeOwner = owner
    Object.assign(scope, { scanJobId, userId, active })
    const version = ++scopeVersion
    scopeTransition = coordinator.setScope(active ? scanJobId : null, userId)
      .then(async () => {
        if (!qz.state.connected) await checkAvailability()
        // Scope restoration is background work with no initiating UI operation.
        try { await restoreMode(version) }
        catch (error) { showError(error) }
      })
      .catch((error) => reportError(error, { context: 'local printing scope cleanup' }))
  }
  function unbindScope(owner) {
    if (scopeOwner !== owner) return
    scopeOwner = null
    ++scopeVersion
    Object.assign(scope, { scanJobId: null, userId: null, active: false })
    scopeTransition = coordinator.setScope(null, null)
      .catch((error) => reportError(error, { context: 'local printing teardown' }))
  }
  async function syncSettings(event) {
    if ((event.storageArea && event.storageArea !== localStorage) || (event.key !== null && ![PRINTER_STORAGE_KEY, PRINT_MODE_STORAGE_KEY].includes(event.key))) return
    const version = ++scopeVersion
    try {
      await coordinator.disarm()
      readPreferences()
      await restoreMode(version)
    } catch (error) { showError(error) }
  }
  async function shutdown() {
    disposed = true
    if (scopeOwner) unbindScope(scopeOwner)
    await scopeTransition
    try { await qz.disconnect() }
    catch (error) { reportError(error, { context: 'local printing disconnect' }) }
  }
  return { qzState: qz.state, state, scope, preferredMode, settingsActive, controlBusy,
    busy, operationInProgress, queueStatus, refreshPrinters, setSettingsActive, printParcel,
    saveSettings, retry, reprint, bindScope, unbindScope, syncSettings, shutdown }
})
