<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks frontend application
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 1. Redistributions of source code must retain the above copyright
// notice, this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above copyright
// notice, this list of conditions and the following disclaimer in the
// documentation and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// ``AS IS'' AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
// TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
// PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDERS OR CONTRIBUTORS
// BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

import { watch, ref, onMounted, onUnmounted, reactive, computed } from 'vue'
import { OZON_COMPANY_ID, WBR_COMPANY_ID } from '@/helpers/company.constants.js'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useParcelStatusesStore } from '@/stores/parcel.statuses.store.js'
import { useCompaniesStore } from '@/stores/companies.store.js'
import { useCountriesStore } from '@/stores/countries.store.js'
import { useTransportationTypesStore } from '@/stores/transportation.types.store.js'
import { useCustomsProceduresStore } from '@/stores/customs.procedures.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { mdiMagnify } from '@mdi/js'
import { storeToRefs } from 'pinia'
import router from '@/router'
import { useConfirm } from 'vuetify-use-dialog'

const validationState = reactive({
  show: false,
  handleId: null,
  total: 0,
  processed: 0
})
let progressTimer = null
const POLLING_INTERVAL_MS = 1000
const progressPercent = computed(() => {
  if (!validationState.total || validationState.total <= 0) return 0
  return Math.round((validationState.processed / validationState.total) * 100)
})

const registersStore = useRegistersStore()
const { items, loading, error, totalCount } = storeToRefs(registersStore)

const parcelStatusesStore = useParcelStatusesStore()

const companiesStore = useCompaniesStore()
const { companies } = storeToRefs(companiesStore)

const countriesStore = useCountriesStore()
countriesStore.ensureLoaded()

const transportationTypesStore = useTransportationTypesStore()
transportationTypesStore.ensureLoaded()

const customsProceduresStore = useCustomsProceduresStore()
customsProceduresStore.ensureLoaded()

const alertStore = useAlertStore()
const { alert } = storeToRefs(alertStore)
const confirm = useConfirm()

const authStore = useAuthStore()
const { registers_per_page, registers_search, registers_sort_by, registers_page } =
  storeToRefs(authStore)

const fileInput = ref(null)
const selectedCustomerId = ref(WBR_COMPANY_ID)

// State for bulk status change
const bulkStatusState = reactive({})

// Available customers for register upload
const uploadCustomers = computed(() => {
  if (!companies.value) return []
  return companies.value
    .filter((company) => company.id === OZON_COMPANY_ID || company.id === WBR_COMPANY_ID)
    .map((company) => ({
      id: company.id,
      name: getCustomerName(company.id)
    }))
})

// Step 1: Toggle edit mode
function bulkChangeStatus(registerId) {
  if (!bulkStatusState[registerId]) {
    bulkStatusState[registerId] = {
      editMode: false,
      selectedStatusId: null
    }
  }

  // Don't allow interaction while loading
  if (loading.value) {
    return
  }

  // Toggle edit mode
  bulkStatusState[registerId].editMode = !bulkStatusState[registerId].editMode

  // Clear selection when entering edit mode
  if (bulkStatusState[registerId].editMode) {
    bulkStatusState[registerId].selectedStatusId = null
  }
}

// Cancel status change
function cancelStatusChange(registerId) {
  if (bulkStatusState[registerId]) {
    bulkStatusState[registerId].editMode = false
    bulkStatusState[registerId].selectedStatusId = null
  }
}

// Step 2: Apply selected status to all orders in register
async function applyStatusToAllOrders(registerId, statusId) {
  if (!registerId || !statusId) {
    alertStore.error('Не указан реестр или статус для изменения')
    return
  }

  // Ensure statusId is a number
  const numericStatusId = Number(statusId)
  if (isNaN(numericStatusId) || numericStatusId <= 0) {
    alertStore.error('Некорректный идентификатор статуса')
    return
  }

  try {
    await registersStore.setOrderStatuses(registerId, numericStatusId)

    // Success: show message and reset state
    alertStore.success('Статус успешно применен ко всем посылкам в реестре')
    bulkStatusState[registerId].editMode = false
    bulkStatusState[registerId].selectedStatusId = null
    // Reload data to reflect changes
    loadRegisters()
  } catch (error) {
    // The store already handles setting the error state
    // Just provide user-friendly error message from the store error
    const errorMessage =
      error?.message || registersStore.error?.message || 'Ошибка при обновлении статусов посылок'
    alertStore.error(errorMessage)

    // Exit edit mode on error
    bulkStatusState[registerId].editMode = false
    bulkStatusState[registerId].selectedStatusId = null
  }
}

