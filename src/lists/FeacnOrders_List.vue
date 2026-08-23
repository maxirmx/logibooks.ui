<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { onMounted, watch, computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useFeacnOrdersStore } from '@/stores/feacn.orders.store.js'
import { useCountriesStore } from '@/stores/countries.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import ActionButton from '@/components/ActionButton.vue'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { mdiMagnify } from '@mdi/js'
import { runWithRetryAlert } from '@/helpers/notification.helpers.js'
import { getProhibitionScopeRows } from '@/helpers/prohibition.scope.helpers.js'
import router from '@/router'

const feacnStore = useFeacnOrdersStore()
const countriesStore = useCountriesStore()
const alertStore = useAlertStore()
const authStore = useAuthStore()

const { orders, prefixes, loading } = storeToRefs(feacnStore)
const runningAction = ref(false)
const {
  feacnorders_search,
  feacnorders_sort_by,
  feacnprefixes_per_page,
  feacnprefixes_search,
  feacnprefixes_sort_by,
  feacnprefixes_page,
  selectedOrderId,
  isAdmin,
  isSrLogistPlus
} = storeToRefs(authStore)

// Always keep selectedOrderId in sync with visible orders
async function loadPrefixes(orderId) {
  if (!orderId) return null
  return runWithRetryAlert(() => feacnStore.getPrefixes(orderId), {
    fallback: 'Не удалось загрузить префиксы порядка'
  })
}

watch(
  () => orders.value,
  async (newOrders) => {
    if (!newOrders?.length) {
      selectedOrderId.value = null
    } else {
      // Only update selectedOrderId if current value is invalid or not set
      if (!selectedOrderId.value || !newOrders.some((o) => o.id === selectedOrderId.value)) {
        const firstEnabled = newOrders.find((o) => o.scopes?.length)
        const newSelectedId = firstEnabled ? firstEnabled.id : newOrders[0].id
        selectedOrderId.value = newSelectedId
        // Update prefixes when new order is selected
        if (newSelectedId) await loadPrefixes(newSelectedId)
      }
    }
  },
  { immediate: true }
)

// When selectedOrderId changes, load prefixes
watch(selectedOrderId, async (id) => {
  if (id) await loadPrefixes(id)
})

async function loadOrders() {
  await Promise.all([feacnStore.ensureLoaded(), countriesStore.ensureLoaded()])
  if (orders.value?.length > 0) {
    // Only set selectedOrderId if it's not already set or if the persisted value is invalid
    if (!selectedOrderId.value || !orders.value.some((o) => o.id === selectedOrderId.value)) {
      const firstEnabled = orders.value.find((o) => o.scopes?.length)
      const newSelectedId = firstEnabled ? firstEnabled.id : orders.value[0].id
      selectedOrderId.value = newSelectedId
    }
    // Always load prefixes for the current selectedOrderId (whether persisted or newly set)
    if (selectedOrderId.value) {
      await loadPrefixes(selectedOrderId.value)
    }
  }
}

onMounted(() =>
  runWithRetryAlert(loadOrders, {
    fallback: 'Не удалось загрузить порядки кодов ТН ВЭД'
  })
)

async function updateCodes() {
  if (runningAction.value) return
  runningAction.value = true
  try {
    await feacnStore.update() // This already reloads orders automatically
    if (selectedOrderId.value) {
      await feacnStore.getPrefixes(selectedOrderId.value)
    }
  } catch (err) {
    alertStore.error(err)
  } finally {
    runningAction.value = false
  }
}

