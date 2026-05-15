<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth.store.js'
import ClickableCell from '@/components/ClickableCell.vue'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { formatWeight } from '@/helpers/number.formatters.js'
import { getCheckStatusClass } from '@/helpers/parcels.check.helpers.js'
import { CheckStatusCode } from '@/helpers/check.status.code.js'
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
  scanjobmonitor_parcels_page
} = storeToRefs(authStore)

function editParcel(item) {
  emit('edit-parcel', item)
}

function checkStatusText(value) {
  return value == null ? '-' : new CheckStatusCode(value).toString()
}

function onProductNameClick(item, event) {
  if (props.loading || event.shiftKey || event.ctrlKey || event.metaKey) {
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
        :cell-class="`${stickerClass(item.stickerScanned)} clickable-cell`"
        :disabled="props.loading"
        @click="editParcel(item)"
      />
    </template>

    <template #[`item.scannedSticker`]="{ item }">
      <ClickableCell :item="item" :display-value="valueOrDash(item.scannedSticker)" :disabled="props.loading" @click="editParcel(item)" />
    </template>

    <template #[`item.scannedUserName`]="{ item }">
      <ClickableCell :item="item" :display-value="valueOrDash(item.scannedUserName)" :disabled="props.loading" @click="editParcel(item)" />
    </template>

    <template #[`item.scannedTime`]="{ item }">
      <ClickableCell :item="item" :display-value="valueOrDash(formatScanTime(item.scannedTime))" :disabled="props.loading" @click="editParcel(item)" />
    </template>

    <template #[`item.parcelNumber`]="{ item }">
      <ClickableCell :item="item" :display-value="valueOrDash(item.parcelNumber)" :disabled="props.loading" @click="editParcel(item)" />
    </template>

    <template #[`item.id`]="{ item }">
      <ClickableCell :item="item" :display-value="valueOrDash(item.id)" :disabled="props.loading" @click="editParcel(item)" />
    </template>

    <template #[`item.shk`]="{ item }">
      <ClickableCell :item="item" :display-value="valueOrDash(item.shk)" :disabled="props.loading" @click="editParcel(item)" />
    </template>

    <template #[`item.sticker`]="{ item }">
      <ClickableCell :item="item" :display-value="valueOrDash(item.sticker)" :disabled="props.loading" @click="editParcel(item)" />
    </template>

    <template #[`item.wbSticker`]="{ item }">
      <ClickableCell :item="item" :display-value="valueOrDash(item.wbSticker)" :disabled="props.loading" @click="editParcel(item)" />
    </template>

    <template #[`item.sellerSticker`]="{ item }">
      <ClickableCell :item="item" :display-value="valueOrDash(item.sellerSticker)" :disabled="props.loading" @click="editParcel(item)" />
    </template>

    <template #[`item.stickerCode`]="{ item }">
      <ClickableCell :item="item" :display-value="valueOrDash(item.stickerCode)" :disabled="props.loading" @click="editParcel(item)" />
    </template>

    <template #[`item.postingNumber`]="{ item }">
      <ClickableCell :item="item" :display-value="valueOrDash(item.postingNumber)" :disabled="props.loading" @click="editParcel(item)" />
    </template>

    <template #[`item.barcode`]="{ item }">
      <ClickableCell :item="item" :display-value="valueOrDash(item.barcode)" :disabled="props.loading" @click="editParcel(item)" />
    </template>

    <template #[`item.productName`]="{ item }">
      <span
        :class="['scanjob-monitor-product-name-cell', 'clickable-cell', props.loading ? 'clickable-cell-disabled' : '']"
        :aria-disabled="props.loading ? 'true' : undefined"
        :title="item.productName || ''"
        @click="onProductNameClick(item, $event)"
      >
        {{ valueOrDash(item.productName) }}
      </span>
    </template>

    <template #[`item.weightKg`]="{ item }">
      <ClickableCell :item="item" :display-value="formatWeight(item.weightKg)" :disabled="props.loading" @click="editParcel(item)" />
    </template>

    <template #[`item.quantity`]="{ item }">
      <ClickableCell :item="item" :display-value="valueOrDash(item.quantity)" :disabled="props.loading" @click="editParcel(item)" />
    </template>

    <template #[`item.zone`]="{ item }">
      <ClickableCell :item="item" :display-value="valueOrDash(item.zoneName)" :disabled="props.loading" @click="editParcel(item)" />
    </template>

    <template #[`item.zoneName`]="{ item }">
      <ClickableCell :item="item" :display-value="valueOrDash(item.zoneName)" :disabled="props.loading" @click="editParcel(item)" />
    </template>

    <template #[`item.statusId`]="{ item }">
      <ClickableCell :item="item" :display-value="valueOrDash(item.statusTitle)" :disabled="props.loading" @click="editParcel(item)" />
    </template>

    <template #[`item.statusTitle`]="{ item }">
      <ClickableCell :item="item" :display-value="valueOrDash(item.statusTitle)" :disabled="props.loading" @click="editParcel(item)" />
    </template>

    <template #[`item.checkStatus`]="{ item }">
      <ClickableCell
        :item="item"
        :display-value="checkStatusText(item.checkStatus)"
        :cell-class="`status-cell ${getCheckStatusClass(item.checkStatus)} clickable-cell`"
        :disabled="props.loading"
        @click="editParcel(item)"
      />
    </template>
  </v-data-table>
</template>
