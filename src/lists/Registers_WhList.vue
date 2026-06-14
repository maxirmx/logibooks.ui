<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { watch, ref, onMounted, onUnmounted, reactive, computed, unref } from 'vue'
import {
  toggleBulkStatusEditMode,
  cancelBulkStatusChange,
  applyBulkStatusToAllOrders,
  isBulkStatusEditMode,
  getBulkStatusSelectedId,
  setBulkStatusSelectedId
} from '@/helpers/registers.list.helpers.js'
import { createRegisterActionHandlers } from '@/helpers/register.actions.js'

import { useRegistersStore } from '@/stores/registers.store.js'
import { useParcelStatusesStore } from '@/stores/parcel.statuses.store.js'
import { useCompaniesStore } from '@/stores/companies.store.js'
import { useCountriesStore } from '@/stores/countries.store.js'
import { useAirportsStore } from '@/stores/airports.store.js'
import { useWarehousesStore } from '@/stores/warehouses.store.js'
import { useRegisterStatusesStore } from '@/stores/register.statuses.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { OP_MODE_WAREHOUSE, getRegisterNouns } from '@/helpers/op.mode.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { mdiMagnify } from '@mdi/js'
import { storeToRefs } from 'pinia'
import router from '@/router'
import { useConfirm } from 'vuetify-use-dialog'
import { useDebouncedFilterSync } from '@/composables/useDebouncedFilterSync.js'
import ActionButton from '@/components/ActionButton.vue'
import WarehouseRegistersTable from '@/components/WarehouseRegistersTable.vue'

const registersStore = useRegistersStore()
const { items, loading, totalCount } = storeToRefs(registersStore)

const parcelStatusesStore = useParcelStatusesStore()
const { parcelStatuses } = storeToRefs(parcelStatusesStore)

const isInitializing = ref(true)
const isComponentMounted = ref(true)
const runningAction = ref(false)

const companiesStore = useCompaniesStore()
const countriesStore = useCountriesStore()

const airportsStore = useAirportsStore()

const warehousesStore = useWarehousesStore()
const registerStatusesStore = useRegisterStatusesStore()

const alertStore = useAlertStore()
const { alert } = storeToRefs(alertStore)
const confirm = useConfirm()

const {
  validationState,
  progressPercent,
  stopPolling
} = createRegisterActionHandlers(registersStore, alertStore, { mode: OP_MODE_WAREHOUSE })

const authStore = useAuthStore()
const {
  registers_wh_per_page: registers_per_page,
  registers_wh_search: registers_search,
  registers_wh_sort_by: registers_sort_by,
  registers_wh_page: registers_page,
  isShiftLeadPlus,
  isSrLogistPlus,
  isWhManagerPlus,
  hasWhRole
} = storeToRefs(authStore)

const registerNouns = computed(() => getRegisterNouns(OP_MODE_WAREHOUSE))

const bulkStatusState = reactive({})

const localSearch = ref('')
localSearch.value = registers_search.value || ''

function bulkChangeStatus(registerId) {
  toggleBulkStatusEditMode(registerId, bulkStatusState, loading.value)
}

function cancelStatusChange(registerId) {
  cancelBulkStatusChange(registerId, bulkStatusState)
}

async function applyStatusToAllOrders(registerId, statusId) {
  await applyBulkStatusToAllOrders(
    registerId,
    statusId,
    bulkStatusState,
    registersStore,
    alertStore,
    { mode: OP_MODE_WAREHOUSE }
  )
}

function isInEditMode(registerId) {
  return isBulkStatusEditMode(registerId, bulkStatusState)
}

function getSelectedStatusId(registerId) {
  return getBulkStatusSelectedId(registerId, bulkStatusState)
}

function setSelectedStatusId(registerId, statusId) {
  setBulkStatusSelectedId(registerId, statusId, bulkStatusState)
}

