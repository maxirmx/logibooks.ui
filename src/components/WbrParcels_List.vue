<script setup>
import { watch, ref, computed, onMounted } from 'vue'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { useParcelStatusesStore } from '@/stores/parcel.statuses.store.js'
import { useParcelCheckStatusStore } from '@/stores/parcel.checkstatuses.store.js'
import { useStopWordsStore } from '@/stores/stop.words.store.js'
import { useFeacnCodesStore } from '@/stores/feacn.codes.store.js'
import { useCountriesStore } from '@/stores/countries.store.js'
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
const countriesStore = useCountriesStore()
const authStore = useAuthStore()

const { items, loading, error, totalCount } = storeToRefs(parcelsStore)
const { stopWords } = storeToRefs(stopWordsStore)
const { orders: feacnOrders } = storeToRefs(feacnCodesStore)
const { countries } = storeToRefs(countriesStore)
const {
  parcels_per_page,
  parcels_sort_by,
  parcels_page,
  parcels_status,
  parcels_tnved
} = storeToRefs(authStore)

const statuses = ref([])
const registerFileName = ref('')

async function fetchRegister() {
  try {
    const res = await fetchWrapper.get(`${apiUrl}/registers/${props.registerId}`)
    const byStatus = res.ordersByStatus || {}
    statuses.value = Object.keys(byStatus).map((id) => ({
      id: Number(id),
      count: byStatus[id]
    }))
    registerFileName.value = res.fileName || ''
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
  if (countries.value.length === 0) {
    await countriesStore.getAll()
  }
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
    { title: wbrRegisterColumnTitles.statusId, key: 'statusId', align: 'start', width: '120px' },
    { title: wbrRegisterColumnTitles.checkStatusId, key: 'checkStatusId', align: 'start', width: '120px' },
    // { title: wbrRegisterColumnTitles.orderNumber, sortable: false, key: 'orderNumber', align: 'start', width: '120px' },
    { title: wbrRegisterColumnTitles.tnVed, key: 'tnVed', align: 'start', width: '120px' },

    // Product Identification & Details - What the order contains
    { title: wbrRegisterColumnTitles.shk, sortable: false, key: 'shk', align: 'start', width: '120px' },
    { title: wbrRegisterColumnTitles.productName, sortable: false, key: 'productName', align: 'start', width: '200px' },
    { title: wbrRegisterColumnTitles.productLink, sortable: false, key: 'productLink', align: 'start', width: '150px' },

    // Physical Properties - Tangible characteristics
    { title: wbrRegisterColumnTitles.countryCode, sortable: false, key: 'countryCode', align: 'start', width: '100px' },
    { title: wbrRegisterColumnTitles.weightKg, sortable: false, key: 'weightKg', align: 'start', width: '100px' },
    { title: wbrRegisterColumnTitles.quantity, sortable: false, key: 'quantity', align: 'start', width: '80px' },

    // Financial Information - Pricing and currency
    { title: wbrRegisterColumnTitles.unitPrice, sortable: false, key: 'unitPrice', align: 'start', width: '100px' },
    { title: wbrRegisterColumnTitles.currency, sortable: false, key: 'currency', align: 'start', width: '80px' },

    // Recipient Information - Who receives the order
    { title: wbrRegisterColumnTitles.recipientName, sortable: false, key: 'recipientName', align: 'start', width: '200px' },
    { title: wbrRegisterColumnTitles.passportNumber, sortable: false, key: 'passportNumber', align: 'start', width: '120px' }
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

function getCountryAlpha2(code) {
  const num = Number(code)
  const country = countries.value.find(c => c.isoNumeric === num)
  return country ? country.isoAlpha2 : code
}

// Function to get tooltip for column headers
function getColumnTooltip(key) {
  const tooltip = wbrRegisterColumnTooltips[key]
  const title = wbrRegisterColumnTitles[key]

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

// Function to filter headers that need generic templates
function getGenericTemplateHeaders() {
  return headers.value.filter(h => 
    !h.key.startsWith('actions') && 
    h.key !== 'productLink' && 
    h.key !== 'statusId' && 
    h.key !== 'checkStatusId' && 
    h.key !== 'countryCode'
  )
}
</script>

<template>
  <div class="settings table-3">
    <h1 class="primary-heading">
      {{ registerFileName || 'Загрузка...' }}
    </h1>
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
        <template v-for="header in getGenericTemplateHeaders()" :key="header.key" #[`item.${header.key}`]="{ item }">
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
        <template #[`item.countryCode`]="{ item }">
          <div class="truncated-cell" :title="item.countryCode">
            {{ getCountryAlpha2(item.countryCode) }}
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

