<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { onMounted, unref } from 'vue'
import { storeToRefs } from 'pinia'
import { mdiMagnify } from '@mdi/js'
import { useExportDutiesStore } from '@/stores/export.duties.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import ActionButton from '@/components/ActionButton.vue'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'

const exportDutiesStore = useExportDutiesStore()
const authStore = useAuthStore()
const alertStore = useAlertStore()

const { duties, loading } = storeToRefs(exportDutiesStore)
const { alert } = storeToRefs(alertStore)
const {
  exportduties_per_page,
  exportduties_search,
  exportduties_sort_by,
  exportduties_page,
  isSrLogistPlus
} = storeToRefs(authStore)

onMounted(loadDuties)

async function loadDuties() {
  await exportDutiesStore.getAll()
  const storeError = unref(exportDutiesStore.error)
  if (storeError) {
    alertStore.error(storeError instanceof Error ? storeError.message : String(storeError))
  }
}

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

function compareDutyCodesAsStrings(a, b) {
  return (a ?? '').toString().localeCompare((b ?? '').toString())
}

async function updateDuties() {
  try {
    if (typeof exportDutiesStore.update !== 'function') {
      alertStore.error('Обновите страницу перед загрузкой информации о пошлинах')
      return
    }
    await exportDutiesStore.update()
    const storeError = unref(exportDutiesStore.error)
    if (storeError) {
      alertStore.error(storeError instanceof Error ? storeError.message : String(storeError))
      return
    }
    await loadDuties()
  } catch (err) {
    alertStore.error(err instanceof Error ? err.message : String(err))
  }
}

const headers = [
  { title: 'Префикс кода ТН ВЭД', key: 'code', align: 'start', width: '250px' },
  { title: 'Описание', key: 'description', align: 'start' },
  { title: 'Пошлина, руб.', key: 'duty', align: 'end', width: '200px' }
]

const customKeySort = {
  code: compareDutyCodesAsStrings
}
</script>

<template>
  <div class="settings table-3" data-testid="export-duties-list">
    <div class="header-with-actions">
      <h1 class="primary-heading">Пошлины</h1>
      <div class="header-actions-bar">
        <div v-if="loading" class="header-actions header-actions-group">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <div class="header-actions header-actions-group" v-if="isSrLogistPlus">
          <ActionButton
            :item="{}"
            icon="fa-solid fa-file-import"
            tooltip-text="Обновить информацию о пошлинах"
            iconSize="2x"
            :disabled="loading"
            @click="updateDuties"
          />
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
        :custom-key-sort="customKeySort"
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
    <div v-if="alert" class="alert alert-dismissable mt-3 mb-0" :class="alert.type">
      <button @click="alertStore.clear()" class="btn btn-link close">×</button>
      {{ alert.message }}
    </div>
  </div>
</template>

<style scoped>
@import '@/assets/styles/scrollable-table.css';
</style>
