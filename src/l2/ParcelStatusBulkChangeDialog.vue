<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, nextTick, ref, watch } from 'vue'
import ActionButton from '@/components/ActionButton.vue'
import { useAlertStore } from '@/stores/alert.store.js'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { useRegistersStore } from '@/stores/registers.store.js'
import {
  buildParcelStatusBulkReport,
  getParcelStatusBulkNumberLabel,
  normalizeParcelStatusBulkIds,
  parseParcelStatusBulkInput
} from '@/helpers/parcel.status.bulk.helpers.js'

const props = defineProps({
  show: { type: Boolean, required: true },
  registerId: { type: Number, default: null },
  register: { type: Object, default: null },
  statusOptions: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:show', 'updated'])

const parcelsStore = useParcelsStore()
const registersStore = useRegistersStore()
const alertStore = useAlertStore()

const inputRef = ref(null)
const selectedStatusId = ref(null)
const parcelNumbersInput = ref('')
const foundParcelIds = ref([])
const missingNumbers = ref([])
const blockedItems = ref([])
const findInProgress = ref(false)
const updateFoundInProgress = ref(false)
const updateAllInProgress = ref(false)
const lastSearchCount = ref(0)

const parsedNumbers = computed(() => parseParcelStatusBulkInput(parcelNumbersInput.value))
const statusId = computed(() => Number(selectedStatusId.value))
const hasStatus = computed(() => Number.isInteger(statusId.value) && statusId.value > 0)
const hasRegister = computed(() => Number.isInteger(Number(props.registerId)) && Number(props.registerId) > 0)
const currentRegister = computed(() => {
  const registerId = Number(props.registerId)
  const matchesRegisterId = (register) =>
    register &&
    Number.isInteger(registerId) &&
    registerId > 0 &&
    Number(register.id) === registerId

  if (matchesRegisterId(props.register)) {
    return props.register
  }

  const registerFromItems = registersStore.items?.find(matchesRegisterId)
  if (registerFromItems) {
    return registerFromItems
  }

  if (matchesRegisterId(registersStore.item)) {
    return registersStore.item
  }

  if (Number.isInteger(registerId) && registerId > 0) {
    return null
  }

  return props.register || null
})
const busy = computed(() =>
  props.disabled ||
  findInProgress.value ||
  updateFoundInProgress.value ||
  updateAllInProgress.value
)
const foundCount = computed(() => foundParcelIds.value.length)
const missingCount = computed(() => missingNumbers.value.length)
const blockedCount = computed(() => blockedItems.value.length)
const canFind = computed(() => hasRegister.value && parsedNumbers.value.length > 0 && !busy.value)
const canUpdateFound = computed(() => hasRegister.value && hasStatus.value && foundCount.value > 0 && !busy.value)
const canUpdateAll = computed(() => hasRegister.value && hasStatus.value && !busy.value)
const parcelNumberLabel = computed(() => getParcelStatusBulkNumberLabel(currentRegister.value))
const notFoundReport = computed(() => buildParcelStatusBulkReport(missingNumbers.value, blockedItems.value))
const searchSummary = computed(() => {
  if (lastSearchCount.value <= 0) {
    return 'Введите номера посылок и нажмите "Найти". Либо выберите статус и нажмите "Изменить статус всех посылок" для применения статуса ко всем посылкам в реестре.'
  }

  return `Обработано: ${lastSearchCount.value}. Найдено: ${foundCount.value}. Не найдено: ${missingCount.value}. Недоступно: ${blockedCount.value}.`
})

watch(() => props.show, async (visible) => {
  if (visible) {
    await nextTick()
    inputRef.value?.focus()
  } else {
    resetState()
  }
})

watch(parcelNumbersInput, () => {
  resetResolution()
})

function resetResolution() {
  foundParcelIds.value = []
  missingNumbers.value = []
  blockedItems.value = []
  lastSearchCount.value = 0
}

function resetState() {
  selectedStatusId.value = null
  parcelNumbersInput.value = ''
  resetResolution()
  findInProgress.value = false
  updateFoundInProgress.value = false
  updateAllInProgress.value = false
}

function close() {
  emit('update:show', false)
}

function onDialogUpdate(value) {
  if (!value) {
    close()
  }
}

function getErrorMessage(error, fallback) {
  return error?.message || error?.msg || error?.reason || fallback
}

async function findParcels() {
  if (!canFind.value) {
    return
  }

  const numbers = parsedNumbers.value
  findInProgress.value = true
  try {
    const result = await parcelsStore.resolveStatusSelection(Number(props.registerId), numbers)
    foundParcelIds.value = normalizeParcelStatusBulkIds(result?.parcelIds)
    missingNumbers.value = Array.isArray(result?.missingNumbers) ? result.missingNumbers : []
    blockedItems.value = Array.isArray(result?.blockedItems) ? result.blockedItems : []
    lastSearchCount.value = numbers.length
  } catch (error) {
    alertStore.error(getErrorMessage(error, 'Ошибка при поиске посылок'))
  } finally {
    findInProgress.value = false
  }
}

async function updateFound() {
  if (!canUpdateFound.value) {
    return
  }

  updateFoundInProgress.value = true
  try {
    const result = await parcelsStore.updateStatusSelection(
      Number(props.registerId),
      statusId.value,
      foundParcelIds.value
    )
    const updatedCount = Number(result?.updatedCount ?? foundCount.value)
    const skippedCount = Number(result?.skippedCount ?? 0)
    alertStore.success(`Статус изменен для ${updatedCount} посылок${skippedCount > 0 ? `. Пропущено: ${skippedCount}` : ''}`)
    emit('updated')
  } catch (error) {
    alertStore.error(getErrorMessage(error, 'Ошибка при изменении статусов найденных посылок'))
  } finally {
    updateFoundInProgress.value = false
  }
}

async function updateAll() {
  if (!canUpdateAll.value) {
    return
  }

  updateAllInProgress.value = true
  try {
    await registersStore.setParcelStatuses(Number(props.registerId), statusId.value)
    alertStore.success('Статус успешно применен ко всем посылкам в реестре')
    emit('updated')
  } catch (error) {
    alertStore.error(getErrorMessage(error, 'Ошибка при изменении статусов всех посылок'))
  } finally {
    updateAllInProgress.value = false
  }
}

defineExpose({
  parseInput: parseParcelStatusBulkInput,
  findParcels,
  updateFound,
  updateAll
})
</script>

<template>
  <v-dialog
    :model-value="show"
    content-class="parcel-status-bulk-dialog-position"
    @update:model-value="onDialogUpdate"
  >
    <v-card class="parcel-status-bulk-card">
      <div class="parcel-status-bulk-header">
        <div class="header-with-actions">
          <h1 class="primary-heading">Изменить статус посылок</h1>
          <div class="header-actions-bar">
            <div v-if="busy" class="header-actions header-actions-group">
              <span class="spinner-border spinner-border-m"></span>
            </div>
            <div class="header-actions header-actions-group">
              <ActionButton
                :item="{}"
                icon="fa-solid fa-magnifying-glass"
                tooltip-text="Найти"
                iconSize="2x"
                :disabled="!canFind"
                aria-label="Найти"
                data-testid="parcel-status-bulk-find"
                @click="findParcels"
              />
              <ActionButton
                :item="{}"
                icon="fa-solid fa-check"
                tooltip-text="Изменить статус найденных"
                iconSize="2x"
                :disabled="!canUpdateFound"
                aria-label="Изменить статус найденных"
                data-testid="parcel-status-bulk-update-found"
                @click="updateFound"
              />
            </div>
            <div class="header-actions header-actions-group">
              <ActionButton
                :item="{}"
                icon="fa-solid fa-check-double"
                tooltip-text="Изменить статус всех посылок"
                iconSize="2x"
                :disabled="!canUpdateAll"
                aria-label="Изменить статус всех посылок"
                data-testid="parcel-status-bulk-update-all"
                @click="updateAll"
              />
              <ActionButton
                :item="{}"
                icon="fa-solid fa-xmark"
                tooltip-text="Отменить"
                iconSize="2x"
                :disabled="busy"
                aria-label="Отменить"
                data-testid="parcel-status-bulk-cancel"
                @click="close"
              />
            </div>
          </div>
        </div>
        <hr class="hr" />
      </div>

      <v-card-text class="parcel-status-bulk-content">
        <v-select
          v-model="selectedStatusId"
          :items="statusOptions"
          item-title="title"
          item-value="id"
          label="Новый статус"
          variant="outlined"
          density="compact"
          hide-details
          :disabled="busy"
          data-testid="parcel-status-bulk-status"
        />

        <label for="parcel-status-bulk-input" class="parcel-status-bulk-label">
          {{ parcelNumberLabel }}
        </label>
        <textarea
          id="parcel-status-bulk-input"
          ref="inputRef"
          v-model="parcelNumbersInput"
          class="input parcel-status-bulk-textarea"
          placeholder="Введите или вставьте номера через запятую, табуляцию или с новой строки. Можно скопировать диапазон из таблицы Excel."
          spellcheck="false"
          :disabled="busy"
          data-testid="parcel-status-bulk-input"
        ></textarea>

        <label for="parcel-status-bulk-report" class="parcel-status-bulk-label">
          Не найдены / недоступны
        </label>
        <textarea
          id="parcel-status-bulk-report"
          class="input parcel-status-bulk-report"
          :value="notFoundReport"
          readonly
          placeholder="После поиска здесь появятся номера посылок, которые не удалось найти или которые недоступны для изменения статуса."
          data-testid="parcel-status-bulk-report"
        ></textarea>

        <div class="parcel-status-bulk-summary" data-testid="parcel-status-bulk-summary">
          {{ searchSummary }}
        </div>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.parcel-status-bulk-card {
  border: 2px solid #797979;
  box-shadow: 0px 3px 7px rgba(0, 0, 0, 0.1);
  border-radius: 0.25rem;
}

.parcel-status-bulk-header {
  padding: 16px 16px 0;
}

.parcel-status-bulk-header .header-with-actions {
  align-items: center;
  margin-bottom: 0.5rem;
}

.parcel-status-bulk-header .primary-heading {
  margin: 0;
}

.parcel-status-bulk-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 0;
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

<style>
.parcel-status-bulk-dialog-position {
  position: absolute !important;
  top: 8vh !important;
  left: 2vw !important;
  width: min(960px, 96vw) !important;
  overflow: visible !important;
}
</style>
