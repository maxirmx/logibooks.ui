<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useCompaniesStore } from '@/stores/companies.store.js'
import { useCountriesStore } from '@/stores/countries.store.js'
import { useAirportsStore } from '@/stores/airports.store.js'
import { useWarehousesStore } from '@/stores/warehouses.store.js'
import { useRegisterStatusesStore } from '@/stores/register.statuses.store.js'
import { getRegisterNouns, OP_MODE_WAREHOUSE } from '@/helpers/op.mode.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { formatIntegerThousands } from '@/helpers/number.formatters.js'
import { formatDate } from '@/helpers/date.formatters.js'
import { formatParcelsByCheckStatusProjectionTooltip } from '@/helpers/parcel.stats.helpers.js'
import {
  createAirportsById,
  createTransportationTypesById,
  createWarehouseRegisterHeaders,
  formatZoneCount,
  getCountryDisplayName as resolveCountryDisplayName,
  isReturnRegister,
  warehouseZoneDistribution
} from '@/helpers/warehouse.registers.table.helpers.js'
import ActionButton from '@/components/ActionButton.vue'
import ClickableCell from '@/components/ClickableCell.vue'
import RegisterInvoiceCell from '@/components/RegisterInvoiceCell.vue'
import SenderRecipientCell from '@/components/SenderRecipientCell.vue'
import SortableMultilineHeader from '@/components/SortableMultilineHeader.vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  itemsLength: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
  itemsPerPage: { type: Number, required: true },
  page: { type: Number, required: true },
  sortBy: { type: Array, required: true },
  showActions: { type: Boolean, default: true },
  selectable: { type: Boolean, default: false },
  selectedIds: { type: Array, default: () => [] },
  selectionDisabled: { type: Boolean, default: false },
  linksEnabled: { type: Boolean, default: true },
  runningAction: { type: Boolean, default: false },
  hasWhRole: { type: Boolean, default: false },
  isSrLogistPlus: { type: Boolean, default: false },
  isWhManagerPlus: { type: Boolean, default: false },
  statusOptions: { type: Array, default: () => [] },
  isInEditMode: { type: Function, default: () => false },
  getSelectedStatusId: { type: Function, default: () => null },
  setSelectedStatusId: { type: Function, default: () => {} },
  bulkChangeStatus: { type: Function, default: () => {} },
  cancelStatusChange: { type: Function, default: () => {} },
  applyStatusToAllOrders: { type: Function, default: () => {} }
})

const emit = defineEmits([
  'update:itemsPerPage',
  'update:page',
  'update:sortBy',
  'update:selectedIds',
  'open-parcels',
  'edit-register',
  'open-unregistered-parcels',
  'open-scanjob-create'
])

const registersStore = useRegistersStore()
const { ops } = storeToRefs(registersStore)

const companiesStore = useCompaniesStore()
const { companies } = storeToRefs(companiesStore)

const countriesStore = useCountriesStore()
const { countries } = storeToRefs(countriesStore)

const airportsStore = useAirportsStore()
const { airports } = storeToRefs(airportsStore)

const warehousesStore = useWarehousesStore()
const registerStatusesStore = useRegisterStatusesStore()

const registerNouns = computed(() => getRegisterNouns(OP_MODE_WAREHOUSE))

const headers = computed(() => createWarehouseRegisterHeaders({
  showActions: props.showActions,
  selectable: props.selectable
}))

const itemsPerPageModel = computed({
  get: () => props.itemsPerPage,
  set: value => emit('update:itemsPerPage', value)
})

const pageModel = computed({
  get: () => props.page,
  set: value => emit('update:page', value)
})

const sortByModel = computed({
  get: () => props.sortBy,
  set: value => emit('update:sortBy', value)
})

const selectedIdSet = computed(() => new Set(props.selectedIds))
const transportationTypesById = computed(() => createTransportationTypesById(ops.value))
const airportsById = computed(() => createAirportsById(airports.value))

function isSelected(registerId) {
  return selectedIdSet.value.has(registerId)
}

function toggleSelection(registerId, checked) {
  const current = new Set(props.selectedIds)
  if (checked) {
    current.add(registerId)
  } else {
    current.delete(registerId)
  }

  emit('update:selectedIds', Array.from(current))
}

function getRegisterLabel(item) {
  return item?.dealNumber || item?.fileName || `#${item?.id}`
}

