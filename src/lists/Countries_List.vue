<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { storeToRefs } from 'pinia'
import { useCountriesStore } from '@/stores/countries.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { mdiMagnify } from '@mdi/js'
import { onMounted } from 'vue'
import ActionButton from '@/components/ActionButton.vue'

const countriesStore = useCountriesStore()
const { countries, loading, error } = storeToRefs(countriesStore)

onMounted(() => {
  countriesStore.getAll()
})

const alertStore = useAlertStore()
const { alert } = storeToRefs(alertStore)

const authStore = useAuthStore()
const {
  countries_per_page,
  countries_search,
  countries_sort_by,
  countries_page,
  isAdminOrSrLogist
} = storeToRefs(authStore)

function filterCodes(value, query, item) {
  if (!query) return true
  const q = query.toString().toUpperCase()
  const i = item.raw
  return (
    i.isoNumeric.toString().includes(q) ||
    i.isoAlpha2.toUpperCase().includes(q) ||
    i.nameEnOfficial.toUpperCase().includes(q) ||
    i.nameRuOfficial.toUpperCase().includes(q)
  )
}

async function updateCodes() {
  try {
    await countriesStore.update()
    await countriesStore.getAll()
  } catch (err) {
    alertStore.error(err)
  }
}

const headers = [
  { title: 'Код', key: 'isoNumeric', align: 'start', width: '80px' },
  { title: 'Обозначение', key: 'isoAlpha2', align: 'start', width: '80px' },
  { title: 'Русское название', key: 'nameRuOfficial', align: 'start' },
  { title: 'Английское название', key: 'nameEnOfficial', align: 'start' },
]
</script>

<template>
  <div class="settings table-2">
    <div class="header-with-actions">
      <h1 class="primary-heading">Cтраны</h1>
      <div class="header-actions" v-if="isAdminOrSrLogist">
        <div v-if="loading">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <ActionButton
          :item="{}"
          icon="fa-solid fa-file-import"
          tooltip-text="Обновить информацию о странах"
          iconSize="2x"
          :disabled="loading"
          @click="updateCodes"
        />
      </div>
    </div>

    <hr class="hr" />

    <div>
      <v-text-field
        v-model="countries_search"
        :append-inner-icon="mdiMagnify"
        label="Поиск по любой информации о стране"
        variant="solo"
        hide-details
        :disabled="loading"
      />
    </div>

    <v-card class="table-card">
      <v-data-table
        v-model:items-per-page="countries_per_page"
        items-per-page-text="Стран на странице"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="countries_page"
        :headers="headers"
        :items="countries"
        :search="authStore.countries_search"
        v-model:sort-by="countries_sort_by"
        :custom-filter="filterCodes"
        density="compact"
        class="elevation-1 interlaced-table"
        fixed-header
      />
      <div v-if="!countries?.length && !loading" class="text-center m-5">
        Список стран пуст
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
@import '@/assets/styles/scrollable-table.css';
</style>
