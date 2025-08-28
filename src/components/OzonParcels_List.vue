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

import { watch, ref, computed, onMounted, onUnmounted, provide } from 'vue'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useParcelStatusesStore } from '@/stores/parcel.statuses.store.js'
import { useParcelCheckStatusStore } from '@/stores/parcel.checkstatuses.store.js'
import { useKeyWordsStore } from '@/stores/key.words.store.js'
import { useStopWordsStore } from '@/stores/stop.words.store.js'
import { useFeacnOrdersStore } from '@/stores/feacn.orders.store.js'
import { useCountriesStore } from '@/stores/countries.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import router from '@/router'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { storeToRefs } from 'pinia'
import { ozonRegisterColumnTitles } from '@/helpers/ozon.register.mapping.js'
import { HasIssues, getCheckStatusClass } from '@/helpers/parcels.check.helpers.js'
import { ensureHttps } from '@/helpers/url.helpers.js'
import {
  navigateToEditParcel,
  validateParcelData,
  approveParcelData,
  getRowPropsForParcel,
  filterGenericTemplateHeadersForParcel,
  generateRegisterName,
  exportParcelXmlData,
  lookupFeacn,
  getFeacnCodesForKeywords,
  loadOrders,
} from '@/helpers/parcels.list.helpers.js'
import ClickableCell from '@/components/ClickableCell.vue'
import ActionButton from '@/components/ActionButton.vue'
import FeacnCodeSelector from '@/components/FeacnCodeSelector.vue'
import FeacnCodeCurrent from '@/components/FeacnCodeCurrent.vue'

const props = defineProps({
  registerId: { type: Number, required: true }
})

const parcelsStore = useParcelsStore()
const registersStore = useRegistersStore()
const parcelStatusStore = useParcelStatusesStore()
const parcelCheckStatusStore = useParcelCheckStatusStore()
const keyWordsStore = useKeyWordsStore()
const stopWordsStore = useStopWordsStore()
const feacnOrdersStore = useFeacnOrdersStore()
const countriesStore = useCountriesStore()
const authStore = useAuthStore()
const alertStore = useAlertStore()

const { alert } = storeToRefs(alertStore)

const { items, loading, error, totalCount } = storeToRefs(parcelsStore)
const {
  parcels_per_page,
  parcels_sort_by,
  parcels_page,
  parcels_status,
  parcels_tnved
} = storeToRefs(authStore)

parcels_status.value = null
parcels_tnved.value = ''

const registerFileName = ref('')
const registerDealNumber = ref('')
const registerLoading = ref(true)
const isInitializing = ref(true)
const isComponentMounted = ref(true)
const registerName = computed(() => {
  if (registerLoading.value) {
    return 'Загрузка реестра...'
  }
  return generateRegisterName(registerDealNumber.value, registerFileName.value)
})

async function fetchRegister() {
  if (!isComponentMounted.value) return
  try {
    await registersStore.getById(props.registerId)
    if (!isComponentMounted.value) return
    if (registersStore.item && !registersStore.item.error && !registersStore.item.loading) {
      registerFileName.value = registersStore.item.fileName || ''
      registerDealNumber.value = registersStore.item.dealNumber || ''
    }
  } finally {
    if (isComponentMounted.value) {
      registerLoading.value = false
    }
  }
}

async function loadOrdersWrapper() {
  await loadOrders(props.registerId, parcelsStore, isComponentMounted, alertStore)
}

// Provide the loadOrders function for child components
provide('loadOrders', loadOrdersWrapper)

const watcherStop = watch(
  [parcels_page, parcels_per_page, parcels_sort_by, parcels_status, parcels_tnved],
  loadOrdersWrapper,
  { immediate: true }
)

onMounted(async () => {
  try {
    if (!isComponentMounted.value) return
    
    await parcelStatusStore.ensureLoaded()
    if (!isComponentMounted.value) return
    
    await parcelCheckStatusStore.ensureLoaded()
    if (!isComponentMounted.value) return
    
    await feacnOrdersStore.ensureLoaded()
    if (!isComponentMounted.value) return
    
    await countriesStore.ensureLoaded()
    if (!isComponentMounted.value) return
    
    await stopWordsStore.ensureLoaded()
    if (!isComponentMounted.value) return
    
    await keyWordsStore.ensureLoaded()
    if (!isComponentMounted.value) return
    
    await fetchRegister()
  } catch (error) {
    if (isComponentMounted.value) {
      parcelsStore.error = error?.message || 'Ошибка при загрузке данных'
    }
  } finally {
    if (isComponentMounted.value) {
      isInitializing.value = false
    }
  }
})

