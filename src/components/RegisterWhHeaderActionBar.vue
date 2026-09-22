<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { computed, ref, unref, watch } from 'vue'
import { useAppConfirm } from '@/composables/useAppConfirm.js'
import ActionButton from '@/components/ActionButton.vue'
import ActionButton2L from '@/components/ActionButton2L.vue'
import { useAuthStore } from '@/stores/auth.store.js'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useRegisterDownloadFlow } from '@/composables/useRegisterDownloadFlow.js'
import {
  chooseOutputWeightCorrection,
  WEIGHT_CORRECTION_CHOICE
} from '@/helpers/weight.correction.helpers.js'

const props = defineProps({
  register: { type: Object, required: true },
  zones: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false },
  iconSize: { type: String, default: '2x' },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['bulk-change-parcel-status', 'close'])

const registersStore = useRegistersStore()
const alertStore = useAlertStore()
const downloadFlow = useRegisterDownloadFlow(registersStore, alertStore)
watch(() => props.register?.id, () => {
  void downloadFlow.loadFormats(props.register)
}, { immediate: true })
const authStore = useAuthStore()
const confirm = useAppConfirm()
const canExport = computed(() => Boolean(unref(authStore.isWhManagerPlus)))
const canBulkChangeParcelStatus = computed(() => Boolean(unref(authStore.isSrLogistPlus)))
const exportPending = ref(false)
const exportDisabled = computed(() =>
  props.disabled ||
  props.loading ||
  exportPending.value ||
  !props.register?.id
)
const actionDisabled = computed(() =>
  props.disabled ||
  props.loading ||
  props.register?.readOnly === true ||
  !props.register?.id
)

function normalizeZoneName(name) {
  if (!name || !name.trim()) {
    return 'Без зоны (не найдены)'
  }
  return name
}

async function downloadRegisterForZone(forZone, zoneLabel, format = 'generic') {
  if (exportDisabled.value) return

  const registerId = props.register?.id
  if (!registerId) return

  exportPending.value = true

  try {
    let applyWeightCorrection = false
    const choice = await chooseOutputWeightCorrection(confirm, props.register)
    applyWeightCorrection = choice === WEIGHT_CORRECTION_CHOICE.Apply

    return await downloadFlow.download({
      register: { ...props.register, id: registerId },
      format,
      forZone,
      zoneLabel,
      applyWeightCorrection
    })
  } catch (error) {
    alertStore.error(error, {
      fallback: 'Не удалось выбрать параметры выгрузки',
      action: { label: 'Повторить', handler: () => downloadRegisterForZone(forZone, zoneLabel, format) }
    })
    return false
  } finally {
    exportPending.value = false
  }
}

const exportOptions = computed(() => {
  const zones = [
    { value: 0, label: 'Все посылки', zoneLabel: undefined },
    ...props.zones.map(zone => ({
      value: zone?.value,
      label: normalizeZoneName(zone?.name),
      zoneLabel: normalizeZoneName(zone?.name)
    }))
  ]
  if (!downloadFlow.companyFormatName.value) {
    return zones.map(zone => ({
      label: zone.label,
      value: zone.value,
      action: () => downloadRegisterForZone(zone.value, zone.zoneLabel)
    }))
  }
  return zones.flatMap(zone => [
    {
      label: `${zone.label} — Общий формат`,
      value: zone.value,
      action: () => downloadRegisterForZone(zone.value, zone.zoneLabel, 'generic')
    },
    {
      label: `${zone.label} — Формат ${downloadFlow.companyFormatName.value}`,
      value: zone.value,
      action: () => downloadRegisterForZone(zone.value, zone.zoneLabel, 'company')
    }
  ])
})
</script>

<template>
  <div class="header-actions-bar">
    <div v-if="loading" class="header-actions header-actions-group">
        <span class="spinner-border spinner-border-m"></span>
    </div>
    <div v-if="canExport" class="header-actions header-actions-group">
        <ActionButton2L
          :item="register"
          icon="fa-solid fa-file-export"
          tooltip-text="Экспортировать реестр"
          :icon-size="iconSize"
          :disabled="exportDisabled"
          :options="exportOptions"
        />
    </div>
    <div class="header-actions header-actions-group">
        <ActionButton
          v-if="canBulkChangeParcelStatus"
          :item="register"
          icon="fa-solid fa-pen-to-square"
          tooltip-text="Выбрать посылки и изменить статус"
          :icon-size="iconSize"
          :disabled="actionDisabled"
          @click="emit('bulk-change-parcel-status')"
        />
        <ActionButton
          :item="register"
          icon="fa-solid fa-xmark"
          tooltip-text="Закрыть"
          aria-label="Закрыть"
          :icon-size="iconSize"
          :disabled="disabled"
          @click="emit('close')"
        />
    </div>
  </div>
</template>