onMounted(async () => {
  try {
    if (!isComponentMounted.value) return

    await parcelStatusesStore.ensureLoaded()
    if (!isComponentMounted.value) return

    await countriesStore.ensureLoaded()
    if (!isComponentMounted.value) return

    await registersStore.ensureOpsLoaded()
    if (!isComponentMounted.value) return

    await warehousesStore.ensureLoaded()
    if (!isComponentMounted.value) return

    await registerStatusesStore.ensureLoaded()
    if (!isComponentMounted.value) return

    await companiesStore.getAll()
    if (!isComponentMounted.value) return

    await airportsStore.getAll()
  } catch (error) {
    if (isComponentMounted.value) {
      registersStore.error = error?.message || 'Ошибка при загрузке данных'
      alertStore.error(registersStore.error)
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
  stopPolling()
})

async function loadRegisters() {
  await registersStore.getAll({ mode: OP_MODE_WAREHOUSE })
  const storeError = unref(registersStore.error)
  if (storeError) {
    alertStore.error(storeError instanceof Error ? storeError.message : String(storeError))
  }
}

const { triggerLoad, stop: stopFilterSync } = useDebouncedFilterSync({
  filters: [{ local: localSearch, store: registers_search }],
  loadFn: loadRegisters,
  isComponentMounted,
  debounceMs: 300
})

const watcherStop = watch([registers_page, registers_per_page, registers_sort_by], () => {
  triggerLoad()
}, { immediate: false })

function openParcels(item) {
  router.push(`/registers/${item.id}/parcels?mode=${OP_MODE_WAREHOUSE}`)
}

function editRegister(item) {
  router.push(`/register/edit/${item.id}?mode=${OP_MODE_WAREHOUSE}`)
}

async function deleteRegister(item) {
  if (runningAction.value) return
  runningAction.value = true
  try {
    const confirmed = await confirm({
      title: 'Подтверждение',
      confirmationText: 'Удалить',
      cancellationText: 'Не удалять',
      dialogProps: {
        width: '30%',
        minWidth: '250px'
      },
      confirmationButtonProps: {
        color: 'orange-darken-3'
      },
      content: `Удалить ${registerNouns.value.accusative} "${item.fileName}" ?`
    })

    if (confirmed) {
      try {
        await registersStore.remove(item.id)
      } catch (err) {
        alertStore.error(
          `Ошибка при удалении ${registerNouns.value.genitiveSingular}` +
          (err.message ? `: ${err.message}` : '')
        )
      }
    }
  } finally {
    runningAction.value = false
  }
}

function openReturnRegisterCreate() {
  router.push('/register/return')
}

function openUnregisteredParcels(item) {
  if (!item?.id) return
  router.push(`/registers/${item.id}/unregistered-parcels`)
}

function openScanjobCreate(item) {
  if (!item) return
  router.push({
    path: '/scanjob/create',
    query: {
      registerId: item.id,
      warehouseId: item.warehouseId,
      dealNumber: item.dealNumber
    }
  })
}

defineExpose({
  validationState,
  progressPercent
})

</script>

<template>
  <div class="settings table-3">
    <div class="header-with-actions">
      <h1 class="primary-heading">{{ registerNouns.plural }}</h1>
      <div class="header-actions-bar">
        <div v-if="runningAction || loading || isInitializing" class="header-actions header-actions-group">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <div class="header-actions header-actions-group" v-if="isWhManagerPlus">
          <ActionButton
            :item="{}"
            icon="fa-solid fa-person-walking-arrow-loop-left"
            tooltip-text="Создать реестр возврата"
            iconSize="2x"
            :disabled="runningAction || loading || isInitializing"
            @click="openReturnRegisterCreate"
          />
        </div>
      </div>
    </div>

    <hr class="hr" />

    <div>
      <v-text-field
        v-model="localSearch"
        :append-inner-icon="mdiMagnify"
        :label="`Поиск по любой информации о ${registerNouns.prepositional}`"
        variant="solo"
        hide-details
        :loading="loading || isInitializing"
        :disabled="runningAction || isInitializing"
      />
    </div>

    <WarehouseRegistersTable
      v-model:items-per-page="registers_per_page"
      v-model:page="registers_page"
      v-model:sort-by="registers_sort_by"
      :items="items"
      :items-length="totalCount"
      :loading="loading || isInitializing"
      :running-action="runningAction"
      :has-wh-role="hasWhRole"
      :is-shift-lead-plus="isShiftLeadPlus"
      :is-sr-logist-plus="isSrLogistPlus"
      :is-wh-manager-plus="isWhManagerPlus"
      :status-options="parcelStatuses"
      :is-in-edit-mode="isInEditMode"
      :get-selected-status-id="getSelectedStatusId"
      :set-selected-status-id="setSelectedStatusId"
      :bulk-change-status="bulkChangeStatus"
      :cancel-status-change="cancelStatusChange"
      :apply-status-to-all-orders="applyStatusToAllOrders"
      @open-parcels="openParcels"
      @edit-register="editRegister"
      @delete-register="deleteRegister"
      @open-unregistered-parcels="openUnregisteredParcels"
      @open-scanjob-create="openScanjobCreate"
    />

    <div v-if="alert" class="alert alert-dismissable mt-3 mb-0" :class="alert.type">
      <button @click="alertStore.clear()" class="btn btn-link close">×</button>
      {{ alert.message }}
    </div>
  </div>
</template>

<style scoped>
@import '@/assets/styles/scrollable-table.css';
</style>
