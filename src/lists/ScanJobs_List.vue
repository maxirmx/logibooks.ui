<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { onMounted, onUnmounted, ref, watch } from 'vue'
import router from '@/router'
import { storeToRefs } from 'pinia'
import { useScanJobsStore } from '@/stores/scanjobs.store.js'
import { useWarehousesStore } from '@/stores/warehouses.store.js'
import ActionButton from '@/components/ActionButton.vue'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useConfirm } from 'vuetify-use-dialog'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { useDebouncedFilterSync } from '@/composables/useDebouncedFilterSync.js'
import { mdiMagnify } from '@mdi/js'

const scanJobsStore = useScanJobsStore()
const warehousesStore = useWarehousesStore()
const authStore = useAuthStore()
const alertStore = useAlertStore()
const confirm = useConfirm()

const { items, loading, ops, totalCount } = storeToRefs(scanJobsStore)
const { alert } = storeToRefs(alertStore)

const runningAction = ref(false)
const isInitializing = ref(true)
const isComponentMounted = ref(true)

const { scanjobs_per_page, scanjobs_search, scanjobs_sort_by, scanjobs_page } = storeToRefs(authStore)

// Local search variable for debounced calls
const localSearch = ref('')
localSearch.value = scanjobs_search.value || ''

const headers = [
  ...(authStore.isSrLogistPlus ? [{ title: '', align: 'center', key: 'actions', sortable: false, width: '120px' }] : []),
  { title: 'Номер', key: 'id', sortable: true },
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
    const content = 'Удалить задание на сканирование "' + scanJob.name + '" ?'
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
          alertStore.error('Нельзя удалить задание на сканирование, у которого есть связанные записи')
        } else {
          alertStore.error('Ошибка при удалении задания на сканирование')
        }
      }
    }
  } finally {
    runningAction.value = false
  }
}

async function loadScanJobs() {
  await scanJobsStore.getAll()
}

const { triggerLoad, stop: stopFilterSync } = useDebouncedFilterSync({
  filters: [{ local: localSearch, store: scanjobs_search }],
  loadFn: loadScanJobs,
  isComponentMounted,
  debounceMs: 300
})

const watcherStop = watch([scanjobs_page, scanjobs_per_page, scanjobs_sort_by], () => {
  triggerLoad()
}, { immediate: false })

onMounted(async () => {
  try {
    if (!isComponentMounted.value) return
    
    await scanJobsStore.ensureOpsLoaded()
    if (!isComponentMounted.value) return
    
    await warehousesStore.ensureLoaded()
  } catch (error) {
    if (isComponentMounted.value) {
      alertStore.error('Ошибка при загрузке данных: ' + (error?.message || 'Неизвестная ошибка'))
    }
  } finally {
    if (isComponentMounted.value) {
      isInitializing.value = false
    }
  }
})

onUnmounted(() => {
  isComponentMounted.value = false
  stopFilterSync()
  if (watcherStop) {
    watcherStop()
  }
})

defineExpose({
  openCreateDialog,
  openEditDialog,
  deleteScanJob
})
</script>

<template>
  <div class="settings table-3">
    <div class="header-with-actions">
      <h1 class="primary-heading">Задания на сканирование</h1>
      <div style="display:flex; align-items:center;" v-if="authStore.isSrLogistPlus">
        <div v-if="runningAction || loading || isInitializing" class="header-actions header-actions-group">
          <span class="spinner-border spinner-border-m"></span>
        </div>
      </div>
    </div>

    <hr class="hr" />

    <div>
      <v-text-field
        v-model="localSearch"
        :append-inner-icon="mdiMagnify"
        label="Поиск по заданиям на сканирование"
        variant="solo"
        hide-details
        :loading="loading || isInitializing"
        :disabled="runningAction || isInitializing"
      />
    </div>

    <v-card class="table-card">
      <v-data-table-server
        v-model:items-per-page="scanjobs_per_page"
        items-per-page-text="Заданий на странице"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="scanjobs_page"
        v-model:sort-by="scanjobs_sort_by"
        :headers="headers"
        :items="items"
        :items-length="totalCount"
        :loading="loading || isInitializing"
        density="compact"
        class="elevation-1 interlaced-table"
        fixed-header
      >
        <template v-slot:[`item.type`]="{ item }">
          {{ scanJobsStore.getOpsLabel(ops?.types, item.type) }}
        </template>

        <template v-slot:[`item.operation`]="{ item }">
          {{ scanJobsStore.getOpsLabel(ops?.operations, item.operation) }}
        </template>

        <template v-slot:[`item.mode`]="{ item }">
          {{ scanJobsStore.getOpsLabel(ops?.modes, item.mode) }}
        </template>

        <template v-slot:[`item.status`]="{ item }">
          {{ scanJobsStore.getOpsLabel(ops?.statuses, item.status) }}
        </template>

        <template v-slot:[`item.warehouseId`]="{ item }">
          {{ warehousesStore.getWarehouseName(item.warehouseId) }}
        </template>

        <template v-slot:[`item.actions`]="{ item }">
          <div v-if="authStore.isSrLogistPlus" class="actions-container">
            <ActionButton
              :item="item"
              icon="fa-solid fa-pen"
              tooltip-text="Редактировать задание на сканирование"
              @click="openEditDialog"
              :disabled="runningAction || loading"
            />
            <ActionButton
              :item="item"
              icon="fa-solid fa-trash-can"
              tooltip-text="Удалить задание на сканирование"
              @click="deleteScanJob"
              :disabled="runningAction || loading"
            />
          </div>
        </template>
      </v-data-table-server>
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
