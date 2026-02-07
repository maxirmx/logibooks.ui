<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks UI application

import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useScanjobsStore } from '@/stores/scanjobs.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import PaginationFooter from '@/components/PaginationFooter.vue'
import { useDebouncedFilterSync } from '@/composables/useDebouncedFilterSync.js'

const props = defineProps({
  scanjobId: { type: Number, required: true }
})

const scanjobsStore = useScanjobsStore()
const authStore = useAuthStore()
const alertStore = useAlertStore()

const { scannedItems, scannedItemsLoading, scannedItemsError, scannedItemsTotalCount, scanjob } =
  storeToRefs(scanjobsStore)
const { alert } = storeToRefs(alertStore)
const {
  scanneditems_per_page,
  scanneditems_page,
  scanneditems_sort_by,
  scanneditems_id,
  scanneditems_code,
  scanneditems_scan_time_from,
  scanneditems_scan_time_to,
  scanneditems_user_name,
  scanneditems_number
} = storeToRefs(authStore)

const isInitializing = ref(true)
const isComponentMounted = ref(true)
const scanjobLoading = ref(true)

const localId = ref(scanneditems_id.value || '')
const localCode = ref(scanneditems_code.value || '')
const localScanTimeFrom = ref(scanneditems_scan_time_from.value || '')
const localScanTimeTo = ref(scanneditems_scan_time_to.value || '')
const localUserName = ref(scanneditems_user_name.value || '')
const localNumber = ref(scanneditems_number.value || '')

const maxPage = computed(() =>
  Math.max(1, Math.ceil((scannedItemsTotalCount.value || 0) / scanneditems_per_page.value))
)

const pageOptions = computed(() => {
  const mp = maxPage.value
  const current = scanneditems_page.value || 1
  if (mp <= 200) {
    return Array.from({ length: mp }, (_, i) => ({ value: i + 1, title: String(i + 1) }))
  }

  const set = new Set()
  for (let i = 1; i <= 10; i++) set.add(i)
  for (let i = Math.max(1, mp - 9); i <= mp; i++) set.add(i)
  for (let i = Math.max(1, current - 10); i <= Math.min(mp, current + 10); i++) set.add(i)

  return Array.from(set)
    .sort((a, b) => a - b)
    .map((n) => ({ value: n, title: String(n) }))
})

watch(maxPage, (v) => {
  if (scanneditems_page.value > v) scanneditems_page.value = v
})

const headers = computed(() => [
  { title: 'ID', key: 'id', align: 'start' },
  { title: 'Код', key: 'code', align: 'start' },
  { title: 'Время сканирования', key: 'scanTime', align: 'start' },
  { title: 'Пользователь', key: 'userName', align: 'start' },
  { title: 'Номер', key: 'number', align: 'start' }
])

const scanjobHeading = computed(() => {
  if (scanjobLoading.value) return 'Загрузка задания на сканирование...'
  if (scanjob.value?.name) return `Сканированные позиции: ${scanjob.value.name}`
  return 'Сканированные позиции'
})

function formatScanTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = date.getFullYear()
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`
}

async function loadScannedItems() {
  await scanjobsStore.getScannedItems(props.scanjobId)
}

const { triggerLoad, stop: stopFilterSync } = useDebouncedFilterSync({
  filters: [
    { local: localId, store: scanneditems_id },
    { local: localCode, store: scanneditems_code },
    { local: localScanTimeFrom, store: scanneditems_scan_time_from },
    { local: localScanTimeTo, store: scanneditems_scan_time_to },
    { local: localUserName, store: scanneditems_user_name },
    { local: localNumber, store: scanneditems_number }
  ],
  loadFn: loadScannedItems,
  isComponentMounted,
  debounceMs: 300
})

const watcherStop = watch(
  [scanneditems_page, scanneditems_per_page, scanneditems_sort_by],
  () => triggerLoad(),
  { immediate: false }
)

onMounted(async () => {
  try {
    const loaded = await scanjobsStore.getById(props.scanjobId)
    if (!loaded && isComponentMounted.value) {
      alertStore.error('Не удалось загрузить задание на сканирование')
    }
    if (isComponentMounted.value) scanjobLoading.value = false
    await loadScannedItems()
  } catch {
    if (isComponentMounted.value) {
      alertStore.error('Ошибка при загрузке данных')
    }
  } finally {
    if (isComponentMounted.value) {
      isInitializing.value = false
    }
  }
})

onUnmounted(() => {
  isComponentMounted.value = false
  stopFilterSync()
  if (watcherStop) {
    watcherStop()
  }
})
</script>

<template>
  <div class="settings table-3">
    <div class="header-with-actions">
      <h1 class="primary-heading">{{ scanjobHeading }}</h1>
      <div class="header-actions" v-if="scannedItemsLoading || isInitializing">
        <span class="spinner-border spinner-border-m"></span>
      </div>
    </div>

    <hr class="hr" />

    <div class="scanned-items-filters">
      <v-text-field
        v-model="localId"
        label="ID"
        variant="solo"
        hide-details
        :loading="scannedItemsLoading || isInitializing"
        :disabled="isInitializing"
      />
      <v-text-field
        v-model="localCode"
        label="Код"
        variant="solo"
        hide-details
        :loading="scannedItemsLoading || isInitializing"
        :disabled="isInitializing"
      />
      <v-text-field
        v-model="localScanTimeFrom"
        label="Сканирование с"
        type="date"
        variant="solo"
        hide-details
        :loading="scannedItemsLoading || isInitializing"
        :disabled="isInitializing"
      />
      <v-text-field
        v-model="localScanTimeTo"
        label="Сканирование по"
        type="date"
        variant="solo"
        hide-details
        :loading="scannedItemsLoading || isInitializing"
        :disabled="isInitializing"
      />
      <v-text-field
        v-model="localUserName"
        label="Пользователь"
        variant="solo"
        hide-details
        :loading="scannedItemsLoading || isInitializing"
        :disabled="isInitializing"
      />
      <v-text-field
        v-model="localNumber"
        label="Номер"
        variant="solo"
        hide-details
        :loading="scannedItemsLoading || isInitializing"
        :disabled="isInitializing"
      />
    </div>

    <v-card class="table-card">
      <v-data-table-server
        v-model:items-per-page="scanneditems_per_page"
        items-per-page-text="Позиций на странице"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="scanneditems_page"
        v-model:sort-by="scanneditems_sort_by"
        :headers="headers"
        :items="scannedItems"
        :items-length="scannedItemsTotalCount"
        :loading="scannedItemsLoading || isInitializing"
        density="compact"
        hide-default-footer
        class="elevation-1 interlaced-table"
      >
        <template #[`item.scanTime`]="{ item }">
          {{ formatScanTime(item.scanTime) }}
        </template>
      </v-data-table-server>

      <div class="v-data-table-footer">
        <PaginationFooter
          v-model:items-per-page="scanneditems_per_page"
          v-model:page="scanneditems_page"
          :items-per-page-options="itemsPerPageOptions"
          :page-options="pageOptions"
          :total-count="scannedItemsTotalCount"
          :max-page="maxPage"
        />
      </div>
    </v-card>

    <div v-if="scannedItemsError" class="text-center m-5">
      <div class="text-danger">Ошибка при загрузке сканированных позиций: {{ scannedItemsError }}</div>
    </div>

    <div v-if="alert" class="alert alert-dismissable text-center m-5" :class="alert.type">
      <button @click="alertStore.clear()" class="btn btn-link close">×</button>
      {{ alert.message }}
    </div>
  </div>
</template>

<style scoped>
.scanned-items-filters {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  margin-bottom: 16px;
}
</style>
