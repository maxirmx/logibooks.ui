<script setup>
import { watch, ref, computed, onMounted } from 'vue'
import { useOrdersStore } from '@/stores/orders.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { storeToRefs } from 'pinia'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'
import { registerColumnTitles } from '@/helpers/register.mapping.js'

const props = defineProps({
  registerId: { type: Number, required: true }
})

const ordersStore = useOrdersStore()
const authStore = useAuthStore()

const { items, loading, error, totalCount } = storeToRefs(ordersStore)
const {
  orders_per_page,
  orders_sort_by,
  orders_page,
  orders_status,
  orders_tnved
} = storeToRefs(authStore)

const statuses = ref([])

async function fetchRegister() {
  try {
    const res = await fetchWrapper.get(`${apiUrl}/registers/${props.registerId}`)
    const byStatus = res.ordersByStatus || {}
    statuses.value = Object.keys(byStatus).map((id) => ({
      id: Number(id),
      count: byStatus[id]
    }))
  } catch {
    // ignore errors
  }
}

function loadOrders() {
  ordersStore.getAll(
    props.registerId,
    orders_status.value ? Number(orders_status.value) : null,
    orders_tnved.value || null,
    orders_page.value,
    orders_per_page.value,
    orders_sort_by.value?.[0]?.key || 'id',
    orders_sort_by.value?.[0]?.order || 'asc'
  )
}

watch(
  [orders_page, orders_per_page, orders_sort_by, orders_status, orders_tnved],
  loadOrders,
  { immediate: true }
)

onMounted(fetchRegister)

const statusOptions = computed(() => [
  { value: null, title: 'Все' },
  ...statuses.value.map((s) => ({
    value: s.id,
    title: `Статус ${s.id} (${s.count})`
  }))
])

const headers = computed(() => {
  return [
    { title: 'Статус', key: 'statusId', align: 'start' },
    { title: registerColumnTitles.RowNumber, key: 'rowNumber', align: 'start' },
    { title: registerColumnTitles.OrderNumber, key: 'orderNumber', align: 'start' },
    { title: registerColumnTitles.TnVed, key: 'tnVed', align: 'start' },
    { title: '', key: 'actions1', sortable: false, align: 'center', width: '5%' },
    { title: '', key: 'actions2', sortable: false, align: 'center', width: '5%' }
  ]
})

function editOrder(item) {
  ordersStore.update(item.id, {})
}

function exportOrderXml(item) {
  ordersStore.generate(item.id)
}

function exportAllXml() {
  ordersStore.generateAll(props.registerId)
}
</script>

<template>
  <div class="settings table-2">
    <h1 class="primary-heading">Заказы</h1>
    <hr class="hr" />


    <div class="d-flex mb-2 align-center flex-wrap-reverse justify-space-between" style="width: 100%; gap: 10px;">
      <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
        <v-select
          v-model="orders_status"
          :items="statusOptions"
          label="Статус"
          density="compact"
          style="min-width: 250px"
        />
        <v-text-field
          v-model="orders_tnved"
          label="ТН ВЭД"
          density="compact"
          style="min-width: 200px;"
        />
      </div>
      <div class="link-crt">
        <a @click="exportAllXml" class="link" tabindex="0">
          <font-awesome-icon size="1x" icon="fa-solid fa-download" class="link" />&nbsp;&nbsp;&nbsp;Выгрузить XML для всех заказов
        </a>
      </div>
    </div>

    <v-card>
      <v-data-table-server
        v-if="items?.length || loading"
        v-model:items-per-page="orders_per_page"
        items-per-page-text="Заказов на странице"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="orders_page"
        v-model:sort-by="orders_sort_by"
        :headers="headers"
        :items="items"
        :items-length="totalCount"
        :loading="loading"
        class="elevation-1"
      >
        <template #[`item.actions1`]="{ item }">
          <button @click="editOrder(item)" class="anti-btn">
            <font-awesome-icon size="1x" icon="fa-solid fa-pen" class="anti-btn" />
          </button>
        </template>
        <template #[`item.actions2`]="{ item }">
          <button @click="exportOrderXml(item)" class="anti-btn">
            <font-awesome-icon size="1x" icon="fa-solid fa-download" class="anti-btn" />
          </button>
        </template>
      </v-data-table-server>
      <div v-if="!items?.length && !loading" class="text-center m-5">Список заказов пуст</div>
    </v-card>
    <div v-if="loading" class="text-center m-5">
      <span class="spinner-border spinner-border-lg align-center"></span>
    </div>
    <div v-if="error" class="text-center m-5">
      <div class="text-danger">Ошибка при загрузке списка заказов: {{ error }}</div>
    </div>
  </div>
</template>
