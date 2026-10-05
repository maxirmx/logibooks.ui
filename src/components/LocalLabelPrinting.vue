<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, onUnmounted, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useAppConfirm } from '@/composables/useAppConfirm.js'
import { reportError } from '@/helpers/error.helpers.js'
import { getPrintingErrorMessage } from '@/helpers/label.printing.helpers.js'
import { createQzPrinting } from '@/services/qz.printing.js'
import { printingApi, createPrintChannel } from '@/services/printing.api.js'
import { createPrintingOwnership } from '@/services/printing.ownership.js'
import { createLabelPrintingCoordinator } from '@/services/label.printing.coordinator.js'
import ActionButton from '@/components/ActionButton.vue'
import PrinterConfigurationDialog from '@/l2/PrinterConfigurationDialog.vue'

const props = defineProps({ scanJobId: { type: Number, required: true }, userId: { type: [Number, String], default: null }, active: Boolean })
const auth = useAuthStore()
const alerts = useAlertStore()
const confirm = useAppConfirm()
const qz = createQzPrinting()
let mounted = true
const pendingTarget = ref(null)
const settingsOpen = ref(false)
const controlBusy = ref(false)
const channel = createPrintChannel((event) => coordinator.consume(event), (error) => coordinator.pause(error))
const coordinator = createLabelPrintingCoordinator({ qz, api: printingApi, channel, ownership: createPrintingOwnership(),
  onError: (error) => { if (mounted) alerts.error(getPrintingErrorMessage(error)) },
  onSent: () => { if (mounted) alerts.success('Этикетка отправлена в очередь принтера. Физическая печать не подтверждена.') }
})
const state = coordinator.state
const busy = computed(() => controlBusy.value || state.busy || Boolean(pendingTarget.value) || state.paused || state.queued > 0)
const operationInProgress = computed(() => controlBusy.value || state.busy)
const queueStatus = computed(() => ({ queued: state.queued, paused: state.paused }))
const configurationOpen = computed(() => settingsOpen.value)

async function refreshPrinters() {
  if (controlBusy.value || state.busy) return
  controlBusy.value = true
  try { await qz.connect() }
  catch (error) { if (mounted) alerts.error(getPrintingErrorMessage(error)) }
  finally {
    await coordinator.stopIfPrinterMissing()
    controlBusy.value = false
  }
}
watch(settingsOpen, (open) => { if (open) refreshPrinters() })
function openSettings() { settingsOpen.value = true }
function closeSettings() { settingsOpen.value = false; pendingTarget.value = null }
async function printTarget(target) {
  try { return await coordinator.manual(target) }
  catch (error) { if (mounted) alerts.error(getPrintingErrorMessage(error)) }
  return false
}
async function printParcel(target) {
  if (busy.value) return
  const captured = { ...target, scanJobId: props.scanJobId }
  if (!qz.state.printer) { pendingTarget.value = captured; openSettings(); return }
  await printTarget(captured)
}
async function selectPrinter(printer) {
  if (controlBusy.value || state.busy) return
  if (!printer) { await clearPrinter(); return }
  try {
    qz.select(printer)
    const target = pendingTarget.value
    if (target && await printTarget(target) && mounted && pendingTarget.value === target) closeSettings()
  } catch (error) { if (mounted) alerts.error(getPrintingErrorMessage(error)) }
}
async function setMode(mode) {
  if (controlBusy.value || (mode !== 'Off' && (pendingTarget.value || !props.active || !props.userId || !qz.state.printer))) return
  controlBusy.value = true
  try { await coordinator.arm(mode) }
  catch (error) { if (mounted) alerts.error(getPrintingErrorMessage(error)) }
  finally { controlBusy.value = false }
}
async function retry() {
  if (controlBusy.value || state.busy) return
  controlBusy.value = true
  try {
    if (state.failed && !await confirm({ title: 'Повторить отправку этикетки?', content: 'Этикетка могла уже попасть в очередь. Повтор может напечатать дубликат.', confirmationText: 'Повторить', cancellationText: 'Отмена' })) return
    await coordinator.retry()
  } catch (error) { if (mounted) alerts.error(getPrintingErrorMessage(error)) }
  finally { controlBusy.value = false }
}
async function reprint() { if (!busy.value && state.last) await printTarget({ ...state.last }) }
async function clearPrinter() {
  if (controlBusy.value || state.busy) return
  controlBusy.value = true
  try { await coordinator.disarm(); qz.clearSelection() }
  catch (error) { if (mounted) alerts.error(getPrintingErrorMessage(error)) }
  finally { controlBusy.value = false }
}
watch(() => [props.scanJobId, props.userId, props.active, auth.user?.token], () => {
  closeSettings()
  coordinator.setScope(props.active && auth.user?.token ? props.scanJobId : null, props.userId).catch((error) => reportError(error, { context: 'local printing scope cleanup' }))
}, { immediate: true, flush: 'sync' })
onUnmounted(() => {
  mounted = false
  // The UI is gone; report cleanup failures technically and still attempt disconnect.
  coordinator.disarm()
    .catch((error) => reportError(error, { context: 'local printing teardown' }))
    .then(() => qz.disconnect())
    .catch((error) => reportError(error, { context: 'local printing disconnect' }))
})
defineExpose({ printParcel, busy, operationInProgress, queueStatus, configurationOpen })
</script>

<template>
  <div class="local-label-printing" data-testid="local-label-printing">
    <div class="header-actions header-actions-group" data-testid="print-settings-group">
      <ActionButton
        :item="{}"
        icon="fa-solid fa-print"
        icon-size="2x"
        :variant="state.mode !== 'Off' ? 'green' : 'default'"
        tooltip-text="Настройки печати"
        aria-label="Настройки печати"
        data-testid="print-settings-action"
        @click="openSettings"
      />
      <ActionButton
        :item="{}"
        icon="fa-solid fa-repeat"
        icon-size="2x"
        tooltip-text="Повтор последней этикетки"
        aria-label="Повтор последней этикетки"
        :disabled="busy || !state.last"
        @click="reprint"
        data-testid="reprint-label"
      />
      <ActionButton
        v-if="state.paused && !state.overflow"
        :item="{}"
        icon="fa-solid fa-arrow-rotate-left"
        icon-size="2x"
        :tooltip-text="state.failed ? 'Повторить отправку' : 'Продолжить'"
        :aria-label="state.failed ? 'Повторить отправку' : 'Продолжить'"
        :disabled="operationInProgress"
        @click="retry"
        data-testid="retry-print"
      />
    </div>
    <PrinterConfigurationDialog :show="settingsOpen" :printers="qz.state.printers" :selected="qz.state.printer"
      :connected="qz.state.connected" :mode="state.mode" :active="active" :user-id="userId"
      :pending-print="Boolean(pendingTarget)"
      :busy="controlBusy" :printing="state.busy" :paused="state.paused" :failed="state.failed" :overflow="state.overflow"
      @select="selectPrinter" @clear="clearPrinter" @refresh="refreshPrinters" @mode="setMode" @close="closeSettings" />
  </div>
</template>

<style scoped>
.local-label-printing {
  display: contents;
}
</style>
