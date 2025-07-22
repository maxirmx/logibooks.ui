<script setup>
import { watch, ref, computed, onMounted } from 'vue'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { useParcelStatusesStore } from '@/stores/parcel.statuses.store.js'
import { useParcelCheckStatusStore } from '@/stores/parcel.checkstatuses.store.js'
import { useStopWordsStore } from '@/stores/stop.words.store.js'
import { useFeacnCodesStore } from '@/stores/feacn.codes.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import router from '@/router'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { storeToRefs } from 'pinia'
import { fetchWrapper } from '@/helpers/fetch.wrapper.js'
import { apiUrl } from '@/helpers/config.js'
import { wbrRegisterColumnTitles, wbrRegisterColumnTooltips } from '@/helpers/wbr.register.mapping.js'
import { HasIssues, getCheckStatusInfo } from '@/helpers/orders.check.helper.js'

const props = defineProps({
  registerId: { type: Number, required: true }
})

const parcelsStore = useParcelsStore()
const parcelStatusStore = useParcelStatusesStore()
const parcelCheckStatusStore = useParcelCheckStatusStore()
const stopWordsStore = useStopWordsStore()
const feacnCodesStore = useFeacnCodesStore()
const authStore = useAuthStore()

const { items, loading, error, totalCount } = storeToRefs(parcelsStore)
const { stopWords } = storeToRefs(stopWordsStore)
const { orders: feacnOrders } = storeToRefs(feacnCodesStore)
const {
  parcels_per_page,
  parcels_sort_by,
  parcels_page,
  parcels_status,
  parcels_tnved
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
  parcelsStore.getAll(
    props.registerId,
    parcels_status.value ? Number(parcels_status.value) : null,
    parcels_tnved.value || null,
    parcels_page.value,
    parcels_per_page.value,
    parcels_sort_by.value?.[0]?.key || 'id',
    parcels_sort_by.value?.[0]?.order || 'asc'
  )
}

watch(
  [parcels_page, parcels_per_page, parcels_sort_by, parcels_status, parcels_tnved],
  loadOrders,
  { immediate: true }
)

onMounted(async () => {
  // Ensure order statuses are loaded
  parcelStatusStore.ensureStatusesLoaded()
  parcelCheckStatusStore.ensureStatusesLoaded()
  // Load all stop words once to reduce network traffic
  await stopWordsStore.getAll()
  // Ensure feacn orders are loaded (loaded globally at startup, but ensure here as fallback)
  await feacnCodesStore.ensureOrdersLoaded()
  await fetchRegister()
})

const statusOptions = computed(() => [
  { value: null, title: 'Все' },
  ...statuses.value.map((s) => ({
    value: s.id,
    title: `${parcelStatusStore.getStatusTitle(s.id)} (${s.count})`
  }))
])

const headers = computed(() => {
  return [
    // Actions - Always first for easy access
    { title: '', key: 'actions1', sortable: false, align: 'center', width: '10px' },
    { title: '', key: 'actions2', sortable: false, align: 'center', width: '10px' },
    { title: '', key: 'actions3', sortable: false, align: 'center', width: '10px' },

    // Order Identification & Status - Key identifiers and current state
    { title: wbrRegisterColumnTitles.Status, key: 'statusId', align: 'start', width: '120px' },
    { title: wbrRegisterColumnTitles.CheckStatusId, key: 'checkStatusId', align: 'start', width: '120px' },
    // { title: wbrRegisterColumnTitles.OrderNumber, sortable: false, key: 'orderNumber', align: 'start', width: '120px' },
    { title: wbrRegisterColumnTitles.TnVed, key: 'tnVed', align: 'start', width: '120px' },

    // Product Identification & Details - What the order contains
    { title: wbrRegisterColumnTitles.Shk, sortable: false, key: 'shk', align: 'start', width: '120px' },
    { title: wbrRegisterColumnTitles.ProductName, sortable: false, key: 'productName', align: 'start', width: '200px' },
    { title: wbrRegisterColumnTitles.ProductLink, sortable: false, key: 'productLink', align: 'start', width: '150px' },

    // Physical Properties - Tangible characteristics
    { title: wbrRegisterColumnTitles.Country, sortable: false, key: 'country', align: 'start', width: '100px' },
    { title: wbrRegisterColumnTitles.WeightKg, sortable: false, key: 'weightKg', align: 'start', width: '100px' },
    { title: wbrRegisterColumnTitles.Quantity, sortable: false, key: 'quantity', align: 'start', width: '80px' },

    // Financial Information - Pricing and currency
    { title: wbrRegisterColumnTitles.UnitPrice, sortable: false, key: 'unitPrice', align: 'start', width: '100px' },
    { title: wbrRegisterColumnTitles.Currency, sortable: false, key: 'currency', align: 'start', width: '80px' },

    // Recipient Information - Who receives the order
    { title: wbrRegisterColumnTitles.RecipientName, sortable: false, key: 'recipientName', align: 'start', width: '200px' },
    { title: wbrRegisterColumnTitles.PassportNumber, sortable: false, key: 'passportNumber', align: 'start', width: '120px' }
  ]
})

