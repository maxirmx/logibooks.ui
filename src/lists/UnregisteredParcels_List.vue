<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useParcelStatusesStore } from '@/stores/parcel.statuses.store.js'
import { useUnregisteredParcelsStore } from '@/stores/unregistered.parcels.store.js'
import { useWarehousesStore } from '@/stores/warehouses.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import ActionButton from '@/components/ActionButton.vue'

const props = defineProps({
  registerId: { type: Number, required: true }
})
const emit = defineEmits(['close'])

const parcelStatusStore = useParcelStatusesStore()
const unregisteredParcelsStore = useUnregisteredParcelsStore()
const warehousesStore = useWarehousesStore()
const alertStore = useAlertStore()

const { items, loading, error } = storeToRefs(unregisteredParcelsStore)
const { ops } = storeToRefs(warehousesStore)


const headers = [
  { title: 'Сканированный код', key: 'scanCode', align: 'center', width: '120px' },
  { title: 'Зона', key: 'zone', align: 'center', width: '120px' },
  { title: 'Статус', key: 'statusId', align: 'center', width: '120px' }
]

async function loadItems() {
  const registerId = props.registerId

  if (!Number.isFinite(registerId) || !Number.isInteger(registerId) || registerId <= 0) {
    alertStore.error('Некорректный идентификатор реестра')
    return
  }

  try {
    await parcelStatusStore.ensureLoaded()
    await warehousesStore.ensureOpsLoaded()
    const rows = await unregisteredParcelsStore.getAll(registerId)

    if (!rows.length && unregisteredParcelsStore.error) {
      alertStore.error('Ошибка при загрузке незарегистрированных посылок')
    }
  } catch {
    alertStore.error('Ошибка при загрузке незарегистрированных посылок')
  }
}

onMounted(loadItems)

function closeList() {
  emit('close')
}
</script>

<template>
  <div class="settings table-3" data-testid="unregistered-parcels-list">
    <div class="header-with-actions">
      <h1 class="primary-heading">Незарегистрированные посылки</h1>
      <div class="header-actions header-actions-group">
        <ActionButton
          :item="{}"
          icon="fa-solid fa-xmark"
          tooltip-text="Закрыть"
          aria-label="Закрыть"
          iconSize="2x"
          @click="closeList"
        />
      </div>
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
      >
        <template #[`item.statusId`]="{ item }">
          {{ parcelStatusStore.getStatusTitle(item.statusId) }}
        </template>
        <template #[`item.zone`]="{ item }">
          {{ warehousesStore.getOpsLabel(ops.zones, item.zone) }}
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
