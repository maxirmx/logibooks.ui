<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth.store.js'
import ClickableCell from '@/components/ClickableCell.vue'
import ScanjobMonitorSummary from '@/components/ScanjobMonitorSummary.vue'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import {
  formatCount,
  formatScanTime,
  scanjobParcelHeaders,
  stickerClass,
  stickerText,
  valueOrDash
} from '@/helpers/scanjob.monitor.helpers.js'
import '@/assets/styles/scanjob-monitor.css'

defineOptions({ name: 'Scanjob_Parcels_Monitor' })

const props = defineProps({
  box: { type: Object, default: null },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['edit-parcel'])

const authStore = useAuthStore()
const {
  scanjobmonitor_parcels_per_page,
  scanjobmonitor_parcels_sort_by,
  scanjobmonitor_parcels_page
} = storeToRefs(authStore)

const parcels = computed(() => props.box?.parcels ?? [])
const summaryCards = computed(() => {
  const box = props.box
  if (!box) return []

  return [
    {
      key: 'boxStatus',
      label: 'Статус сканирования коробки',
      value: stickerText(box.boxStickerScanned),
      valueClass: stickerClass(box.boxStickerScanned)
    },
    {
      key: 'boxParcels',
      label: 'Посылки всего / сканировано / не сканировано',
      value: `${formatCount(box.totalParcels)} / ${formatCount(box.parcelsWithStickerScanned)} / ${formatCount(box.parcelsWithStickerNotScanned)}`
    }
  ]
})

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
        В коробке нет посылок
      </div>

      <v-data-table
        v-model:items-per-page="scanjobmonitor_parcels_per_page"
        v-model:page="scanjobmonitor_parcels_page"
        v-model:sort-by="scanjobmonitor_parcels_sort_by"
        v-else
        :headers="scanjobParcelHeaders"
        :items="parcels"
        :items-per-page-options="itemsPerPageOptions"
        items-per-page-text="Посылок на странице"
        page-text="{0}-{1} из {2}"
        :loading="props.loading"
        density="compact"
        class="elevation-1 interlaced-table"
        data-testid="scanjob-monitor-parcels-table"
      >
        <template #[`item.stickerScanned`]="{ item }">
          <ClickableCell
            :item="item"
            :display-value="stickerText(item.stickerScanned)"
            :cell-class="`${stickerClass(item.stickerScanned)} clickable-cell`"
            :disabled="props.loading"
            @click="editParcel(item)"
          />
        </template>

        <template #[`item.scannedSticker`]="{ item }">
          <ClickableCell
            :item="item"
            :display-value="valueOrDash(item.scannedSticker)"
            cell-class="clickable-cell"
            :disabled="props.loading"
            @click="editParcel(item)"
          />
        </template>

        <template #[`item.scannedUserName`]="{ item }">
          <ClickableCell
            :item="item"
            :display-value="valueOrDash(item.scannedUserName)"
            cell-class="clickable-cell"
            :disabled="props.loading"
            @click="editParcel(item)"
          />
        </template>

        <template #[`item.scannedTime`]="{ item }">
          <ClickableCell
            :item="item"
            :display-value="valueOrDash(formatScanTime(item.scannedTime))"
            cell-class="clickable-cell"
            :disabled="props.loading"
            @click="editParcel(item)"
          />
        </template>

        <template #[`item.parcelNumber`]="{ item }">
          <ClickableCell
            :item="item"
            :display-value="valueOrDash(item.parcelNumber)"
            cell-class="clickable-cell"
            :disabled="props.loading"
            @click="editParcel(item)"
          />
        </template>

        <template #[`item.zoneName`]="{ item }">
          <ClickableCell
            :item="item"
            :display-value="valueOrDash(item.zoneName)"
            cell-class="clickable-cell"
            :disabled="props.loading"
            @click="editParcel(item)"
          />
        </template>

        <template #[`item.statusTitle`]="{ item }">
          <ClickableCell
            :item="item"
            :display-value="valueOrDash(item.statusTitle)"
            cell-class="clickable-cell"
            :disabled="props.loading"
            @click="editParcel(item)"
          />
        </template>
      </v-data-table>
    </v-card>
    </div>
  </div>
</template>
