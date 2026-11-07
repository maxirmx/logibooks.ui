<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, onBeforeUnmount, ref, watch, watchPostEffect } from 'vue'
import AppDialogFrame from '@/components/AppDialogFrame.vue'
import PageAlertRegion from '@/components/PageAlertRegion.vue'
import ParcelIdentifierFields from '@/components/ParcelIdentifierFields.vue'
import { useParcelSelectionRequest } from '@/composables/useParcelSelectionRequest.js'
import { useTableMultiSelect } from '@/composables/useTableMultiSelect.js'
import { APP_DIALOG_BUTTON_PROPS, APP_DIALOG_MAX_WIDTH, getAppDialogWidth } from '@/helpers/dialog.helpers.js'
import { GTC_COMPANY_ID } from '@/helpers/company.constants.js'
import { getParcelStatusBulkNumberLabel, parseParcelStatusBulkInput, supportsParcelStickerLookup } from '@/helpers/parcel.status.bulk.helpers.js'
import { reportError } from '@/helpers/error.helpers.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useParcelsStore } from '@/stores/parcels.store.js'

const props = defineProps({
  register: { type: Object, required: true },
  disabled: Boolean
})
const open = defineModel({ type: Boolean, required: true })
const emit = defineEmits(['selected'])
const alertStore = useAlertStore()
const parcelsStore = useParcelsStore()
const { activeOperation, beginOperation, isCurrent, finishOperation, invalidateOperation } = useParcelSelectionRequest()

const inputRef = ref(null)
const input = ref('')
const bySticker = ref(false)
const registerType = computed(() => Number(props.register.registerType))
const supportsStickerLookup = computed(() => supportsParcelStickerLookup(registerType.value))
const groups = ref([])
const missing = ref([])
const busy = computed(() => activeOperation.value !== null)
const identifiers = computed(() => parseParcelStatusBulkInput(input.value))
const label = computed(() => bySticker.value ? 'Коды стикеров' : getParcelStatusBulkNumberLabel(props.register))
const rows = computed(() => groups.value.flatMap(group => group.parcels))
const selection = useTableMultiSelect({
  items: rows, loading: busy, page: ref(1), selectedId: ref(null),
  getItemId: candidate => candidate.key
})
const selectedKeys = selection.selectedIds
const selectedIds = computed(() => [...new Set(selection.selectedItems.value.map(candidate => candidate.parcelId))])
const hasOmissions = computed(() => missing.value.length > 0 ||
  groups.value.some(group => group.parcels.every(candidate => !selectedKeys.value.has(candidate.key))))
const canFind = computed(() => open.value && !props.disabled && !busy.value && identifiers.value.length > 0)

function invalidatePreview() {
  invalidateOperation()
  groups.value = []
  missing.value = []
  selection.clearSelection()
}

watch([input, bySticker], invalidatePreview, { flush: 'sync' })
watch([open, () => props.register?.id, registerType], () => {
  input.value = ''
  bySticker.value = false
  invalidatePreview()
}, { flush: 'sync', immediate: true })
watchPostEffect(() => {
  if (open.value) inputRef.value?.focus()
})
onBeforeUnmount(() => {
  invalidateOperation()
  selection.stop()
})

async function findParcels() {
  if (!canFind.value) return
  const registerId = Number(props.register.id)
  const lookupBy = bySticker.value && supportsStickerLookup.value ? 'sticker' : 'number'
  const numbers = identifiers.value
  invalidatePreview()
  const request = beginOperation({ registerId, lookupBy })
  try {
    const result = await parcelsStore.resolveStatusSelection(registerId, numbers, lookupBy, 'lookup')
    if (!isCurrent(request)) return
    if (result?.purpose !== 'lookup' || result.lookupBy !== lookupBy || !Array.isArray(result.matches)) {
      throw new Error('Сервер не поддерживает выбор посылок для поиска')
    }
    groups.value = result.matches.map(group => ({
      identifier: group.identifier,
      parcels: group.parcels.map(candidate => ({ ...candidate, key: JSON.stringify([group.identifier, candidate.parcelId]) }))
    }))
    missing.value = result.missingNumbers ?? []
    selectedKeys.value = new Set(groups.value.filter(group => group.parcels.length === 1)
      .map(group => group.parcels[0].key))
  } catch (error) {
    if (!(error?.status >= 400 && error?.status < 500)) {
      reportError(error, { context: 'lookup parcel selection' })
    }
    if (isCurrent(request)) alertStore.error(error, { fallback: 'Не удалось найти посылки' })
  } finally {
    finishOperation(request)
  }
}

function confirmSelection() {
  if (!open.value || props.disabled || busy.value || selectedIds.value.length === 0) return
  emit('selected', selectedIds.value, Number(props.register.id))
  open.value = false
}
</script>

<template>
  <v-dialog v-model="open" :width="getAppDialogWidth('search')" :max-width="APP_DIALOG_MAX_WIDTH">
    <AppDialogFrame title="Выбрать посылки для поиска">
      <hr class="hr" />
      <PageAlertRegion v-if="open" />
      <div class="d-flex flex-column ga-2">
        <ParcelIdentifierFields
          ref="inputRef"
          v-model:input="input"
          v-model:by-sticker="bySticker"
          prefix="lookup-parcels"
          :label="label"
          :disabled="disabled"
          :supports-sticker-lookup="supportsStickerLookup"
          :is-gtc="registerType === GTC_COMPANY_ID"
          placeholder="Введите, вставьте или отсканируйте коды. Разделяйте их запятой, табуляцией или новой строкой."
          report-label="Не найдены"
          :report="missing.join('\n')"
        />
        <div v-if="groups.length" class="app-table-card">
          <div class="app-table-scroll">
            <table class="app-table interlaced-table">
              <thead><tr><th>Код</th><th>Посылка</th><th>Коробка</th></tr></thead>
              <tbody>
                <template v-for="group in groups" :key="group.identifier">
                  <tr v-for="candidate in group.parcels" :key="candidate.key">
                    <td>{{ group.identifier }}</td>
                    <td>
                      <label>
                        <input v-model="selectedKeys" type="checkbox" :value="candidate.key" :disabled="disabled" />
                        {{ candidate.parcelNumber }} (#{{ candidate.parcelId }})
                      </label>
                    </td>
                    <td>{{ candidate.boxNumber || '—' }}</td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>
        <div aria-live="polite">Выбрано посылок: {{ selectedIds.length }}</div>
      </div>

      <template #actions>
        <v-btn v-bind="APP_DIALOG_BUTTON_PROPS.secondary" @click="open = false">Отмена</v-btn>
        <v-btn v-bind="APP_DIALOG_BUTTON_PROPS.primary" :disabled="!canFind" :loading="busy" @click="findParcels">Найти</v-btn>
        <v-btn
          v-bind="APP_DIALOG_BUTTON_PROPS.primary"
          :disabled="busy || disabled || selectedIds.length === 0"
          @click="confirmSelection"
        >
          {{ hasOmissions ? 'Использовать только выбранные' : 'Подтвердить выбор' }}
        </v-btn>
      </template>
    </AppDialogFrame>
  </v-dialog>
</template>
