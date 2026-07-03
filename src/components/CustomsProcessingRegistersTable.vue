<script setup>
// Copyright (C) 2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useCompaniesStore } from '@/stores/companies.store.js'
import { useCountriesStore } from '@/stores/countries.store.js'
import { useAirportsStore } from '@/stores/airports.store.js'
import { useRegisterStatusesStore } from '@/stores/register.statuses.store.js'
import { OP_MODE_PAPERWORK, getRegisterNouns } from '@/helpers/op.mode.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { formatWeight, formatPrice, formatIntegerThousands } from '@/helpers/number.formatters.js'
import { formatDate } from '@/helpers/date.formatters.js'
import { formatParcelsByCheckStatusTooltip } from '@/helpers/parcel.stats.helpers.js'
import {
  createAirportsById,
  createTransportationTypesById,
  getCountryDisplayName as getRegisterCountryDisplayName
} from '@/helpers/warehouse.registers.table.helpers.js'
import ActionButton from '@/components/ActionButton.vue'
import ClickableCell from '@/components/ClickableCell.vue'
import RegisterInvoiceCell from '@/components/RegisterInvoiceCell.vue'
import RegisterStatusInlineEditor from '@/components/RegisterStatusInlineEditor.vue'
import SenderRecipientCell from '@/components/SenderRecipientCell.vue'
import SortableMultilineHeader from '@/components/SortableMultilineHeader.vue'

const props = defineProps({
  items: { type: Array, default: () => [] },
  itemsLength: { type: Number, default: 0 },
  loading: { type: Boolean, default: false },
  itemsPerPage: { type: Number, required: true },
  page: { type: Number, required: true },
  sortBy: { type: Array, required: true },
  runningAction: { type: Boolean, default: false },
  isShiftLeadPlus: { type: Boolean, default: false },
  isSrLogistPlus: { type: Boolean, default: false },
  openParcelStatusBulkDialog: { type: Function, default: () => {} },
  registerStatusOptions: { type: Array, default: () => [] },
  canChangeRegisterStatus: { type: Boolean, default: false },
  isRegisterStatusEditMode: { type: Function, default: () => false },
  getSelectedRegisterStatusId: { type: Function, default: () => null },
  setSelectedRegisterStatusId: { type: Function, default: () => {} },
  startRegisterStatusChange: { type: Function, default: () => {} },
  cancelRegisterStatusChange: { type: Function, default: () => {} },
  applyRegisterStatusChange: { type: Function, default: () => {} },
  calculateCustomCharges: { type: Function, default: () => {} }
})

const emit = defineEmits([
  'update:itemsPerPage',
  'update:page',
  'update:sortBy',
  'open-parcels',
  'edit-register',
  'delete-register'
])

const registersStore = useRegistersStore()
const { ops } = storeToRefs(registersStore)

const companiesStore = useCompaniesStore()
const { companies } = storeToRefs(companiesStore)

const countriesStore = useCountriesStore()
const { countries } = storeToRefs(countriesStore)

const airportsStore = useAirportsStore()
const { airports } = storeToRefs(airportsStore)

const registerStatusesStore = useRegisterStatusesStore()

const registerNouns = computed(() => getRegisterNouns(OP_MODE_PAPERWORK))

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

const headers = [
  { title: '', key: 'actions', sortable: false, align: 'center' },
  { title: 'Номер сделки', key: 'dealNumber', sortable: true },
  { title: 'ТСД', key: 'invoice', sortable: true },
  { title: 'Страны', key: 'countries', sortable: true },
  { title: 'Отправитель/Получатель', key: 'senderRecipient', sortable: true },
  { title: 'Товаров/Посылок', key: 'parcelsTotal', sortable: true, align: 'end', minWidth: '150px', width: '150px' },
  { title: 'Вес, кг, общий / К оформлению', key: 'weight', sortable: true, align: 'end', minWidth: '220px', width: '220px' },
  { title: 'Стоимость, руб, общая / К оформлению', key: 'price', sortable: true, align: 'end', minWidth: '240px', width: '240px' },
  { title: 'Сборы, руб./Пошлины', key: 'customsCharges', sortable: false, align: 'end', minWidth: '160px', width: '160px' },
  { title: 'Дата загрузки', key: 'date', sortable: true }
]

const transportationTypesById = computed(() => createTransportationTypesById(ops.value))
const airportsById = computed(() => createAirportsById(airports.value))

function getCountryDisplayName(item, countryCode, airportId) {
  return getRegisterCountryDisplayName(
    item,
    countryCode,
    airportId,
    countries.value,
    transportationTypesById.value,
    airportsById.value
  )
}

function parseWeightValue(value) {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' && value.trim() === '') return null
  const numericValue = typeof value === 'string'
    ? Number(value.trim().replace(/\u00A0|\s/g, '').replace(',', '.'))
    : Number(value)
  return Number.isFinite(numericValue) ? numericValue : null
}