function filterOrders(value, query, item) {
  if (!query) return true
  const q = query.toString().toUpperCase()
  const i = item.raw
  const scopes = getProhibitionScopeRows(i, countriesStore.getCountryShortName)
    .map((scope) => scope.label)
    .join(' ')
  return (
    i.title.toUpperCase().includes(q) ||
    (i.url || '').toUpperCase().includes(q) ||
    scopes.toUpperCase().includes(q)
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
  prefixes.value.map((p) => ({
    ...p,
    exceptions: p.exceptions.map((e) => e.code).join(', ')
  }))
)

const orderHeaders = [
  ...(isAdmin.value
    ? [{ title: '', key: 'actions', sortable: false, align: 'center', width: '70px' }]
    : []),
  { title: 'Правила применения', key: 'scopes', sortable: false, align: 'start' },
  { title: 'Нормативный документ', key: 'title', align: 'start' },
  { title: 'Ссылка', key: 'url', align: 'start' }
]

const prefixHeaders = [
  { title: 'Префикс', key: 'code', align: 'start', width: '120px' },
  { title: 'Описание', key: 'description', align: 'start' },
  { title: 'Исключения', key: 'exceptions', align: 'start' }
]

function editOrderScopes(order) {
  if (!isAdmin.value || runningAction.value || loading.value) return
  router.push(`/feacn/order/edit/${order.id}`)
}

defineExpose({ editOrderScopes, filterOrders, orderHeaders })
</script>

<template>
  <div class="settings table-3" data-testid="feacn-orders-list">
    <div class="header-with-actions">
      <h1 class="primary-heading">Ограничения по кодам ТН ВЭД</h1>
      <div class="header-actions-bar">
        <div v-if="runningAction || loading" class="header-actions header-actions-group">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <div class="header-actions header-actions-group" v-if="isSrLogistPlus">
          <ActionButton
            :item="{}"
            icon="fa-solid fa-file-import"
            tooltip-text="Обновить информацию об ограничениях по кодам ТН ВЭД"
            iconSize="2x"
            :disabled="runningAction || loading"
            @click="updateCodes"
          />
        </div>
      </div>
    </div>
    <hr class="hr" />

    <PageAlertRegion />

    <div>
      <v-text-field
        v-model="authStore.feacnorders_search"
        :append-inner-icon="mdiMagnify"
        label="Поиск по документам"
        variant="solo"
        hide-details
        :disabled="runningAction || loading"
      />
    </div>

    <v-card class="table-card orders-table">
      <v-data-table
        :headers="orderHeaders"
        :items="orders"
        :search="feacnorders_search"
        v-model:sort-by="feacnorders_sort_by"
        :custom-filter="filterOrders"
        density="compact"
        class="elevation-1 interlaced-table"
        fixed-header
        hide-default-footer
        :row-props="
          (data) => ({ class: data.item.id === selectedOrderId ? 'selected-order-row' : '' })
        "
        @click:row="
          (event, { item }) => {
            selectedOrderId = item.id
          }
        "
      >
        <template #[`item.scopes`]="{ item }">
          <span v-if="item.scopes?.length" class="scope-summary">
            <span
              v-for="scope in getProhibitionScopeRows(item, countriesStore.getCountryShortName)"
              :key="scope.key"
              class="scope-summary-line"
            >
              {{ scope.label }}
            </span>
          </span>
          <span v-else>Неактивно</span>
        </template>
        <template #[`item.actions`]="{ item }">
          <span v-if="isAdmin" @click.stop>
            <ActionButton
              :item="item"
              icon="fa-solid fa-pen"
              tooltip-text="Изменить области действия"
              :disabled="runningAction || loading"
              data-testid="edit-order-scopes"
              @click="editOrderScopes"
            />
          </span>
        </template>
        <template #[`item.url`]="{ item }">
          <a
            v-if="item.url"
            :href="item.url"
            target="_blank"
            rel="noopener noreferrer"
            class="product-link"
          >
            {{ item.url }}
          </a>
          <span v-else>-</span>
        </template>
      </v-data-table>
    </v-card>

    <div class="mt-8"></div>

    <div>
      <v-text-field
        v-model="authStore.feacnprefixes_search"
        :append-inner-icon="mdiMagnify"
        label="Поиск по кодам"
        variant="solo"
        hide-details
        :disabled="runningAction || loading"
      />
    </div>

    <v-card class="table-card prefixes-table">
      <v-data-table
        v-model:items-per-page="feacnprefixes_per_page"
        items-per-page-text="Кодов на странице"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="feacnprefixes_page"
        :headers="prefixHeaders"
        :items="prefixItems"
        :search="feacnprefixes_search"
        v-model:sort-by="feacnprefixes_sort_by"
        :custom-filter="filterPrefixes"
        density="compact"
        class="elevation-1 interlaced-table"
        fixed-header
      >
        <template v-for="h in prefixHeaders" :key="h.key" #[`item.${h.key}`]="{ item }">
          {{ item[h.key] || '-' }}
        </template>
      </v-data-table>
    </v-card>

  </div>
</template>

<style scoped>
@import '@/assets/styles/scrollable-table.css';

/* Visual emphasis for the selected order row */
:deep(.selected-order-row) {
  border-left: 4px solid #1976d2 !important;
}

/* Adjust max-height for dual-table layout */
.orders-table :deep(.v-table__wrapper) {
  max-height: calc(100vh - 650px);
}

.prefixes-table :deep(.v-table__wrapper) {
  max-height: calc(100vh - 750px);
}

.scope-summary,
.scope-summary-line {
  display: block;
}

.scope-summary-line {
  min-height: 1.35em;
  line-height: 1.35;
}
</style>