// Function to get customer name by customerId
function getCustomerName(customerId) {
  if (!customerId || !companies.value) return 'Неизвестно'
  const company = companies.value.find((c) => c.id === customerId)
  if (!company) return 'Неизвестно'
  return company.shortName || company.name || 'Неизвестно'
}

// Load companies and order statuses on component mount
onMounted(async () => {
  await companiesStore.getAll()
  await parcelStatusesStore.getAll()
})

onUnmounted(() => {
  stopPolling()
})

function openFileDialog() {
  if (!selectedCustomerId.value) {
    alertStore.error('Пожалуйста, выберите клиента')
    return
  }
  fileInput.value?.click()
}

async function fileSelected(files) {
  const file = Array.isArray(files) ? files[0] : files
  if (!file) return

  if (!selectedCustomerId.value) {
    alertStore.error('Не выбран клиент для загрузки реестра')
    return
  }

  registersStore.item = {
    fileName: file.name,
    companyId: selectedCustomerId.value
  }
  registersStore.uploadFile = file
  router.push('/register/load')

  if (fileInput.value) {
    fileInput.value.value = null
  }
}

// Watch for changes in pagination, sorting, or search
watch(
  [registers_page, registers_per_page, registers_sort_by, registers_search],
  () => {
    loadRegisters()
  },
  { immediate: true, deep: true }
)

function loadRegisters() {
  registersStore.getAll()
}

function openParcels(item) {
  router.push(`/registers/${item.id}/parcels`)
}

function editRegister(item) {
  router.push('/register/edit/' + item.id)
}

function exportAllXml(item) {
  registersStore.generate(item.id, item.invoiceNumber)
}

async function downloadRegister(item) {
    await registersStore.download(item.id, item.fileName)
}

async function deleteRegister(item) {
  const content = `Удалить реестр "${item.fileName}" ?`
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
      console.error('Error deleting register:', err)
      alertStore.error('Ошибка при удалении реестра')
    }
  }
}

async function pollValidation() {
  if (!validationState.handleId) return
  try {
    const progress = await registersStore.getValidationProgress(validationState.handleId)
    validationState.total = progress.total
    validationState.processed = progress.processed
    if (progress.finished || progress.total === -1 || progress.processed === -1) {
      validationState.show = false
      stopPolling()
    }
  } catch (err) {
    alertStore.error(err.message || String(err))
    validationState.show = false
    stopPolling()
  }
}

function stopPolling() {
  if (progressTimer) {
    clearInterval(progressTimer)
    progressTimer = null
  }
}

async function validateRegister(item) {
  try {
    stopPolling()
    const res = await registersStore.validate(item.id)
    validationState.handleId = res.id
    validationState.total = 0
    validationState.processed = 0
    validationState.show = true
    pollValidation()
    progressTimer = setInterval(pollValidation, POLLING_INTERVAL_MS)
  } catch (err) {
    alertStore.error(err.message || String(err))
  }
}

