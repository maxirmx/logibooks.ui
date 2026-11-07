<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, ref } from 'vue'
import { GTC_COMPANY_ID } from '@/helpers/company.constants.js'
import {
  buildParcelStatusBulkReport,
  getParcelStatusBulkNumberLabel,
  supportsParcelStickerLookup
} from '@/helpers/parcel.status.bulk.helpers.js'

const props = defineProps({
  prefix: { type: String, required: true },
  disabled: Boolean,
  register: { type: Object, default: null },
  processedCount: { type: Number, default: 0 },
  foundCount: { type: Number, default: 0 },
  missingNumbers: { type: Array, default: () => [] },
  blockedItems: { type: Array, default: () => [] },
  statusChange: Boolean
})

const bySticker = defineModel('bySticker', { type: Boolean, required: true })
const input = defineModel('input', { type: String, required: true })
const inputRef = ref(null)
const registerType = computed(() => Number(props.register?.registerType))
const isGtc = computed(() => registerType.value === GTC_COMPANY_ID)
const supportsStickerLookup = computed(() => supportsParcelStickerLookup(registerType.value))
const identifierLabel = computed(() => {
  if (!bySticker.value) return getParcelStatusBulkNumberLabel(props.register)
  return 'Стикеры или коды стикеров'
})
const identifierPlaceholder = computed(() => {
  const values = bySticker.value ? 'стикеры или коды стикеров' : 'номера'
  return `Введите или вставьте ${values} через запятую, табуляцию или с новой строки. Можно скопировать диапазон из таблицы Excel.`
})
const reportPlaceholder = computed(() => {
  if (bySticker.value) {
    const blocked = props.statusChange ? ' и стикеры посылок, недоступных для изменения статуса' : ''
    return `После поиска здесь появятся ненайденные стикеры${blocked}.`
  }
  const blocked = props.statusChange ? ' или которые недоступны для изменения статуса' : ''
  return `После поиска здесь появятся номера, которые не удалось найти${blocked}.`
})
const report = computed(() => buildParcelStatusBulkReport(
  props.missingNumbers, props.blockedItems, bySticker.value
))
const searchSummary = computed(() => {
  const { processedCount, foundCount, missingNumbers, blockedItems } = props
  if (processedCount <= 0) {
    const values = bySticker.value ? 'стикеры или коды стикеров' : 'номера отправлений'
    const search = `Введите ${values} и нажмите «Найти».`
    return props.statusChange
      ? search + ' Либо выберите статус и нажмите «Изменить статус всех посылок» для применения статуса ко всем посылкам в реестре.'
      : search
  }

  return `Обработано: ${processedCount}. Найдено: ${foundCount}. Не найдено: ${missingNumbers.length}. Недоступно: ${blockedItems.length}.`
})

defineExpose({ focus: () => inputRef.value?.focus() })
</script>

<template>
  <div>
    <div class="parcel-status-bulk-lookup">
      <span :class="{ 'parcel-status-bulk-mode-active': !bySticker }">По номерам отправлений</span>
      <v-switch
        v-model="bySticker"
        role="switch"
        aria-label="Поиск по стикерам"
        :aria-describedby="isGtc ? prefix + '-gtc-hint' : undefined"
        :disabled="disabled || !supportsStickerLookup"
        color="primary"
        density="compact"
        hide-details
        :data-testid="prefix + '-lookup'"
      />
      <span :class="{ 'parcel-status-bulk-mode-active': bySticker }">По стикерам и кодам стикеров</span>
    </div>
    <div v-if="isGtc" :id="prefix + '-gtc-hint'" class="parcel-status-bulk-summary">
      В реестрах GTC поиск доступен только по номеру посылки.
    </div>
  </div>

  <label :for="prefix + '-input'" class="parcel-status-bulk-label">{{ identifierLabel }}</label>
  <textarea
    :id="prefix + '-input'"
    ref="inputRef"
    v-model="input"
    class="input parcel-status-bulk-textarea"
    :placeholder="identifierPlaceholder"
    spellcheck="false"
    :disabled="disabled"
    :data-testid="prefix + '-input'"
  ></textarea>

  <label :for="prefix + '-report'" class="parcel-status-bulk-label">Не найдены / недоступны</label>
  <textarea
    :id="prefix + '-report'"
    class="input parcel-status-bulk-report"
    :value="report"
    readonly
    :placeholder="reportPlaceholder"
    :data-testid="prefix + '-report'"
  ></textarea>
  <div class="parcel-status-bulk-summary" :data-testid="prefix + '-summary'" aria-live="polite">
    {{ searchSummary }}
  </div>
</template>

<style scoped>
.parcel-status-bulk-lookup {
  display: grid;
  grid-template-columns: minmax(0, max-content) max-content max-content;
  align-items: center;
  column-gap: clamp(16px, 3vw, 24px);
}

.parcel-status-bulk-lookup > span:first-child {
  overflow-wrap: anywhere;
}

.parcel-status-bulk-mode-active {
  font-weight: 600;
}

.parcel-status-bulk-label {
  margin-top: 4px;
  font-weight: 600;
  color: #4b4b4b;
}

.parcel-status-bulk-textarea,
.parcel-status-bulk-report {
  width: 100%;
  min-height: 140px;
  resize: vertical;
  line-height: 1.35;
  font-family: inherit;
}

.parcel-status-bulk-report {
  min-height: 100px;
  max-height: 220px;
  overflow: auto;
  background-color: #f8f9fa;
  white-space: pre;
}

.parcel-status-bulk-summary {
  min-height: 22px;
  color: #555;
  font-size: 0.92rem;
}
</style>
