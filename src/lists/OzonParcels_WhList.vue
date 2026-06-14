<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { watch, ref, computed, onMounted, onUnmounted } from 'vue'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { useParcelStatusesStore } from '@/stores/parcel.statuses.store.js'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useWarehousesStore } from '@/stores/warehouses.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import router from '@/router'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { buildParcelListHeading } from '@/helpers/register.heading.helpers.js'
import { formatWeight } from '@/helpers/number.formatters.js'
import { loadParcels } from '@/helpers/parcels.list.helpers.js'
import {
  scanjobCheckStatusProjectionKind,
  getScanjobCheckStatusClass,
  scanjobCheckStatusReason
} from '@/helpers/scanjob.check-status.helpers.js'
import { ozonRegisterColumnTitles } from '@/helpers/ozon.register.mapping.js'
import RegisterHeadingWithStats from '@/components/RegisterHeadingWithStats.vue'
import PaginationFooter from '@/components/PaginationFooter.vue'
import RegisterWhHeaderActionBar from '@/components/RegisterWhHeaderActionBar.vue'
import ParcelWhFilterSelectors from '@/components/ParcelWhFilterSelectors.vue'
import ClickableCell from '@/components/ClickableCell.vue'
import ActionButton from '@/components/ActionButton.vue'
import {
  canClearParcelDefect,
  canSetParcelDefect,
  getClearParcelDefectErrorMessage,
  getSetParcelDefectErrorMessage
} from '@/helpers/parcel.defect.helpers.js'
import { storeToRefs } from 'pinia'
import { useDebouncedFilterSync } from '@/composables/useDebouncedFilterSync.js'
import { useParcelEditAccess } from '@/composables/useParcelEditAccess.js'

const props = defineProps({
  registerId: { type: Number, required: true }
})
const emit = defineEmits(['close'])

const parcelsStore = useParcelsStore()
const parcelStatusStore = useParcelStatusesStore()
const registersStore = useRegistersStore()
const warehousesStore = useWarehousesStore()
const authStore = useAuthStore()
const alertStore = useAlertStore()

const { alert } = storeToRefs(alertStore)
const { items, loading, totalCount } = storeToRefs(parcelsStore)
const {
  parcels_wh_per_page,
  parcels_wh_sort_by,
  parcels_wh_page,
  parcels_wh_status,
  parcels_wh_check_status_projection,
  parcels_wh_zone,
  parcels_wh_number,
  parcels_wh_box_number,
  parcels_wh_sticker,
  parcels_wh_product_name,
} = storeToRefs(authStore)
const { ops } = storeToRefs(warehousesStore)

const localParcelNumberSearch = ref(parcels_wh_number.value || '')
const localBoxNumberSearch = ref(parcels_wh_box_number.value || '')
const localStickerSearch = ref(parcels_wh_sticker.value || '')
const localProductNameSearch = ref(parcels_wh_product_name.value || '')

const registerLoading = ref(true)
const isInitializing = ref(true)
const isComponentMounted = ref(true)
const runningAction = ref(false)

const maxPage = computed(() => Math.max(1, Math.ceil((totalCount.value || 0) / parcels_wh_per_page.value)))

const pageOptions = computed(() => {
  const mp = maxPage.value
  const current = parcels_wh_page.value || 1
  if (mp <= 200) {
    return Array.from({ length: mp }, (_, i) => ({ value: i + 1, title: String(i + 1) }))
  }

  const set = new Set()
  for (let i = 1; i <= 10; i++) set.add(i)
  for (let i = Math.max(1, mp - 9); i <= mp; i++) set.add(i)
  for (let i = Math.max(1, current - 10); i <= Math.min(mp, current + 10); i++) set.add(i)

  return Array.from(set).sort((a, b) => a - b).map(n => ({ value: n, title: String(n) }))
})

watch(maxPage, (v) => {
  if (parcels_wh_page.value > v) parcels_wh_page.value = v
})

