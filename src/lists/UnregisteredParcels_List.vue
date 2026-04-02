<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useUnregisteredParcelsStore } from '@/stores/unregistered.parcels.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'

const props = defineProps({
  registerId: { type: Number, required: true }
})

const unregisteredParcelsStore = useUnregisteredParcelsStore()
const alertStore = useAlertStore()

const { items, loading, error } = storeToRefs(unregisteredParcelsStore)

const headers = [
  { title: 'ID', key: 'id', align: 'center', width: '120px' },
  { title: 'Реестр', key: 'registerId', align: 'center', width: '120px' },
  { title: 'Статус', key: 'statusId', align: 'center', width: '120px' },
  { title: 'Зона', key: 'zone', align: 'center', width: '120px' }
]

async function loadItems() {
  const registerId = props.registerId

  if (!Number.isFinite(registerId) || !Number.isInteger(registerId) || registerId <= 0) {
    alertStore.error('Некорректный идентификатор реестра')
    return
  }

  const rows = await unregisteredParcelsStore.getAll(registerId)
  if (!rows.length && unregisteredParcelsStore.error) {
    alertStore.error('Ошибка при загрузке незарегистрированных посылок')
  }
}

onMounted(loadItems)
</script>

<template>
  <div class="settings table-3" data-testid="unregistered-parcels-list">
    <div class="header-with-actions">
      <h1 class="primary-heading">Незарегистрированные посылки</h1>
    </div>

    <hr class="hr" />

    <v-card class="table-card">
      <v-data-table
        :headers="headers"
        :items="items"
        :loading="loading"
        items-per-page-text="Записей на странице"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        density="compact"
        class="elevation-1 interlaced-table"
        fixed-header
      />
    </v-card>

    <div v-if="error" class="text-center m-5">
      <div class="text-danger">Ошибка при загрузке информации: {{ error }}</div>
    </div>
  </div>
</template>

<style scoped>
@import '@/assets/styles/scrollable-table.css';
</style>
