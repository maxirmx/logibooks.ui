<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { mdiMagnify } from '@mdi/js'
import { useExportDutiesStore } from '@/stores/export.duties.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'

const exportDutiesStore = useExportDutiesStore()
const authStore = useAuthStore()

const { duties, loading, error } = storeToRefs(exportDutiesStore)
const {
  exportduties_per_page,
  exportduties_search,
  exportduties_sort_by,
  exportduties_page
} = storeToRefs(authStore)

onMounted(() => {
  exportDutiesStore.getAll()
})

function filterDuties(value, query, item) {
  if (!query) return true
  const q = query.toString().toUpperCase()
  const i = item.raw

  return (
    i.id?.toString().includes(q) ||
    i.code?.toString().toUpperCase().includes(q) ||
    (i.description || '').toUpperCase().includes(q) ||
    i.duty?.toString().includes(q)
  )
}

const headers = [
  { title: 'Код ТН ВЭД', key: 'code', align: 'start' },
  { title: 'Описание', key: 'description', align: 'start' },
  { title: 'Пошлина', key: 'duty', align: 'end' }
]
</script>

<template>
  <div class="settings table-2" data-testid="export-duties-list">
    <div class="header-with-actions">
      <h1 class="primary-heading">Пошлины</h1>
      <div class="header-actions-bar">
        <div v-if="loading" class="header-actions header-actions-group">
          <span class="spinner-border spinner-border-m"></span>
        </div>
      </div>
    </div>

    <hr class="hr" />

    <div>
      <v-text-field
        v-model="exportduties_search"
        :append-inner-icon="mdiMagnify"
        label="Поиск по записям"
        variant="solo"
        hide-details
        :disabled="loading"
      />
    </div>

    <v-card class="table-card">
      <v-data-table
        v-model:items-per-page="exportduties_per_page"
        items-per-page-text="Записей на странице"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="exportduties_page"
        :headers="headers"
        :items="duties"
        :search="authStore.exportduties_search"
        v-model:sort-by="exportduties_sort_by"
        :custom-filter="filterDuties"
        density="compact"
        class="elevation-1 interlaced-table"
        fixed-header
      >
        <template #[`item.description`]="{ item }">
          {{ item.description || '-' }}
        </template>
      </v-data-table>
    </v-card>
    <div v-if="error" class="text-center m-5">
      <div class="text-danger">Ошибка при загрузке информации: {{ error }}</div>
    </div>
  </div>
</template>

<style scoped>
@import '@/assets/styles/scrollable-table.css';
</style>
