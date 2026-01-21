<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { onMounted, ref } from 'vue'
import router from '@/router'
import { storeToRefs } from 'pinia'
import { useWarehousesStore } from '@/stores/warehouses.store.js'
import ActionButton from '@/components/ActionButton.vue'
import { useCountriesStore } from '@/stores/countries.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useConfirm } from 'vuetify-use-dialog'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { mdiMagnify } from '@mdi/js'

const warehousesStore = useWarehousesStore()
const countriesStore = useCountriesStore()
const authStore = useAuthStore()
const alertStore = useAlertStore()
const confirm = useConfirm()

const { warehouses, loading } = storeToRefs(warehousesStore)
countriesStore.ensureLoaded()
const { alert } = storeToRefs(alertStore)
const runningAction = ref(false)

const warehouseTypeOptions = [
  { value: 0, label: 'Склад временного хранения' },
  { value: 1, label: 'Сортировочный склад' }
]

function getTypeLabel(type) {
  const match = warehouseTypeOptions.find(option => option.value === Number(type))
  return match ? match.label : type
}

function filterWarehouses(value, query, item) {
  if (query === null || item === null) {
    return false
  }
  const warehouse = item.raw
  if (warehouse === null) {
    return false
  }
  const q = query.toLocaleUpperCase()

  if (
    warehouse.name?.toLocaleUpperCase().includes(q) ||
    warehouse.postalCode?.toLocaleUpperCase().includes(q) ||
    warehouse.city?.toLocaleUpperCase().includes(q) ||
    warehouse.street?.toLocaleUpperCase().includes(q) ||
    getTypeLabel(warehouse.type)?.toLocaleUpperCase().includes(q)
  ) {
    return true
  }

  const countryName = countriesStore.getCountryShortName(warehouse.countryIsoNumeric)
  if (countryName?.toLocaleUpperCase().includes(q)) {
    return true
  }
  return false
}

const headers = [
  ...(authStore.isSrLogistPlus ? [{ title: '', align: 'center', key: 'actions', sortable: false, width: '120px' }] : []),
  { title: 'Название', key: 'name', sortable: false },
  { title: 'Страна', key: 'countryIsoNumeric', sortable: true },
  { title: 'Город', key: 'city', sortable: true },
  { title: 'Тип склада', key: 'type', sortable: true }
]

function openEditDialog(warehouse) {
  router.push('/warehouse/edit/' + warehouse.id)
}

function openCreateDialog() {
  router.push('/warehouse/create')
}

async function deleteWarehouse(warehouse) {
  if (runningAction.value) return
  runningAction.value = true
  try {
    const content = 'Удалить склад "' + warehouse.name + '" ?'
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
      content: content
    })

    if (confirmed) {
      try {
        await warehousesStore.remove(warehouse.id)
      } catch (error) {
        if (error.message?.includes('409')) {
          alertStore.error('Нельзя удалить информацию о складе, у которого есть связанные записи')
        } else {
          alertStore.error('Ошибка при удалении информации о складе')
        }
      }
    }
  } finally {
    runningAction.value = false
  }
}

onMounted(async () => {
  await warehousesStore.getAll()
})

defineExpose({
  openCreateDialog,
  openEditDialog,
  deleteWarehouse,
  getTypeLabel
})
</script>

<template>
  <div class="settings table-2">
    <div class="header-with-actions">
      <h1 class="primary-heading">Склады</h1>
      <div style="display:flex; align-items:center;" v-if="authStore.isSrLogistPlus">
        <div v-if="runningAction || loading" class="header-actions header-actions-group">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <div class="header-actions header-actions-group">
          <ActionButton
            :item="{}"
            icon="fa-solid fa-plus"
            tooltip-text="Зарегистрировать склад"
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
        v-model="authStore.warehouses_search"
        :append-inner-icon="mdiMagnify"
        label="Поиск по любой информации о складе"
        variant="solo"
        hide-details
        :disabled="runningAction || loading"
      />
    </div>

    <v-card class="table-card">
      <v-data-table
        v-model:items-per-page="authStore.warehouses_per_page"
        items-per-page-text="Складов на странице"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="authStore.warehouses_page"
        :headers="headers"
        :items="warehouses"
        :search="authStore.warehouses_search"
        v-model:sort-by="authStore.warehouses_sort_by"
        :custom-filter="filterWarehouses"
        :loading="loading"
        item-value="name"
        density="compact"
        class="elevation-1 interlaced-table"
        fixed-header
      >
        <template v-slot:[`item.countryIsoNumeric`]="{ item }">
          {{ countriesStore.getCountryShortName(item.countryIsoNumeric) }}
        </template>

        <template v-slot:[`item.type`]="{ item }">
          {{ getTypeLabel(item.type) }}
        </template>

        <template v-slot:[`item.actions`]="{ item }">
          <div v-if="authStore.isSrLogistPlus" class="actions-container">
            <ActionButton
              :item="item"
              icon="fa-solid fa-pen"
              tooltip-text="Редактировать информацию о складе"
              @click="openEditDialog"
              :disabled="runningAction || loading"
            />
            <ActionButton
              :item="item"
              icon="fa-solid fa-trash-can"
              tooltip-text="Удалить информацию о складе"
              @click="deleteWarehouse"
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
