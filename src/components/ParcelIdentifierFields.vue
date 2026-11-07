<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { ref } from 'vue'

defineProps({
  prefix: { type: String, required: true },
  disabled: Boolean,
  supportsStickerLookup: { type: Boolean, default: true },
  isGtc: Boolean,
  label: { type: String, required: true },
  placeholder: { type: String, required: true },
  reportLabel: { type: String, required: true },
  report: { type: String, default: '' },
  reportPlaceholder: { type: String, default: '' }
})

const bySticker = defineModel('bySticker', { type: Boolean, required: true })
const input = defineModel('input', { type: String, required: true })
const inputRef = ref(null)
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
      <span :class="{ 'parcel-status-bulk-mode-active': bySticker }">По стикерам</span>
    </div>
    <div v-if="isGtc" :id="prefix + '-gtc-hint'" class="parcel-status-bulk-summary">
      В реестрах GTC поиск доступен только по номеру посылки.
    </div>
  </div>

  <label :for="prefix + '-input'" class="parcel-status-bulk-label">{{ label }}</label>
  <textarea
    :id="prefix + '-input'"
    ref="inputRef"
    v-model="input"
    class="input parcel-status-bulk-textarea"
    :placeholder="placeholder"
    spellcheck="false"
    :disabled="disabled"
    :data-testid="prefix + '-input'"
  ></textarea>

  <label :for="prefix + '-report'" class="parcel-status-bulk-label">{{ reportLabel }}</label>
  <textarea
    :id="prefix + '-report'"
    class="input parcel-status-bulk-report"
    :value="report"
    readonly
    :placeholder="reportPlaceholder"
    :data-testid="prefix + '-report'"
  ></textarea>
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
