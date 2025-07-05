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
    { title: '', key: 'actions1', sortable: false, align: 'center', width: '60px' },
    { title: '', key: 'actions2', sortable: false, align: 'center', width: '60px' },
    { title: 'Статус', key: 'statusId', align: 'start', width: '100px' },
    { title: registerColumnTitles.RowNumber, sortable: false, key: 'rowNumber', align: 'start', width: '80px' },
    { title: registerColumnTitles.OrderNumber, sortable: false, key: 'orderNumber', align: 'start', width: '120px' },
    { title: registerColumnTitles.TnVed, key: 'tnVed', align: 'start', width: '120px' },
    { title: registerColumnTitles.InvoiceDate, sortable: false, key: 'invoiceDate', align: 'start', width: '120px' },
    { title: registerColumnTitles.Sticker, sortable: false, key: 'sticker', align: 'start', width: '100px' },
    { title: registerColumnTitles.Shk, sortable: false, key: 'shk', align: 'start', width: '120px' },
    { title: registerColumnTitles.StickerCode, sortable: false, key: 'stickerCode', align: 'start', width: '120px' },
    { title: registerColumnTitles.ExtId, sortable: false, key: 'extId', align: 'start', width: '100px' },
    { title: registerColumnTitles.SiteArticle, sortable: false, key: 'siteArticle', align: 'start', width: '120px' },
    { title: registerColumnTitles.HeelHeight, sortable: false, key: 'heelHeight', align: 'start', width: '80px' },
    { title: registerColumnTitles.Size, sortable: false, key: 'size', align: 'start', width: '80px' },
    { title: registerColumnTitles.ProductName, sortable: false, key: 'productName', align: 'start', width: '200px' },
    { title: registerColumnTitles.Description, sortable: false, key: 'description', align: 'start', width: '200px' },
    { title: registerColumnTitles.Gender, sortable: false, key: 'gender', align: 'start', width: '80px' },
    { title: registerColumnTitles.Brand, sortable: false, key: 'brand', align: 'start', width: '120px' },
    { title: registerColumnTitles.FabricType, sortable: false, key: 'fabricType', align: 'start', width: '150px' },
    { title: registerColumnTitles.Composition, sortable: false, key: 'composition', align: 'start', width: '150px' },
    { title: registerColumnTitles.Lining, sortable: false, key: 'lining', align: 'start', width: '120px' },
    { title: registerColumnTitles.Insole, sortable: false, key: 'insole', align: 'start', width: '120px' },
    { title: registerColumnTitles.Sole, sortable: false, key: 'sole', align: 'start', width: '120px' },
    { title: registerColumnTitles.Country, sortable: false, key: 'country', align: 'start', width: '100px' },
    { title: registerColumnTitles.FactoryAddress, sortable: false, key: 'factoryAddress', align: 'start', width: '200px' },
    { title: registerColumnTitles.Unit, sortable: false, key: 'unit', align: 'start', width: '80px' },
    { title: registerColumnTitles.WeightKg, sortable: false, key: 'weightKg', align: 'start', width: '100px' },
    { title: registerColumnTitles.Quantity, sortable: false, key: 'quantity', align: 'start', width: '80px' },
    { title: registerColumnTitles.UnitPrice, sortable: false, key: 'unitPrice', align: 'start', width: '100px' },
    { title: registerColumnTitles.Currency, sortable: false, key: 'currency', align: 'start', width: '80px' },
    { title: registerColumnTitles.Barcode, sortable: false, key: 'barcode', align: 'start', width: '120px' },
    { title: registerColumnTitles.Declaration, sortable: false, key: 'declaration', align: 'start', width: '120px' },
    { title: registerColumnTitles.ProductLink, sortable: false, key: 'productLink', align: 'start', width: '150px' },
    { title: registerColumnTitles.RecipientName, sortable: false, key: 'recipientName', align: 'start', width: '200px' },
    { title: registerColumnTitles.RecipientInn, sortable: false, key: 'recipientInn', align: 'start', width: '120px' },
    { title: registerColumnTitles.PassportNumber, sortable: false, key: 'passportNumber', align: 'start', width: '120px' },
    { title: registerColumnTitles.Pinfl, sortable: false, key: 'pinfl', align: 'start', width: '120px' },
    { title: registerColumnTitles.RecipientAddress, sortable: false, key: 'recipientAddress', align: 'start', width: '200px' },
    { title: registerColumnTitles.ContactPhone, sortable: false, key: 'contactPhone', align: 'start', width: '120px' },
    { title: registerColumnTitles.BoxNumber, sortable: false, key: 'boxNumber', align: 'start', width: '100px' },
    { title: registerColumnTitles.Supplier, sortable: false, key: 'supplier', align: 'start', width: '150px' },
    { title: registerColumnTitles.SupplierInn, sortable: false, key: 'supplierInn', align: 'start', width: '120px' },
    { title: registerColumnTitles.Category, sortable: false, key: 'category', align: 'start', width: '120px' },
    { title: registerColumnTitles.Subcategory, sortable: false, key: 'subcategory', align: 'start', width: '120px' },
    { title: registerColumnTitles.PersonalData, sortable: false, key: 'personalData', align: 'start', width: '150px' },
    { title: registerColumnTitles.CustomsClearance, sortable: false, key: 'customsClearance', align: 'start', width: '150px' },
    { title: registerColumnTitles.DutyPayment, sortable: false, key: 'dutyPayment', align: 'start', width: '150px' },
    { title: registerColumnTitles.OtherReason, sortable: false, key: 'otherReason', align: 'start', width: '150px' }
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
  <div class="settings table-3">
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
      <div style="overflow-x: auto;">
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
          density="compact"
          fixed-header
          hide-default-footer
          class="elevation-1 single-line-table interlaced-table"
          style="min-width: fit-content;"
        >
        <!-- Add tooltip templates for header cells -->
        <template v-for="header in headers.filter(h => !h.key.startsWith('actions'))" :key="`header-${header.key}`" #[`header.${header.key}`]="{ column }">
          <div 
            class="truncated-cell" 
            :title="column.title || ''"
          >
            {{ column.title || '' }}
          </div>
        </template>
        
        <!-- Add tooltip templates for each data field -->
        <template v-for="header in headers.filter(h => !h.key.startsWith('actions'))" :key="header.key" #[`item.${header.key}`]="{ item }">
          <div 
            class="truncated-cell" 
            :title="item[header.key] || ''"
          >
            {{ item[header.key] || '' }}
          </div>
        </template>
        <template #[`item.actions1`]="{ item }">
          <v-tooltip text="Редактировать заказ">
            <template v-slot:activator="{ props }">
              <button @click="editOrder(item)" class="anti-btn" v-bind="props">
                <font-awesome-icon size="1x" icon="fa-solid fa-pen" class="anti-btn" />
              </button>
            </template>
          </v-tooltip>
        </template>
        <template #[`item.actions2`]="{ item }">
          <v-tooltip text="Выгрузить XML для заказа">
            <template v-slot:activator="{ props }">
              <button @click="exportOrderXml(item)" class="anti-btn" v-bind="props">
                <font-awesome-icon size="1x" icon="fa-solid fa-download" class="anti-btn" />
              </button>
            </template>
          </v-tooltip>
        </template>        </v-data-table-server>
      </div>
      
      <!-- Custom pagination controls outside the scrollable area -->
      <div v-if="items?.length || loading" class="v-data-table-footer">
        <div class="v-data-table-footer__items-per-page">
          <span>Заказов на странице:</span>
          <v-select
            v-model="orders_per_page"
            :items="itemsPerPageOptions"
            density="compact"
            variant="plain"
            hide-details
            class="v-data-table-footer__items-per-page-select"
          />
        </div>
        
        <div class="v-data-table-footer__info">
          <div>{{ Math.min((orders_page - 1) * orders_per_page + 1, totalCount) }}-{{ Math.min(orders_page * orders_per_page, totalCount) }} из {{ totalCount }}</div>
        </div>
        
        <div class="v-data-table-footer__pagination">
          <v-btn
            variant="text"
            icon="$first"
            size="small"
            :disabled="orders_page <= 1"
            @click="orders_page = 1"
          />
          
          <v-btn
            variant="text"
            icon="$prev"
            size="small"
            :disabled="orders_page <= 1"
            @click="orders_page = Math.max(1, orders_page - 1)"
          />
          
          <v-btn
            variant="text"
            icon="$next"
            size="small"
            :disabled="orders_page >= Math.ceil(totalCount / orders_per_page)"
            @click="orders_page = Math.min(Math.ceil(totalCount / orders_per_page), orders_page + 1)"
          />
          
          <v-btn
            variant="text"
            icon="$last"
            size="small"
            :disabled="orders_page >= Math.ceil(totalCount / orders_per_page)"
            @click="orders_page = Math.ceil(totalCount / orders_per_page)"
          />
        </div>
      </div>
      
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