function editParcel(item) {
  router.push(`/registers/${props.registerId}/parcels/edit/${item.id}`)
}

function exportParcelXml(item) {
  parcelsStore.generate(item.id)
}

async function validateParcel(item) {
  try {
    await parcelsStore.validate(item.id)
    loadOrders()
  } catch (error) {
    console.error('Failed to validate parcel:', error)
    parcelsStore.error = error?.response?.data?.message || 'Ошибка при проверке информации о посылке'
  }
}

// Function to get tooltip for column headers
function getColumnTooltip(key) {
  // Convert camelCase key to PascalCase to match the mapping keys
  const pascalKey = key.charAt(0).toUpperCase() + key.slice(1)
  const tooltip = wbrRegisterColumnTooltips[pascalKey]
  const title = wbrRegisterColumnTitles[pascalKey]

  if (tooltip && title) {
    return `${title} (${tooltip})`
  }
  return title || null
}

// Function to get tooltip for checkStatusId with combined status info
function getCheckStatusTooltip(item) {
  const baseTitle = parcelCheckStatusStore.getStatusTitle(item.checkStatusId)

  if (HasIssues(item.checkStatusId)) {
    const checkInfo = getCheckStatusInfo(item, feacnOrders.value, stopWords.value)
    if (checkInfo) {
      return `${baseTitle}\n${checkInfo}`
    }
  }

  return baseTitle
}

function getRowProps(data) {
  return { class: '' + (HasIssues(data.item.checkStatusId) ? 'order-has-issues' : '') }
}
</script>

