<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, nextTick, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth.store.js'
import ActionButton from '@/components/ActionButton.vue'
import ClickableCell from '@/components/ClickableCell.vue'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { formatWeight } from '@/helpers/number.formatters.js'
import {
  canClearParcelDefect,
  canSetParcelDefect
} from '@/helpers/parcel.defect.helpers.js'
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
  loading: { type: Boolean, default: false },
  defectActionLoading: { type: Boolean, default: false },
  selectedParcelId: { type: [Number, String], default: null }
})

const emit = defineEmits(['edit-parcel', 'set-defect', 'clear-defect'])

const authStore = useAuthStore()
const {
  scanjobmonitor_parcels_per_page,
  scanjobmonitor_parcels_sort_by,
  scanjobmonitor_parcels_page,
  hasLogistRole
} = storeToRefs(authStore)

const canFollowParcelEditRoute = computed(() => hasLogistRole?.value === true)
const isParcelCellDisabled = computed(() => props.loading || !canFollowParcelEditRoute.value)
const areDefectActionsBusy = computed(() => props.loading || props.defectActionLoading)
const selectedParcelIdNumber = computed(() => toNumberOrNull(props.selectedParcelId))
const dataTableRef = ref(null)

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

function isSetDefectDisabled(item) {
  return areDefectActionsBusy.value || !canSetParcelDefect(item, authStore)
}

function isClearDefectDisabled(item) {
  return areDefectActionsBusy.value || !canClearParcelDefect(item, authStore)
}

function setDefect(item) {
  if (isSetDefectDisabled(item)) return
  emit('set-defect', item)
}

function clearDefect(item) {
  if (isClearDefectDisabled(item)) return
  emit('clear-defect', item)
}

function toNumberOrNull(value) {
  if (value == null || value === '') {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function getParcelId(item) {
  return toNumberOrNull(item?.parcelId ?? item?.id)
}

function comparePrimitiveValues(left, right) {
  if (left == null && right == null) return 0
  if (left == null) return -1
  if (right == null) return 1

  if (typeof left === 'number' && typeof right === 'number') {
    return left - right
  }

  return String(left).localeCompare(String(right), 'ru', {
    numeric: true,
    sensitivity: 'accent'
  })
}

function getSortedParcels() {
  const sortRules = Array.isArray(scanjobmonitor_parcels_sort_by.value)
    ? scanjobmonitor_parcels_sort_by.value
    : []

  if (sortRules.length === 0) {
    return props.parcels
  }

  const headersByKey = new Map(props.headers.map((header) => [header.key, header]))
  return [...props.parcels].sort((left, right) => {
    for (const rule of sortRules) {
      const key = rule?.key
      if (!key) {
        continue
      }

      const header = headersByKey.get(key)
      const customSort = typeof header?.sort === 'function'
        ? header.sort(left?.[key], right?.[key])
        : comparePrimitiveValues(left?.[key], right?.[key])

      if (customSort !== 0) {
        return rule.order === 'desc' ? -customSort : customSort
      }
    }

    return comparePrimitiveValues(getParcelId(left), getParcelId(right))
  })
}

function moveToSelectedParcelPage() {
  const selectedId = selectedParcelIdNumber.value
  if (selectedId == null) {
    return
  }

  const perPage = Number(scanjobmonitor_parcels_per_page.value)
  if (!Number.isFinite(perPage) || perPage <= 0) {
    return
  }

  const selectedIndex = getSortedParcels().findIndex((parcel) => getParcelId(parcel) === selectedId)
  if (selectedIndex < 0) {
    return
  }

  scanjobmonitor_parcels_page.value = Math.floor(selectedIndex / perPage) + 1
}

async function scrollToSelectedParcel() {
  const selectedId = selectedParcelIdNumber.value
  if (selectedId == null) {
    return
  }

  await nextTick()
  const tableElement = dataTableRef.value?.$el ?? dataTableRef.value
  const selectedRows = tableElement?.querySelectorAll?.('.selected-parcel-row')
  const selectedRow = selectedRows?.[selectedRows.length - 1]
  selectedRow?.scrollIntoView?.({
    behavior: 'smooth',
    block: 'center',
    inline: 'nearest'
  })
}

function getRowProps(data) {
  const item = data?.item ?? data
  return getParcelId(item) === selectedParcelIdNumber.value
    ? { class: 'selected-parcel-row' }
    : {}
}

watch(
  () => [
    props.selectedParcelId,
    props.parcels,
    scanjobmonitor_parcels_per_page.value,
    scanjobmonitor_parcels_sort_by.value
  ],
  async () => {
    moveToSelectedParcelPage()
    await scrollToSelectedParcel()
  },
  { immediate: true, deep: true }
)

</script>

<template>
  <v-data-table
    ref="dataTableRef"
    v-model:items-per-page="scanjobmonitor_parcels_per_page"
    v-model:page="scanjobmonitor_parcels_page"
    v-model:sort-by="scanjobmonitor_parcels_sort_by"
    :headers="props.headers"
    :items="props.parcels"
    :row-props="getRowProps"
    :items-per-page-options="itemsPerPageOptions"
    items-per-page-text="Посылок на странице"
    page-text="{0}-{1} из {2}"
    :loading="props.loading"
    density="compact"
    class="elevation-1 interlaced-table single-line-table scanjob-monitor-parcels-table"
    data-testid="scanjob-monitor-parcels-table"
  >
    <template #[`item.actions`]="{ item }">
      <div class="actions-container">
        <ActionButton
          :item="item"
          icon="fa-solid fa-person-circle-xmark"
          tooltip-text="Брак"
          aria-label="Брак"
          title="Брак"
          data-testid="scanjob-set-defect-action"
          @click="setDefect"
          :disabled="isSetDefectDisabled(item)"
        />
        <ActionButton
          :item="item"
          icon="fa-solid fa-person-circle-check"
          tooltip-text="Отменить брак"
          aria-label="Отменить брак"
          title="Отменить брак"
          data-testid="scanjob-clear-defect-action"
          @click="clearDefect"
          :disabled="isClearDefectDisabled(item)"
        />
      </div>
    </template>

    <template #[`header.scannedInfo`]="{ column }">
      <span class="scanjob-monitor-scanned-info-header">{{ column.title }}</span>
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
