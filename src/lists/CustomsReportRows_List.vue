<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useDecsStore } from '@/stores/decs.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import TruncateTooltipCell from '@/components/TruncateTooltipCell.vue'
import router from '@/router'

const props = defineProps({
  reportId: {
    type: Number,
    required: true
  }
})

const decsStore = useDecsStore()
const alertStore = useAlertStore()
const authStore = useAuthStore()

const { reportRows, loading, error } = storeToRefs(decsStore)
const { alert } = storeToRefs(alertStore)

onMounted(async () => {
  await decsStore.getReportRows(props.reportId)
})

const headers = [
  { title: '№ строки', key: 'rowNumber', align: 'center', width: '100px' },
  { title: 'Трек-номер', key: 'trackingNumber', align: 'center', class: 'col-text' },
  { title: 'Решение', key: 'decision', align: 'center', class: 'col-text' },
  { title: 'ТН ВЭД', key: 'tnVed', align: 'center' },
  { title: 'Процедура', key: 'customsProcedure', align: 'center' },
  { title: 'Статус', key: 'status', align: 'center', class: 'col-text' },
  { title: 'Ошибка', key: 'errorMessage', align: 'center', class: 'col-text' }
]

function goBack() {
  router.push('/customs-reports')
}
</script>

<template>
  <div class="settings table-3">
    <div class="header-with-actions">
      <h1 class="primary-heading">Строки отчёта №{{ reportId }}</h1>
      <div style="display:flex; align-items:center;">
        <div v-if="loading" class="header-actions header-actions-group">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <div class="header-actions header-actions-group">
          <button
            class="btn btn-secondary"
            @click="goBack"
            :disabled="loading"
          >
            <i class="fa-solid fa-arrow-left"></i> Назад к списку отчётов
          </button>
        </div>
      </div>
    </div>
    <hr class="hr" />

    <v-card class="table-card">
      <v-data-table
        v-model:items-per-page="authStore.customsreportrows_per_page"
        :items-per-page-options="itemsPerPageOptions"
        v-model:page="authStore.customsreportrows_page"
        v-model:sort-by="authStore.customsreportrows_sort_by"
        :headers="headers"
        :items="reportRows"
        :loading="loading"
        density="compact"
        class="elevation-1 interlaced-table"
        item-value="rowNumber"
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
                v-if="['trackingNumber', 'decision', 'status', 'errorMessage'].includes(col.key)"
                :text="item[col.key]"
              />

              <!-- Fallback for all other columns -->
              <template v-else>
                {{ item[col.key] }}
              </template>
            </td>
          </tr>
        </template>
      </v-data-table>
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

/* Minimal width for truncation columns */
.col-text {
  min-width: 140px;
}
</style>
