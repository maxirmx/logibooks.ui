<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useFeacnCodesStore } from '@/stores/feacn.codes.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { mdiMagnify } from '@mdi/js'

const feacnStore = useFeacnCodesStore()
const alertStore = useAlertStore()
const authStore = useAuthStore()

const { orders, prefixes, loading, error } = storeToRefs(feacnStore)
const { alert } = storeToRefs(alertStore)
const {
  feacnorders_sort_by,
  feacnprefixes_per_page,
  feacnprefixes_search,
  feacnprefixes_sort_by,
  feacnprefixes_page,
  isAdmin
} = storeToRefs(authStore)

const selectedOrderId = ref(null)
watch(selectedOrderId, async (id) => {
  await feacnStore.getPrefixes(id)
})

onMounted(async () => {
  await feacnStore.getOrders()
  // Set selectedOrderId to the first order's ID by default
  if (orders.value?.length > 0) {
    selectedOrderId.value = orders.value[0].id
  }
})

async function updateCodes() {
  try {
    await feacnStore.update()
    await feacnStore.getOrders()
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
  { title: 'Нормативный документ', key: 'title', align: 'start', width: '70%' },
  { title: 'Ссылка', key: 'url', align: 'start', width: '30%' }
]

const prefixHeaders = [
  { title: 'Префикс', key: 'code', align: 'start', width: '10%' },
  { title: 'Описание', key: 'description', align: 'start', width: '50%' },
  { title: 'Исключения', key: 'exceptions', align: 'start', width: '40%' }
]
</script>

<template>
  <div class="settings table-3" data-testid="feacn-codes-list">
    <h1 class="primary-heading">Коды ТН ВЭД с ограничениями</h1>
    <hr class="hr" />

    <div class="link-crt" v-if="isAdmin">
      <a @click="updateCodes" class="link">
        <font-awesome-icon size="1x" icon="fa-solid fa-download" class="link" />
        &nbsp;&nbsp;&nbsp;Обновить информацию о кодах ТН ВЭД с ограничениями
      </a>
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
        class="elevation-1 interlaced-table single-line-table"
        hide-default-footer
        :row-props="(data) => ({ class: data.item.id === selectedOrderId ? 'selected-order-row' : '' })"
        @click:row="(event, { item }) => { selectedOrderId = item.id }"
      >
        <template v-for="h in orderHeaders" :key="`header-${h.key}`" #[`header.${h.key}`]="{ column }">
          <div class="truncated-cell" :title="column.title">
            {{ column.title }}
          </div>
        </template>
        <template #[`item.url`]="{ item }">
          <div class="truncated-cell">
            <a v-if="item.url" :href="item.url" target="_blank" rel="noopener noreferrer" class="product-link" :title="item.url">
              {{ item.url }}
            </a>
            <span v-else>-</span>
          </div>
        </template>
        <template v-for="h in orderHeaders.filter(h => h.key !== 'url')" :key="h.key" #[`item.${h.key}`]="{ item }">
          <div class="truncated-cell" :title="item[h.key] || ''">
            {{ item[h.key] }}
          </div>
        </template>
      </v-data-table>
      <div v-if="!orders?.length && !loading" class="text-center m-5">Список документов пуст</div>
    </v-card>

    <v-card class="mt-8">
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
        class="elevation-1 interlaced-table single-line-table"
      >
        <template v-for="h in prefixHeaders" :key="`pheader-${h.key}`" #[`header.${h.key}`]="{ column }">
          <div class="truncated-cell" :title="column.title">
            {{ column.title }}
          </div>
        </template>
        <template v-for="h in prefixHeaders" :key="h.key" #[`item.${h.key}`]="{ item }">
          <div class="truncated-cell" :title="item[h.key] || ''">
            {{ item[h.key] || '-' }}
          </div>
        </template>
      </v-data-table>
      <div v-if="!prefixItems?.length && !loading" class="text-center m-5">Список кодов пуст</div>

      <div v-if="prefixItems?.length || feacnprefixes_search">
        <v-text-field
          v-model="authStore.feacnprefixes_search"
          :append-inner-icon="mdiMagnify"
          label="Поиск по кодам"
          variant="solo"
          hide-details
        />
      </div>
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
.truncated-cell {
  cursor: help;
}

/* Visual emphasis for the selected order row */
:deep(.selected-order-row) {
  background-color: rgba(25, 118, 210, 0.08) !important;
  border-left: 14px solid #1976d2 !important;
}

:deep(.selected-order-row:hover) {
  background-color: rgba(25, 118, 210, 0.12) !important;
}

:deep(.selected-order-row td) {
  background-color: transparent !important;
}
</style>
