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
  formatParcelProgress,
  formatScanTime,
  monitorBoxStickerClass,
  monitorBoxStickerText,
  scanjobBoxHeaders,
  scanjobParcelsProgressTitle,
  valueOrDash
} from '@/helpers/scanjob.monitor.helpers.js'
import '@/assets/styles/scanjob-monitor.css'

defineOptions({ name: 'Scanjob_Boxes_Monitor' })

const props = defineProps({
  snapshot: { type: Object, default: null },
  boxes: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['open-box'])

const authStore = useAuthStore()
const {
  scanjobmonitor_boxes_per_page,
  scanjobmonitor_boxes_sort_by,
  scanjobmonitor_boxes_page
} = storeToRefs(authStore)

const summaryCards = computed(() => {
  const snapshot = props.snapshot
  if (!snapshot) return []

  return [
    {
      key: 'boxes',
      label: 'Коробки всего / сканировано / не сканировано',
      value: `${snapshot.totalBoxes ?? 0} / ${snapshot.boxesWithStickerScanned ?? 0} / ${snapshot.boxesWithStickerNotScanned ?? 0}`,
    },
    {
      key: 'parcels',
      label: scanjobParcelsProgressTitle,
      value: formatParcelProgress(snapshot),
    },
    {
      key: 'unregistered',
      label: 'Посылки не в реестре',
      value: String(snapshot.scannedItemsNotInRegister ?? 0),
    }
  ]
})

function openBox(item) {
  emit('open-box', item)
}
</script>

<template>
  <div data-testid="scanjob-monitor-register">
    <ScanjobMonitorSummary :cards="summaryCards" />

    <div class="monitor-section">
    <v-card class="table-card">
      <div v-if="props.boxes.length === 0" class="monitor-empty" data-testid="scanjob-monitor-empty-boxes">
        Коробки не найдены
      </div>

      <v-data-table
        v-model:items-per-page="scanjobmonitor_boxes_per_page"
        v-model:page="scanjobmonitor_boxes_page"
        v-model:sort-by="scanjobmonitor_boxes_sort_by"
        v-else
        :headers="scanjobBoxHeaders"
        :items="props.boxes"
        :items-per-page-options="itemsPerPageOptions"
        items-per-page-text="Коробок на странице"
        page-text="{0}-{1} из {2}"
        :loading="props.loading"
        density="compact"
        class="elevation-1 interlaced-table"
        data-testid="scanjob-monitor-boxes-table"
      >
        <template #[`item.boxCode`]="{ item }">
          <ClickableCell
            :item="item"
            :display-value="item.boxCode"
            cell-class="clickable-cell"
            data-testid="scanjob-monitor-box-row"
            :disabled="props.loading"
            @click="openBox(item)"
          />
        </template>

        <template #[`item.boxStickerScanned`]="{ item }">
          <ClickableCell
            :item="item"
            :display-value="monitorBoxStickerText(item)"
            :cell-class="`${monitorBoxStickerClass(item)} clickable-cell`"
            :disabled="props.loading"
            @click="openBox(item)"
          />
        </template>

        <template #[`item.boxScannedSticker`]="{ item }">
          <ClickableCell
            :item="item"
            :display-value="valueOrDash(item.boxScannedSticker)"
            cell-class="clickable-cell"
            :disabled="props.loading"
            @click="openBox(item)"
          />
        </template>

        <template #[`item.boxScannedUserName`]="{ item }">
          <ClickableCell
            :item="item"
            :display-value="valueOrDash(item.boxScannedUserName)"
            cell-class="clickable-cell"
            :disabled="props.loading"
            @click="openBox(item)"
          />
        </template>

        <template #[`item.boxScannedTime`]="{ item }">
          <ClickableCell
            :item="item"
            :display-value="valueOrDash(formatScanTime(item.boxScannedTime))"
            cell-class="clickable-cell"
            :disabled="props.loading"
            @click="openBox(item)"
          />
        </template>

        <template #[`item.parcelsProgress`]="{ item }">
          <ClickableCell
            :item="item"
            :display-value="formatParcelProgress(item)"
            cell-class="clickable-cell"
            :disabled="props.loading"
            @click="openBox(item)"
          />
        </template>
      </v-data-table>
    </v-card>
    </div>
  </div>
</template>
