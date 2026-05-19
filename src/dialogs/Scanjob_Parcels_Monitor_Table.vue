<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth.store.js'
import ActionButton from '@/components/ActionButton.vue'
import ClickableCell from '@/components/ClickableCell.vue'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { formatWeight } from '@/helpers/number.formatters.js'
import { isSetDefectCheckStatusBlocked } from '@/helpers/parcels.check.helpers.js'
import {
  getScanjobCheckStatusClass,
  scanjobCheckStatusReason,
  scanjobCheckStatusText
} from '@/helpers/scanjob.check-status.helpers.js'
import {
  formatScannedInfoLines,
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

const emit = defineEmits(['edit-parcel', 'set-defect'])

const authStore = useAuthStore()
const {
  scanjobmonitor_parcels_per_page,
  scanjobmonitor_parcels_sort_by,
  scanjobmonitor_parcels_page,
  hasLogistRole,
  isAdmin,
  isWhManager
} = storeToRefs(authStore)

const canFollowParcelEditRoute = computed(() => hasLogistRole?.value === true)
const isParcelCellDisabled = computed(() => props.loading || !canFollowParcelEditRoute.value)
const canSetDefectByRole = computed(() => isAdmin?.value === true || isWhManager?.value === true)

function editParcel(item) {
  if (isParcelCellDisabled.value) {
    return
  }

  emit('edit-parcel', item)
}

function isSetDefectDisabled(item) {
  return !(item?.id ?? item?.parcelId)
    || props.loading
    || !canSetDefectByRole.value
    || isSetDefectCheckStatusBlocked(item?.checkStatus)
    || isSetDefectProjectionBlocked(item)
}

function setDefect(item) {
  if (isSetDefectDisabled(item)) {
    return
  }

  emit('set-defect', item)
}

function isSetDefectProjectionBlocked(item) {
  const statusText = [
    item?.checkStatusProjection?.title,
    item?.checkStatusProjection?.restrictionReason
  ].filter(Boolean).join(' ').toLocaleLowerCase('ru-RU')

  return statusText.includes('дубликат') || statusText.includes('исключено партн')
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
    class="elevation-1 interlaced-table single-line-table scanjob-monitor-parcels-table"
    data-testid="scanjob-monitor-parcels-table"
  >
    <template #[`header.scannedInfo`]="{ column }">
      <span class="scanjob-monitor-scanned-info-header">{{ column.title }}</span>
    </template>

    <template #[`item.actions`]="{ item }">
      <ActionButton
        :item="item"
        icon="fa-solid fa-person-circle-xmark"
        tooltip-text="Брак"
        variant="red"
        :disabled="isSetDefectDisabled(item)"
        :data-testid="`scanjob-parcel-set-defect-${item.id ?? item.parcelId}`"
        @click="setDefect"
      />
    </template>

    <template #[`item.stickerScanned`]="{ item }">
      <ClickableCell
        :item="item"
        :display-value="stickerText(item.stickerScanned)"
        :cell-class="parcelCellClass(stickerClass(item.stickerScanned))"
        :disabled="isParcelCellDisabled"
        @click="editParcel(item)"
      />
    </template>

    <template #[`item.scannedInfo`]="{ item }">
      <ClickableCell :item="item" :display-value="''" :cell-class="parcelCellClass('scanjob-monitor-scanned-info-cell')" :disabled="isParcelCellDisabled" @click="editParcel(item)">
        <span class="scanjob-monitor-scanned-info">
          <span v-for="(line, index) in formatScannedInfoLines(item)" :key="index">{{ line }}</span>
        </span>
      </ClickableCell>
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
      <v-tooltip v-if="item.productName" location="top" open-delay="150">
        <template #activator="{ props: tooltipProps }">
          <span
            v-bind="tooltipProps"
            :class="['scanjob-monitor-product-name-cell', canFollowParcelEditRoute ? 'clickable-cell' : '', isParcelCellDisabled ? 'clickable-cell-disabled' : '']"
            :aria-disabled="isParcelCellDisabled ? 'true' : undefined"
            @click="onProductNameClick(item, $event)"
          >
            {{ valueOrDash(item.productName) }}
          </span>
        </template>
        <template #default>
          <div style="white-space: pre-line">{{ item.productName }}</div>
        </template>
      </v-tooltip>
      <span
        v-else
        :class="['scanjob-monitor-product-name-cell', canFollowParcelEditRoute ? 'clickable-cell' : '', isParcelCellDisabled ? 'clickable-cell-disabled' : '']"
        :aria-disabled="isParcelCellDisabled ? 'true' : undefined"
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
      <v-tooltip v-if="scanjobCheckStatusReason(item.checkStatusProjection)" location="top" open-delay="150">
        <template #activator="{ props: tooltipProps }">
          <span
            v-bind="tooltipProps"
            :class="parcelCellClass(`status-cell ${getScanjobCheckStatusClass(item.checkStatusProjection)}`)"
            :aria-disabled="isParcelCellDisabled ? 'true' : undefined"
            @click="editParcel(item)"
          >
            {{ scanjobCheckStatusText(item.checkStatusProjection) }}
          </span>
        </template>
        <template #default>
          <div style="white-space: pre-line">{{ scanjobCheckStatusReason(item.checkStatusProjection) }}</div>
        </template>
      </v-tooltip>
      <span
        v-else
        :class="parcelCellClass(`status-cell ${getScanjobCheckStatusClass(item.checkStatusProjection)}`)"
        :aria-disabled="isParcelCellDisabled ? 'true' : undefined"
        @click="editParcel(item)"
      >
        {{ scanjobCheckStatusText(item.checkStatusProjection) }}
      </span>
    </template>
  </v-data-table>
</template>
