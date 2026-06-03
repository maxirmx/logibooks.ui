<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { onMounted, unref } from 'vue'
import { storeToRefs } from 'pinia'
import { mdiMagnify } from '@mdi/js'
import { useExportFeesStore } from '@/stores/export.fees.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import ActionButton from '@/components/ActionButton.vue'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'

const ExportFeesStore = useExportFeesStore()
const authStore = useAuthStore()
const alertStore = useAlertStore()

const { duties, loading } = storeToRefs(ExportFeesStore)
const { alert } = storeToRefs(alertStore)
const {
  exportfees_per_page,
  exportfees_search,
  exportfees_sort_by,
  exportfees_page,
  isSrLogistPlus
} = storeToRefs(authStore)

onMounted(loadDuties)

async function loadDuties() {
  await ExportFeesStore.getAll()
  const storeError = unref(ExportFeesStore.error)
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
    if (typeof ExportFeesStore.update !== 'function') {
      alertStore.error('Обновите страницу перед загрузкой информации о пошлинах')
      return
    }
    await ExportFeesStore.update()
    const storeError = unref(ExportFeesStore.error)
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
  <div class="settings table-3" data-testid="export-fees-list">
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
        v-model="exportfees_search"
        :append-inner-icon="mdiMagnify"
        label="Поиск по записям"
        variant="solo"
        hide-details
        :disabled="loading"
      />
    </div>

    <v-card class="table-card">
      <v-data-table
        v-model:items-per-page="exportfees_per_page"
        items-per-page-text="Записей на странице"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="exportfees_page"
        :headers="headers"
        :items="duties"
        :search="authStore.exportfees_search"
        v-model:sort-by="exportfees_sort_by"
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
