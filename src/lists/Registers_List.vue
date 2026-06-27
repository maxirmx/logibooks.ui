<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { watch, ref, onMounted, onUnmounted, reactive, computed, unref } from 'vue'
import { OZON_COMPANY_ID, WBR_COMPANY_ID, WBR2_REGISTER_ID, GTC_COMPANY_ID } from '@/helpers/company.constants.js'
import {
  startRegisterStatusEditMode,
  cancelRegisterStatusChange,
  applyRegisterStatusChange,
  isRegisterStatusEditMode,
  getRegisterStatusSelectedId,
  setRegisterStatusSelectedId
} from '@/helpers/registers.list.helpers.js'
import { createRegisterActionHandlers } from '@/helpers/register.actions.js'

import { useRegistersStore } from '@/stores/registers.store.js'
import { useParcelStatusesStore } from '@/stores/parcel.statuses.store.js'
import { useRegisterStatusesStore } from '@/stores/register.statuses.store.js'
import { useCompaniesStore } from '@/stores/companies.store.js'
import { useCountriesStore } from '@/stores/countries.store.js'
import { useAirportsStore } from '@/stores/airports.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { OP_MODE_PAPERWORK, getRegisterNouns } from '@/helpers/op.mode.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { mdiMagnify } from '@mdi/js'
import { storeToRefs } from 'pinia'
import router from '@/router'
import { useConfirm } from 'vuetify-use-dialog'
import { useDebouncedFilterSync } from '@/composables/useDebouncedFilterSync.js'
import ActionButton2L from '@/components/ActionButton2L.vue'
import CustomsProcessingRegistersTable from '@/components/CustomsProcessingRegistersTable.vue'
import ParcelStatusBulkChangeDialog from '@/l2/ParcelStatusBulkChangeDialog.vue'

const registersStore = useRegistersStore()
const { items, loading, totalCount } = storeToRefs(registersStore)

const parcelStatusesStore = useParcelStatusesStore()
const registerStatusesStore = useRegisterStatusesStore()

const isInitializing = ref(true)
const isComponentMounted = ref(true)
const runningAction = ref(false)

const companiesStore = useCompaniesStore()
const { companies } = storeToRefs(companiesStore)

const countriesStore = useCountriesStore()
const airportsStore = useAirportsStore()

const alertStore = useAlertStore()
const { alert } = storeToRefs(alertStore)
const confirm = useConfirm()

const {
  validationState,
  progressPercent,
  stopPolling
} = createRegisterActionHandlers(registersStore, alertStore, { mode: OP_MODE_PAPERWORK })

const authStore = useAuthStore()
const {
  registers_per_page: paperworkRegistersPerPage,
  registers_search: paperworkRegistersSearch,
  registers_sort_by: paperworkRegistersSortBy,
  registers_page: paperworkRegistersPage,
  isShiftLeadPlus,
  isSrLogistPlus
} = storeToRefs(authStore)

const fileInput = ref(null)
const selectedRegisterType = ref(null)
const parcelStatusBulkDialogRegisterId = ref(null)
const showParcelStatusBulkDialog = ref(false)

const registerNouns = computed(() => getRegisterNouns(OP_MODE_PAPERWORK))

const registers_per_page = paperworkRegistersPerPage
const registers_search = paperworkRegistersSearch
const registers_sort_by = paperworkRegistersSortBy
const registers_page = paperworkRegistersPage

const registerStatusState = reactive({})

const localSearch = ref('')
localSearch.value = registers_search.value || ''

const parcelStatusOptions = computed(() => unref(parcelStatusesStore.parcelStatuses) || [])
const registerStatusOptions = computed(() => unref(registerStatusesStore.registerStatuses) || [])

const uploadMenuOptions = computed(() => {
  if (!companies.value) return []
  const list = companies.value
    .filter((company) => company.id === OZON_COMPANY_ID || company.id === WBR_COMPANY_ID)
    .map((company) => ({
      label: getCustomerName(company.id),
      action: () => startRegisterUpload(company.id)
    }))

  list.push({
    label: 'Импорт и реэкспорт (тест)',
    action: () => startRegisterUpload(GTC_COMPANY_ID)
  })

  return list
})

const isUploadDisabled = computed(() => uploadMenuOptions.value.length === 0)

function startRegisterStatusChange(registerId, currentStatusId) {
  startRegisterStatusEditMode(
    registerId,
    currentStatusId,
    registerStatusState,
    runningAction.value || loading.value
  )
}

function cancelRegisterStatusEdit(registerId) {
  cancelRegisterStatusChange(registerId, registerStatusState)
}

async function applyRegisterStatusToRegister(registerId, statusId, currentStatusId) {
  await applyRegisterStatusChange(
    registerId,
    statusId,
    currentStatusId,
    registerStatusState,
    registersStore,
    alertStore,
    { mode: OP_MODE_PAPERWORK }
  )
}

function isInRegisterStatusEditMode(registerId) {
  return isRegisterStatusEditMode(registerId, registerStatusState)
}

function getSelectedRegisterStatusId(registerId) {
  return getRegisterStatusSelectedId(registerId, registerStatusState)
}

