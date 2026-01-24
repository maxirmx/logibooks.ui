<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { onMounted, ref } from 'vue'
import router from '@/router'
import { storeToRefs } from 'pinia'
import { useScanJobsStore } from '@/stores/scanjobs.store.js'
import { useWarehousesStore } from '@/stores/warehouses.store.js'
import ActionButton from '@/components/ActionButton.vue'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useConfirm } from 'vuetify-use-dialog'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { mdiMagnify } from '@mdi/js'

const scanJobsStore = useScanJobsStore()
const warehousesStore = useWarehousesStore()
const authStore = useAuthStore()
const alertStore = useAlertStore()
const confirm = useConfirm()

const { scanjobs, loading, ops } = storeToRefs(scanJobsStore)
const { warehouses } = storeToRefs(warehousesStore)
const { alert } = storeToRefs(alertStore)
const runningAction = ref(false)

function getOpsLabel(list, value) {
  const num = Number(value)
  const match = list?.find((item) => Number(item.value) === num)
  return match ? match.name : value
}

function getWarehouseName(warehouseId) {
  const num = Number(warehouseId)
  const match = warehouses.value.find((warehouse) => warehouse.id === num)
  return match ? match.name : warehouseId
}

function filterScanJobs(value, query, item) {
  if (query === null || item === null) {
    return false
  }
  const scanJob = item.raw
  if (scanJob === null) {
    return false
  }
  const q = query.toLocaleUpperCase()

  if (
    scanJob.name?.toLocaleUpperCase().includes(q) ||
    getOpsLabel(ops.value?.types, scanJob.type)?.toLocaleUpperCase().includes(q) ||
    getOpsLabel(ops.value?.operations, scanJob.operation)?.toLocaleUpperCase().includes(q) ||
    getOpsLabel(ops.value?.modes, scanJob.mode)?.toLocaleUpperCase().includes(q) ||
    getOpsLabel(ops.value?.statuses, scanJob.status)?.toLocaleUpperCase().includes(q) ||
    getWarehouseName(scanJob.warehouseId)?.toLocaleUpperCase().includes(q)
  ) {
    return true
  }

  return false
}

const headers = [
  ...(authStore.isSrLogistPlus ? [{ title: '', align: 'center', key: 'actions', sortable: false, width: '120px' }] : []),
  { title: 'Название', key: 'name', sortable: true },
  { title: 'Тип', key: 'type', sortable: true },
  { title: 'Операция', key: 'operation', sortable: true },
  { title: 'Режим', key: 'mode', sortable: true },
  { title: 'Статус', key: 'status', sortable: true },
  { title: 'Склад', key: 'warehouseId', sortable: true }
]

function openEditDialog(scanJob) {
  router.push('/scanjob/edit/' + scanJob.id)
}

function openCreateDialog() {
  router.push('/scanjob/create')
}

async function deleteScanJob(scanJob) {
  if (runningAction.value) return
  runningAction.value = true
  try {
    const content = 'Удалить скан-задание "' + scanJob.name + '" ?'
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
        await scanJobsStore.remove(scanJob.id)
      } catch (error) {
        if (error.message?.includes('409')) {
          alertStore.error('Нельзя удалить скан-задание, у которого есть связанные записи')
        } else {
          alertStore.error('Ошибка при удалении скан-задания')
        }
      }
    }
  } finally {
    runningAction.value = false
  }
}

onMounted(async () => {
  await scanJobsStore.ensureOpsLoaded()
  await Promise.all([
    scanJobsStore.getAll(),
    warehousesStore.getAll()
  ])
})

defineExpose({
  openCreateDialog,
  openEditDialog,
  deleteScanJob,
  getOpsLabel,
  getWarehouseName
})
</script>

<template>
  <div class="settings table-2">
    <div class="header-with-actions">
      <h1 class="primary-heading">Скан-задания</h1>
      <div style="display:flex; align-items:center;" v-if="authStore.isSrLogistPlus">
        <div v-if="runningAction || loading" class="header-actions header-actions-group">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <div class="header-actions header-actions-group">
          <ActionButton
            :item="{}"
            icon="fa-solid fa-plus"
            tooltip-text="Создать скан-задание"
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
        v-model="authStore.scanjobs_search"
        :append-inner-icon="mdiMagnify"
        label="Поиск по скан-заданию"
        variant="solo"
        hide-details
        :disabled="runningAction || loading"
      />
    </div>

    <v-card class="table-card">
      <v-data-table
        v-model:items-per-page="authStore.scanjobs_per_page"
        items-per-page-text="Скан-заданий на странице"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="authStore.scanjobs_page"
        :headers="headers"
        :items="scanjobs"
        :search="authStore.scanjobs_search"
        v-model:sort-by="authStore.scanjobs_sort_by"
        :custom-filter="filterScanJobs"
        :loading="loading"
        item-value="name"
        density="compact"
        class="elevation-1 interlaced-table"
        fixed-header
      >
        <template v-slot:[`item.type`]="{ item }">
          {{ getOpsLabel(ops?.types, item.type) }}
        </template>

        <template v-slot:[`item.operation`]="{ item }">
          {{ getOpsLabel(ops?.operations, item.operation) }}
        </template>

        <template v-slot:[`item.mode`]="{ item }">
          {{ getOpsLabel(ops?.modes, item.mode) }}
        </template>

        <template v-slot:[`item.status`]="{ item }">
          {{ getOpsLabel(ops?.statuses, item.status) }}
        </template>

        <template v-slot:[`item.warehouseId`]="{ item }">
          {{ getWarehouseName(item.warehouseId) }}
        </template>

        <template v-slot:[`item.actions`]="{ item }">
          <div v-if="authStore.isSrLogistPlus" class="actions-container">
            <ActionButton
              :item="item"
              icon="fa-solid fa-pen"
              tooltip-text="Редактировать скан-задание"
              @click="openEditDialog"
              :disabled="runningAction || loading"
            />
            <ActionButton
              :item="item"
              icon="fa-solid fa-trash-can"
              tooltip-text="Удалить скан-задание"
              @click="deleteScanJob"
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
