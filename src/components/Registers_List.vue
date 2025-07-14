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

import { watch, ref, onMounted } from 'vue'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useOrdersStore } from '@/stores/orders.store.js'
import { useCompaniesStore } from '@/stores/companies.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { mdiMagnify } from '@mdi/js'
import { storeToRefs } from 'pinia'
import router from '@/router'


const registersStore = useRegistersStore()
const { items, loading, error, totalCount } = storeToRefs(registersStore)

const ordersStore = useOrdersStore()

const companiesStore = useCompaniesStore()
const { companies } = storeToRefs(companiesStore)

const alertStore = useAlertStore()

const authStore = useAuthStore()
const { registers_per_page, registers_search, registers_sort_by, registers_page } = storeToRefs(authStore)

const fileInput = ref(null)

// Function to get customer name by customerId
function getCustomerName(customerId) {
  if (!customerId || !companies.value) return 'Неизвестно'
  const company = companies.value.find(c => c.id === customerId)
  if (!company) return 'Неизвестно'
  return company.shortName || company.name || 'Неизвестно'
}

// Load companies on component mount
onMounted(async () => {
  await companiesStore.getAll()
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

function openOrders(item) {
  router.push(`/registers/${item.id}/orders`)
}

function bulkChangeStatus(item) {
  // TODO: Implement bulk status change functionality for register
  console.log('Bulk status change for register:', item.id, item.fileName)
  // This will open a dialog to select new status and apply to all orders in this register
}

function exportAllXml(item) {
  ordersStore.generateAll(item.id)
}

const headers = [
  { title: '', key: 'actions1', sortable: false, align: 'center', width: '60px' },
  { title: '', key: 'actions2', sortable: false, align: 'center', width: '60px' },
  { title: '', key: 'actions3', sortable: false, align: 'center', width: '60px' },
  { title: '№', key: 'id', align: 'start' },
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
          <v-tooltip text="Открыть список заказов">
            <template v-slot:activator="{ props }">
              <button type="button" @click="openOrders(item)" class="anti-btn" v-bind="props">
                <font-awesome-icon size="1x" icon="fa-solid fa-list" class="anti-btn" />
              </button>
            </template>
          </v-tooltip>
        </template>
        <template #[`item.actions2`]="{ item }">
          <v-tooltip text="Изменить статус всех заказов в реестре">
            <template v-slot:activator="{ props }">
              <button type="button" @click="bulkChangeStatus(item)" class="anti-btn" v-bind="props">
                <font-awesome-icon size="1x" icon="fa-solid fa-pen-to-square" class="anti-btn" />
              </button>
            </template>
          </v-tooltip>
        </template>
        <template #[`item.actions3`]="{ item }">
          <v-tooltip text="Выгрузить накладные для всех заказов в реестре">
            <template v-slot:activator="{ props }">
              <button type="button" @click="exportAllXml(item)" class="anti-btn" v-bind="props">
                <font-awesome-icon size="1x" icon="fa-solid fa-download" class="anti-btn" />
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
  </div>
</template>