onUnmounted(() => {
  isComponentMounted.value = false
  if (watcherStop) {
    watcherStop()
  }
})

const statusOptions = computed(() => [
  { value: null, title: 'Все' },
  ...parcelStatusStore.parcelStatuses.map(status => ({
    value: status.id,
    title: status.title
  }))
])

const headers = computed(() => {
  return [
    // Actions - Always first for easy access
    { title: '', key: 'actions', sortable: false, align: 'center', width: '200px' },

    // Order Identification & Status - Key identifiers and current state
    { title: '№', key: 'id', align: 'start', width: '120px' },
    { title: ozonRegisterColumnTitles.checkStatusId, key: 'checkStatusId', align: 'start', width: '120px' },
    { title: ozonRegisterColumnTitles.tnVed, key: 'tnVed', align: 'start', width: '120px' },
    { title: 'Подбор ТН ВЭД', key: 'feacnLookup', sortable: false, align: 'start', width: '120px' },
    { title: ozonRegisterColumnTitles.postingNumber, key: 'postingNumber', align: 'start', width: '120px' },
    { title: ozonRegisterColumnTitles.productName, key: 'productName', sortable: false, align: 'start', width: '200px' },
    { title: ozonRegisterColumnTitles.article, key: 'article', sortable: false, align: 'start', width: '120px' },
    { title: ozonRegisterColumnTitles.countryCode, key: 'countryCode', sortable: false, align: 'start', width: '100px' },
    { title: ozonRegisterColumnTitles.placesCount, key: 'placesCount', sortable: false, align: 'start', width: '120px' },
    { title: ozonRegisterColumnTitles.weightKg, key: 'weightKg', sortable: false, align: 'start', width: '100px' },
    { title: ozonRegisterColumnTitles.unitPrice, key: 'unitPrice', sortable: false, align: 'start', width: '100px' },
    { title: ozonRegisterColumnTitles.currency, key: 'currency', sortable: false, align: 'start', width: '80px' },
    { title: ozonRegisterColumnTitles.quantity, key: 'quantity', sortable: false, align: 'start', width: '80px' },
    { title: ozonRegisterColumnTitles.productLink, key: 'productLink', sortable: false, align: 'start', width: '150px' },
    { title: ozonRegisterColumnTitles.lastName, key: 'lastName', sortable: false, align: 'start', width: '120px' },
    { title: ozonRegisterColumnTitles.firstName, key: 'firstName', sortable: false, align: 'start', width: '120px' },
    { title: ozonRegisterColumnTitles.patronymic, key: 'patronymic', sortable: false, align: 'start', width: '120px' },
    { title: ozonRegisterColumnTitles.passportNumber, key: 'passportNumber', sortable: false, align: 'start', width: '120px' },
    // Status Information - Current state of the order
    { title: ozonRegisterColumnTitles.statusId, key: 'statusId', align: 'start', width: '120px' }
  ]
})

function editParcel(item) {
  navigateToEditParcel(router, item, 'Редактирование посылки', { registerId: props.registerId })
}

async function exportParcelXml(item) {
  const filename = item.postingNumber
  await exportParcelXmlData(item, parcelsStore, filename)
}

async function validateParcel(item) {
  await validateParcelData(item, parcelsStore, loadOrdersWrapper)
}

async function lookupFeacnCodes(item) {
  await lookupFeacn(item, parcelsStore, loadOrdersWrapper)
}

async function approveParcel(item) {
  await approveParcelData(item, parcelsStore, loadOrdersWrapper)
}

