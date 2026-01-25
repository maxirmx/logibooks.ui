<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { watch, ref, computed, onMounted, onUnmounted } from 'vue'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { useParcelStatusesStore } from '@/stores/parcel.statuses.store.js'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useTransportationTypesStore } from '@/stores/transportation.types.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { buildParcelListHeading } from '@/helpers/register.heading.helpers.js'
import { formatWeight } from '@/helpers/number.formatters.js'
import { loadOrders } from '@/helpers/parcels.list.helpers.js'
import { wbr2RegisterColumnTitles } from '@/helpers/wbr2.register.mapping.js'
import RegisterHeadingWithStats from '@/components/RegisterHeadingWithStats.vue'
import PaginationFooter from '@/components/PaginationFooter.vue'
import { storeToRefs } from 'pinia'

const props = defineProps({
  registerId: { type: Number, required: true }
})

const parcelsStore = useParcelsStore()
const parcelStatusStore = useParcelStatusesStore()
const registersStore = useRegistersStore()
const transportationTypesStore = useTransportationTypesStore()
const authStore = useAuthStore()
const alertStore = useAlertStore()

const { alert } = storeToRefs(alertStore)
const { items, loading, error, totalCount } = storeToRefs(parcelsStore)
const { parcels_per_page, parcels_sort_by, parcels_page } = storeToRefs(authStore)

const registerLoading = ref(true)
const isInitializing = ref(true)
const isComponentMounted = ref(true)

const maxPage = computed(() => Math.max(1, Math.ceil((totalCount.value || 0) / parcels_per_page.value)))

const pageOptions = computed(() => {
  const mp = maxPage.value
  const current = parcels_page.value || 1
  if (mp <= 200) {
    return Array.from({ length: mp }, (_, i) => ({ value: i + 1, title: String(i + 1) }))
  }

  const set = new Set()
  for (let i = 1; i <= 10; i++) set.add(i)
  for (let i = Math.max(1, mp - 9); i <= mp; i++) set.add(i)
  for (let i = Math.max(1, current - 10); i <= Math.min(mp, current + 10); i++) set.add(i)

  return Array.from(set).sort((a, b) => a - b).map(n => ({ value: n, title: String(n) }))
})

watch(maxPage, (v) => {
  if (parcels_page.value > v) parcels_page.value = v
})

const headers = computed(() =>[
  { title: wbr2RegisterColumnTitles.id, key: 'id', align: 'start' },
  { title: wbr2RegisterColumnTitles.shk, key: 'shk', align: 'start' },
  { title: wbr2RegisterColumnTitles.stickerCode, key: 'stickerCode', align: 'start', sortable: false },
  { title: wbr2RegisterColumnTitles.boxNumber, key: 'boxNumber', align: 'start', sortable: false },
  { title: wbr2RegisterColumnTitles.wbSticker, key: 'wbSticker', align: 'start', sortable: false },
  { title: wbr2RegisterColumnTitles.sellerSticker, key: 'sellerSticker', align: 'start', sortable: false },
  { title: wbr2RegisterColumnTitles.weightKg, key: 'weightKg', align: 'start', sortable: false },
  { title: wbr2RegisterColumnTitles.quantity, key: 'quantity', align: 'start', sortable: false },
  { title: wbr2RegisterColumnTitles.statusId, key: 'statusId', align: 'start' },
  { title: 'Зона', key: 'zone', align: 'start' }
])

const registerHeading = computed(() => {
  if (registerLoading.value) return 'Загрузка реестра...'
  return buildParcelListHeading(registersStore.item, transportationTypesStore.getDocument)
})

async function fetchRegister() {
  if (!isComponentMounted.value) return
  try {
    await registersStore.getById(props.registerId)
  } finally {
    if (isComponentMounted.value) {
      registerLoading.value = false
    }
  }
}

async function loadOrdersWrapper() {
  await loadOrders(props.registerId, parcelsStore, isComponentMounted, alertStore)
}

const watcherStop = watch(
  [parcels_page, parcels_per_page, parcels_sort_by],
  () => loadOrdersWrapper(),
  { immediate: false }
)

onMounted(async () => {
  try {
    await transportationTypesStore.ensureLoaded()
    if (!isComponentMounted.value) return
 
    await parcelStatusStore.ensureLoaded()
    if (!isComponentMounted.value) return
 
    await fetchRegister()
    await loadOrdersWrapper()
  } catch (error) {
    if (isComponentMounted.value) {
      alertStore.error('Ошибка при инициализации компонента')
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
</script>

<template>
  <div class="settings table-3">
    <RegisterHeadingWithStats
      :register-id="props.registerId"
      :register="registersStore.item"
      :heading="registerHeading"
    />
    <hr class="hr" />

    <v-card class="table-card">
      <v-data-table-server
        v-model:items-per-page="parcels_per_page"
        items-per-page-text="Посылок на странице"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="parcels_page"
        v-model:sort-by="parcels_sort_by"
        :headers="headers"
        :items="items"
        :items-length="totalCount"
        :loading="loading || isInitializing"
        density="compact"
        hide-default-footer
        class="elevation-1 single-line-table interlaced-table wbr-parcels-table"
      >
        <template #[`item.weightKg`]="{ item }">
          <span class="numeric-panel">{{ formatWeight(item.weightKg) }}</span>
        </template>
        <template #[`item.statusId`]="{ item }">
          {{ parcelStatusStore.getStatusTitle(item.statusId) }}
        </template>
        <template #[`item.zone`]="{ item }">
          Зелёная зона
        </template>
      </v-data-table-server>

      <div class="v-data-table-footer">
        <PaginationFooter
          v-model:items-per-page="parcels_per_page"
          v-model:page="parcels_page"
          :items-per-page-options="itemsPerPageOptions"
          :page-options="pageOptions"
          :total-count="totalCount"
          :max-page="maxPage"
        />
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

<style scoped>
:deep(.numeric-panel) {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  width: 100%;
  text-align: right;
}
</style>