function setSelectedRegisterStatusId(registerId, statusId) {
  setRegisterStatusSelectedId(registerId, statusId, registerStatusState)
}

function getCustomerName(customerId) {
  if (!customerId || !companies?.value) return 'Неизвестно'
  const company = companies.value.find((c) => c.id === customerId)
  if (!company) return 'Неизвестно'
  return company.shortName || company.name || 'Неизвестно'
}

onMounted(async () => {
  try {
    if (!isComponentMounted.value) return

    await parcelStatusesStore.ensureLoaded()
    if (!isComponentMounted.value) return

    await registerStatusesStore.ensureLoaded()
    if (!isComponentMounted.value) return

    await countriesStore.ensureLoaded()
    if (!isComponentMounted.value) return

    await registersStore.ensureOpsLoaded()
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

async function fileSelected(files) {
  const file = Array.isArray(files) ? files[0] : files
  if (!file) return

  if (!selectedRegisterType.value) {
    alertStore.error(`Не выбран тип ${registerNouns.value.genitiveSingular} для загрузки`)
    return
  }

  const customerId = selectedRegisterType.value === WBR2_REGISTER_ID ? WBR_COMPANY_ID : selectedRegisterType.value
  registersStore.item = {
    fileName: file.name,
    registerType: selectedRegisterType.value,
    companyId: customerId
  }
  registersStore.uploadFile = file
  router.push('/register/load')

  if (fileInput.value) {
    fileInput.value.value = null
  }
}

function startRegisterUpload(registerType) {
  if (!registerType) {
    alertStore.error(`Не выбран тип ${registerNouns.value.genitiveSingular} для загрузки`)
    return
  }

  selectedRegisterType.value = registerType
  const input = fileInput.value
  if (input && typeof input.click === 'function') {
    input.click()
  }
}

async function loadRegisters() {
  await registersStore.getAll({ mode: OP_MODE_PAPERWORK })
  const storeError = unref(registersStore.error)
  if (storeError) {
    alertStore.error(storeError instanceof Error ? storeError.message : String(storeError))
  }
}

function openParcelStatusBulkDialog(registerId) {
  if (runningAction.value || loading.value || isInitializing.value) return
  parcelStatusBulkDialogRegisterId.value = registerId
  showParcelStatusBulkDialog.value = true
}

async function handleParcelStatusBulkUpdated() {
  await loadRegisters()
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
  router.push(`/registers/${item.id}/parcels?mode=${OP_MODE_PAPERWORK}`)
}

function editRegister(item) {
  router.push(`/register/edit/${item.id}?mode=${OP_MODE_PAPERWORK}`)
}

async function deleteRegister(item) {
  if (runningAction.value) return
  runningAction.value = true
  try {
    const content = `Удалить ${registerNouns.value.accusative} "${item.fileName}" ?`
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
      content: content
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
        <div class="header-actions header-actions-group" v-if="isSrLogistPlus">
          <ActionButton2L
            :item="{}"
            icon="fa-solid fa-file-import"
            :tooltip-text="`Загрузить ${registerNouns.accusative}`"
            iconSize="2x"
            :disabled="runningAction || loading || isInitializing || isUploadDisabled"
            :options="uploadMenuOptions"
          />
        </div>
      </div>
    </div>
    <v-file-input
      v-if="isSrLogistPlus"
      ref="fileInput"
      style="display: none"
      accept=".xls,.xlsx,.zip,.rar"
      :loading-text="`Идёт загрузка ${registerNouns.genitiveSingular}...`"
      @update:model-value="fileSelected"
    />

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

    <CustomsProcessingRegistersTable
      v-model:items-per-page="registers_per_page"
      v-model:page="registers_page"
      v-model:sort-by="registers_sort_by"
      :items="items"
      :items-length="totalCount"
      :loading="loading || isInitializing"
      :running-action="runningAction"
      :is-shift-lead-plus="isShiftLeadPlus"
      :is-sr-logist-plus="isSrLogistPlus"
      :open-parcel-status-bulk-dialog="openParcelStatusBulkDialog"
      :register-status-options="registerStatusOptions"
      :can-change-register-status="isSrLogistPlus"
      :is-register-status-edit-mode="isInRegisterStatusEditMode"
      :get-selected-register-status-id="getSelectedRegisterStatusId"
      :set-selected-register-status-id="setSelectedRegisterStatusId"
      :start-register-status-change="startRegisterStatusChange"
      :cancel-register-status-change="cancelRegisterStatusEdit"
      :apply-register-status-change="applyRegisterStatusToRegister"
      @open-parcels="openParcels"
      @edit-register="editRegister"
      @delete-register="deleteRegister"
    />

    <ParcelStatusBulkChangeDialog
      :show="showParcelStatusBulkDialog"
      :register-id="parcelStatusBulkDialogRegisterId"
      :status-options="parcelStatusOptions"
      :disabled="runningAction || loading || isInitializing"
      @update:show="showParcelStatusBulkDialog = $event"
      @updated="handleParcelStatusBulkUpdated"
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
