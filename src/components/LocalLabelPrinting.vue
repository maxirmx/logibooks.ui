<script setup>
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
import PrinterSelectionDialog from '@/dialogs/PrinterSelectionDialog.vue'

const props = defineProps({ scanJobId: { type: Number, required: true }, userId: { type: [Number, String], default: null }, active: Boolean })
const auth = useAuthStore()
const alerts = useAlertStore()
const confirm = useAppConfirm()
const qz = createQzPrinting()
let mounted = true
let pendingTarget = null
const selecting = ref(false)
const controlBusy = ref(false)
const channel = createPrintChannel((event) => coordinator.consume(event), (error) => coordinator.pause(error))
const coordinator = createLabelPrintingCoordinator({ qz, api: printingApi, channel, ownership: createPrintingOwnership(),
  onError: (error) => { if (mounted) alerts.error(getPrintingErrorMessage(error)) },
  onSent: () => { if (mounted) alerts.success('Этикетка отправлена в очередь принтера. Физическая печать не подтверждена.') }
})
const state = coordinator.state
const busy = computed(() => controlBusy.value || state.busy || selecting.value || state.paused || state.queued > 0)

async function choose() {
  controlBusy.value = true
  try { await qz.connect() }
  catch (error) { if (mounted) alerts.error(getPrintingErrorMessage(error)) }
  finally {
    controlBusy.value = false
    if (mounted) selecting.value = true
  }
}
async function printTarget(target) {
  try { await coordinator.manual(target) }
  catch (error) { if (mounted) alerts.error(getPrintingErrorMessage(error)) }
}
async function printParcel(target) {
  if (busy.value) return
  const captured = { ...target, scanJobId: props.scanJobId }
  if (!qz.state.printer) { pendingTarget = captured; await choose(); return }
  await printTarget(captured)
}
async function selectPrinter(printer) {
  try {
    qz.select(printer)
    selecting.value = false
    const target = pendingTarget
    pendingTarget = null
    if (target) await printTarget(target)
  } catch (error) { alerts.error(getPrintingErrorMessage(error)) }
}
function cancelSelection() { selecting.value = false; pendingTarget = null }
async function setMode(mode) {
  controlBusy.value = true
  try { await coordinator.arm(mode) }
  catch (error) { if (mounted) alerts.error(getPrintingErrorMessage(error)) }
  finally { controlBusy.value = false }
}
async function retry() {
  try {
    if (state.failed && !await confirm({ title: 'Повторить отправку этикетки?', content: 'Этикетка могла уже попасть в очередь. Повтор может напечатать дубликат.', confirmationText: 'Повторить', cancellationText: 'Отмена' })) return
    await coordinator.retry()
  } catch (error) { if (mounted) alerts.error(getPrintingErrorMessage(error)) }
}
async function reprint() { if (state.last) await printTarget({ ...state.last }) }
async function disconnect() {
  controlBusy.value = true
  try { await coordinator.disarm(); await qz.disconnect() }
  catch (error) { if (mounted) alerts.error(getPrintingErrorMessage(error)) }
  finally { controlBusy.value = false }
}
watch(() => [props.scanJobId, props.userId, props.active, auth.user?.token], () => {
  pendingTarget = null
  selecting.value = false
  coordinator.setScope(props.active && auth.user?.token ? props.scanJobId : null, props.userId).catch((error) => reportError(error, { context: 'local printing scope cleanup' }))
}, { immediate: true, flush: 'sync' })
onUnmounted(() => {
  mounted = false
  coordinator.disarm().then(() => qz.disconnect()).catch((error) => reportError(error, { context: 'local printing teardown' }))
})
defineExpose({ printParcel, busy })
</script>

<template>
  <div class="header-actions-bar" data-testid="local-label-printing">
    <div class="header-actions header-actions-group">
      <v-btn :disabled="controlBusy || state.busy || (state.mode !== 'Off' && !state.paused)" @click="choose" data-testid="choose-printer">Принтер этикеток</v-btn>
      <span data-testid="printer-status">{{ qz.state.connected ? (qz.state.printer || 'Принтер не выбран') : 'QZ Tray отключён' }}</span>
      <v-btn :disabled="controlBusy || state.busy" @click="disconnect" data-testid="disconnect-printer">Отключить</v-btn>
    </div>
    <div class="header-actions header-actions-group">
      <v-select :model-value="state.mode" :items="['Off', 'KGT', 'TJ']" label="Автопечать: Off / KGT / TJ"
        :disabled="controlBusy || !active || !userId || !qz.state.printer" hide-details data-testid="auto-print-mode" @update:model-value="setMode" />
      <v-btn v-if="state.mode !== 'Off'" :disabled="controlBusy" @click="setMode('Off')" data-testid="stop-auto-print">Выключить автопечать</v-btn>
      <span>В очереди: {{ state.queued }}{{ state.paused ? ' — приостановлена' : '' }}</span>
      <span v-if="state.failed" data-testid="failed-print">Повторить скан {{ state.failed.scanCodeId }} ({{ state.failed.template }})</span>
      <span v-if="state.overflow" data-testid="print-overflow">Переполнение начиная со скана {{ state.overflow.scanCodeId }}. Выключите автопечать и проверьте сканы.</span>
      <v-btn v-if="state.paused && !state.overflow" :disabled="state.busy" @click="retry" data-testid="retry-print">{{ state.failed ? 'Повторить отправку' : 'Продолжить' }}</v-btn>
      <v-btn :disabled="busy || !state.last" @click="reprint" data-testid="reprint-label">Повтор последней этикетки</v-btn>
    </div>
    <PrinterSelectionDialog :open="selecting" :printers="qz.state.printers" :selected="qz.state.printer" :busy="controlBusy"
      @select="selectPrinter" @cancel="cancelSelection" />
  </div>
</template>