<style scoped>
.single-line-table :deep(.v-data-table__td) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.8rem;
  line-height: 1.0;
  border-right: 1px solid rgba(var(--v-border-color), 0.25);
}

.single-line-table :deep(.v-data-table__th) {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
  font-size: 0.8rem;
  line-height: 1.0;
  font-weight: 600;
  border-right: 1px solid rgba(var(--v-border-color), 0.12);
}

/* Remove border from last column */
.single-line-table :deep(.v-data-table__td:last-child),
.single-line-table :deep(.v-data-table__th:last-child) {
  border-right: none;
}

.single-line-table :deep(.v-data-table__tr) {
  height: 32px !important;
}

.single-line-table :deep(.v-data-table__thead .v-data-table__tr) {
  height: 36px !important;
}

.single-line-table :deep(.v-data-table) {
  table-layout: fixed;
}

.truncated-cell {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
  cursor: default;
}

.truncated-cell:hover {
  cursor: help;
}

/* Custom pagination styling to match Vuetify's default exactly */
.v-data-table-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 32px;
  padding: 4px 16px;
  border-top: thin solid rgba(var(--v-border-color), var(--v-border-opacity));
  min-height: 52px;
}

.v-data-table-footer__items-per-page {
  display: flex;
  align-items: center;
  gap: 12px;
  white-space: nowrap;
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  padding-inline-end: 5px;
}

