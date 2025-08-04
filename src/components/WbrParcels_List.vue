<script setup>

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
import { HasIssues, getCheckStatusClass } from '@/helpers/orders.check.helper.js'
import { getFieldTooltip, getCheckStatusTooltip } from '@/helpers/parcel.tooltip.helpers.js'
import { ensureHttps } from '@/helpers/url.helpers.js'

const props = defineProps({
  registerId: { type: Number, required: true }
})

const parcelsStore = useParcelsStore()

const parcelStatusStore = useParcelStatusesStore()
parcelStatusStore.ensureStatusesLoaded()

const parcelCheckStatusStore = useParcelCheckStatusStore()
parcelCheckStatusStore.ensureStatusesLoaded()

const stopWordsStore = useStopWordsStore()
await stopWordsStore.getAll()

const feacnCodesStore = useFeacnCodesStore()
feacnCodesStore.ensureOrdersLoaded()

const countriesStore = useCountriesStore()
countriesStore.ensureLoaded()

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
const registerFileName = ref('')
const registerDealNumber = ref('')
const registerName = computed(() => {
  if (registerDealNumber.value && String(registerDealNumber.value).trim() !== '') {
    return `Реестр для сделки ${registerDealNumber.value}`
  } else {
    return 'Реестр для сделки без номера (файл: ' + registerFileName.value + ')'
  }
})

async function fetchRegister() {
  try {
    const res = await fetchWrapper.get(`${apiUrl}/registers/${props.registerId}`)
    const byStatus = res.ordersByStatus || {}
    statuses.value = Object.keys(byStatus).map((id) => ({
      id: Number(id),
      count: byStatus[id]
    }))
    registerFileName.value = res.fileName || ''
    registerDealNumber.value = res.dealNumber || ''
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
    { title: '', key: 'actions4', sortable: false, align: 'center', width: '10px' },

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

async function exportParcelXml(item) {
  try {
    const filename = String(item.shk || '').padStart(20, '0')
    await parcelsStore.generate(item.id, filename)
  } catch (error) {
    console.error('Failed to export parcel XML:', error)
    parcelsStore.error = error?.response?.data?.message || 'Ошибка при выгрузке накладной для посылки'
  }
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

async function approveParcel(item) {
  try {
    await parcelsStore.approve(item.id)
    loadOrders()
  } catch (error) {
    console.error('Failed to approve parcel:', error)
    parcelsStore.error = error?.response?.data?.message || 'Ошибка при согласовании посылки'
  }
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
      {{ registerName }}
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
            :title="getFieldTooltip(header.key, wbrRegisterColumnTitles, wbrRegisterColumnTooltips)"
          >
            {{ column.title || '' }}
          </div>
        </template>

        <!-- Add tooltip templates for each data field -->
        <template v-for="header in getGenericTemplateHeaders()" :key="header.key" #[`item.${header.key}`]="{ item }">
          <v-tooltip>
            <template #activator="{ props }">
              <div class="truncated-cell" data-test="editable-cell" v-bind="props" @click="editParcel(item)">
                {{ item[header.key] || '' }}
              </div>
            </template>
            <div class="d-flex align-center">
              <font-awesome-icon size="1x" icon="fa-solid fa-pen" class="mr-1" />
              <span>{{ item[header.key] || '' }}</span>
            </div>
          </v-tooltip>
        </template>

        <!-- Special template for statusId to display status title with color -->
        <template #[`item.statusId`]="{ item }">
          <v-tooltip>
            <template #activator="{ props }">
              <div class="truncated-cell status-cell" data-test="editable-cell" v-bind="props" @click="editParcel(item)">
                {{ parcelStatusStore.getStatusTitle(item.statusId) }}
              </div>
            </template>
            <div class="d-flex align-center">
              <font-awesome-icon size="1x" icon="fa-solid fa-pen" class="mr-1" />
              <span>{{ parcelStatusStore.getStatusTitle(item.statusId) }}</span>
            </div>
          </v-tooltip>
        </template>

        <!-- Special template for checkStatusId to display check status title -->
        <template #[`item.checkStatusId`]="{ item }">
          <v-tooltip>
            <template #activator="{ props }">
              <div
                class="truncated-cell status-cell"
                data-test="editable-cell"
                :class="getCheckStatusClass(item.checkStatusId)"
                v-bind="props"
                @click="editParcel(item)"
              >
                {{ parcelCheckStatusStore.getStatusTitle(item.checkStatusId) }}
              </div>
            </template>
            <div class="d-flex align-center">
              <font-awesome-icon size="1x" icon="fa-solid fa-pen" class="mr-1" />
              <span>{{ getCheckStatusTooltip(item, parcelCheckStatusStore.getStatusTitle, feacnOrders, stopWords) }}</span>
            </div>
          </v-tooltip>
        </template>

        <!-- Special template for productLink to display as clickable URL -->
        <template #[`item.productLink`]="{ item }">
          <div class="truncated-cell">
            <a
              v-if="item.productLink"
              :href="ensureHttps(item.productLink)"
              target="_blank"
              rel="noopener noreferrer"
              class="product-link"
              :title="ensureHttps(item.productLink)"
            >
              {{ ensureHttps(item.productLink) }}
            </a>
            <span v-else>-</span>
          </div>
        </template>
        <template #[`item.countryCode`]="{ item }">
          <v-tooltip>
            <template #activator="{ props }">
              <div class="truncated-cell" data-test="editable-cell" v-bind="props" @click="editParcel(item)">
                {{ countriesStore.getCountryAlpha2(item.countryCode) }}
              </div>
            </template>
            <div class="d-flex align-center">
              <font-awesome-icon size="1x" icon="fa-solid fa-pen" class="mr-1" />
              <span>{{ item.countryCode }}</span>
            </div>
          </v-tooltip>
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
                <font-awesome-icon size="1x" icon="fa-solid fa-upload" class="anti-btn" />
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
        <template #[`item.actions4`]="{ item }">
          <v-tooltip text="Согласовать">
            <template v-slot:activator="{ props }">
              <button @click="approveParcel(item)" class="anti-btn" v-bind="props">
                <font-awesome-icon size="1x" icon="fa-solid fa-check-circle" class="anti-btn" />
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