const headers = computed(() => [
  { title: '', key: 'actions', align: 'center', sortable: false, width: '72px' },
  { title: '№', key: 'id', align: 'start' },
  { title: 'Проверка', key: 'checkStatusProjection', align: 'center', width: '170px', sortable: true },
  { title: 'Зона', key: 'zone', align: 'start' },
  { title: ozonRegisterColumnTitles.statusId, key: 'statusId', align: 'start' },
  { title: ozonRegisterColumnTitles.postingNumber, key: 'postingNumber', align: 'start' },
  { title: ozonRegisterColumnTitles.barcode, key: 'barcode', align: 'start', sortable: false },
  { title: ozonRegisterColumnTitles.boxNumber, key: 'boxNumber', align: 'start', sortable: false },
  { title: ozonRegisterColumnTitles.productName, key: 'productName', align: 'start', sortable: false },
  { title: ozonRegisterColumnTitles.weightKg, key: 'weightKg', align: 'start', sortable: false },
  { title: ozonRegisterColumnTitles.quantity, key: 'quantity', align: 'start', sortable: false },
])

const genericClickableHeaders = computed(() => headers.value.filter(header => ![
  'actions',
  'checkStatusProjection',
  'zone',
  'statusId',
  'productName',
  'weightKg',
  'quantity'
].includes(header.key)))

const registerHeading = computed(() => {
  if (registerLoading.value) return 'Загрузка...'
  return buildParcelListHeading(registersStore.item, (id) => registersStore.getTransportationDocument(id), 'Партия')
})

async function fetchRegister() {
  if (!isComponentMounted.value) return
  try {
    await registersStore.getById(props.registerId)
  } finally {
    if (isComponentMounted.value) {
      registerLoading.value = false
    }
  }
}

async function loadParcelsWrapper() {
  await loadParcels(props.registerId, parcelsStore, isComponentMounted, alertStore, {
    showMarkedByPartner: true
  })
}

const statusOptions = computed(() => [
  { value: null, title: 'Все' },
  ...(parcelStatusStore.parcelStatuses || []).map(status => ({
    value: status.id,
    title: status.title
  }))
])

const checkStatusProjectionOptions = [
  { value: null, title: 'Все' },
  { value: scanjobCheckStatusProjectionKind.NotChecked, title: 'Не проверено' },
  { value: scanjobCheckStatusProjectionKind.Restriction, title: 'Запрет' },
  { value: scanjobCheckStatusProjectionKind.Defect, title: 'Брак' },
  { value: scanjobCheckStatusProjectionKind.Checked, title: 'Проверено' },
]

const warehouseZoneNoneValue = 1
const zoneOptions = computed(() => [
  { value: null, title: 'Все' },
  { value: warehouseZoneNoneValue, title: 'Не задана' },
  ...(ops.value?.zones || [])
    .filter(zone => Number(zone.value) !== warehouseZoneNoneValue)
    .map(zone => ({
      value: zone.value,
      title: zone.name || String(zone.value)
    }))
])

const { triggerLoad, stop: stopFilterSync } = useDebouncedFilterSync({
  filters: [
    { local: localParcelNumberSearch, store: parcels_wh_number },
    { local: localBoxNumberSearch, store: parcels_wh_box_number },
    { local: localStickerSearch, store: parcels_wh_sticker },
    { local: localProductNameSearch, store: parcels_wh_product_name }
  ],
  loadFn: loadParcelsWrapper,
  isComponentMounted
})

const {
  isParcelEditCellDisabled,
  parcelEditCellClass,
  openParcelEdit
} = useParcelEditAccess({
  router,
  disabled: computed(() => loading.value || isInitializing.value),
  getQueryParams: () => ({ registerId: props.registerId })
})

const watcherStop = watch(
  [parcels_wh_page, parcels_wh_per_page, parcels_wh_sort_by, parcels_wh_status, parcels_wh_check_status_projection, parcels_wh_zone],
  () => triggerLoad(),
  { immediate: false }
)