// Function to filter headers that need generic templates
function getGenericTemplateHeaders() {
  return filterGenericTemplateHeadersForParcel(headers.value)
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
          :row-props="getRowPropsForParcel"
          :items-length="totalCount"
          :loading="loading"
          density="compact"
          fixed-header
          hide-default-footer
          class="elevation-1 single-line-table interlaced-table ozon-parcels-table"
          style="min-width: fit-content;"
        >
        <!-- Add tooltip templates for each data field -->
        <template v-for="header in getGenericTemplateHeaders()" :key="header.key" #[`item.${header.key}`]="{ item }">
          <ClickableCell 
            :item="item" 
            :display-value="item[header.key] || ''" 
            cell-class="truncated-cell clickable-cell" 
            @click="editParcel" 
          />
        </template>

        <!-- Special template for statusId to display status title with color -->
        <template #[`item.statusId`]="{ item }">
          <ClickableCell 
            :item="item" 
            :display-value="parcelStatusStore.getStatusTitle(item.statusId)" 
            cell-class="truncated-cell status-cell clickable-cell" 
            @click="editParcel" 
          />
        </template>

        <!-- Special template for checkStatusId to display check status title -->
        <template #[`item.checkStatusId`]="{ item }">
          <ClickableCell 
            :item="item" 
            :display-value="parcelCheckStatusStore.getStatusTitle(item.checkStatusId)" 
            :cell-class="`truncated-cell status-cell clickable-cell ${getCheckStatusClass(item.checkStatusId)}`" 
            @click="editParcel" 
          />
        </template>

        <!-- Special template for tnVed to display with FEACN tooltip -->
        <template #[`item.tnVed`]="{ item }">
          <FeacnCodeCurrent
            :item="item"
            :feacn-codes="getFeacnCodesForKeywords(item.keyWordIds, keyWordsStore)"
            data-test="editable-cell"
            @click="editParcel"
          />
        </template>

        <!-- Special template for feacnLookup to display FEACN codes vertically -->
        <template #[`item.feacnLookup`]="{ item }">
          <FeacnCodeSelector :item="item" />
        </template>

        <!-- Special template for productLink to display as clickable URL -->
        <template #[`item.productLink`]="{ item }">
          <div class="product-link-in-list">
            <a
              v-if="item.productLink"
              :href="ensureHttps(item.productLink)"
              target="_blank"
              rel="noopener noreferrer"
              class="product-link-in-list"
              :title="ensureHttps(item.productLink)"
            >
              {{ ensureHttps(item.productLink) }}
            </a>
            <span v-else>-</span>
          </div>
        </template>
        <template #[`item.countryCode`]="{ item }">
          <ClickableCell 
            :item="item" 
            :display-value="countriesStore.getCountryAlpha2(item.countryCode)" 
            cell-class="truncated-cell clickable-cell" 
            @click="editParcel" 
          />
        </template>

        <template #[`item.actions`]="{ item }">
          <div class="actions-container">
            <ActionButton :item="item" icon="fa-solid fa-pen" tooltip-text="Редактировать информацию о посылке" @click="editParcel" />
            <ActionButton :item="item" icon="fa-solid fa-clipboard-check" tooltip-text="Проверить посылку" @click="validateParcel" />
            <ActionButton :item="item" icon="fa-solid fa-magnifying-glass" tooltip-text="Подобрать код ТН ВЭД" @click="lookupFeacnCodes" />
            <ActionButton :item="item" icon="fa-solid fa-upload" tooltip-text="Выгрузить накладную для посылки" @click="exportParcelXml" :disabled="HasIssues(item.checkStatusId)" />
            <ActionButton :item="item" icon="fa-solid fa-check-circle" tooltip-text="Согласовать" @click="approveParcel" />
          </div>
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

    <div v-if="!items?.length && !loading && !isInitializing" class="text-center m-5">Реестр пуст</div>
    <div v-if="loading || isInitializing" class="text-center m-5">
      <span class="spinner-border spinner-border-lg align-center"></span>
    </div>
    </v-card>
    <div v-if="error" class="text-center m-5">
      <div class="text-danger">Ошибка при загрузке реестра: {{ error }}</div>
    </div>
    <div v-if="alert" class="alert alert-dismissable text-center m-5" :class="alert.type">
      <button @click="alertStore.clear()" class="btn btn-link close">×</button>
      {{ alert.message }}
    </div>
  </div>
</template>