function getCountryDisplayName(item, countryCode, airportId) {
  return resolveCountryDisplayName(
    item,
    countryCode,
    airportId,
    countries.value,
    transportationTypesById.value,
    airportsById.value
  )
}

function emitOpenParcels(item) {
  if (props.linksEnabled) {
    emit('open-parcels', item)
  }
}

function emitEditRegister(item) {
  if (props.linksEnabled) {
    emit('edit-register', item)
  }
}

</script>

<template>
  <v-card
    class="table-card warehouse-registers-table-card"
    :class="{ 'warehouse-registers-table-card--read-only': !linksEnabled }"
  >
    <v-data-table-server
      v-model:items-per-page="itemsPerPageModel"
      :items-per-page-text="`${registerNouns.genitivePluralCapitalized} на странице`"
      :items-per-page-options="itemsPerPageOptions"
      page-text="{0}-{1} из {2}"
      v-model:page="pageModel"
      v-model:sort-by="sortByModel"
      :headers="headers"
      :items="items"
      :items-length="itemsLength"
      :loading="loading"
      density="compact"
      class="elevation-1 interlaced-table"
      fixed-header
      data-testid="registers-table"
    >
      <template v-if="selectable" #[`item.selection`]="{ item }">
        <input
          type="checkbox"
          :checked="isSelected(item.id)"
          :disabled="selectionDisabled"
          :aria-label="getRegisterLabel(item)"
          data-testid="register-checkbox"
          @change="toggleSelection(item.id, $event.target.checked)"
        />
      </template>

      <template #[`item.dealNumber`]="{ item }">
        <ClickableCell
          v-if="linksEnabled"
          :item="item"
          :display-value="item.dealNumber"
          cell-class="truncated-cell clickable-cell open-parcels-link"
          @click="emitOpenParcels"
        />
        <span v-else class="truncated-cell">{{ item.dealNumber }}</span>
        <font-awesome-icon class="bookmark-icon" icon="fa-solid fa-bookmark" v-if="item?.lookupByArticle" />
      </template>

      <template #[`item.invoice`]="{ item }">
        <span v-if="isReturnRegister(item)" class="truncated-cell invoice-panel"></span>
        <ClickableCell
          v-else-if="linksEnabled"
          :item="item"
          cell-class="truncated-cell clickable-cell open-parcels-link invoice-panel"
          @click="emitOpenParcels"
        >
          <template #default>
            <RegisterInvoiceCell
              :item="item"
              :get-transportation-document="registersStore.getTransportationDocument"
            />
          </template>
        </ClickableCell>
        <span v-else class="truncated-cell invoice-panel">
          <RegisterInvoiceCell
            :item="item"
            :get-transportation-document="registersStore.getTransportationDocument"
          />
        </span>
      </template>

      <template #[`item.countries`]="{ item }">
        <ClickableCell
          v-if="linksEnabled"
          :item="item"
          cell-class="truncated-cell clickable-cell edit-register-link countries-panel"
          @click="emitEditRegister"
        >
          <template #default>
            <div class="countries-box">
              <div v-if="isReturnRegister(item)" class="customs-procedure return-procedure">Возврат</div>
              <template v-else>
                <div class="customs-procedure">{{ registersStore.getOpsLabel(ops.customsProcedures, item.customsProcedureCode) }}</div>
                <div class="country-route">
                  <span>{{ getCountryDisplayName(item, item.origCountryCode, item.departureAirportId) }}</span>
                  <font-awesome-icon icon="fa-solid fa-arrow-right" class="mx-1 arrow-icon" />
                  <span>{{ getCountryDisplayName(item, item.destCountryCode, item.arrivalAirportId) }}</span>
                </div>
              </template>
            </div>
          </template>
        </ClickableCell>
        <span v-else class="truncated-cell countries-panel">
          <div class="countries-box">
            <div v-if="isReturnRegister(item)" class="customs-procedure return-procedure">Возврат</div>
            <template v-else>
              <div class="customs-procedure">{{ registersStore.getOpsLabel(ops.customsProcedures, item.customsProcedureCode) }}</div>
              <div class="country-route">
                <span>{{ getCountryDisplayName(item, item.origCountryCode, item.departureAirportId) }}</span>
                <font-awesome-icon icon="fa-solid fa-arrow-right" class="mx-1 arrow-icon" />
                <span>{{ getCountryDisplayName(item, item.destCountryCode, item.arrivalAirportId) }}</span>
              </div>
            </template>
          </div>
        </span>
      </template>

      <template #[`item.senderRecipient`]="{ item }">
        <ClickableCell
          v-if="linksEnabled"
          :item="item"
          cell-class="truncated-cell clickable-cell edit-register-link data-panel"
          @click="emitEditRegister"
        >
          <template #default>
            <SenderRecipientCell :item="item" :companies="companies" />
          </template>
        </ClickableCell>
        <span v-else class="truncated-cell data-panel">
          <SenderRecipientCell :item="item" :companies="companies" />
        </span>
      </template>

      <template #[`item.statusId`]="{ item }">
        <ClickableCell
          v-if="linksEnabled"
          :item="item"
          :display-value="registerStatusesStore.getStatusTitle(item.statusId)"
          cell-class="truncated-cell clickable-cell open-parcels-link status-panel"
          @click="emitOpenParcels"
        />
        <span v-else class="truncated-cell status-panel">{{ registerStatusesStore.getStatusTitle(item.statusId) }}</span>
      </template>

      <template #[`item.warehouseId`]="{ item }">
        <ClickableCell
          v-if="linksEnabled"
          :item="item"
          :display-value="warehousesStore.getWarehouseName(item.warehouseId)"
          cell-class="truncated-cell clickable-cell open-parcels-link warehouse-panel"
          @click="emitOpenParcels"
        />
        <span v-else class="truncated-cell warehouse-panel">{{ warehousesStore.getWarehouseName(item.warehouseId) }}</span>
      </template>

      <template #[`item.warehouseArrivalDate`]="{ item }">
        <ClickableCell
          v-if="linksEnabled"
          :item="item"
          :display-value="formatDate(item.warehouseArrivalDate)"
          cell-class="truncated-cell clickable-cell open-parcels-link warehouse-arrival-panel"
          @click="emitOpenParcels"
        />
        <span v-else class="truncated-cell warehouse-arrival-panel">{{ formatDate(item.warehouseArrivalDate) }}</span>
      </template>

      <template #[`item.parcelsTotal`]="{ item }">
        <v-tooltip>
          <template #activator="{ props: tipProps }">
            <ClickableCell
              v-if="linksEnabled"
              v-bind="tipProps"
              :item="item"
              cell-class="truncated-cell clickable-cell data-panel numeric-panel"
              @click="emitOpenParcels"
            >
              <template #default>
                <div class="data-box">
                  <div>{{ formatIntegerThousands(item.parcelsTotal) }}</div>
                  <div>{{ formatIntegerThousands(item.placesTotal) }}</div>
                </div>
              </template>
            </ClickableCell>
            <span
              v-else
              v-bind="tipProps"
              class="truncated-cell data-panel numeric-panel warehouse-registers-tooltip-cell"
            >
              <div class="data-box">
                <div>{{ formatIntegerThousands(item.parcelsTotal) }}</div>
                <div>{{ formatIntegerThousands(item.placesTotal) }}</div>
              </div>
            </span>
          </template>
          <template #default>
            <div style="white-space: pre-line">{{ formatParcelsByCheckStatusProjectionTooltip(item) }}</div>
          </template>
        </v-tooltip>
      </template>

      <template #[`item.parcelsByZone`]="{ item }">
        <div class="zone-distribution">
          <div
            v-for="zone in warehouseZoneDistribution"
            :key="zone.value"
            class="zone-distribution-row"
          >
            <span class="zone-distribution-label">{{ zone.label }}</span>
            <span class="zone-distribution-value">{{ formatZoneCount(item, zone.value) }}</span>
          </div>
        </div>
      </template>

      <template #[`header.dealNumber`]="{ column, isSorted, getSortIcon }">
        <SortableMultilineHeader
          :lines="['Номер', 'сделки']"
          :column="column"
          :is-sorted="isSorted"
          :get-sort-icon="getSortIcon"
        />
      </template>

      <template #[`header.senderRecipient`]="{ column, isSorted, getSortIcon }">
        <SortableMultilineHeader
          :lines="['Отправитель', 'Получатель']"
          :column="column"
          :is-sorted="isSorted"
          :get-sort-icon="getSortIcon"
        />
      </template>

      <template #[`header.parcelsTotal`]="{ column, isSorted, getSortIcon }">
        <SortableMultilineHeader
          :lines="['Товаров', 'Посылок']"
          :column="column"
          :is-sorted="isSorted"
          :get-sort-icon="getSortIcon"
        />
      </template>

      <template #[`header.warehouseArrivalDate`]="{ column, isSorted, getSortIcon }">
        <SortableMultilineHeader
          :lines="['Дата', 'прибытия']"
          :column="column"
          :is-sorted="isSorted"
          :get-sort-icon="getSortIcon"
        />
      </template>

      <template v-if="showActions" #[`item.actions`]="{ item }">
        <div class="actions-container">
          <ActionButton
            :item="item"
            icon="fa-solid fa-list"
            tooltip-text="Список посылок"
            @click="() => emit('open-parcels', item)"
            :disabled="runningAction || loading"
          />
          <ActionButton
            v-if="hasWhRole"
            :item="item"
            icon="fa-solid fa-rectangle-list"
            tooltip-text="Стикеры не в реестре"
            @click="() => emit('open-unregistered-parcels', item)"
            :disabled="runningAction || loading"
          />
          <ActionButton
            v-if="isSrLogistPlus"
            :item="item"
            icon="fa-solid fa-pen"
            :tooltip-text="`Редактировать ${registerNouns.accusative}`"
            @click="() => emit('edit-register', item)"
            :disabled="runningAction || loading"
          />

          <div class="bulk-status-inline" v-if="isSrLogistPlus">
            <div v-if="isInEditMode(item.id)" class="status-selector-inline">
              <v-select
                :model-value="getSelectedStatusId(item.id)"
                @update:model-value="(value) => setSelectedStatusId(item.id, value)"
                :items="statusOptions"
                item-title="title"
                item-value="id"
                placeholder="Статус"
                variant="outlined"
                density="compact"
                hide-details
                hide-no-data
                :disabled="runningAction || loading"
              />
              <ActionButton
                :item="item"
                icon="fa-solid fa-check"
                tooltip-text="Применить статус"
                :disabled="runningAction || loading || !getSelectedStatusId(item.id)"
                @click="() => applyStatusToAllOrders(item.id, getSelectedStatusId(item.id))"
              />
              <ActionButton
                :item="item"
                icon="fa-solid fa-xmark"
                tooltip-text="Отменить"
                :disabled="runningAction || loading"
                @click="() => cancelStatusChange(item.id)"
              />
            </div>
            <ActionButton
              v-else
              :item="item"
              icon="fa-solid fa-pen-to-square"
              :tooltip-text="`Изменить статус всех посылок в ${registerNouns.prepositional}`"
              :disabled="runningAction || loading"
              @click="() => bulkChangeStatus(item.id)"
            />
          </div>
          <ActionButton
            v-if="isWhManagerPlus"
            :item="item"
            icon="fa-solid fa-barcode"
            tooltip-text="Создать задание на сканирование"
            @click="() => emit('open-scanjob-create', item)"
            :disabled="runningAction || loading"
          />
        </div>
      </template>
    </v-data-table-server>
  </v-card>
