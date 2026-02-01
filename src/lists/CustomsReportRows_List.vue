<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { onUnmounted, computed, watch, ref, toRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useCustomsReportsStore } from '@/stores/customsreports.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import TruncateTooltipCell from '@/components/TruncateTooltipCell.vue'
import ClickableCell from '@/components/ClickableCell.vue'
import PaginationFooter from '@/components/PaginationFooter.vue'
import { mdiMagnify } from '@mdi/js'
import router from '@/router'
import { useDebouncedFilterSync } from '@/composables/useDebouncedFilterSync.js'
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

const customsReportsStore = useCustomsReportsStore()
const alertStore = useAlertStore()
const authStore = useAuthStore()
const customsreportrows_search = toRef(authStore, 'customsreportrows_search')
const customsreportrows_page = toRef(authStore, 'customsreportrows_page')
const customsreportrows_per_page = toRef(authStore, 'customsreportrows_per_page')
const customsreportrows_sort_by = toRef(authStore, 'customsreportrows_sort_by')

const customsReportsRefs = storeToRefs(customsReportsStore)
const reportRows = customsReportsRefs.reportRows || ref([])
const loading = customsReportsRefs.loading || ref(false)
const error = customsReportsRefs.error || ref(null)
const totalCount = customsReportsRefs.totalCount || ref(0)
const localSearch = ref(customsreportrows_search.value || '')

const isComponentMounted = ref(true)

const headingLabel = computed(() => props.masterInvoice || `№${props.reportId}`)

const alertRefs = storeToRefs(alertStore)
const alert = alertRefs.alert || ref(null)

function isParcelRowClickable(item) {
  return item?.parcelId !== null && item?.registerId !== null
}

function openParcel(item) {
  const parcelId = item?.parcelId
  const registerId = item?.registerId
  if (!parcelId || !registerId) return
  router.push(`/registers/${registerId}/parcels/edit/${parcelId}`)
}

function getCellClass(columnKey) {
  return TRUNCATABLE_COLUMNS.includes(columnKey)
    ? 'truncated-cell clickable-cell'
    : 'clickable-cell'
}

async function loadReportRows() {
  await customsReportsStore.getReportRows(props.reportId)
}

const { triggerLoad, stop: stopFilterSync } = useDebouncedFilterSync({
  filters: [{ local: localSearch, store: customsreportrows_search }],
  loadFn: loadReportRows,
  isComponentMounted,
  debounceMs: 300
})

const watcherStop = watch(
  [customsreportrows_page, customsreportrows_per_page, customsreportrows_sort_by, () => props.reportId],
  () => {
    triggerLoad()
  },
  { immediate: false }
)

onUnmounted(() => {
  isComponentMounted.value = false
  stopFilterSync()
  if (watcherStop) {
    watcherStop()
  }
})

// Column keys that should use TruncateTooltipCell
const TRUNCATABLE_COLUMNS = []
const headers = [
  { title: 'Номер записи', key: 'id', align: 'start', width: '50px' },
  { title: 'Номер отправления', key: 'parcelNumber', align: 'start', width: '120px' },
  { title: 'Результат обработки', key: 'processingResult', align: 'start', width: '180px' },
  { title: 'ДТЭГ/ПТДЭГ', key: 'dTag', align: 'start', width: '120px' },
  { title: 'Код ТНВЭД', key: 'tnVed', align: 'start', width: '120px' },
  { title: 'Предшествующий ТНВЭД', key: 'prevTnVed', align: 'start', width: '120px' },
]

const maxPage = computed(() => Math.max(1, Math.ceil((totalCount.value || 0) / customsreportrows_per_page.value)))

const pageOptions = computed(() => {
  const mp = maxPage.value
  const current = customsreportrows_page.value || 1
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
        v-model:items-per-page="customsreportrows_per_page"
        :items-per-page-options="itemsPerPageOptions"
        v-model:page="customsreportrows_page"
        v-model:sort-by="customsreportrows_sort_by"
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
              <ClickableCell
                :item="item"
                :cell-class="getCellClass(col.key)"
                :disabled="!isParcelRowClickable(item)"
                @click="openParcel"
              >
                <!-- DTag column: two-line display with secondary muted line for rowNumber -->
                <template v-if="col.key === 'dTag'">
                  <div class="two-line-cell">
                    <div class="primary-line">{{ item.dTag }}</div>
                    <div class="secondary-line">Позиция {{ item.rowNumber }}</div>
                  </div>
                </template>

                <!-- Text columns with conditional truncation tooltip -->
                <TruncateTooltipCell
                  v-else-if="TRUNCATABLE_COLUMNS.includes(col.key)"
                  :text="item[col.key]"
                />

                <!-- Fallback for all other columns -->
                <template v-else>
                  {{ item[col.key] }}
                </template>
              </ClickableCell>
            </td>
          </tr>
        </template>
      </v-data-table-server>
      <div class="v-data-table-footer">
        <PaginationFooter
          v-model:items-per-page="customsreportrows_per_page"
          v-model:page="customsreportrows_page"
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

<style scoped>
.two-line-cell {
  display: flex;
  flex-direction: column;
}
.two-line-cell .primary-line {
  font-weight: 400;
}
.two-line-cell .secondary-line {
  font-size: 0.85em;
  color: #2a2c2d; /* muted gray */
}

/* Minimal width for truncation columns */
.col-text {
  min-width: 140px;
}

</style>
