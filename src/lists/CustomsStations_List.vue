<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { mdiMagnify } from '@mdi/js'
import { useConfirm } from 'vuetify-use-dialog'
import router from '@/router'
import ActionButton from '@/components/ActionButton.vue'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useCountriesStore } from '@/stores/countries.store.js'
import { useCustomsStationsStore } from '@/stores/customs.stations.store.js'

const customsStationsStore = useCustomsStationsStore()
const countriesStore = useCountriesStore()
const authStore = useAuthStore()
const alertStore = useAlertStore()
const confirm = useConfirm()

const { customsStations, loading } = storeToRefs(customsStationsStore)
const { alert } = storeToRefs(alertStore)
countriesStore.ensureLoaded()
const runningAction = ref(false)

function filterCustomsStations(value, query, item) {
  if (query === null || item === null || item.raw === null) {
    return false
  }

  const station = item.raw
  const search = query.toLocaleUpperCase()
  const fields = [
    station.number,
    station.name,
    station.postalCode,
    station.city,
    station.street,
    countriesStore.getCountryShortName(station.countryIsoNumeric)
  ]

  return fields
    .filter((field) => field !== null && field !== undefined)
    .some((field) => String(field).toLocaleUpperCase().includes(search))
}

const headers = [
  ...(authStore.isSrLogistPlus
    ? [{ title: '', align: 'center', key: 'actions', sortable: false, width: '120px' }]
    : []),
  { title: 'Код поста', key: 'number', sortable: true },
  { title: 'Название', key: 'name', sortable: true },
  { title: 'Страна', key: 'countryIsoNumeric', sortable: true },
  { title: 'Город', key: 'city', sortable: true }
]

function openCreateDialog() {
  router.push('/customsstation/create')
}

function openEditDialog(station) {
  router.push(`/customsstation/edit/${station.id}`)
}

async function deleteCustomsStation(station) {
  if (runningAction.value) return
  runningAction.value = true

  try {
    const confirmed = await confirm({
      title: 'Подтверждение',
      confirmationText: 'Удалить',
      cancellationText: 'Не удалять',
      dialogProps: {
        width: '30%',
        minWidth: '250px'
      },
      confirmationButtonProps: {
        color: 'orange-darken-3'
      },
      content: `Удалить таможенный пост "${station.name}"?`
    })

    if (confirmed) {
      try {
        await customsStationsStore.remove(station.id)
      } catch {
        alertStore.error('Ошибка при удалении таможенного поста')
      }
    }
  } finally {
    runningAction.value = false
  }
}

onMounted(async () => {
  await customsStationsStore.getAll()
})

defineExpose({
  filterCustomsStations,
  openCreateDialog,
  openEditDialog,
  deleteCustomsStation
})
</script>

<template>
  <div class="settings table-2">
    <div class="header-with-actions">
      <h1 class="primary-heading">Таможенные посты</h1>
      <div class="header-actions-bar" v-if="authStore.isSrLogistPlus">
        <div v-if="runningAction || loading" class="header-actions header-actions-group">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <div class="header-actions header-actions-group">
          <ActionButton
            :item="{}"
            icon="fa-solid fa-plus"
            tooltip-text="Зарегистрировать таможенный пост"
            iconSize="2x"
            :disabled="runningAction || loading"
            @click="openCreateDialog"
          />
        </div>
      </div>
    </div>

    <hr class="hr" />

    <div>
      <v-text-field
        v-model="authStore.customsstations_search"
        :append-inner-icon="mdiMagnify"
        label="Поиск по любой информации о таможенном посте"
        variant="solo"
        hide-details
        :disabled="runningAction || loading"
      />
    </div>

    <v-card class="table-card">
      <v-data-table
        v-model:items-per-page="authStore.customsstations_per_page"
        items-per-page-text="Таможенных постов на странице"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="authStore.customsstations_page"
        :headers="headers"
        :items="customsStations"
        :search="authStore.customsstations_search"
        v-model:sort-by="authStore.customsstations_sort_by"
        :custom-filter="filterCustomsStations"
        :loading="loading"
        item-value="id"
        density="compact"
        class="elevation-1 interlaced-table"
        fixed-header
      >
        <template v-slot:[`item.countryIsoNumeric`]="{ item }">
          {{ countriesStore.getCountryShortName(item.countryIsoNumeric) }}
        </template>

        <template v-slot:[`item.actions`]="{ item }">
          <div v-if="authStore.isSrLogistPlus" class="actions-container">
            <ActionButton
              :item="item"
              icon="fa-solid fa-pen"
              tooltip-text="Редактировать таможенный пост"
              @click="openEditDialog"
              :disabled="runningAction || loading"
            />
            <ActionButton
              :item="item"
              icon="fa-solid fa-trash-can"
              tooltip-text="Удалить таможенный пост"
              @click="deleteCustomsStation"
              :disabled="runningAction || loading"
            />
          </div>
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