onMounted(async () => {
  try {
    await registersStore.ensureOpsLoaded()
    if (!isComponentMounted.value) return

    await parcelStatusStore.ensureLoaded()
    if (!isComponentMounted.value) return

    await warehousesStore.ensureOpsLoaded()
    if (!isComponentMounted.value) return

    await fetchRegister()
  } catch (error) {
    if (isComponentMounted.value) {
      alertStore.error('Ошибка при инициализации компонента')
      parcelsStore.error = error?.message || 'Ошибка при загрузке данных'
    }
  } finally {
    if (isComponentMounted.value) {
      isInitializing.value = false
    }
  }
})

onUnmounted(() => {
  isComponentMounted.value = false
  stopFilterSync()
  if (watcherStop) {
    watcherStop()
  }
})

function closeList() {
  emit('close')
}

function editParcel(item) {
  openParcelEdit(item)
}

async function runDefectAction(item, action, getErrorMessage) {
  if (runningAction.value || loading.value || !item?.id) return

  runningAction.value = true
  try {
    await action(item.id)
  } catch (error) {
    alertStore.error(getErrorMessage(error))
    runningAction.value = false
    return
  }

  try {
    await loadParcelsWrapper()
  } catch {
    alertStore.error('Ошибка при обновлении данных')
  } finally {
    runningAction.value = false
  }
}

async function setParcelDefect(item) {
  if (!canSetParcelDefect(item, authStore)) return
  await runDefectAction(item, parcelsStore.setDefect, getSetParcelDefectErrorMessage)
}

async function clearParcelDefect(item) {
  if (!canClearParcelDefect(item, authStore)) return
  await runDefectAction(item, parcelsStore.clearDefect, getClearParcelDefectErrorMessage)
}
</script>

