<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed } from 'vue'
import ActionButton from '@/components/ActionButton.vue'
import RegisterStatusIcon from '@/components/RegisterStatusIcon.vue'
import RegisterStatusSelect from '@/components/RegisterStatusSelect.vue'

const props = defineProps({
  item: { type: Object, required: true },
  status: { type: Object, default: null },
  title: { type: String, default: '' },
  statusOptions: { type: Array, default: () => [] },
  canChange: { type: Boolean, default: false },
  editMode: { type: Boolean, default: false },
  selectedStatusId: { type: [Number, String], default: null },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['start', 'select', 'apply', 'cancel'])

const numericSelectedStatusId = computed(() => Number(props.selectedStatusId))
const numericCurrentStatusId = computed(() => Number(props.item?.statusId))
const hasChangedStatus = computed(() =>
  Number.isFinite(numericSelectedStatusId.value) &&
  numericSelectedStatusId.value > 0 &&
  numericSelectedStatusId.value !== numericCurrentStatusId.value
)

const applyDisabled = computed(() => props.disabled || !hasChangedStatus.value)
</script>

<template>
  <div v-if="editMode && canChange" class="register-status-inline-editor status-selector-inline">
    <RegisterStatusSelect
      :model-value="selectedStatusId"
      @update:model-value="(value) => emit('select', value)"
      :items="statusOptions"
      class="register-status-inline-select"
      placeholder="Статус партии"
      variant="outlined"
      density="compact"
      hide-details
      hide-no-data
      :show-selection-title="false"
      :menu-props="{ minWidth: 260 }"
      :disabled="disabled"
    />
    <ActionButton
      :item="item"
      icon="fa-solid fa-check"
      tooltip-text="Применить статус партии"
      :disabled="applyDisabled"
      @click="() => emit('apply', selectedStatusId)"
    />
    <ActionButton
      :item="item"
      icon="fa-solid fa-xmark"
      tooltip-text="Отменить"
      :disabled="disabled"
      @click="() => emit('cancel')"
    />
  </div>
  <button
    v-else-if="canChange"
    type="button"
    class="register-status-action-button"
    aria-label="Изменить статус партии"
    :title="title"
    :disabled="disabled"
    @click="() => emit('start')"
  >
    <RegisterStatusIcon :status="status" />
  </button>
  <span
    v-else
    class="register-status-action-button register-status-action-button--readonly"
    :title="title"
  >
    <RegisterStatusIcon :status="status" />
  </span>
</template>

<style scoped>
.register-status-inline-editor {
  margin: 3px;
}

.register-status-inline-editor :deep(.register-status-inline-select) {
  width: 58px;
  min-width: 58px;
  max-width: 58px;
}

.register-status-inline-editor :deep(.register-status-inline-select .v-field__input) {
  justify-content: center;
  min-height: 34px;
  padding-inline-start: 6px;
  padding-inline-end: 0;
}

.register-status-inline-editor :deep(.register-status-inline-select .v-select__selection) {
  margin-inline-end: 0;
}

.register-status-inline-editor :deep(.register-status-inline-select .register-status-icon) {
  width: 1.5rem;
  height: 1.5rem;
}

.register-status-action-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  padding: 0;
  margin-left: 1px;
  color: rgb(75, 75, 75);
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.register-status-action-button:hover:not(:disabled):not(.register-status-action-button--readonly) {
  transform: scale(1.1);
}

.register-status-action-button:focus {
  outline: none;
}

.register-status-action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.register-status-action-button--readonly {
  cursor: default;
}

.register-status-action-button :deep(.register-status-icon) {
  width: 2rem;
  height: 2rem;
}
</style>
