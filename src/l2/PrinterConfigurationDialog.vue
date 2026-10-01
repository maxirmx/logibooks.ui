<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, ref, watch } from 'vue'
import ActionButton from '@/components/ActionButton.vue'
import AppDialogFrame from '@/components/AppDialogFrame.vue'
import FieldError from '@/components/FieldError.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import {
  APP_DIALOG_BUTTON_PROPS,
  APP_DIALOG_MAX_WIDTH,
  APP_DIALOG_SIZES
} from '@/helpers/dialog.helpers.js'

const props = defineProps({
  show: Boolean,
  printers: { type: Array, default: () => [] },
  selected: { type: String, default: '' },
  connected: Boolean,
  mode: { type: String, default: 'Off' },
  active: Boolean,
  userId: { type: [Number, String], default: null },
  busy: Boolean,
  printing: Boolean,
  pendingPrint: Boolean,
  paused: Boolean,
  failed: { type: Object, default: null },
  overflow: { type: Object, default: null }
})
const emit = defineEmits(['select', 'clear', 'refresh', 'mode', 'close'])
const printerDraft = ref('')
const invalidPrinter = ref(false)
const printerOptions = computed(() => [...props.printers].sort(
  (a, b) => Number(/TE200/i.test(b)) - Number(/TE200/i.test(a)) || a.localeCompare(b)
))
const printerSelectionDisabled = computed(() => props.busy || props.printing)
const modeOptions = computed(() => [
  { title: 'Отключена', value: 'Off' },
  { title: 'Таджикистан', value: 'TJ', props: { disabled: !props.active || !props.userId || !props.selected } },
  { title: 'КГТ', value: 'KGT', props: { disabled: !props.active || !props.userId || !props.selected } }
])
watch(() => [props.show, props.pendingPrint, props.selected], ([show, pending, selected], previous = []) => {
  if (!show || !pending) { invalidPrinter.value = false; return }
  if (!previous[0] || !previous[1]) {
    printerDraft.value = selected || preferredPrinter()
    invalidPrinter.value = false
  } else if (selected !== previous[2]) {
    printerDraft.value = selected
    invalidPrinter.value = false
  }
}, { immediate: true })
watch(printerOptions, () => {
  if (props.show && props.pendingPrint && !printerDraft.value) printerDraft.value = props.selected || preferredPrinter()
})
function preferredPrinter() { return printerOptions.value.find((name) => /TE200/i.test(name)) || '' }
function selectPrinter(printer) {
  invalidPrinter.value = false
  if (props.pendingPrint) printerDraft.value = printer
  else emit('select', printer)
}
function submitPendingPrint() {
  if (printerSelectionDisabled.value) return
  invalidPrinter.value = !props.printers.includes(printerDraft.value)
  if (!invalidPrinter.value) emit('select', printerDraft.value)
}
function close() {
  if (!props.pendingPrint || !props.printing) emit('close')
}
</script>

<template>
  <v-dialog v-if="show" :model-value="show" :width="APP_DIALOG_SIZES.medium"
    :max-width="APP_DIALOG_MAX_WIDTH" aria-label="Настройки печати" persistent
    @keydown.esc.prevent.stop="close">
    <AppDialogFrame title="Настройки печати" data-testid="print-settings-dialog">
      <PageAlertRegion />
      <div class="printer-configuration-row">
        <v-select :model-value="pendingPrint ? printerDraft : selected" :items="printerOptions" label="Принтер этикеток"
          class="printer-configuration-selector" density="compact" variant="outlined" hide-details
          :disabled="printerSelectionDisabled" data-testid="printer-selection-inline"
          @update:model-value="selectPrinter" />
        <div class="header-actions header-actions-group">
          <ActionButton :item="{}" icon="fa-solid fa-broom" icon-size="2x"
            tooltip-text="Очистить выбор" aria-label="Очистить выбор" :disabled="busy || printing || !selected"
            @click="emit('clear')" data-testid="clear-printer" />
          <ActionButton :item="{}" icon="fa-solid fa-arrow-rotate-left" icon-size="2x"
            tooltip-text="Обновить список" aria-label="Обновить список" :disabled="printerSelectionDisabled"
            @click="emit('refresh')" data-testid="refresh-printers" />
        </div>
      </div>
      <FieldError name="printer" :errors="invalidPrinter ? { printer: 'Выберите доступный принтер' } : {}" />
      <p v-if="!connected" data-testid="printer-status">QZ Tray отключён</p>
      <v-select :model-value="mode" :items="modeOptions" item-title="title" item-value="value"
        label="Режим автомаркировки" density="compact" variant="outlined" hide-details
        :disabled="busy || pendingPrint" data-testid="auto-print-mode" @update:model-value="(value) => emit('mode', value)" />
      <p v-if="paused">Печать приостановлена</p>
      <p v-if="failed" data-testid="failed-print">Повторить скан {{ failed.scanCodeId }} ({{ failed.template }})</p>
      <p v-if="overflow" data-testid="print-overflow">Переполнение начиная со скана {{ overflow.scanCodeId }}. Выключите автомаркировку и проверьте сканы.</p>
      <template #actions>
        <v-btn v-bind="pendingPrint ? APP_DIALOG_BUTTON_PROPS.secondary : APP_DIALOG_BUTTON_PROPS.primary"
          :disabled="pendingPrint && printing" @click="close" data-testid="close-print-settings">{{ pendingPrint ? 'Отмена' : 'Закрыть' }}</v-btn>
        <v-btn v-if="pendingPrint" v-bind="APP_DIALOG_BUTTON_PROPS.primary" :disabled="busy || printing"
          @click="submitPendingPrint" data-testid="print-pending-label">Выбрать и печатать</v-btn>
      </template>
    </AppDialogFrame>
  </v-dialog>
</template>

<style scoped>
.printer-configuration-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.printer-configuration-selector {
  flex: 1;
  min-width: 0;
}
</style>
