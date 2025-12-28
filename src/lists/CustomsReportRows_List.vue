<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { onMounted, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useDecsStore } from '@/stores/decs.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import TruncateTooltipCell from '@/components/TruncateTooltipCell.vue'

const props = defineProps({
  reportId: {
    type: Number,
    required: true
  }
})

const decsStore = useDecsStore()
const alertStore = useAlertStore()
const authStore = useAuthStore()

const { reportRows, loading, error, totalCount } = storeToRefs(decsStore)
const { alert } = storeToRefs(alertStore)

onMounted(async () => {
  await decsStore.getReportRows(props.reportId)
})

// Watch pagination/sort changes and reload rows
watch([
  () => authStore.customsreportrows_page,
  () => authStore.customsreportrows_per_page,
  () => authStore.customsreportrows_sort_by
], async () => {
  await decsStore.getReportRows(props.reportId)
})

// Column keys that should use TruncateTooltipCell
const TRUNCATABLE_COLUMNS = []

const headers = [
  { title: 'Номер отправления', key: 'parcelNumber', align: 'start', width: '120px' },
  { title: 'ДТЭГ/ПТДЭГ', key: 'dTag', align: 'start', width: '120px' },
  { title: '№ п/п', key: 'rowNumber', align: 'start', width: '120px' },
  { title: 'Код ТНВЭД', key: 'tnVed', align: 'start', width: '120px' },
  { title: 'Результат обработки', key: 'processingResult', align: 'start', width: '280px' },
]

// Navigation handled by parent view; no local back action
</script>

<template>
  <div class="settings table-2">
    <div class="header-with-actions">
      <h1 class="primary-heading">Строки отчёта №{{ reportId }}</h1>
      <div style="display:flex; align-items:center;">
        <div v-if="loading" class="header-actions header-actions-group">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        
      </div>
    </div>
    <hr class="hr" />

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
        fixed-header
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
@import '@/assets/styles/scrollable-table.css';
</style>
