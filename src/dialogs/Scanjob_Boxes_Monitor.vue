<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, ref } from 'vue'
import DataTablePaginationFooter from '@/components/DataTablePaginationFooter.vue'
import BoxScanAction from '@/components/BoxScanAction.vue'
import { useManualScanSelection } from '@/composables/useManualScanSelection.js'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth.store.js'
import ClickableCell from '@/components/ClickableCell.vue'
import ActionButton from '@/components/ActionButton.vue'
import BoxStickerPrintButton from '@/components/BoxStickerPrintButton.vue'
import BoxStickerExportButton from '@/components/BoxStickerExportButton.vue'
import BoxStickerContextMenu from '@/components/BoxStickerContextMenu.vue'
import ScanjobMonitorSummary from '@/components/ScanjobMonitorSummary.vue'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import {
  buildScanjobProgressCards,
  formatBoxDimensions,
  formatBoxWeight,
  formatScanTime,
  getLookupParcelProgressStats,
  getParcelProgressStats,
  monitorBoxStickerClass,
  monitorBoxStickerText,
  scanjobBoxHeaders,
  valueOrDash
} from '@/helpers/scanjob.monitor.helpers.js'
import '@/assets/styles/scanjob-monitor.css'

defineOptions({ name: 'Scanjob_Boxes_Monitor' })

const props = defineProps({
  registerId: { type: Number, default: null },
  readOnly: Boolean,
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

const contextMenu = ref(null)
const scopeKey = computed(() => JSON.stringify([
  props.snapshot?.scanJobId, scanjobmonitor_boxes_page.value, scanjobmonitor_boxes_per_page.value, scanjobmonitor_boxes_sort_by.value
]))
const { selection, locked, updateDisplayedItems } = useManualScanSelection({
  loading: computed(() => props.loading), page: scanjobmonitor_boxes_page, scopeKey, contextMenu
})
const controlsBusy = computed(() => props.loading || locked.value)

const summaryCards = computed(() => {
  const snapshot = props.snapshot
  if (!snapshot) return []

  const { lookupRemainingCount, lookupNotFoundCount } = snapshot
  return [
    ...buildScanjobProgressCards(snapshot),
    {
      key: 'unregistered',
      label: 'Стикеры не в реестре',
      value: String(snapshot.scannedItemsNotInRegister ?? 0),
    },
    ...(lookupRemainingCount == null || lookupNotFoundCount != null ? [] : [{
      key: 'lookupRemaining',
      label: 'Осталось найти',
      value: String(lookupRemainingCount)
    }])
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

    <BoxStickerContextMenu
      v-if="authStore.isWhManagerPlus && props.registerId"
      :key="props.snapshot?.scanJobId"
      ref="contextMenu"
      :register-id="props.registerId"
      :scope-key="scopeKey"
      :read-only="props.readOnly"
      :disabled="controlsBusy"
    />

    <div class="monitor-section">
    <v-card class="table-card">
      <div v-if="props.boxes.length === 0" class="monitor-empty" data-testid="scanjob-monitor-empty-boxes">
        Коробки не найдены
      </div>

      <v-data-table
        :inert="locked || undefined"
        :row-props="selection.getRowProps"
        @click:row="selection.handleRowClick"
        @contextmenu:row="selection.handleRowContextMenu"
        @update:current-items="updateDisplayedItems"
        v-model:items-per-page="scanjobmonitor_boxes_per_page"
        v-model:page="scanjobmonitor_boxes_page"
        v-model:sort-by="scanjobmonitor_boxes_sort_by"
        v-else
        :headers="scanjobBoxHeaders"
        :items="props.boxes"
        :loading="props.loading"
        density="compact"
        class="elevation-1 interlaced-table"
        data-testid="scanjob-monitor-boxes-table"
      >
        <template #bottom>
          <DataTablePaginationFooter
            :items-per-page-options="itemsPerPageOptions"
            items-per-page-label="Коробок на странице"
            :disabled="locked"
          />
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

        <template #[`item.actions`]="{ item }">
          <div class="actions-container" @click.stop>
            <ActionButton :item="item" icon="fa-solid fa-list"
              tooltip-text="Список посылок" aria-label="Список посылок"
              :disabled="controlsBusy" data-testid="box-parcels-action" @click="openBox" />
            <BoxScanAction v-if="item.boxId != null" :boxes="[item]" :selection="selection" />
            <BoxStickerPrintButton :box="item" :company="props.snapshot" :disabled="controlsBusy" />
            <BoxStickerExportButton :box="item" :disabled="controlsBusy" />
          </div>
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

        <template #[`item.boxSticker`]="{ item }">
          <ClickableCell
            :item="item"
            :display-value="valueOrDash(item.boxSticker)"
            data-testid="box-sticker-value"
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
            <span class="scanjob-monitor-parcel-progress">
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
              <span
                v-if="item.lookupFoundCount != null && item.lookupNotFoundCount != null"
                class="scanjob-monitor-parcel-progress-lookup"
              >
                <span
                  v-for="stat in getLookupParcelProgressStats(item)"
                  :key="stat.label"
                  class="scanjob-monitor-parcel-progress-item"
                >
                  <span class="scanjob-monitor-parcel-progress-label">{{ stat.label }}</span>
                  <span class="scanjob-monitor-parcel-progress-value">{{ stat.value }}</span>
                </span>
              </span>
            </span>
          </ClickableCell>
        </template>
      </v-data-table>
    </v-card>
    </div>
  </div>
</template>
