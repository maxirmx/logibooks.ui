<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, onBeforeUnmount, ref, watch, watchPostEffect } from 'vue'
import ActionButton from '@/components/ActionButton.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import ParcelIdentifierFields from '@/components/ParcelIdentifierFields.vue'
import { useParcelSelectionRequest } from '@/composables/useParcelSelectionRequest.js'
import { GTC_COMPANY_ID, OZON_COMPANY_ID } from '@/helpers/company.constants.js'
import { getErrorMessage, reportError } from '@/helpers/error.helpers.js'
import { useAppConfirm } from '@/composables/useAppConfirm.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { useRegistersStore } from '@/stores/registers.store.js'
import {
  buildParcelStatusBulkReport,
  getParcelStatusBulkNumberLabel,
  normalizeParcelStatusBulkIds,
  parseParcelStatusBulkInput,
  supportsParcelStickerLookup
} from '@/helpers/parcel.status.bulk.helpers.js'
import {
  buildCustomsExclusionWarning,
  formatParcelCountGenitive,
  getStatusById
} from '@/helpers/lifecycle.warning.helpers.js'

const props = defineProps({
  show: { type: Boolean, required: true },
  registerId: { type: Number, default: null },
  register: { type: Object, default: null },
  statusOptions: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:show', 'updated', 'progress-visible'])

const parcelsStore = useParcelsStore()
const registersStore = useRegistersStore()
const alertStore = useAlertStore()
const confirm = useAppConfirm()

const inputRef = ref(null)
const selectedStatusId = ref(null)
const bySticker = ref(false)
const identifiersInput = ref('')
const foundParcelIds = ref([])
const missingNumbers = ref([])
const blockedItems = ref([])
const { activeOperation, beginOperation, isCurrent, finishOperation, invalidateOperation } = useParcelSelectionRequest()
const lastSearchCount = ref(0)

const parsedIdentifiers = computed(() => parseParcelStatusBulkInput(identifiersInput.value))
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
const registerType = computed(() => Number(currentRegister.value?.registerType))
const isGtc = computed(() => registerType.value === GTC_COMPANY_ID)
const supportsStickerLookup = computed(() => supportsParcelStickerLookup(registerType.value))
const busy = computed(() => activeOperation.value !== null)
const actionsDisabled = computed(() => props.disabled || currentRegister.value?.readOnly === true)
const canOperate = computed(() => props.show && hasRegister.value && !actionsDisabled.value && !busy.value)
const foundCount = computed(() => foundParcelIds.value.length)
const missingCount = computed(() => missingNumbers.value.length)
const blockedCount = computed(() => blockedItems.value.length)
const canFind = computed(() => canOperate.value && parsedIdentifiers.value.length > 0)
const canUpdateFound = computed(() => canOperate.value && hasStatus.value && foundCount.value > 0)
const canUpdateAll = computed(() => canOperate.value && hasStatus.value)
const identifierLabel = computed(() => {
  if (!bySticker.value) return getParcelStatusBulkNumberLabel(currentRegister.value)
  return registerType.value === OZON_COMPANY_ID ? 'Штрихкоды' : 'Стикеры'
})
const identifierPlaceholder = computed(() => {
  const values = bySticker.value ? 'коды со стикеров' : 'номера'
  return `Введите или вставьте ${values} через запятую, табуляцию или с новой строки. Можно скопировать диапазон из таблицы Excel.`
})
const reportPlaceholder = computed(() => bySticker.value
  ? 'После поиска здесь появятся ненайденные коды и коды посылок, недоступных для изменения статуса.'
  : 'После поиска здесь появятся номера посылок, которые не удалось найти или которые недоступны для изменения статуса.'
)
const notFoundReport = computed(() => buildParcelStatusBulkReport(
  missingNumbers.value, blockedItems.value, bySticker.value
))
const searchSummary = computed(() => {
  if (lastSearchCount.value <= 0) {
    const values = bySticker.value ? 'коды со стикеров' : 'номера посылок'
    return `Введите ${values} и нажмите «Найти». Либо выберите статус и нажмите «Изменить статус всех посылок» для применения статуса ко всем посылкам в реестре.`
  }

  return bySticker.value
    ? `Обработано кодов: ${lastSearchCount.value}. Найдено посылок: ${foundCount.value}. Не найдено кодов: ${missingCount.value}. Недоступных совпадений: ${blockedCount.value}.`
    : `Обработано: ${lastSearchCount.value}. Найдено: ${foundCount.value}. Не найдено: ${missingCount.value}. Недоступно: ${blockedCount.value}.`
})

watch(() => props.show && busy.value, visible => emit('progress-visible', visible))
watchPostEffect(() => {
  if (props.show) inputRef.value?.focus()
})
watch(() => props.show, (visible) => {
  if (visible) alertStore.clear()
  else resetState()
}, { immediate: true, flush: 'sync' })
watch(() => props.registerId, resetState, { flush: 'sync' })
watch(registerType, () => {
  if (!supportsStickerLookup.value) bySticker.value = false
  invalidateResolution()
}, { flush: 'sync' })
watch([identifiersInput, bySticker], invalidateResolution, { flush: 'sync' })
onBeforeUnmount(invalidateOperation)

function resetResolution() {
  foundParcelIds.value = []
  missingNumbers.value = []
  blockedItems.value = []
  lastSearchCount.value = 0
}

function invalidateResolution() {
  invalidateOperation()
  resetResolution()
}

function resetState() {
  selectedStatusId.value = null
  bySticker.value = false
  identifiersInput.value = ''
  invalidateResolution()
}

function beginRequest() {
  return beginOperation({ registerId: Number(props.registerId), statusId: statusId.value })
}

function close() {
  emit('update:show', false)
}

function onDialogUpdate(value) {
  if (!value) close()
}

function showOperationError(operation, error, fallback) {
  if (!(error?.status >= 400 && error?.status < 500)) {
    reportError(error, { context: 'parcel bulk status operation' })
  }
  if (isCurrent(operation)) alertStore.error(error, { fallback })
}

async function handleMutationError(operation, error, fallback) {
  if (isCurrent(operation) && error?.status === 409 && getErrorMessage(error).includes('Изменения запрещены')) {
    try {
      await registersStore.refreshReadOnlyRegister(operation.registerId)
    } catch (refreshError) {
      reportError(refreshError, { context: 'parcel bulk status register refresh after conflict' })
    }
  }
  showOperationError(operation, error, fallback)
}

async function findParcels() {
  if (!canFind.value) return

  const identifiers = parsedIdentifiers.value
  const lookupBy = bySticker.value ? 'sticker' : 'number'
  resetResolution()
  const operation = beginRequest()
  try {
    const result = await parcelsStore.resolveStatusSelection(operation.registerId, identifiers, lookupBy)
    if (!isCurrent(operation)) return
    if (lookupBy === 'sticker' && result?.lookupBy !== 'sticker') {
      throw new Error('Сервер не поддерживает поиск по стикерам. Повторите попытку после обновления сервера.')
    }
    foundParcelIds.value = normalizeParcelStatusBulkIds(result?.parcelIds)
    missingNumbers.value = Array.isArray(result?.missingNumbers) ? result.missingNumbers : []
    blockedItems.value = Array.isArray(result?.blockedItems) ? result.blockedItems : []
    lastSearchCount.value = identifiers.length
  } catch (error) {
    showOperationError(operation, error, 'Ошибка при поиске посылок')
  } finally {
    finishOperation(operation)
  }
}

function updateFound() {
  return updateStatus(false)
}

function updateAll() {
  return updateStatus(true)
}

async function updateStatus(all) {
  if (!(all ? canUpdateAll.value : canUpdateFound.value)) return

  const operation = beginRequest()
  const { registerId, statusId } = operation
  const parcelIds = foundParcelIds.value
  try {
    const selectedStatus = getStatusById(statusId, { parcelStatuses: props.statusOptions })
    const excluded = selectedStatus?.useAtCustomsProcessing === false
    if (all || excluded) {
      const statusTitle = selectedStatus?.title || ''
      const statusDescription = statusTitle ? ` на "${statusTitle}"` : ''
      const content = excluded
        ? buildCustomsExclusionWarning(statusTitle, all ? Number(currentRegister.value?.parcelsTotal || 0) : parcelIds.length)
        : `Изменить статус всех посылок в реестре${statusDescription}?`
      const confirmed = await confirm({
        title: 'Подтверждение',
        confirmationText: 'Изменить',
        cancellationText: 'Не изменять',
        content
      })
      if (!confirmed || !isCurrent(operation) || actionsDisabled.value) return
    }

    if (all) {
      await registersStore.setParcelStatuses(registerId, statusId)
      if (!isCurrent(operation)) return
      alertStore.success('Статус успешно применен ко всем посылкам в реестре')
    } else {
      const result = await parcelsStore.updateStatusSelection(registerId, statusId, parcelIds)
      if (!isCurrent(operation)) return
      const updatedCount = Number(result?.updatedCount ?? parcelIds.length)
      const skippedCount = Number(result?.skippedCount ?? 0)
      const updatedParcels = updatedCount === 1 ? 'одной посылки' : formatParcelCountGenitive(updatedCount)
      alertStore.success(`Статус изменен для ${updatedParcels}${skippedCount > 0 ? `. Пропущено: ${skippedCount}` : ''}`)
    }
    emit('updated')
  } catch (error) {
    const fallback = all
      ? 'Ошибка при изменении статусов всех посылок'
      : 'Ошибка при изменении статусов найденных посылок'
    await handleMutationError(operation, error, fallback)
  } finally {
    finishOperation(operation)
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
    :persistent="busy"
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
                icon="fa-solid fa-list-check"
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
        <PageAlertRegion v-if="show" />
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
          :disabled="busy || actionsDisabled"
          data-testid="parcel-status-bulk-status"
        />

        <ParcelIdentifierFields
          ref="inputRef"
          v-model:input="identifiersInput"
          v-model:by-sticker="bySticker"
          prefix="parcel-status-bulk"
          :disabled="busy || actionsDisabled"
          :supports-sticker-lookup="supportsStickerLookup"
          :is-gtc="isGtc"
          :label="identifierLabel"
          :placeholder="identifierPlaceholder"
          report-label="Не найдены / недоступны"
          :report="notFoundReport"
          :report-placeholder="reportPlaceholder"
        />

        <div class="parcel-status-bulk-summary" data-testid="parcel-status-bulk-summary" aria-live="polite">
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
