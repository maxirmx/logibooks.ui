<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import ActionButton from '@/components/ActionButton.vue'
import TruncateTooltipCell from '@/components/TruncateTooltipCell.vue'

const parcelsStore = useParcelsStore()
const authStore = useAuthStore()
const alertStore = useAlertStore()

const { items, loading, error } = storeToRefs(parcelsStore)
const { parcels_number } = storeToRefs(authStore)
const { alert } = storeToRefs(alertStore)

const runningAction = ref(false)

const headers = [
  { title: '№', key: 'id', align: 'center', width: '70px' },
  { title: 'Номер', key: 'number', align: 'center', class: 'col-text' },
  { title: '№ сделки', key: 'registerDealNumber', align: 'center', class: 'col-text' },
  { title: 'Товар', key: 'productName', align: 'center', class: 'col-text' },
  { title: 'ТН ВЭД', key: 'tnVed', align: 'center', class: 'col-text' },
  { title: 'ДТЭГ/ПТДЭГ', key: 'dTag', align: 'center', class: 'col-text' },
  { title: 'Комментарий ДТЭГ/ПТДЭГ', key: 'dTagComment', align: 'center', class: 'col-text' },
  { title: 'Предыдущий комментарий', key: 'previousDTagComment', align: 'center', class: 'col-text' }
]

const truncatedKeys = [
  'number',
  'registerDealNumber',
  'productName',
  'tnVed',
  'dTag',
  'dTagComment',
  'previousDTagComment'
]

function normalizedNumber() {
  return parcels_number.value?.trim() || ''
}

async function loadParcelsByNumber() {
  if (runningAction.value || loading.value) return
  const number = normalizedNumber()
  if (!number) {
    alertStore.error('Введите номер посылки')
    return
  }
  runningAction.value = true
  try {
    await parcelsStore.getByNumber(number)
  } catch (err) {
    const message = err?.response?.data?.message || err?.message || 'Ошибка при загрузке информации о посылках'
    alertStore.error(message)
  } finally {
    runningAction.value = false
  }
}

onMounted(async () => {
  if (normalizedNumber()) {
    await loadParcelsByNumber()
  }
})

defineExpose({
  loadParcelsByNumber
})
</script>

<template>
  <div class="settings table-2" data-testid="parcels-by-number-list">
    <div class="header-with-actions">
      <h1 class="primary-heading">Посылки по номеру</h1>
      <div style="display:flex; align-items:center;">
        <div v-if="runningAction || loading" class="header-actions header-actions-group">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <div class="header-actions header-actions-group">
          <ActionButton
            tooltip-text="Загрузить данные"
            iconSize="2x"
            icon="fa-solid fa-magnifying-glass"
            :item="null"
            :disabled="runningAction || loading"
            data-testid="parcels-by-number-search"
            @click="loadParcelsByNumber"
          />
        </div>
      </div>
    </div>

    <hr class="hr" />

    <div class="d-flex mb-2 align-center flex-wrap" style="gap: 10px;">
      <v-text-field
        v-model="parcels_number"
        label="Номер посылки"
        density="compact"
        style="min-width: 250px"
        :disabled="runningAction || loading"
        @keydown.enter="loadParcelsByNumber"
      />
    </div>

    <v-card class="table-card">
      <v-data-table
        :headers="headers"
        :items="items"
        :loading="loading"
        density="compact"
        class="elevation-1 interlaced-table"
        fixed-header
      >
        <template v-for="key in truncatedKeys" :key="key" #[`item.${key}`]="{ item }">
          <TruncateTooltipCell :text="item[key] || ''" />
        </template>
      </v-data-table>
      <div v-if="!items?.length && !loading" class="text-center m-5">
        Список посылок пуст
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
