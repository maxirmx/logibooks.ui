<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, onBeforeUnmount, ref, watch, watchPostEffect } from 'vue'
import ActionButton from '@/components/ActionButton.vue'
import ParcelSelectionDialogFrame from '@/components/ParcelSelectionDialogFrame.vue'
import ParcelIdentifierFields from '@/components/ParcelIdentifierFields.vue'
import { useParcelSelectionRequest } from '@/composables/useParcelSelectionRequest.js'
import { parseParcelStatusBulkInput, supportsParcelStickerLookup } from '@/helpers/parcel.status.bulk.helpers.js'
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
let lookupAlertId = null
const parcelsStore = useParcelsStore()
const { activeOperation, beginOperation, isCurrent, finishOperation, invalidateOperation } = useParcelSelectionRequest()

const inputRef = ref(null)
const input = ref('')
const bySticker = ref(false)
const registerType = computed(() => Number(props.register.registerType))
const supportsStickerLookup = computed(() => supportsParcelStickerLookup(registerType.value))
const matchedParcels = ref([])
const missing = ref([])
const processedCount = ref(0)
const busy = computed(() => activeOperation.value !== null)
const identifiers = computed(() => parseParcelStatusBulkInput(input.value))
const canFind = computed(() => open.value && !props.disabled && !busy.value && identifiers.value.length > 0)

function invalidatePreview() {
  invalidateOperation()
  matchedParcels.value = []
  missing.value = []
  processedCount.value = 0
}

function dismissLookupAlert() {
  if (lookupAlertId == null) return
  alertStore.dismiss(lookupAlertId)
  lookupAlertId = null
}

watch([input, bySticker], invalidatePreview, { flush: 'sync' })
watch([open, () => props.register?.id, registerType], ([isOpen]) => {
  if (!isOpen) dismissLookupAlert()
  input.value = ''
  bySticker.value = false
  invalidatePreview()
}, { flush: 'sync', immediate: true })
watchPostEffect(() => {
  if (open.value) inputRef.value?.focus()
})
onBeforeUnmount(() => {
  invalidateOperation()
  dismissLookupAlert()
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
    const matches = new Map()
    for (const { identifier, parcels } of result.matches) {
      for (const parcel of parcels) {
        if (!matches.has(parcel.parcelId)) matches.set(parcel.parcelId, { ...parcel, identifier })
      }
    }
    matchedParcels.value = [...matches.values()]
    missing.value = Array.isArray(result.missingNumbers) ? result.missingNumbers : []
    processedCount.value = numbers.length
  } catch (error) {
    if (!(error?.status >= 400 && error?.status < 500)) {
      reportError(error, { context: 'lookup parcel selection' })
    }
    if (isCurrent(request)) {
      lookupAlertId = alertStore.error(error, { fallback: 'Не удалось найти посылки' })
    }
  } finally {
    finishOperation(request)
  }
}

const canConfirm = computed(() => open.value && !props.disabled && !busy.value && matchedParcels.value.length > 0)
const confirmLabel = computed(() => missing.value.length > 0 ? 'Использовать только найденные' : 'Подтвердить выбор')

function confirmSelection() {
  if (!canConfirm.value) return
  emit('selected', matchedParcels.value, Number(props.register.id))
  open.value = false
}
</script>

<template>
  <ParcelSelectionDialogFrame v-model="open" title="Выбрать посылки для поиска" :busy="busy">
    <template #actions>
      <div class="header-actions header-actions-group">
        <ActionButton
          :item="{}"
          icon="fa-solid fa-magnifying-glass"
          tooltip-text="Найти"
          icon-size="2x"
          :disabled="!canFind"
          aria-label="Найти"
          data-testid="lookup-parcels-find"
          @click="findParcels"
        />
        <ActionButton
          :item="{}"
          icon="fa-solid fa-check"
          :tooltip-text="confirmLabel"
          icon-size="2x"
          :disabled="!canConfirm"
          :aria-label="confirmLabel"
          data-testid="lookup-parcels-confirm"
          @click="confirmSelection"
        />
      </div>
      <div class="header-actions header-actions-group">
        <ActionButton
          :item="{}"
          icon="fa-solid fa-xmark"
          tooltip-text="Отменить"
          icon-size="2x"
          aria-label="Отменить"
          data-testid="lookup-parcels-cancel"
          @click="open = false"
        />
      </div>
    </template>

    <ParcelIdentifierFields
      ref="inputRef"
      v-model:input="input"
      v-model:by-sticker="bySticker"
      prefix="lookup-parcels"
      :disabled="disabled"
      :register="register"
      :processed-count="processedCount"
      :found-count="matchedParcels.length"
      :missing-numbers="missing"
    />
  </ParcelSelectionDialogFrame>
</template>