.v-data-table-footer__items-per-page-select {
  width: 80px;
  flex: 0 0 auto;
}

.v-data-table-footer__items-per-page-select :deep(.v-field__input) {
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.87);
}

.v-data-table-footer__info {
  font-size: 0.875rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  white-space: nowrap;
  display: block;
  text-align: right;
  width: 100%;
  padding-top: 10px;
}

.v-data-table-footer__pagination {
  display: flex;
  align-items: center;
  gap: 2px;
  padding-top: 17px;
}

.v-data-table-footer__pagination :deep(.v-btn) {
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.v-data-table-footer__pagination :deep(.v-btn:hover) {
  color: rgba(var(--v-theme-on-surface), 0.87);
  background-color: rgba(var(--v-theme-on-surface), 0.04);
}

.v-data-table-footer__pagination :deep(.v-btn.v-btn--disabled) {
  color: rgba(var(--v-theme-on-surface), 0.26) !important;
  opacity: 1;
}

/* Responsive adjustments to match Vuetify's default */
@media (min-width: 768px) {
  .v-data-table-footer__items-per-page {
    padding-inline-end: 24px;
  }
  
  .v-data-table-footer__info {
    display: inline-block;
    width: auto;
    padding-top: 0;
    padding-inline-end: 24px;
  }
  
  .v-data-table-footer__pagination {
    padding-top: 0;
  }
}
</style>
