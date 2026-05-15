<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed } from 'vue'
import ScanjobMonitorSummary from '@/components/ScanjobMonitorSummary.vue'
import ScanjobParcelsMonitorTable from '@/dialogs/Scanjob_Parcels_Monitor_Table.vue'
import ScanjobOzonParcelsMonitorTable from '@/dialogs/Scanjob_Ozon_Parcels_Monitor_Table.vue'
import ScanjobWbrParcelsMonitorTable from '@/dialogs/Scanjob_Wbr_Parcels_Monitor_Table.vue'
import ScanjobWbr2ParcelsMonitorTable from '@/dialogs/Scanjob_Wbr2_Parcels_Monitor_Table.vue'
import { OZON_COMPANY_ID, WBR_COMPANY_ID, WBR2_REGISTER_ID } from '@/helpers/company.constants.js'
import {
  formatCount,
  isUnassignedMonitorBox,
  scanjobParcelHeaders,
  monitorBoxStickerClass,
  monitorBoxStickerText
} from '@/helpers/scanjob.monitor.helpers.js'
import '@/assets/styles/scanjob-monitor.css'

defineOptions({ name: 'Scanjob_Parcels_Monitor' })

const props = defineProps({
  box: { type: Object, default: null },
  registerType: { type: Number, default: 0 },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['edit-parcel'])

const parcels = computed(() => props.box?.parcels ?? [])
const hasRegisteredParcels = computed(() => parcels.value.some((parcel) => parcel?.isInRegister !== false))
const typedTableComponent = computed(() => {
  if (!hasRegisteredParcels.value) {
    return null
  }

  switch (Number(props.registerType)) {
    case OZON_COMPANY_ID:
      return ScanjobOzonParcelsMonitorTable
    case WBR_COMPANY_ID:
      return ScanjobWbrParcelsMonitorTable
    case WBR2_REGISTER_ID:
      return ScanjobWbr2ParcelsMonitorTable
    default:
      return null
  }
})
const summaryCards = computed(() => {
  const box = props.box
  if (!box) return []
  const isUnassigned = isUnassignedMonitorBox(box)

  return [
    {
      key: 'boxStatus',
      label: isUnassigned ? 'Группа посылок' : 'Статус сканирования коробки',
      value: monitorBoxStickerText(box),
      valueClass: monitorBoxStickerClass(box)
    },
    {
      key: 'boxParcels',
      label: 'Посылки всего / сканировано / не сканировано',
      value: `${formatCount(box.totalParcels)} / ${formatCount(box.parcelsWithStickerScanned)} / ${formatCount(box.parcelsWithStickerNotScanned)}`
    }
  ]
})

const emptyText = computed(() => (
  isUnassignedMonitorBox(props.box) ? 'В группе нет посылок' : 'В коробке нет посылок'
))

function editParcel(item) {
  emit('edit-parcel', item)
}
</script>

<template>
  <div data-testid="scanjob-monitor-box">
    <ScanjobMonitorSummary :cards="summaryCards" />

    <div class="monitor-section">
      <v-card class="table-card">
        <div v-if="parcels.length === 0" class="monitor-empty" data-testid="scanjob-monitor-empty-parcels">
          {{ emptyText }}
        </div>

        <component
          :is="typedTableComponent"
          v-else-if="typedTableComponent"
          :parcels="parcels"
          :loading="props.loading"
          @edit-parcel="editParcel"
        />

        <ScanjobParcelsMonitorTable
          v-else
          :headers="scanjobParcelHeaders"
          :parcels="parcels"
          :loading="props.loading"
          @edit-parcel="editParcel"
        />
      </v-card>
    </div>
  </div>
</template>
