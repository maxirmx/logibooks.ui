// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks frontend application
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 1. Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in the
//    documentation and/or other materials provided with the distribution.
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

<script setup>

import { ref, onMounted, watch, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useFeacnOrdersStore } from '@/stores/feacn.orders.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { mdiMagnify } from '@mdi/js'

const feacnStore = useFeacnOrdersStore()
const alertStore = useAlertStore()
const authStore = useAuthStore()

const { orders, prefixes, loading, error } = storeToRefs(feacnStore)
const { alert } = storeToRefs(alertStore)
const {
  feacnorders_search,
  feacnorders_sort_by,
  feacnprefixes_per_page,
  feacnprefixes_search,
  feacnprefixes_sort_by,
  feacnprefixes_page,
  isAdmin
} = storeToRefs(authStore)


const selectedOrderId = ref(null)

// Always keep selectedOrderId in sync with visible orders
watch(
  () => orders.value,
  async (newOrders) => {
    if (!newOrders?.length) {
      selectedOrderId.value = null
    } else {
      // Find first order with Enabled === true
      const firstEnabled = newOrders.find(o => o.Enabled === true)
      const newSelectedId = firstEnabled ? firstEnabled.id : newOrders[0].id
      if (!selectedOrderId.value || !newOrders.some(o => o.id === selectedOrderId.value)) {
        selectedOrderId.value = newSelectedId
        // Update prefixes when default row is set
        if (newSelectedId) await feacnStore.getPrefixes(newSelectedId)
      }
    }
  },
  { immediate: true }
)

// When selectedOrderId changes, load prefixes
watch(selectedOrderId, async (id) => {
  if (id) await feacnStore.getPrefixes(id)
})

onMounted(async () => {
  await feacnStore.ensureLoaded()
  if (orders.value?.length > 0) {
    const firstEnabled = orders.value.find(o => o.Enabled === true)
    const newSelectedId = firstEnabled ? firstEnabled.id : orders.value[0].id
    selectedOrderId.value = newSelectedId
    // Update prefixes when default row is set on mount
    if (newSelectedId) await feacnStore.getPrefixes(newSelectedId)
  }
})

async function updateCodes() {
  try {
    await feacnStore.update()  // This already reloads orders automatically
    if (selectedOrderId.value) {
      await feacnStore.getPrefixes(selectedOrderId.value)
    }
  } catch (err) {
    alertStore.error(err)
  }
}

function filterOrders(value, query, item) {
  if (!query) return true
  const q = query.toString().toUpperCase()
  const i = item.raw
  return (
    i.title.toUpperCase().includes(q) ||
    (i.url || '').toUpperCase().includes(q)
  )
}

function filterPrefixes(value, query, item) {
  if (!query) return true
  const q = query.toString().toUpperCase()
  const i = item.raw
  return (
    i.code.toUpperCase().includes(q) ||
    (i.description || '').toUpperCase().includes(q) ||
    (i.comment || '').toUpperCase().includes(q) ||
    (i.exceptions || '').toUpperCase().includes(q)
  )
}

const prefixItems = computed(() =>
  prefixes.value.map(p => ({
    ...p,
    exceptions: p.exceptions.map(e => e.code).join(', ')
  }))
)

const orderHeaders = [
  { title: '', key: 'action', sortable: false, align: 'center', width: '50px' },
  { title: 'Нормативный документ', key: 'title', align: 'start' },
  { title: 'Ссылка', key: 'url', align: 'start' }
]

const prefixHeaders = [
  { title: 'Префикс', key: 'code', align: 'start', width: '120px' },
  { title: 'Описание', key: 'description', align: 'start' },
  { title: 'Исключения', key: 'exceptions', align: 'start' }
]

async function handleToggleOrderEnabled(order) {
  if (loading.value) return
  await feacnStore.toggleEnabled(order.id, !order.enabled)
}
</script>

