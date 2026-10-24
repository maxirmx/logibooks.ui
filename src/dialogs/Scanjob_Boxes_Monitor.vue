<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, ref } from 'vue'
import BoxScanAction from '@/components/BoxScanAction.vue'
import { useManualScanSelection } from '@/composables/useManualScanSelection.js'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth.store.js'
import ClickableCell from '@/components/ClickableCell.vue'
import ScanjobMonitorSummary from '@/components/ScanjobMonitorSummary.vue'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import {
  formatBoxDimensions,
  formatBoxWeight,
  formatParcelProgress,
  formatScanTime,
  getParcelProgressStats,
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
  loading: { type: Boolean, default: false },
  printQueue: { type: Object, default: null }
})

const emit = defineEmits(['open-box'])

const authStore = useAuthStore()
const {
  scanjobmonitor_boxes_per_page,
  scanjobmonitor_boxes_sort_by,
  scanjobmonitor_boxes_page
} = storeToRefs(authStore)

const dataTableRef = ref(null)
const { selection, locked, updateDisplayedItems } = useManualScanSelection({
  loading: computed(() => props.loading), page: scanjobmonitor_boxes_page, dataTableRef,
  scopeKey: () => JSON.stringify([props.snapshot?.scanJobId, scanjobmonitor_boxes_page.value, scanjobmonitor_boxes_per_page.value, scanjobmonitor_boxes_sort_by.value])
})
const controlsBusy = computed(() => props.loading || locked.value)
const headers = [{ title: '', key: 'actions', align: 'center', sortable: false, width: '48px' }, ...scanjobBoxHeaders]

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
      label: 'Стикеры не в реестре',
      value: String(snapshot.scannedItemsNotInRegister ?? 0),
    }
  ]
})

function openBox(item) {
  if (controlsBusy.value) return
  emit('open-box', item)
}
</script>

<template>
  <div data-testid="scanjob-monitor-register">
    <ScanjobMonitorSummary :cards="summaryCards" :print-queue="props.printQueue" />

    <div class="monitor-section">
    <v-card class="table-card">
      <div v-if="props.boxes.length === 0" class="monitor-empty" data-testid="scanjob-monitor-empty-boxes">
        Коробки не найдены
      </div>

      <v-data-table
        ref="dataTableRef"
        :disable-sort="locked"
        :inert="locked || undefined"
        :row-props="selection.getRowProps"
        @click:row="selection.handleRowClick"
        @contextmenu:row="selection.handleRowContextMenu"
        @update:current-items="updateDisplayedItems"
        v-model:items-per-page="scanjobmonitor_boxes_per_page"
        v-model:page="scanjobmonitor_boxes_page"
        v-model:sort-by="scanjobmonitor_boxes_sort_by"
        v-else
        :headers="headers"
        :items="props.boxes"
        :items-per-page-options="itemsPerPageOptions"
        items-per-page-text="Коробок на странице"
        page-text="{0}-{1} из {2}"
        :loading="props.loading"
        density="compact"
        class="elevation-1 interlaced-table"
        data-testid="scanjob-monitor-boxes-table"
      >
        <template #bottom>
          <v-defaults-provider :defaults="{ VSelect: { disabled: locked }, VPagination: { disabled: locked } }">
            <v-data-table-footer :items-per-page-options="itemsPerPageOptions" items-per-page-text="Коробок на странице" page-text="{0}-{1} из {2}" />
          </v-defaults-provider>
        </template>

        <template #[`item.actions`]="{ item }">
          <BoxScanAction v-if="item.boxId != null" :boxes="[item]" :selection="selection" />
        </template>

        <template #[`item.boxCode`]="{ item }">
          <ClickableCell
            :item="item"
            :display-value="item.boxCode"
            cell-class="clickable-cell"
            data-testid="scanjob-monitor-box-row"
            :disabled="controlsBusy"
            @click="openBox(item)"
          />
        </template>

        <template #[`item.dimensions`]="{ item }">
          <ClickableCell
            :item="item"
            :display-value="formatBoxDimensions(item)"
            cell-class="clickable-cell"
            :disabled="controlsBusy"
            @click="openBox(item)"
          />
        </template>

        <template #[`item.weightKg`]="{ item }">
          <ClickableCell
            :item="item"
            :display-value="formatBoxWeight(item.weightKg)"
            cell-class="clickable-cell"
            :disabled="controlsBusy"
            @click="openBox(item)"
          />
        </template>

        <template #[`item.boxStickerScanned`]="{ item }">
          <ClickableCell
            :item="item"
            :display-value="monitorBoxStickerText(item)"
            :cell-class="`${monitorBoxStickerClass(item)} clickable-cell`"
            :disabled="controlsBusy"
            @click="openBox(item)"
          />
        </template>

        <template #[`item.boxScannedSticker`]="{ item }">
          <ClickableCell
            :item="item"
            :display-value="valueOrDash(item.boxScannedSticker)"
            cell-class="clickable-cell"
            :disabled="controlsBusy"
            @click="openBox(item)"
          />
        </template>

        <template #[`item.boxScannedUserName`]="{ item }">
          <ClickableCell
            :item="item"
            :display-value="valueOrDash(item.boxScannedUserName)"
            cell-class="clickable-cell"
            :disabled="controlsBusy"
            @click="openBox(item)"
          />
        </template>

        <template #[`item.boxScannedTime`]="{ item }">
          <ClickableCell
            :item="item"
            :display-value="valueOrDash(formatScanTime(item.boxScannedTime))"
            cell-class="clickable-cell"
            :disabled="controlsBusy"
            @click="openBox(item)"
          />
        </template>

        <template #[`item.parcelsProgress`]="{ item }">
          <ClickableCell
            :item="item"
            :display-value="''"
            cell-class="clickable-cell"
            :disabled="controlsBusy"
            @click="openBox(item)"
          >
            <span class="scanjob-monitor-parcel-progress-panel">
              <span
                v-for="stat in getParcelProgressStats(item)"
                :key="stat.label"
                :class="['scanjob-monitor-parcel-progress-item', stat.isRestricted ? 'scanjob-monitor-parcel-progress-restricted' : '']"
              >
                <span class="scanjob-monitor-parcel-progress-label">{{ stat.label }}</span>
                <span class="scanjob-monitor-parcel-progress-value">{{ stat.value }}</span>
              </span>
            </span>
          </ClickableCell>
        </template>
      </v-data-table>
    </v-card>
    </div>
  </div>
</template>
