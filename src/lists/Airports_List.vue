<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { onMounted, ref } from 'vue'
import router from '@/router'
import { storeToRefs } from 'pinia'
import { useAirportsStore } from '@/stores/airports.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import ActionButton from '@/components/ActionButton.vue'
import { useConfirm } from 'vuetify-use-dialog'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { mdiMagnify } from '@mdi/js'

const airportsStore = useAirportsStore()
const authStore = useAuthStore()
const alertStore = useAlertStore()
const confirm = useConfirm()

const { airports, loading } = storeToRefs(airportsStore)
const { alert } = storeToRefs(alertStore)

const runningAction = ref(false)

function filterAirports(value, query, item) {
  if (query === null || item === null) {
    return false
  }
  const airport = item.raw
  if (airport === null) {
    return false
  }

  const q = query.toLocaleUpperCase()

  return [airport.name, airport.codeIata]
    .filter(Boolean)
    .some((field) => field.toLocaleUpperCase().includes(q))
}

const headers = [
  ...(authStore.isAdminOrSrLogist
    ? [{ title: '', align: 'center', key: 'actions', sortable: false, width: '120px' }]
    : []),
  { title: 'Название', key: 'name', sortable: true },
  { title: 'Код ИАТА', key: 'codeIata', sortable: true },
]

function openEditDialog(airport) {
  router.push(`/airport/edit/${airport.id}`)
}

function openCreateDialog() {
  router.push('/airport/create')
}

async function deleteAirport(airport) {
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
      content: `Удалить код аэропорта "${airport.name}"?`
    })

    if (confirmed) {
      try {
        await airportsStore.remove(airport.id)
      } catch (error) {
        if (error.message?.includes('409')) {
          alertStore.error('Нельзя удалить код аэропорта, у которого есть связанные записи')
        } else {
          alertStore.error('Ошибка при удалении кода аэропорта')
        }
      }
    }
  } finally {
    runningAction.value = false
  }
}

onMounted(async () => {
  await airportsStore.getAll()
})

defineExpose({
  openCreateDialog,
  openEditDialog,
  deleteAirport
})
</script>

<template>
  <div class="settings table-2">
    <div class="header-with-actions">
      <h1 class="primary-heading">Коды аэропортов</h1>
      <div class="header-actions" v-if="authStore.isAdminOrSrLogist">
        <div v-if="loading">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <ActionButton
          :item="{}"
          icon="fa-solid fa-plus"
          tooltip-text="Добавить код аэропорта"
          iconSize="2x"
          :disabled="loading"
          @click="openCreateDialog"
        />
      </div>
    </div>

    <hr class="hr" />

    <div>
      <v-text-field
        v-model="authStore.airports_search"
        :append-inner-icon="mdiMagnify"
        label="Поиск по любой информации об аэропорте"
        variant="solo"
        hide-details
        :disabled="runningAction || loading"
      />
    </div>

    <v-card class="table-card">
      <v-data-table
        v-model:items-per-page="authStore.airports_per_page"
        items-per-page-text="Кодов аэропортов на странице"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="authStore.airports_page"
        :headers="headers"
        :items="airports"
        :search="authStore.airports_search"
        v-model:sort-by="authStore.airports_sort_by"
        :custom-filter="filterAirports"
        :loading="loading"
        item-value="name"
        density="compact"
        class="elevation-1 interlaced-table"
        fixed-header
      >
        <template v-slot:[`item.actions`]="{ item }">
          <div v-if="authStore.isAdminOrSrLogist" class="actions-container">
            <ActionButton
              :item="item"
              icon="fa-solid fa-pen"
              tooltip-text="Редактировать код аэропорта"
              @click="openEditDialog"
              :disabled="runningAction || loading"
            />
            <ActionButton
              :item="item"
              icon="fa-solid fa-trash-can"
              tooltip-text="Удалить код аэропорта"
              @click="deleteAirport"
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
