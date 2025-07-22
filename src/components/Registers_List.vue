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
import { useRegistersStore } from '@/stores/registers.store.js'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { useParcelStatusesStore } from '@/stores/parcel.statuses.store.js'
import { useCompaniesStore } from '@/stores/companies.store.js'
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

const parcelsStore = useParcelsStore()

const parcelStatusesStore = useParcelStatusesStore()

const companiesStore = useCompaniesStore()
const { companies } = storeToRefs(companiesStore)

const alertStore = useAlertStore()
const confirm = useConfirm()

const authStore = useAuthStore()
const { registers_per_page, registers_search, registers_sort_by, registers_page } = storeToRefs(authStore)

const fileInput = ref(null)

// State for bulk status change
const bulkStatusState = reactive({})

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
    const errorMessage = error?.message || registersStore.error?.message || 'Ошибка при обновлении статусов посылок'
    alertStore.error(errorMessage)

    // Exit edit mode on error
    bulkStatusState[registerId].editMode = false
    bulkStatusState[registerId].selectedStatusId = null
  }
}

// Function to get customer name by customerId
function getCustomerName(customerId) {
  if (!customerId || !companies.value) return 'Неизвестно'
  const company = companies.value.find(c => c.id === customerId)
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
  fileInput.value?.click()
}

async function fileSelected(files) {
  const file = Array.isArray(files) ? files[0] : files
  if (!file) return
  try {
    await registersStore.upload(file)
    alertStore.success('Реестр успешно загружен')
    loadRegisters()
  } catch (err) {
    alertStore.error(err.message || String(err))
  }
}

// Watch for changes in pagination, sorting, or search
watch([registers_page, registers_per_page, registers_sort_by, registers_search], () => {
  loadRegisters()
}, { immediate: true, deep: true })

function loadRegisters() {
  const sortBy = registers_sort_by.value?.[0]?.key || 'id'
  const sortOrder = registers_sort_by.value?.[0]?.order || 'asc'

  registersStore.getAll(
    registers_page.value,
    registers_per_page.value,
    sortBy,
    sortOrder,
    registers_search.value
  )
}

function openParcels(item) {
  router.push(`/registers/${item.id}/parcels`)
}

function exportAllXml(item) {
  parcelsStore.generateAll(item.id)
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
    } catch (error) {
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
    stopPolling();
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

const headers = [
  { title: '', key: 'actions1', sortable: false, align: 'center', width: '10px' },
  { title: '', key: 'actions2', sortable: false, align: 'center', width: '10px' },
  { title: '', key: 'actions3', sortable: false, align: 'center', width: '10px' },
  { title: '', key: 'actions4', sortable: false, align: 'center', width: '10px' },
  { title: '', key: 'actions5', sortable: false, align: 'center', width: '10px' },
  { title: 'Файл реестра', key: 'fileName', align: 'start' },
  { title: 'Клиент', key: 'companyId', align: 'start' },
  { title: 'Заказы', key: 'ordersTotal', align: 'end' }
]
</script>

<template>
  <div class="settings table-2">
    <h1 class="primary-heading">Реестры</h1>
    <hr class="hr" />

    <div class="link-crt d-flex upload-links">
      <a @click="openFileDialog" class="link" tabindex="0">
        <font-awesome-icon size="1x" icon="fa-solid fa-upload" class="link" />&nbsp;&nbsp;&nbsp;Загрузить реестр ООО "РВБ"
      </a>
      <v-file-input
        ref="fileInput"
        style="display: none"
        accept=".xls,.xlsx,.zip,.rar"
        loading-text="Идёт загрузка реестра..."
        @update:model-value="fileSelected"
      />
      <a @click="console.log('Загружаем реестр Озон')" class="link" tabindex="0">
        <font-awesome-icon size="1x" icon="fa-solid fa-upload" class="link" />&nbsp;&nbsp;&nbsp;Загрузить реестр ООО "Интернет решения"
      </a>
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
        <template #[`item.companyId`]="{ item }">
          {{ getCustomerName(item.companyId) }}
        </template>
        <template #[`item.ordersTotal`]="{ item }">
          {{ item.ordersTotal }}
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
                style="min-width: 150px; max-width: 200px;"
              />

              <!-- Save button (checkmark) -->
              <v-tooltip text="Применить статус">
                <template v-slot:activator="{ props }">
                  <button
                    type="button"
                    @click="applyStatusToAllOrders(item.id, bulkStatusState[item.id].selectedStatusId)"
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
                <font-awesome-icon size="1x" icon="fa-solid fa-download" class="anti-btn" />
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
</style>
