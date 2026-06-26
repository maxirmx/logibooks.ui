<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import RegisterStatusIcon from '@/components/RegisterStatusIcon.vue'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  modelValue: { type: [Number, String], default: null },
  items: { type: Array, default: () => [] },
  placeholder: { type: String, default: '' },
  variant: { type: String, default: 'outlined' },
  density: { type: String, default: 'compact' },
  hideDetails: { type: Boolean, default: false },
  hideNoData: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  showSelectionTitle: { type: Boolean, default: true },
  menuProps: { type: Object, default: null }
})

const emit = defineEmits(['update:modelValue'])

function normalizeRegisterStatus(status) {
  if (!status || typeof status !== 'object') {
    return null
  }

  return {
    ...status,
    id: status.id ?? status.Id,
    title: status.title ?? status.Title,
    icon: status.icon ?? status.Icon ?? null,
    bkColor: status.bkColor ?? status.BkColor ?? null,
    fgColor: status.fgColor ?? status.FgColor ?? null
  }
}

function isRegisterStatusDto(value) {
  return Boolean(value && typeof value === 'object' && (
    Object.prototype.hasOwnProperty.call(value, 'id') ||
    Object.prototype.hasOwnProperty.call(value, 'Id') ||
    Object.prototype.hasOwnProperty.call(value, 'title') ||
    Object.prototype.hasOwnProperty.call(value, 'Title') ||
    Object.prototype.hasOwnProperty.call(value, 'icon') ||
    Object.prototype.hasOwnProperty.call(value, 'Icon') ||
    Object.prototype.hasOwnProperty.call(value, 'bkColor') ||
    Object.prototype.hasOwnProperty.call(value, 'BkColor') ||
    Object.prototype.hasOwnProperty.call(value, 'fgColor') ||
    Object.prototype.hasOwnProperty.call(value, 'FgColor')
  ))
}

function sameStatusId(left, right) {
  if (left === null || left === undefined || right === null || right === undefined) {
    return false
  }

  return String(left) === String(right)
}

function findRegisterStatus(statusId) {
  const match = props.items.find(status => sameStatusId(status?.id ?? status?.Id, statusId))
  return normalizeRegisterStatus(match)
}

function getRegisterStatusSelectItem(selectItem) {
  const raw = selectItem?.raw ?? selectItem
  if (raw === null || raw === undefined || raw === '') {
    return null
  }

  if (isRegisterStatusDto(raw)) {
    return normalizeRegisterStatus(raw)
  }

  if (typeof raw === 'object') {
    if (raw.raw !== undefined) {
      return getRegisterStatusSelectItem(raw.raw)
    }

    if (raw.value !== undefined) {
      return findRegisterStatus(raw.value)
    }
  }

  return findRegisterStatus(raw)
}

function getRegisterStatusSelectTitle(selectItem) {
  return getRegisterStatusSelectItem(selectItem)?.title || ''
}
</script>

<template>
  <v-select
    v-bind="$attrs"
    :model-value="modelValue"
    @update:model-value="(value) => emit('update:modelValue', value)"
    :items="items"
    item-title="title"
    item-value="id"
    class="register-status-select"
    :placeholder="placeholder"
    :variant="variant"
    :density="density"
    :hide-details="hideDetails"
    :hide-no-data="hideNoData"
    :disabled="disabled"
    :menu-props="menuProps"
  >
    <template #selection="{ item: selectedItem }">
      <div class="register-status-select-row" :title="getRegisterStatusSelectTitle(selectedItem)">
        <RegisterStatusIcon :status="getRegisterStatusSelectItem(selectedItem)" size="sm" />
        <span v-if="showSelectionTitle" data-testid="register-status-selection-title">
          {{ getRegisterStatusSelectTitle(selectedItem) }}
        </span>
      </div>
    </template>
    <template #item="{ props: itemProps, item: option }">
      <div class="register-status-select-row register-status-select-option" v-bind="itemProps">
        <RegisterStatusIcon :status="getRegisterStatusSelectItem(option)" size="sm" />
        <span data-testid="register-status-option-title">{{ getRegisterStatusSelectTitle(option) }}</span>
      </div>
    </template>
  </v-select>
</template>

<style scoped>
.register-status-select-row {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.register-status-select-option {
  display: flex;
  width: 100%;
  padding: 0.375rem 0.75rem;
  cursor: pointer;
}

.register-status-select :deep(.register-status-icon) {
  width: 1.75rem;
  height: 1.75rem;
}
</style>
