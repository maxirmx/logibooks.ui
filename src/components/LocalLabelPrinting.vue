<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, onUnmounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useLabelPrintingStore } from '@/stores/label.printing.store.js'
import { getPrintingErrorCode, getPrintingErrorMessage } from '@/helpers/label.printing.helpers.js'
import { reportError } from '@/helpers/error.helpers.js'
import { useAppConfirm } from '@/composables/useAppConfirm.js'
import ActionButton from '@/components/ActionButton.vue'

const props = defineProps({ scanJobId: { type: Number, default: null }, userId: { type: [Number, String], default: null }, active: Boolean })
const auth = useAuthStore()
const alerts = useAlertStore()
const printing = useLabelPrintingStore()
const confirm = useAppConfirm()
const owner = Symbol('printing scope')
let mounted = true
const { state, busy, operationInProgress, queueStatus, qzState } = storeToRefs(printing)
async function runPrint(operation) {
  try { return await operation() }
  catch (error) {
    // Availability diagnostics belong to settings; unmounted pages must not publish alerts.
    if (mounted && getPrintingErrorCode(error) !== 'QzUnavailable') alerts.error(getPrintingErrorMessage(error))
    else if (!mounted && getPrintingErrorCode(error) !== 'QzUnavailable') reportError(error, { context: 'local printing after unmount' })
    return false
  }
}
const printParcel = (target) => runPrint(() => printing.printParcel(target))
const reprint = () => runPrint(() => printing.reprint())
const retry = () => runPrint(() => printing.retry(confirm))
watch(() => [props.scanJobId, props.userId, props.active, auth.user?.token], () => {
  printing.bindScope(owner, props.scanJobId, props.userId, Boolean(props.active && auth.user?.token))
}, { immediate: true, flush: 'sync' })
onUnmounted(() => { mounted = false; printing.unbindScope(owner) })
const hasActions = computed(() => Boolean(state.value.last || state.value.paused))
defineExpose({ printParcel, busy, operationInProgress, queueStatus })
</script>

<template>
  <div v-if="hasActions" class="header-actions header-actions-group" data-testid="local-label-printing">
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
      :disabled="operationInProgress || !qzState.connected"
      @click="retry"
      data-testid="retry-print"
    />
  </div>
</template>
