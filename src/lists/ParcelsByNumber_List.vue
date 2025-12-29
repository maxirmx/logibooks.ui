<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useParcelsStore } from '@/stores/parcels.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { navigateToEditParcel } from '@/helpers/parcels.list.helpers.js'
import router from '@/router'
import ActionButton from '@/components/ActionButton.vue'
import TruncateTooltipCell from '@/components/TruncateTooltipCell.vue'
import ClickableCell from '@/components/ClickableCell.vue'

const parcelsStore = useParcelsStore()
const authStore = useAuthStore()
const alertStore = useAlertStore()

const { items_bn, loading, error } = storeToRefs(parcelsStore)
const { alert } = storeToRefs(alertStore)
const { parcels_number } = storeToRefs(authStore)

const runningAction = ref(false)

const headers = [
  { title: '№', key: 'id', align: 'center', width: '170px' },
  { title: 'Номер', key: 'number', align: 'center', width: '170px' },
  { title: 'Сделка', key: 'registerDealNumber', align: 'center', width: '170px' },
  { title: 'Описание', key: 'productName', align: 'center', minWidth: '300px' },
  { title: 'Код ТН ВЭД', key: 'tnVed', align: 'center', width: '170px' },
  { title: 'ДТЭГ/ПТДЭГ', key: 'dTag', align: 'center', width: '170px' },
  { title: 'Комментарий', key: 'dTagComment', align: 'center', width: '170px' },
  { title: 'Предшествующий ДТЭГ/ПТДЭГ', key: 'previousDTagComment', align: 'center', width: '170px' }
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

const clickableColumns = [
  { key: 'id', useTruncate: false },
  ...truncatedKeys.map((key) => ({ key, useTruncate: true }))
]

function getRegisterId(item) {
  return item?.registerId
}

function openRegister(item) {
  const registerId = getRegisterId(item)
  if (!registerId) return
  router.push(`/register/edit/${registerId}`)
}

function openParcel(item) {
  const registerId = getRegisterId(item)
  if (!registerId || !item?.id) return
  navigateToEditParcel(router, item, 'Редактирование посылки', { registerId })
}

function handleCellClick(item, key) {
  if (key === 'registerDealNumber') {
    openRegister(item)
  } else {
    openParcel(item)
  }
}
}

function getCellClass(useTruncate) {
  return useTruncate ? 'truncated-cell clickable-cell' : 'clickable-cell'
}

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
  <div class="settings table-3" data-testid="parcels-by-number-list">
    <div class="header-with-actions">
      <h1 class="primary-heading">Поиск посылки по номеру</h1>
      <div class="header-actions-row">
        <div v-if="runningAction || loading" class="header-actions header-actions-group">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <div class="header-actions header-actions-group">
          <v-text-field
            v-model="authStore.parcels_number"
            density="compact"
            class="parcels-number-input"
            label="Номер посылки"
            variant="outlined"
            hide-details
            :disabled="runningAction || loading"
            @keydown.enter="loadParcelsByNumber"
          />
          <ActionButton
            tooltip-text="Найти"
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

    <v-card class="table-card">
      <v-data-table
        v-model:items-per-page="authStore.parcels_per_page"
        v-model:page="authStore.parcels_page"
        :headers="headers"
        :items="items_bn"
        v-model:sort-by="authStore.parcels_sort_by"
        :loading="loading"
        density="compact"
        class="elevation-1 interlaced-table"
        fixed-header
      >
        <template v-for="column in clickableColumns" :key="column.key" #[`item.${column.key}`]="{ item }">
          <ClickableCell
            :item="item"
            :display-value="column.useTruncate ? '' : item[column.key]"
            :cell-class="getCellClass(column.useTruncate)"
            :data-testid="`parcels-by-number-cell-${column.key}-${item.id}`"
            @click="() => handleCellClick(item, column.key)"
          >
            <template v-if="column.useTruncate">
              <TruncateTooltipCell :text="item[column.key] || ''" />
            </template>
          </ClickableCell>
        </template>
      </v-data-table>
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

.header-actions-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.parcels-number-input {
  min-width: 250px;
}

</style>