function hasRealWeightKg(item) {
  const realWeightKg = parseWeightValue(item?.realWeightKg)
  return realWeightKg !== null && realWeightKg > 0
}

function hasCustomsCharges(item) {
  return item?.customsFee != null || item?.customsDuty != null
}

function formatCustomsCharge(value) {
  return value == null ? '-' : formatPrice(value)
}

function getRegisterStatus(item) {
  return registerStatusesStore.getStatusById(item?.statusId)
}

function getRegisterStatusTitle(item) {
  const status = getRegisterStatus(item)
  return status?.title || (item?.statusId ? registerStatusesStore.getStatusTitle(item.statusId) : null)
}
</script>

<template>
  <v-card class="table-card">
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
      data-testid="customs-processing-registers-table"
    >
      <template #[`item.dealNumber`]="{ item }">
        <ClickableCell
          :item="item"
          :display-value="item.dealNumber"
          cell-class="truncated-cell clickable-cell open-parcels-link"
          @click="(row) => emit('open-parcels', row)"
        />
        <font-awesome-icon class="bookmark-icon" icon="fa-solid fa-bookmark" v-if="item?.lookupByArticle" />
      </template>

      <template #[`item.invoice`]="{ item }">
        <ClickableCell
          :item="item"
          cell-class="truncated-cell clickable-cell open-parcels-link invoice-panel"
          @click="(row) => emit('open-parcels', row)"
        >
          <template #default>
            <RegisterInvoiceCell
              :item="item"
              :get-transportation-document="registersStore.getTransportationDocument"
            />
          </template>
        </ClickableCell>
      </template>

      <template #[`item.countries`]="{ item }">
        <ClickableCell
          :item="item"
          cell-class="truncated-cell clickable-cell edit-register-link countries-panel"
          @click="(row) => emit('edit-register', row)"
        >
          <template #default>
            <div class="countries-box">
              <div class="customs-procedure">{{ registersStore.getOpsLabel(ops.customsProcedures, item.customsProcedureCode) }}</div>
              <div class="country-route">
                <span>{{ getCountryDisplayName(item, item.origCountryCode, item.departureAirportId) }}</span>
                <font-awesome-icon icon="fa-solid fa-arrow-right" class="mx-1 arrow-icon" />
                <span>{{ getCountryDisplayName(item, item.destCountryCode, item.arrivalAirportId) }}</span>
              </div>
            </div>
          </template>
        </ClickableCell>
      </template>

      <template #[`item.senderRecipient`]="{ item }">
        <ClickableCell
          :item="item"
          cell-class="truncated-cell clickable-cell edit-register-link data-panel"
          @click="(row) => emit('edit-register', row)"
        >
          <template #default>
            <SenderRecipientCell :item="item" :companies="companies" />
          </template>
        </ClickableCell>
      </template>

      <template #[`item.date`]="{ item }">
        <ClickableCell
          :item="item"
          :display-value="formatDate(item.date)"
          cell-class="truncated-cell clickable-cell edit-register-link"
          @click="(row) => emit('edit-register', row)"
        />
      </template>

      <template #[`item.parcelsTotal`]="{ item }">
        <v-tooltip>
          <template #activator="{ props: tipProps }">
            <ClickableCell
              v-bind="tipProps"
              :item="item"
              cell-class="truncated-cell clickable-cell data-panel numeric-panel"
              @click="(row) => emit('open-parcels', row)"
            >
              <template #default>
                <div class="data-box">
                  <div>{{ formatIntegerThousands(item.parcelsTotal) }}</div>
                  <div>{{ formatIntegerThousands(item.placesTotal) }}</div>
                </div>
              </template>
            </ClickableCell>
          </template>
          <template #default>
            <div style="white-space: pre-line">{{ formatParcelsByCheckStatusTooltip(item) }}</div>
          </template>
        </v-tooltip>
      </template>

      <template #[`item.weight`]="{ item }">
        <ClickableCell
          :item="item"
          cell-class="truncated-cell clickable-cell data-panel numeric-panel"
          @click="(row) => emit('edit-register', row)"
        >
          <template #default>
            <div class="data-box weight-box" data-testid="register-weight-cell">
              <div class="weight-line">{{ formatWeight(item.totalWeightKg) }}</div>
              <div
                v-if="hasRealWeightKg(item)"
                class="weight-line weight-real-route"
              >
                <span>{{ formatWeight(item.totalWeightKgToRelease) }}</span>
                <font-awesome-icon icon="fa-solid fa-arrow-right" class="mx-1 arrow-icon" />
                <span>{{ formatWeight(item.realWeightKg) }}</span>
              </div>
              <div v-else class="weight-line">{{ formatWeight(item.totalWeightKgToRelease) }}</div>
            </div>
          </template>
        </ClickableCell>
      </template>

      <template #[`item.price`]="{ item }">
        <ClickableCell
          :item="item"
          cell-class="truncated-cell clickable-cell data-panel numeric-panel"
          @click="(row) => emit('edit-register', row)"
        >
          <template #default>
            <div class="data-box">
              <div>{{ formatPrice(item.totalPrice) }}</div>
              <div>{{ formatPrice(item.totalPriceToRelease) }}</div>
            </div>
          </template>
        </ClickableCell>
      </template>

      <template #[`item.customsCharges`]="{ item }">
        <ClickableCell
          :item="item"
          cell-class="truncated-cell clickable-cell data-panel numeric-panel"
          @click="(row) => emit('edit-register', row)"
        >
          <template #default>
            <div class="data-box" data-testid="register-customs-charges-cell">
              <template v-if="hasCustomsCharges(item)">
                <div>{{ formatCustomsCharge(item.customsFee) }}</div>
                <div>{{ formatCustomsCharge(item.customsDuty) }}</div>
              </template>
            </div>
          </template>
        </ClickableCell>
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

      <template #[`header.weight`]="{ column, isSorted, getSortIcon }">
        <SortableMultilineHeader
          :lines="['Вес, кг, общий', 'К оформлению']"
          :column="column"
          :is-sorted="isSorted"
          :get-sort-icon="getSortIcon"
        />
      </template>

      <template #[`header.price`]="{ column, isSorted, getSortIcon }">
        <SortableMultilineHeader
          :lines="['Стоимость, руб, общая', 'К оформлению']"
          :column="column"
          :is-sorted="isSorted"
          :get-sort-icon="getSortIcon"
        />
      </template>

      <template #[`header.customsCharges`]="{ column, isSorted, getSortIcon }">
        <SortableMultilineHeader
          :lines="['Сборы, руб.', 'Пошлины']"
          :column="column"
          :is-sorted="isSorted"
          :get-sort-icon="getSortIcon"
        />
      </template>

      <template #[`header.date`]="{ column, isSorted, getSortIcon }">
        <SortableMultilineHeader
          :lines="['Дата', 'загрузки']"
          :column="column"
          :is-sorted="isSorted"
          :get-sort-icon="getSortIcon"
        />
      </template>

      <template #[`item.actions`]="{ item }">
        <div class="actions-container">
          <RegisterStatusInlineEditor
            :item="item"
            :status="getRegisterStatus(item)"
            :title="getRegisterStatusTitle(item)"
            :status-options="registerStatusOptions"
            :can-change="canChangeRegisterStatus"
            :edit-mode="isRegisterStatusEditMode(item.id)"
            :selected-status-id="getSelectedRegisterStatusId(item.id)"
            :disabled="runningAction || loading"
            @start="() => startRegisterStatusChange(item.id, item.statusId)"
            @select="(value) => setSelectedRegisterStatusId(item.id, value)"
            @apply="(value) => applyRegisterStatusChange(item.id, value, item.statusId)"
            @cancel="() => cancelRegisterStatusChange(item.id)"
          />
          <ActionButton
            :item="item"
            icon="fa-solid fa-list"
            tooltip-text="Список посылок"
            @click="(row) => emit('open-parcels', row)"
            :disabled="runningAction || loading"
          />
          <ActionButton
            v-if="isSrLogistPlus"
            :item="item"
            icon="fa-solid fa-pen"
            :tooltip-text="`Редактировать ${registerNouns.accusative}`"
            @click="(row) => emit('edit-register', row)"
            :disabled="runningAction || loading"
          />
          <ActionButton
            v-if="isSrLogistPlus"
            :item="item"
            icon="fa-solid fa-calculator"
            tooltip-text="Рассчитать сборы и пошлины"
            :disabled="runningAction || loading"
            @click="(row) => calculateCustomCharges(row)"
          />
          <ActionButton
            v-if="isSrLogistPlus"
            :item="item"
            icon="fa-solid fa-pen-to-square"
            tooltip-text="Выбрать посылки и изменить статус"
            :disabled="runningAction || loading"
            @click="() => openParcelStatusBulkDialog(item.id)"
          />
          <ActionButton
            v-if="isShiftLeadPlus"
            :item="item"
            icon="fa-solid fa-trash-can"
            :tooltip-text="`Удалить ${registerNouns.accusative}`"
            @click="(row) => emit('delete-register', row)"
            :disabled="runningAction || loading"
          />
        </div>
      </template>
    </v-data-table-server>
  </v-card>
</template>

<style scoped>
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

.weight-real-route {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  max-width: 100%;
}

.weight-real-route .arrow-icon {
  flex-shrink: 0;
}

.numeric-panel .data-box {
  align-items: flex-end;
  text-align: right;
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
