<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { onUnmounted, computed, watch, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useDecsStore } from '@/stores/decs.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import TruncateTooltipCell from '@/components/TruncateTooltipCell.vue'
import PaginationFooter from '@/components/PaginationFooter.vue'
import { mdiMagnify } from '@mdi/js'
const props = defineProps({
  reportId: {
    type: Number,
    required: true
  },
  masterInvoice: {
    type: String,
    default: ''
  }
})

const decsStore = useDecsStore()
const alertStore = useAlertStore()
const authStore = useAuthStore()

const decsRefs = storeToRefs(decsStore)
const reportRows = decsRefs.reportRows || ref([])
const loading = decsRefs.loading || ref(false)
const error = decsRefs.error || ref(null)
const totalCount = decsRefs.totalCount || ref(0)
const localSearch = ref(authStore.customsreportrows_search || '')

const isComponentMounted = ref(true)
const isLoadingRows = ref(false)
const hasPendingReload = ref(false)
let loadRowsTimeout = null
let pendingDebounceDelay = 0
const watcherStops = []
let isSearchWatcherInitialized = false

const headingLabel = computed(() => props.masterInvoice || `№${props.reportId}`)

const alertRefs = storeToRefs(alertStore)
const alert = alertRefs.alert || ref(null)

function triggerLoadReportRows({ debounceMs = 0, syncSearch = false } = {}) {
  if (!isComponentMounted.value) return

  if (syncSearch) {
    authStore.customsreportrows_search = localSearch.value
  }

  if (loadRowsTimeout) {
    clearTimeout(loadRowsTimeout)
    loadRowsTimeout = null
  }

  if (isLoadingRows.value) {
    hasPendingReload.value = true
    pendingDebounceDelay = debounceMs
    return
  }

  if (debounceMs > 0) {
    pendingDebounceDelay = 0
    loadRowsTimeout = setTimeout(() => {
      loadRowsTimeout = null
      triggerLoadReportRows()
    }, debounceMs)
    return
  }

  pendingDebounceDelay = 0
  loadReportRows()
}

watcherStops.push(
  watch(
    localSearch,
    (newValue, oldValue) => {
      if (isSearchWatcherInitialized && newValue === oldValue) {
        return
      }

      const debounceMs = isSearchWatcherInitialized ? 300 : 0
      triggerLoadReportRows({ debounceMs, syncSearch: true })
      isSearchWatcherInitialized = true
    },
    { immediate: true }
  )
)

watcherStops.push(
  watch([
    () => authStore.customsreportrows_page,
    () => authStore.customsreportrows_per_page,
    () => authStore.customsreportrows_sort_by,
    () => props.reportId
  ], () => {
    triggerLoadReportRows()
  })
)

onUnmounted(() => {
  isComponentMounted.value = false
  watcherStops.forEach((stop) => stop())
  if (loadRowsTimeout) {
    clearTimeout(loadRowsTimeout)
    loadRowsTimeout = null
  }
})

async function loadReportRows() {
  if (!isComponentMounted.value || isLoadingRows.value) return

  isLoadingRows.value = true
  try {
    hasPendingReload.value = false
    await decsStore.getReportRows(props.reportId)
  } finally {
    if (isComponentMounted.value) {
      isLoadingRows.value = false

      if (hasPendingReload.value) {
        hasPendingReload.value = false
        const delay = pendingDebounceDelay
        pendingDebounceDelay = 0
        triggerLoadReportRows({ debounceMs: delay })
      }
    }
  }
}

// Column keys that should use TruncateTooltipCell
const TRUNCATABLE_COLUMNS = []
const headers = [
  { title: 'Номер записи', key: 'id', align: 'start', width: '50px' },
  { title: 'ДТЭГ/ПТДЭГ', key: 'dTag', align: 'start', width: '120px' },
  { title: 'П/п ДТЭГ/ПТДЭГ', key: 'rowNumber', align: 'start', width: '120px' },
  { title: 'Номер отправления', key: 'parcelNumber', align: 'start', width: '120px' },
  { title: 'Код ТНВЭД', key: 'tnVed', align: 'start', width: '120px' },
  { title: 'Результат обработки', key: 'processingResult', align: 'start', width: '280px' },
]

const maxPage = computed(() => Math.max(1, Math.ceil((totalCount.value || 0) / authStore.customsreportrows_per_page)))

const pageOptions = computed(() => {
  const mp = maxPage.value
  const current = authStore.customsreportrows_page || 1
  if (mp <= 200) {
    return Array.from({ length: mp }, (_, i) => ({ value: i + 1, title: String(i + 1) }))
  }

  const set = new Set()
  for (let i = 1; i <= 10; i++) set.add(i)
  for (let i = Math.max(1, mp - 9); i <= mp; i++) set.add(i)
  for (let i = Math.max(1, current - 10); i <= Math.min(mp, current + 10); i++) set.add(i)

  return Array.from(set).sort((a, b) => a - b).map(n => ({ value: n, title: String(n) }))
})

// Navigation handled by parent view; no local back action
</script>

<template>
  <div class="settings table-3">
    <div class="header-with-actions">
      <h1 class="primary-heading">Отчёт о выпуске для {{ headingLabel }}</h1>
      <div style="display:flex; align-items:center;">
        <div v-if="loading" class="header-actions header-actions-group">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        
      </div>
    </div>
    <hr class="hr" />

    <div class="mb-4">
      <v-text-field
        v-model="localSearch"
        :append-inner-icon="mdiMagnify"
        label="Поиск по отчёту"
        variant="solo"
        hide-details
        :loading="loading"
      />
    </div>

    <v-card class="table-card">
      <v-data-table-server
        v-model:items-per-page="authStore.customsreportrows_per_page"
        :items-per-page-options="itemsPerPageOptions"
        v-model:page="authStore.customsreportrows_page"
        v-model:sort-by="authStore.customsreportrows_sort_by"
        :headers="headers"
        :items="reportRows"
        :items-length="totalCount"
        :loading="loading"
        density="compact"
        class="elevation-1 interlaced-table"
        item-value="id"
        hide-default-footer
      >
        <!-- Row-level slot -->
        <template #item="{ item, columns }">
          <tr>
            <td
              v-for="col in columns"
              :key="col.key"
              :class="[
                col.class,
                col.align === 'center' ? 'text-center' : col.align === 'end' ? 'text-right' : 'text-start'
              ]"
              :data-column-key="col.key"
            >
              <!-- Text columns with conditional truncation tooltip -->
              <TruncateTooltipCell
                v-if="TRUNCATABLE_COLUMNS.includes(col.key)"
                :text="item[col.key]"
              />

              <!-- Fallback for all other columns -->
              <template v-else>
                {{ item[col.key] }}
              </template>
            </td>
          </tr>
        </template>
      </v-data-table-server>
      <div class="v-data-table-footer">
        <PaginationFooter
          v-model:items-per-page="authStore.customsreportrows_per_page"
          v-model:page="authStore.customsreportrows_page"
          :items-per-page-options="itemsPerPageOptions"
          :page-options="pageOptions"
          :total-count="totalCount"
          :max-page="maxPage"
        />
      </div>
    </v-card>

    <div v-if="error" class="text-center m-5">
      <div class="text-danger">Ошибка при загрузке информации: {{ error }}</div>
    </div>
    <div v-if="alert" class="alert alert-dismissable mt-3 mb-0" :class="alert.type">
      <button @click="alertStore.clear()" class="btn btn-link close">×</button>
      {{ alert.message }}
    </div>
  </div>
</template>