<template>
  <div class="settings table-3" data-testid="feacn-orders-list">
    <h1 class="primary-heading">Ограничения по кодам ТН ВЭД</h1>
    <hr class="hr" />

    <div class="link-crt" v-if="isAdmin">
      <a @click="updateCodes" class="link">
        <font-awesome-icon size="1x" icon="fa-solid fa-file-import" class="link" />
        &nbsp;&nbsp;&nbsp;Обновить информацию об ограничениях по кодам ТН ВЭД
      </a>
    </div>

    <div v-if="orders?.length || feacnorders_search">
      <v-text-field
        v-model="authStore.feacnorders_search"
        :append-inner-icon="mdiMagnify"
        label="Поиск по документам"
        variant="solo"
        hide-details
      />
    </div>

    <v-card>
      <v-data-table
        v-if="orders?.length"
        :headers="orderHeaders"
        :items="orders"
        :search="authStore.feacnorders_search"
        v-model:sort-by="feacnorders_sort_by"
        :custom-filter="filterOrders"
        density="compact"
        class="elevation-1 interlaced-table"
        hide-default-footer
        :row-props="(data) => ({ class: data.item.id === selectedOrderId ? 'selected-order-row' : '' })"
        @click:row="(event, { item }) => { selectedOrderId = item.id }"
      >
        <template  #[`item.action`]="{ item }">
          <v-tooltip :text="item.enabled ? 'Не использовать' : 'Использовать'">
            <template v-slot:activator="{ props }">
              <button
                type="button"
                class="action-btn"
                v-bind="props"
                @click.stop="handleToggleOrderEnabled(item)"
                :disabled="loading"
                data-testid="toggle-order-enabled"
              >
                <font-awesome-icon
                  size="1x"
                  :icon="item.enabled ? 'fa-solid fa-toggle-on' : 'fa-solid fa-toggle-off'"
                  class="action-btn"
                />
              </button>
            </template>
          </v-tooltip>
        </template>
        <template #[`item.url`]="{ item }">
          <a v-if="item.url" :href="item.url" target="_blank" rel="noopener noreferrer" class="product-link">
            {{ item.url }}
          </a>
          <span v-else>-</span>
        </template>
      </v-data-table>
      <div v-if="!orders?.length && !loading" class="text-center m-5">Список документов пуст</div>
    </v-card>

    <div class="mt-8"></div>

    <div v-if="prefixItems?.length || feacnprefixes_search">
      <v-text-field
        v-model="authStore.feacnprefixes_search"
        :append-inner-icon="mdiMagnify"
        label="Поиск по кодам"
        variant="solo"
        hide-details
      />
    </div>

    <v-card>
      <v-data-table
        v-if="prefixItems?.length"
        v-model:items-per-page="feacnprefixes_per_page"
        items-per-page-text="Кодов на странице"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="feacnprefixes_page"
        :headers="prefixHeaders"
        :items="prefixItems"
        :search="authStore.feacnprefixes_search"
        v-model:sort-by="feacnprefixes_sort_by"
        :custom-filter="filterPrefixes"
        density="compact"
        class="elevation-1 interlaced-table"
      >
        <template v-for="h in prefixHeaders" :key="h.key" #[`item.${h.key}`]="{ item }">
          {{ item[h.key] || '-' }}
        </template>
      </v-data-table>
      <div v-if="!prefixItems?.length && !loading" class="text-center m-5">Список кодов пуст</div>
    </v-card>

    <div v-if="loading" class="text-center m-5">
      <span class="spinner-border spinner-border-lg align-center"></span>
    </div>
    <div v-if="error" class="text-center m-5">
      <div class="text-danger">Ошибка при загрузке информации: {{ error }}</div>
    </div>
    <div v-if="alert" class="alert alert-dismissable mt-3 mb-0" :class="alert.type">
      <button @click="alertStore.clear()" class="btn btn-link close">×</button>
      {{ alert.message }}
    </div>
  </div>
</template>

<style scoped>
/* Visual emphasis for the selected order row */
:deep(.selected-order-row) {
  background-color: rgba(25, 118, 210, 0.08) !important;
  border-left: 4px solid #1976d2 !important;
}

:deep(.selected-order-row:hover) {
  background-color: rgba(25, 118, 210, 0.12) !important;
}

:deep(.selected-order-row td) {
  background-color: transparent !important;
}
</style>