function cancelValidation() {
  if (validationState.handleId) {
    registersStore.cancelValidation(validationState.handleId).catch(() => {})
  }
  validationState.show = false
  stopPolling()
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d)) return dateStr
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}.${mm}.${yyyy}`
}

const headers = [
  { title: '', key: 'actions1', sortable: false, align: 'center', width: '5px' },
  { title: '', key: 'actions2', sortable: false, align: 'center', width: '5px' },
  { title: '', key: 'actions4', sortable: false, align: 'center', width: '5px' },
  { title: '', key: 'actions6', sortable: false, align: 'center', width: '5px' },
  { title: '', key: 'actions3', sortable: false, align: 'center', width: '5px' },
  { title: '', key: 'actions7', sortable: false, align: 'center', width: '5px' },
  { title: '', key: 'actions5', sortable: false, align: 'center', width: '5px' },
  { title: 'Номер сделки', key: 'dealNumber', align: 'start' },
  // { title: 'Файл', key: 'fileName', align: 'start' },
  { title: 'Дата загрузки', key: 'date', align: 'start' },
  { title: 'Отправитель', key: 'senderId', align: 'start' },
  { title: 'Страна отправления', key: 'origCountryCode', align: 'start' },
  { title: 'Получатель', key: 'recipientId', align: 'start' },
  { title: 'Страна назначения', key: 'destCountryCode', align: 'start' },
  { title: 'Номер накладной', key: 'invoiceNumber', align: 'start' },
  { title: 'Дата накладной', key: 'invoiceDate', align: 'start' },
  { title: 'Транспорт', key: 'transportationTypeId', align: 'start' },
  { title: 'Процедура', key: 'customsProcedureId', align: 'start' },
  { title: 'Заказы', key: 'ordersTotal', align: 'end' }
]

</script>

<template>
  <div class="settings table-3">
    <h1 class="primary-heading">Реестры</h1>
    <hr class="hr" />

    <div class="link-crt d-flex upload-links">
      <a @click="openFileDialog" class="link" tabindex="0">
        <font-awesome-icon
          size="1x"
          icon="fa-solid fa-file-import"
          class="link"
        />&nbsp;&nbsp;&nbsp;Загрузить реестр
      </a>

      <v-select
        v-model="selectedCustomerId"
        :items="uploadCustomers"
        item-title="name"
        item-value="id"
        placeholder="Выберите клиента"
        variant="outlined"
        density="compact"
        hide-details
        hide-no-data
        class="customer-select"
        style="max-width: 280px; min-width: 150px; margin-left: 16px"
      />

      <v-file-input
        ref="fileInput"
        style="display: none"
        accept=".xls,.xlsx,.zip,.rar"
        loading-text="Идёт загрузка реестра..."
        @update:model-value="fileSelected"
      />
    </div>

    <v-card>
      <v-data-table-server
        v-if="items?.length || loading"
        v-model:items-per-page="registers_per_page"
        items-per-page-text="Реестров на странице"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="registers_page"
        v-model:sort-by="registers_sort_by"
        :headers="headers"
        :items="items"
        :items-length="totalCount"
        :loading="loading"
        density="compact"
        class="elevation-1 interlaced-table"
      >
        <template #[`item.dealNumber`]="{ item }">
          <v-tooltip>
            <template #activator="{ props }">
              <span
                class="open-parcels-link clickable-cell"
                v-bind="props"
                @click="openParcels(item)"
              >
                {{ item.dealNumber }}
              </span>
            </template>
            <template #default>
              <span>
                <font-awesome-icon icon="fa-solid fa-list" class="mr-1" />Открыть список посылок
              </span>
            </template>
          </v-tooltip>
        </template>
        <template #[`item.senderId`]="{ item }">
          <v-tooltip>
            <template #activator="{ props }">
              <span
                class="edit-register-link clickable-cell"
                v-bind="props"
                @click="editRegister(item)"
              >
                {{ getCustomerName(item.senderId) }}
              </span>
            </template>
            <template #default>
              <span>
                <font-awesome-icon icon="fa-solid fa-pen" class="mr-1" />Редактировать реестр
              </span>
            </template>
          </v-tooltip>
        </template>
        <template #[`item.recipientId`]="{ item }">
          <v-tooltip>
            <template #activator="{ props }">
              <span
                class="edit-register-link clickable-cell"
                v-bind="props"
                @click="editRegister(item)"
              >
                {{ getCustomerName(item.recipientId) }}
              </span>
            </template>
            <template #default>
              <span>
                <font-awesome-icon icon="fa-solid fa-pen" class="mr-1" />Редактировать реестр
              </span>
            </template>
          </v-tooltip>
        </template>
        <template #[`item.destCountryCode`]="{ item }">
          <v-tooltip>
            <template #activator="{ props }">
              <span
                class="edit-register-link clickable-cell"
                v-bind="props"
                @click="editRegister(item)"
              >
                {{ countriesStore.getCountryShortName(item.destCountryCode) }}
              </span>
            </template>
            <template #default>
              <span>
                <font-awesome-icon icon="fa-solid fa-pen" class="mr-1" />Редактировать реестр
              </span>
            </template>
          </v-tooltip>
        </template>
        <template #[`item.origCountryCode`]="{ item }">
          <v-tooltip>
            <template #activator="{ props }">
              <span
                class="edit-register-link clickable-cell"
                v-bind="props"
                @click="editRegister(item)"
              >
                {{ countriesStore.getCountryShortName(item.origCountryCode) }}
              </span>
            </template>
            <template #default>
              <span>
                <font-awesome-icon icon="fa-solid fa-pen" class="mr-1" />Редактировать реестр
              </span>
            </template>
          </v-tooltip>
        </template>
        <template #[`item.date`]="{ item }">
          <v-tooltip>
            <template #activator="{ props }">
              <span
                class="edit-register-link clickable-cell"
                v-bind="props"
                @click="editRegister(item)"
              >
                {{ formatDate(item.date) }}
              </span>
            </template>
            <template #default>
              <span>
                <font-awesome-icon icon="fa-solid fa-pen" class="mr-1" />Редактировать реестр
              </span>
            </template>
          </v-tooltip>
        </template>
        <template #[`item.invoiceNumber`]="{ item }">
          <v-tooltip>
            <template #activator="{ props }">
              <span
                class="open-parcels-link clickable-cell"
                v-bind="props"
                @click="openParcels(item)"
              >
                {{ item.invoiceNumber }}
              </span>
            </template>
            <template #default>
              <span>
                <font-awesome-icon icon="fa-solid fa-list" class="mr-1" />Открыть список посылок
              </span>
            </template>
          </v-tooltip>
        </template>
        <template #[`item.invoiceDate`]="{ item }">
          <v-tooltip>
            <template #activator="{ props }">
              <span
                class="edit-register-link clickable-cell"
                v-bind="props"
                @click="editRegister(item)"
              >
                {{ formatDate(item.invoiceDate) }}
              </span>
            </template>
            <template #default>
              <span>
                <font-awesome-icon icon="fa-solid fa-pen" class="mr-1" />Редактировать реестр
              </span>
            </template>
          </v-tooltip>
        </template>
        <template #[`item.transportationTypeId`]="{ item }">
          <v-tooltip>
            <template #activator="{ props }">
              <span
                class="edit-register-link clickable-cell"
                v-bind="props"
                @click="editRegister(item)"
              >
                {{ transportationTypesStore.getName(item.transportationTypeId) }}
              </span>
            </template>
            <template #default>
              <span>
                <font-awesome-icon icon="fa-solid fa-pen" class="mr-1" />Редактировать реестр
              </span>
            </template>
          </v-tooltip>
        </template>
        <template #[`item.customsProcedureId`]="{ item }">
          <v-tooltip>
            <template #activator="{ props }">
              <span
                class="edit-register-link clickable-cell"
                v-bind="props"
                @click="editRegister(item)"
              >
                {{ customsProceduresStore.getName(item.customsProcedureId) }}
              </span>
            </template>
            <template #default>
              <span>
                <font-awesome-icon icon="fa-solid fa-pen" class="mr-1" />Редактировать реестр
              </span>
            </template>
          </v-tooltip>
        </template>
        <template #[`item.ordersTotal`]="{ item }">
          <v-tooltip>
            <template #activator="{ props }">
              <span
                class="edit-register-link clickable-cell"
                v-bind="props"
                @click="editRegister(item)"
              >
                {{ item.ordersTotal }}
              </span>
            </template>
            <template #default>
              <span>
                <font-awesome-icon icon="fa-solid fa-pen" class="mr-1" />Редактировать реестр
              </span>
            </template>
          </v-tooltip>
        </template>
        <template #[`item.actions1`]="{ item }">
          <v-tooltip text="Открыть список посылок">
            <template v-slot:activator="{ props }">
              <button type="button" @click="openParcels(item)" class="anti-btn" v-bind="props">
                <font-awesome-icon size="1x" icon="fa-solid fa-list" class="anti-btn" />
              </button>
            </template>
          </v-tooltip>
        </template>
        <template #[`item.actions2`]="{ item }">
          <div class="bulk-status-container">
            <!-- Edit mode with dropdown and save/cancel buttons -->
            <div v-if="bulkStatusState[item.id]?.editMode" class="status-selector">
              <v-select
                v-model="bulkStatusState[item.id].selectedStatusId"
                :items="parcelStatusesStore.parcelStatuses"
                item-title="title"
                item-value="id"
                label="Выберите статус"
                variant="outlined"
                density="compact"
                hide-details
                hide-no-data
                :disabled="loading"
                style="min-width: 150px; max-width: 200px"
              />

              <!-- Save button (checkmark) -->
              <v-tooltip text="Применить статус">
                <template v-slot:activator="{ props }">
                  <button
                    type="button"
                    @click="
                      applyStatusToAllOrders(item.id, bulkStatusState[item.id].selectedStatusId)
                    "
                    :disabled="loading || !bulkStatusState[item.id]?.selectedStatusId"
                    class="anti-btn"
                    v-bind="props"
                  >
                    <font-awesome-icon size="1x" icon="fa-solid fa-check" class="anti-btn" />
                  </button>
                </template>
              </v-tooltip>

              <!-- Cancel button (X) -->
              <v-tooltip text="Отменить">
                <template v-slot:activator="{ props }">
                  <button
                    type="button"
                    @click="cancelStatusChange(item.id)"
                    :disabled="loading"
                    class="anti-btn"
                    v-bind="props"
                  >
                    <font-awesome-icon size="1x" icon="fa-solid fa-xmark" class="anti-btn" />
                  </button>
                </template>
              </v-tooltip>
            </div>

            <!-- Default mode with pen-to-square icon -->
            <v-tooltip v-else text="Изменить статус всех посылок в реестре">
              <template v-slot:activator="{ props }">
                <button
                  type="button"
                  @click="bulkChangeStatus(item.id)"
                  class="anti-btn"
                  :disabled="loading"
                  v-bind="props"
                >
                  <font-awesome-icon size="1x" icon="fa-solid fa-pen-to-square" class="anti-btn" />
                </button>
              </template>
            </v-tooltip>
          </div>
        </template>
        <template #[`item.actions3`]="{ item }">
          <v-tooltip text="Выгрузить накладные для всех посылок в реестре">
            <template v-slot:activator="{ props }">
              <button type="button" @click="exportAllXml(item)" class="anti-btn" v-bind="props">
                <font-awesome-icon size="1x" icon="fa-solid fa-upload" class="anti-btn" />
              </button>
            </template>
          </v-tooltip>
        </template>
        <template #[`item.actions4`]="{ item }">
          <v-tooltip text="Проверить реестр">
            <template v-slot:activator="{ props }">
              <button type="button" @click="validateRegister(item)" class="anti-btn" v-bind="props">
                <font-awesome-icon size="1x" icon="fa-solid fa-clipboard-check" class="anti-btn" />
              </button>
            </template>
          </v-tooltip>
        </template>
        <template #[`item.actions5`]="{ item }">
          <v-tooltip text="Удалить реестр">
            <template v-slot:activator="{ props }">
              <button type="button" @click="deleteRegister(item)" class="anti-btn" v-bind="props">
                <font-awesome-icon size="1x" icon="fa-solid fa-trash-can" class="anti-btn" />
              </button>
            </template>
          </v-tooltip>
        </template>
        <template #[`item.actions6`]="{ item }">
          <v-tooltip text="Редактировать реестр">
            <template v-slot:activator="{ props }">
              <button type="button" @click="editRegister(item)" class="anti-btn" v-bind="props">
                <font-awesome-icon size="1x" icon="fa-solid fa-pen" class="anti-btn" />
              </button>
            </template>
          </v-tooltip>
        </template>
        <template #[`item.actions7`]="{ item }">
          <v-tooltip text="Экспортировать реестр">
            <template v-slot:activator="{ props }">
              <button type="button" @click="downloadRegister(item)" class="anti-btn" v-bind="props">
                <font-awesome-icon size="1x" icon="fa-solid fa-file-export" class="anti-btn" />
              </button>
            </template>
          </v-tooltip>
        </template>
      </v-data-table-server>
      <div v-if="!items?.length && !loading" class="text-center m-5">Список реестров пуст</div>
      <div v-if="items?.length || loading || registers_search">
        <v-text-field
          v-model="registers_search"
          :append-inner-icon="mdiMagnify"
          label="Поиск по любой информации о реестре"
          variant="solo"
          hide-details
        />
      </div>
    </v-card>
    <div v-if="loading" class="text-center m-5">
      <span class="spinner-border spinner-border-lg align-center"></span>
    </div>
    <div v-if="error" class="text-center m-5">
      <div class="text-danger">Ошибка при загрузке списка реестров: {{ error }}</div>
    </div>
    <div v-if="alert" class="alert alert-dismissable mt-3 mb-0" :class="alert.type">
      <button @click="alertStore.clear()" class="btn btn-link close">×</button>
      {{ alert.message }}
    </div>

    <v-dialog v-model="validationState.show" width="300">
      <v-card>
        <v-card-title class="primary-heading">Проверка реестра</v-card-title>
        <v-card-text class="text-center">
          <v-progress-circular :model-value="progressPercent" :size="70" :width="7" color="primary">
            {{ progressPercent }}%
          </v-progress-circular>
        </v-card-text>
        <v-card-actions class="justify-end">
          <v-btn variant="text" @click="cancelValidation">Отменить</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<style scoped>
.bulk-status-container {
  min-width: 60px;
  padding: 2px;
  transition: min-width 0.2s ease;
}

.bulk-status-container:has(.status-selector) {
  min-width: 200px;
}

.status-selector {
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-selector .v-select {
  font-size: 0.875rem;
}

.status-selector .v-select :deep(.v-field__input) {
  font-size: 0.875rem;
  min-height: 32px;
}

.status-selector .v-select :deep(.v-field__field) {
  font-size: 0.875rem;
}

.status-selector .v-select :deep(.v-list-item) {
  font-size: 0.875rem;
  min-height: 36px;
}

.status-selector .v-select :deep(.v-list-item__title) {
  font-size: 0.875rem;
}

.action-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.anti-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.clickable-cell {
  cursor: pointer;
}

.upload-links {
  align-items: center;
  gap: 16px;
}

.customer-select {
  font-size: 1rem;
  font-weight: 500;
  color: var(--primary-color, #1976d2);
}

.customer-select :deep(.v-field__input) {
  font-size: 1rem;
  font-weight: 500;
  color: var(--primary-color, #1976d2);
}

.customer-select :deep(.v-field__field) {
  border-color: var(--primary-color, #1976d2);
}

.customer-select :deep(.v-field__outline) {
  border-color: var(--primary-color, #1976d2);
}

.customer-select :deep(.v-select__selection) {
  color: var(--primary-color, #1976d2);
}

.customer-select :deep(.v-field__append-inner) {
  color: var(--primary-color, #1976d2);
}

.customer-select :deep(.v-list-item) {
  color: var(--primary-color, #1976d2) !important;
}

.customer-select :deep(.v-list-item-title) {
  color: var(--primary-color, #1976d2) !important;
}

.customer-select :deep(.v-list-item__title) {
  color: var(--primary-color, #1976d2) !important;
}

.customer-select :deep(.v-list-item__content) {
  color: var(--primary-color, #1976d2) !important;
}
</style>

<style>
/* Global styles for customer select dropdown */
.v-overlay .v-list .v-list-item {
  color: var(--primary-color, #1976d2) !important;
}

.v-overlay .v-list .v-list-item .v-list-item__title {
  color: var(--primary-color, #1976d2) !important;
}

.v-overlay .v-list .v-list-item .v-list-item__content {
  color: var(--primary-color, #1976d2) !important;
}
</style>