<template>
  <div class="settings table-3">
    <div class="header-with-actions">
      <RegisterHeadingWithStats
        :register-id="props.registerId"
        :register="registersStore.item"
        :heading="registerHeading"
      />
      <RegisterWhHeaderActionBar
        :register="registersStore.item"
        :zones="ops.zones"
        :loading="registerLoading || isInitializing"
        icon-size="2x"
        @close="closeList"
      />
    </div>
    <hr class="hr" />

    <div class="d-flex mb-2 align-center flex-wrap-reverse justify-space-between" style="width: 100%; gap: 10px;">
      <ParcelWhFilterSelectors
        v-model:parcels-wh-status="parcels_wh_status"
        v-model:parcels-wh-check-status-projection="parcels_wh_check_status_projection"
        v-model:parcels-wh-zone="parcels_wh_zone"
        v-model:local-parcel-number-search="localParcelNumberSearch"
        v-model:local-box-number-search="localBoxNumberSearch"
        v-model:local-sticker-search="localStickerSearch"
        v-model:local-product-name-search="localProductNameSearch"
        :status-options="statusOptions"
        :check-status-projection-options="checkStatusProjectionOptions"
        :zone-options="zoneOptions"
        number-label="Номер отправления"
        :running-action="runningAction"
        :loading="loading"
        :is-initializing="isInitializing"
      />
    </div>

    <v-card class="table-card">
      <v-data-table-server
        v-model:items-per-page="parcels_wh_per_page"
        items-per-page-text="Посылок на странице"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="parcels_wh_page"
        v-model:sort-by="parcels_wh_sort_by"
        :headers="headers"
        :items="items"
        :items-length="totalCount"
        :loading="loading || isInitializing"
        density="compact"
        hide-default-footer
        class="elevation-1 single-line-table interlaced-table ozon-parcels-table"
      >
        <template #[`item.actions`]="{ item }">
          <div class="actions-container">
            <ActionButton
              :item="item"
              icon="fa-solid fa-person-circle-xmark"
              tooltip-text="Брак"
              aria-label="Брак"
              title="Брак"
              data-testid="set-defect-action"
              @click="setParcelDefect"
              :disabled="runningAction || loading || !canSetParcelDefect(item, authStore)"
            />
            <ActionButton
              :item="item"
              icon="fa-solid fa-person-circle-check"
              tooltip-text="Отменить брак"
              aria-label="Отменить брак"
              title="Отменить брак"
              data-testid="clear-defect-action"
              @click="clearParcelDefect"
              :disabled="runningAction || loading || !canClearParcelDefect(item, authStore)"
            />
          </div>
        </template>
        <template v-for="header in genericClickableHeaders" :key="header.key" #[`item.${header.key}`]="{ item }">
          <ClickableCell
            :item="item"
            :display-value="item[header.key] ?? ''"
            :cell-class="parcelEditCellClass('truncated-cell')"
            :disabled="isParcelEditCellDisabled"
            @click="editParcel"
          />
        </template>
        <template #[`item.productName`]="{ item }">
          <ClickableCell
            :item="item"
            :display-value="item.productName || ' '"
            :cell-class="parcelEditCellClass('truncated-cell warehouse-product-name-cell')"
            :disabled="isParcelEditCellDisabled"
            :title="item.productName || ''"
            @click="editParcel"
          />
        </template>
        <template #[`item.weightKg`]="{ item }">
          <ClickableCell
            :item="item"
            :display-value="formatWeight(item.weightKg)"
            :cell-class="parcelEditCellClass('truncated-cell numeric-panel')"
            :disabled="isParcelEditCellDisabled"
            @click="editParcel"
          />
        </template>
        <template #[`item.quantity`]="{ item }">
          <ClickableCell
            :item="item"
            :display-value="item.quantity"
            :cell-class="parcelEditCellClass('truncated-cell numeric-panel')"
            :disabled="isParcelEditCellDisabled"
            @click="editParcel"
          />
        </template>
        <template #[`item.statusId`]="{ item }">
          <ClickableCell
            :item="item"
            :display-value="parcelStatusStore.getStatusTitle(item.statusId)"
            :cell-class="parcelEditCellClass('truncated-cell')"
            :disabled="isParcelEditCellDisabled"
            @click="editParcel"
          />
        </template>
        <template #[`item.checkStatusProjection`]="{ item }">
          <v-tooltip v-if="scanjobCheckStatusReason(item.checkStatusProjection)" location="top" open-delay="150">
            <template #activator="{ props: tooltipProps }">
              <ClickableCell
                v-bind="tooltipProps"
                :item="item"
                :display-value="item.checkStatusProjection?.title"
                :cell-class="parcelEditCellClass('truncated-cell status-cell ' + getScanjobCheckStatusClass(item.checkStatusProjection))"
                :disabled="isParcelEditCellDisabled"
                @click="editParcel"
              />
            </template>
            <template #default>
              <div style="white-space: pre-line">{{ scanjobCheckStatusReason(item.checkStatusProjection) }}</div>
            </template>
          </v-tooltip>
          <ClickableCell
            v-else
            :item="item"
            :display-value="item.checkStatusProjection?.title"
            :cell-class="parcelEditCellClass('truncated-cell status-cell ' + getScanjobCheckStatusClass(item.checkStatusProjection))"
            :disabled="isParcelEditCellDisabled"
            @click="editParcel"
          />
        </template>
        <template #[`item.zone`]="{ item }">
          <ClickableCell
            :item="item"
            :display-value="ops.zones.find(z => z.value === item.zone)?.name || ' '"
            :cell-class="parcelEditCellClass('truncated-cell')"
            :disabled="isParcelEditCellDisabled"
            @click="editParcel"
          />
        </template>
      </v-data-table-server>

      <div class="v-data-table-footer">
        <PaginationFooter
          v-model:items-per-page="parcels_wh_per_page"
          v-model:page="parcels_wh_page"
          :items-per-page-options="itemsPerPageOptions"
          :page-options="pageOptions"
          :total-count="totalCount"
          :max-page="maxPage"
        />
      </div>
    </v-card>

    <div v-if="alert" class="alert alert-dismissable text-center m-5" :class="alert.type">
      <button @click="alertStore.clear()" class="btn btn-link close">×</button>
      {{ alert.message }}
    </div>
  </div>
</template>

<style scoped>
:deep(.numeric-panel) {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  width: 100%;
  text-align: right;
}
</style>