</template>

<style scoped>
.warehouse-registers-table-card.table-card :deep(.v-data-table) {
  height: auto;
}

.warehouse-registers-table-card.table-card :deep(.v-table__wrapper) {
  max-height: none;
  overflow-x: auto;
  overflow-y: hidden;
}

.warehouse-registers-table-card--read-only :deep(.truncated-cell:hover) {
  cursor: default;
}

.warehouse-registers-table-card--read-only :deep(.warehouse-registers-tooltip-cell:hover) {
  cursor: help;
}

.arrow-icon {
  opacity: 0.8;
}

.bookmark-icon {
  color: #28a745;
  margin-right: 0;
  margin-left: 8px;
  margin-top: 2px;
  opacity: 0.95;
}

.bookmark-icon:hover {
  color: #218838;
}

.invoice-panel .invoice-box {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.invoice-panel .invoice-number {
  font-size: 0.95rem;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.invoice-panel .invoice-date {
  font-size: 0.78rem;
  margin-top: 4px;
}

.data-panel .data-box {
  display: flex;
  flex-direction: column;
  font-size: 0.9rem;
  margin-top: 4px;
}

.data-panel .data-box > div {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.numeric-panel .data-box {
  align-items: flex-end;
  text-align: right;
}

.zone-distribution {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 0.82rem;
  line-height: 1.15;
  min-width: 120px;
}

.zone-distribution-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
}

.zone-distribution-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.zone-distribution-value {
  min-width: 26px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.countries-panel .countries-box {
  display: flex;
  flex-direction: column;
  font-size: 0.9rem;
  margin-top: 4px;
}

.countries-panel .customs-procedure {
  font-size: 0.9rem;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}

.countries-panel .country-route {
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