<template>
  <div class="settings table-3">
    <h1 class="primary-heading"></h1>
    <hr class="hr" />


    <div class="d-flex mb-2 align-center flex-wrap-reverse justify-space-between" style="width: 100%; gap: 10px;">
      <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
        <v-select
          v-model="parcels_status"
          :items="statusOptions"
          label="Статус"
          density="compact"
          style="min-width: 250px"
        />
        <v-text-field
          v-model="parcels_tnved"
          label="ТН ВЭД"
          density="compact"
          style="min-width: 200px;"
        />
      </div>
    </div>

    <v-card>
      <div style="overflow-x: auto;">
        <v-data-table-server
          v-if="items?.length || loading"
          v-model:items-per-page="parcels_per_page"
          items-per-page-text="Посылок на странице"
          :items-per-page-options="itemsPerPageOptions"
          page-text="{0}-{1} из {2}"
          v-model:page="parcels_page"
          v-model:sort-by="parcels_sort_by"
          :headers="headers"
          :items="items"
          :row-props="getRowProps"
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
            :title="getColumnTooltip(header.key)"
          >
            {{ column.title || '' }}
          </div>
        </template>

        <!-- Add tooltip templates for each data field -->
        <template v-for="header in headers.filter(h => !h.key.startsWith('actions') && h.key !== 'productLink' && h.key !== 'statusId' && h.key !== 'checkStatusId')" :key="header.key" #[`item.${header.key}`]="{ item }">
          <div
            class="truncated-cell"
            :title="item[header.key] || ''"
          >
            {{ item[header.key] || '' }}
          </div>
        </template>

        <!-- Special template for statusId to display status title with color -->
        <template #[`item.statusId`]="{ item }">
          <div
            class="truncated-cell status-cell"
            :title="parcelStatusStore.getStatusTitle(item.statusId)"
          >
            {{ parcelStatusStore.getStatusTitle(item.statusId) }}
          </div>
        </template>

        <!-- Special template for checkStatusId to display check status title -->
        <template #[`item.checkStatusId`]="{ item }">
          <div
            class="truncated-cell status-cell"
            :title="getCheckStatusTooltip(item)"
          >
            {{ parcelCheckStatusStore.getStatusTitle(item.checkStatusId) }}
          </div>
        </template>

        <!-- Special template for productLink to display as clickable URL -->
        <template #[`item.productLink`]="{ item }">
          <div class="truncated-cell">
            <a
              v-if="item.productLink"
              :href="item.productLink"
              target="_blank"
              rel="noopener noreferrer"
              class="product-link"
              :title="item.productLink"
            >
              {{ item.productLink }}
            </a>
            <span v-else>-</span>
          </div>
        </template>
        <template #[`item.actions1`]="{ item }">
          <v-tooltip text="Редактировать посылку">
            <template v-slot:activator="{ props }">
              <button @click="editParcel(item)" class="anti-btn" v-bind="props">
                <font-awesome-icon size="1x" icon="fa-solid fa-pen" class="anti-btn" />
              </button>
            </template>
          </v-tooltip>
        </template>
        <template #[`item.actions2`]="{ item }">
          <v-tooltip text="Выгрузить накладную для посылки">
            <template v-slot:activator="{ props }">
              <button @click="exportParcelXml(item)" class="anti-btn" v-bind="props">
                <font-awesome-icon size="1x" icon="fa-solid fa-download" class="anti-btn" />
              </button>
            </template>
          </v-tooltip>
        </template>
        <template #[`item.actions3`]="{ item }">
          <v-tooltip text="Проверить посылку">
            <template v-slot:activator="{ props }">
              <button @click="validateParcel(item)" class="anti-btn" v-bind="props">
                <font-awesome-icon size="1x" icon="fa-solid fa-clipboard-check" class="anti-btn" />
              </button>
            </template>
          </v-tooltip>
        </template>
      </v-data-table-server>
    </div>

    <!-- Custom pagination controls outside the scrollable area -->
    <div v-if="items?.length || loading" class="v-data-table-footer">
      <div class="v-data-table-footer__items-per-page">
        <span>Посылок на странице:</span>
        <v-select
          v-model="parcels_per_page"
          :items="itemsPerPageOptions"
          density="compact"
          variant="plain"
          hide-details
          class="v-data-table-footer__items-per-page-select"
        />
      </div>

      <div class="v-data-table-footer__info">
        <div>{{ Math.min((parcels_page - 1) * parcels_per_page + 1, totalCount) }}-{{ Math.min(parcels_page * parcels_per_page, totalCount) }} из {{ totalCount }}</div>
      </div>

      <div class="v-data-table-footer__pagination">
        <v-btn
          variant="text"
          icon="$first"
          size="small"
          :disabled="parcels_page <= 1"
          @click="parcels_page = 1"
        />

        <v-btn
          variant="text"
          icon="$prev"
          size="small"
          :disabled="parcels_page <= 1"
          @click="parcels_page = Math.max(1, parcels_page - 1)"
        />

        <v-btn
          variant="text"
          icon="$next"
          size="small"
          :disabled="parcels_page >= Math.ceil(totalCount / parcels_per_page)"
          @click="parcels_page = Math.min(Math.ceil(totalCount / parcels_per_page), parcels_page + 1)"
        />

        <v-btn
          variant="text"
          icon="$last"
          size="small"
          :disabled="parcels_page >= Math.ceil(totalCount / parcels_per_page)"
          @click="parcels_page = Math.ceil(totalCount / parcels_per_page)"
        />
      </div>
    </div>

    <div v-if="!items?.length && !loading" class="text-center m-5">Реестр пуст</div>
    </v-card>
    <div v-if="loading" class="text-center m-5">
      <span class="spinner-border spinner-border-lg align-center"></span>
    </div>
    <div v-if="error" class="text-center m-5">
      <div class="text-danger">Ошибка при загрузке реестра: {{ error }}</div>
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

/* Remove borders for action button columns */
.single-line-table :deep(.v-data-table__td:first-child),
.single-line-table :deep(.v-data-table__td:nth-child(2)),
.single-line-table :deep(.v-data-table__th:first-child),
.single-line-table :deep(.v-data-table__th:nth-child(2)) {
  border-right: none;
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

.product-link {
  color: rgba(var(--v-theme-primary), 1);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  max-width: 100%;
}

.product-link:hover {
  text-decoration: underline;
  cursor: pointer;
}

/* Status color styling */
.status-cell {
  font-weight: 500;
  border-radius: 4px;
  padding: 2px 8px;
  display: inline-block;
  min-width: 80px;
  text-align: center;
}

/* Row background colors based on checkStatusId */
:deep(.v-data-table__tbody tr.order-has-issues) {
  background-color: rgba(244, 67, 54, 0.08) !important; /* Light red background for issues */
}

:deep(.v-data-table__tbody tr.order-has-issues:hover) {
  background-color: rgba(244, 67, 54, 0.12) !important; /* Darker red on hover */
}

:deep(.v-data-table__tbody tr.order-has-issues td) {
  background-color: transparent !important; /* Ensure cells don't override row background */
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
