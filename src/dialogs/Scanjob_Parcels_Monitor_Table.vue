<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth.store.js'
import ClickableCell from '@/components/ClickableCell.vue'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { formatWeight } from '@/helpers/number.formatters.js'
import {
  getScanjobCheckStatusClass,
  scanjobCheckStatusReason,
  scanjobCheckStatusText
} from '@/helpers/scanjob.check-status.helpers.js'
import {
  formatScanTime,
  stickerClass,
  stickerText,
  valueOrDash
} from '@/helpers/scanjob.monitor.helpers.js'

defineOptions({ name: 'Scanjob_Parcels_Monitor_Table' })

const props = defineProps({
  headers: { type: Array, required: true },
  parcels: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['edit-parcel'])

const authStore = useAuthStore()
const {
  scanjobmonitor_parcels_per_page,
  scanjobmonitor_parcels_sort_by,
  scanjobmonitor_parcels_page,
  hasLogistRole
} = storeToRefs(authStore)

const canFollowParcelEditRoute = computed(() => hasLogistRole?.value === true)
const isParcelCellDisabled = computed(() => props.loading || !canFollowParcelEditRoute.value)

function editParcel(item) {
  if (isParcelCellDisabled.value) {
    return
  }

  emit('edit-parcel', item)
}

function parcelCellClass(baseClass = '') {
  return [
    baseClass,
    canFollowParcelEditRoute.value ? 'clickable-cell' : ''
  ].filter(Boolean).join(' ')
}

function onProductNameClick(item, event) {
  if (isParcelCellDisabled.value || event.shiftKey || event.ctrlKey || event.metaKey) {
    return
  }
  editParcel(item)
}
</script>

<template>
  <v-data-table
    v-model:items-per-page="scanjobmonitor_parcels_per_page"
    v-model:page="scanjobmonitor_parcels_page"
    v-model:sort-by="scanjobmonitor_parcels_sort_by"
    :headers="props.headers"
    :items="props.parcels"
    :items-per-page-options="itemsPerPageOptions"
    items-per-page-text="Посылок на странице"
    page-text="{0}-{1} из {2}"
    :loading="props.loading"
    density="compact"
    class="elevation-1 interlaced-table single-line-table"
    data-testid="scanjob-monitor-parcels-table"
  >
    <template #[`item.stickerScanned`]="{ item }">
      <ClickableCell
        :item="item"
        :display-value="stickerText(item.stickerScanned)"
        :cell-class="parcelCellClass(stickerClass(item.stickerScanned))"
        :disabled="isParcelCellDisabled"
        @click="editParcel(item)"
      />
    </template>

    <template #[`item.scannedSticker`]="{ item }">
      <ClickableCell :item="item" :display-value="valueOrDash(item.scannedSticker)" :cell-class="parcelCellClass()" :disabled="isParcelCellDisabled" @click="editParcel(item)" />
    </template>

    <template #[`item.scannedUserName`]="{ item }">
      <ClickableCell :item="item" :display-value="valueOrDash(item.scannedUserName)" :cell-class="parcelCellClass()" :disabled="isParcelCellDisabled" @click="editParcel(item)" />
    </template>

    <template #[`item.scannedTime`]="{ item }">
      <ClickableCell :item="item" :display-value="valueOrDash(formatScanTime(item.scannedTime))" :cell-class="parcelCellClass()" :disabled="isParcelCellDisabled" @click="editParcel(item)" />
    </template>

    <template #[`item.parcelNumber`]="{ item }">
      <ClickableCell :item="item" :display-value="valueOrDash(item.parcelNumber)" :cell-class="parcelCellClass()" :disabled="isParcelCellDisabled" @click="editParcel(item)" />
    </template>

    <template #[`item.shk`]="{ item }">
      <ClickableCell :item="item" :display-value="valueOrDash(item.shk)" :cell-class="parcelCellClass()" :disabled="isParcelCellDisabled" @click="editParcel(item)" />
    </template>

    <template #[`item.sticker`]="{ item }">
      <ClickableCell :item="item" :display-value="valueOrDash(item.sticker)" :cell-class="parcelCellClass()" :disabled="isParcelCellDisabled" @click="editParcel(item)" />
    </template>

    <template #[`item.wbSticker`]="{ item }">
      <ClickableCell :item="item" :display-value="valueOrDash(item.wbSticker)" :cell-class="parcelCellClass()" :disabled="isParcelCellDisabled" @click="editParcel(item)" />
    </template>

    <template #[`item.sellerSticker`]="{ item }">
      <ClickableCell :item="item" :display-value="valueOrDash(item.sellerSticker)" :cell-class="parcelCellClass()" :disabled="isParcelCellDisabled" @click="editParcel(item)" />
    </template>

    <template #[`item.stickerCode`]="{ item }">
      <ClickableCell :item="item" :display-value="valueOrDash(item.stickerCode)" :cell-class="parcelCellClass()" :disabled="isParcelCellDisabled" @click="editParcel(item)" />
    </template>

    <template #[`item.postingNumber`]="{ item }">
      <ClickableCell :item="item" :display-value="valueOrDash(item.postingNumber)" :cell-class="parcelCellClass()" :disabled="isParcelCellDisabled" @click="editParcel(item)" />
    </template>

    <template #[`item.barcode`]="{ item }">
      <ClickableCell :item="item" :display-value="valueOrDash(item.barcode)" :cell-class="parcelCellClass()" :disabled="isParcelCellDisabled" @click="editParcel(item)" />
    </template>

    <template #[`item.productName`]="{ item }">
      <span
        :class="['scanjob-monitor-product-name-cell', canFollowParcelEditRoute ? 'clickable-cell' : '', isParcelCellDisabled ? 'clickable-cell-disabled' : '']"
        :aria-disabled="isParcelCellDisabled ? 'true' : undefined"
        :title="item.productName || ''"
        @click="onProductNameClick(item, $event)"
      >
        {{ valueOrDash(item.productName) }}
      </span>
    </template>

    <template #[`item.weightKg`]="{ item }">
      <ClickableCell :item="item" :display-value="formatWeight(item.weightKg)" :cell-class="parcelCellClass()" :disabled="isParcelCellDisabled" @click="editParcel(item)" />
    </template>

    <template #[`item.quantity`]="{ item }">
      <ClickableCell :item="item" :display-value="valueOrDash(item.quantity)" :cell-class="parcelCellClass()" :disabled="isParcelCellDisabled" @click="editParcel(item)" />
    </template>

    <template #[`item.zone`]="{ item }">
      <ClickableCell :item="item" :display-value="valueOrDash(item.zoneName)" :cell-class="parcelCellClass()" :disabled="isParcelCellDisabled" @click="editParcel(item)" />
    </template>

    <template #[`item.zoneName`]="{ item }">
      <ClickableCell :item="item" :display-value="valueOrDash(item.zoneName)" :cell-class="parcelCellClass()" :disabled="isParcelCellDisabled" @click="editParcel(item)" />
    </template>

    <template #[`item.statusId`]="{ item }">
      <ClickableCell :item="item" :display-value="valueOrDash(item.statusTitle)" :cell-class="parcelCellClass()" :disabled="isParcelCellDisabled" @click="editParcel(item)" />
    </template>

    <template #[`item.statusTitle`]="{ item }">
      <ClickableCell :item="item" :display-value="valueOrDash(item.statusTitle)" :cell-class="parcelCellClass()" :disabled="isParcelCellDisabled" @click="editParcel(item)" />
    </template>

    <template #[`item.checkStatusProjection`]="{ item }">
      <span
        :class="parcelCellClass(`status-cell scanjob-projected-status ${getScanjobCheckStatusClass(item.checkStatusProjection)}`)"
        :aria-disabled="isParcelCellDisabled ? 'true' : undefined"
        @click="editParcel(item)"
      >
        <span class="scanjob-projected-status-title">{{ scanjobCheckStatusText(item.checkStatusProjection) }}</span>
        <span v-if="scanjobCheckStatusReason(item.checkStatusProjection)" class="scanjob-projected-status-reason">
          {{ scanjobCheckStatusReason(item.checkStatusProjection) }}
        </span>
      </span>
    </template>
  </v-data-table>
</template>
