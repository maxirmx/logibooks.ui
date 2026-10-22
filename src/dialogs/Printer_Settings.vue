<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { isNavigationFailure, useRoute, useRouter } from 'vue-router'
import ActionButton from '@/components/ActionButton.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import FieldError from '@/components/FieldError.vue'
import { useLabelPrintingStore } from '@/stores/label.printing.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { normalizeInternalReturnUrl } from '@/helpers/parcel.navigation.helpers.js'
import { reportError } from '@/helpers/error.helpers.js'
import { getPrintingErrorCode, getPrintingErrorMessage } from '@/helpers/label.printing.helpers.js'
import PrintRecoveryDetails from '@/components/PrintRecoveryDetails.vue'

const printing = useLabelPrintingStore()
const alerts = useAlertStore()
const route = useRoute()
const router = useRouter()
const draft = reactive({ printer: printing.qzState.printer, mode: printing.preferredMode })
const saving = ref(false)
const errors = ref({})
const discoveryPending = ref(true)
const refreshing = ref(false)
let mounted = true
let discoveryAlertId = null
const busy = computed(() => saving.value || printing.operationInProgress || discoveryPending.value || refreshing.value)
const printers = computed(() => {
  const names = [...printing.qzState.printers]
  if (draft.printer && !names.includes(draft.printer)) names.push(draft.printer)
  return names.sort((a, b) => Number(/TE200/i.test(b)) - Number(/TE200/i.test(a)) || a.localeCompare(b))
})
const modes = computed(() => [
  { title: 'Отключён', value: 'Off' },
  { title: 'Таджикистан', value: 'TJ', props: { disabled: !draft.printer } },
  { title: 'КГТ', value: 'KGT', props: { disabled: !draft.printer } }
])
function clearPrinter() { draft.printer = ''; draft.mode = 'Off'; errors.value = {} }
async function leave() {
  try {
    const target = normalizeInternalReturnUrl(route.query.returnUrl)
    const isSettings = target && router.resolve(target).matched.at(-1) === route.matched.at(-1)
    const result = await router.push(target && !isSettings ? target : '/scanjobs')
    if (isNavigationFailure(result)) throw result
  } catch (error) { alerts.error(error, { fallback: 'Не удалось вернуться к предыдущей странице' }) }
}
async function save() {
  if (busy.value) return
  errors.value = {}
  if ((!draft.printer && draft.mode !== 'Off') || (draft.printer && draft.printer !== printing.qzState.printer && !printing.qzState.printers.includes(draft.printer))) {
    errors.value = { printer: 'Выберите доступный принтер' }
    return
  }
  saving.value = true
  try { if (await printing.saveSettings({ ...draft })) await leave() }
  catch (error) { alerts.error(getPrintingErrorMessage(error)) }
  finally { saving.value = false }
}
async function refreshPrinters() {
  refreshing.value = true
  try {
    await printing.refreshPrinters()
    if (mounted && discoveryAlertId != null) alerts.dismiss(discoveryAlertId)
    discoveryAlertId = null
  }
  catch (error) {
    if (mounted) {
      const id = alerts.error(getPrintingErrorMessage(error))
      if (getPrintingErrorCode(error) === 'QzUnavailable') discoveryAlertId = id
    }
    // A departed settings page must not publish errors on the destination page.
    else if (getPrintingErrorCode(error) !== 'QzUnavailable') reportError(error, { context: 'printing settings discovery after unmount' })
  } finally { refreshing.value = false }
}
onMounted(() => {
  printing.setSettingsActive(true)
  watch(() => printing.operationInProgress, (inProgress) => {
    if (!inProgress && discoveryPending.value) {
      discoveryPending.value = false
      refreshPrinters()
    }
  }, { immediate: true })
})
onUnmounted(() => {
  mounted = false
  printing.setSettingsActive(false)
  if (discoveryAlertId != null) alerts.dismiss(discoveryAlertId)
})
</script>

<template>
  <div class="settings form-2" data-testid="print-settings-page">
    <div class="header-with-actions">
      <h1 class="primary-heading">Настройки печати</h1>
      <div class="header-actions-bar">
        <div v-if="busy" class="header-actions header-actions-group" role="status" aria-label="Загрузка настроек печати" data-testid="print-settings-loading">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <div class="header-actions header-actions-group">
          <ActionButton :item="{}" icon="fa-solid fa-check-double" icon-size="2x"
            tooltip-text="Сохранить" aria-label="Сохранить" :disabled="busy" data-testid="save-print-settings" @click="save" />
          <ActionButton :item="{}" icon="fa-solid fa-xmark" icon-size="2x"
            tooltip-text="Отменить" aria-label="Отменить" :disabled="saving" data-testid="cancel-print-settings" @click="leave" />
        </div>
      </div>
    </div>
    <hr class="hr" />
    <PageAlertRegion />
    <PrintRecoveryDetails :failed="printing.state.failed || printing.recovery?.failed"
      :overflow="printing.state.overflow || printing.recovery?.overflow" />
    <div class="form-group">
      <label for="label-printer" class="label">Принтер этикеток:</label>
      <div class="printer-configuration-field">
        <div class="printer-configuration-row">
          <v-select id="label-printer" v-model="draft.printer" :items="printers"
            class="printer-configuration-selector" density="compact" variant="outlined" hide-details
            :disabled="busy" data-testid="printer-selection-inline" />
          <ActionButton :item="{}" icon="fa-solid fa-broom" tooltip-text="Очистить выбор" aria-label="Очистить выбор"
            :disabled="busy || !draft.printer" data-testid="clear-printer" @click="clearPrinter" />
          <ActionButton :item="{}" icon="fa-solid fa-arrow-rotate-left" tooltip-text="Обновить список" aria-label="Обновить список"
            :disabled="busy" data-testid="refresh-printers" @click="refreshPrinters" />
        </div>
        <FieldError name="printer" :errors="errors" />
      </div>
    </div>
    <div class="form-group">
      <label for="auto-print-mode" class="label">Режим автомаркировки:</label>
      <v-select id="auto-print-mode" v-model="draft.mode" :items="modes" item-title="title" item-value="value"
        class="printer-configuration-selector" density="compact" variant="outlined" hide-details
        :disabled="busy" data-testid="auto-print-mode" />
    </div>
  </div>
</template>

<style scoped>
.printer-configuration-field { flex: 1; min-width: 0; }
.printer-configuration-row { display: flex; align-items: center; gap: 8px; }
.printer-configuration-selector { flex: 1; min-width: 0; }
</style>
