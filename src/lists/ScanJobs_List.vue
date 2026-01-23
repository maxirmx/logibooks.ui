<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { computed, onMounted, onUnmounted, ref, watch, toRef } from 'vue'
import router from '@/router'
import { storeToRefs } from 'pinia'
import { 
  useScanJobsStore, 
  SCANJOB_TYPE_OPTIONS, 
  SCANJOB_OPERATION_OPTIONS, 
  SCANJOB_MODE_OPTIONS, 
  SCANJOB_STATUS_OPTIONS 
} from '@/stores/scanjobs.store.js'
import { useWarehousesStore } from '@/stores/warehouses.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useConfirm } from 'vuetify-use-dialog'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { mdiMagnify } from '@mdi/js'
import { useDebouncedFilterSync } from '@/composables/useDebouncedFilterSync.js'
import PaginationFooter from '@/components/PaginationFooter.vue'
import ActionButton from '@/components/ActionButton.vue'

const scanJobsStore = useScanJobsStore()
const warehousesStore = useWarehousesStore()
const authStore = useAuthStore()
const alertStore = useAlertStore()
const confirm = useConfirm()

const scanjobs_search = toRef(authStore, 'scanjobs_search')
const scanjobs_page = toRef(authStore, 'scanjobs_page')
const scanjobs_per_page = toRef(authStore, 'scanjobs_per_page')
const scanjobs_sort_by = toRef(authStore, 'scanjobs_sort_by')

const { scanJobs, loading, error, totalCount } = storeToRefs(scanJobsStore)
const { warehouses } = storeToRefs(warehousesStore)
const { alert } = storeToRefs(alertStore)

const localSearch = ref(scanjobs_search.value || '')
const runningAction = ref(false)
const isComponentMounted = ref(true)

const typeOptions = SCANJOB_TYPE_OPTIONS
const operationOptions = SCANJOB_OPERATION_OPTIONS
const modeOptions = SCANJOB_MODE_OPTIONS
const statusOptions = SCANJOB_STATUS_OPTIONS

const warehousesById = computed(() => {
  if (!Array.isArray(warehouses.value)) return new Map()
  return new Map(warehouses.value.map((warehouse) => [warehouse.id, warehouse]))
})

function getWarehouseName(id) {
  const warehouse = warehousesById.value.get(Number(id))
  return warehouse?.name || id
}

function getOptionLabel(options, value) {
  const match = options.find((option) => option.value === Number(value))
  return match ? match.label : value
}

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
    const content = `Удалить задание сканирования "${scanJob.name}" ?`
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
      content
    })

    if (confirmed) {
      try {
        await scanJobsStore.remove(scanJob.id)
      } catch (err) {
        if (err.message?.includes('409')) {
          alertStore.error('Нельзя удалить задание сканирования с зависимыми записями')
        } else {
          alertStore.error('Ошибка при удалении задания сканирования')
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
    await warehousesStore.getAll()
    if (!isComponentMounted.value) return
    await scanJobsStore.getAll()
  } catch (err) {
    if (isComponentMounted.value) {
      scanJobsStore.error = err?.message || 'Ошибка при загрузке заданий сканирования'
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

const baseHeaders = [
  { title: 'Название', key: 'name', sortable: true },
  { title: 'Склад', key: 'warehouseId', sortable: true },
  { title: 'Тип', key: 'type', sortable: true },
  { title: 'Операция', key: 'operation', sortable: true },
  { title: 'Режим', key: 'mode', sortable: true },
  { title: 'Статус', key: 'status', sortable: true }
]

const headers = computed(() => {
  const list = [...baseHeaders]
  if (authStore.isSrLogistPlus) {
    list.unshift({ title: '', align: 'center', key: 'actions', sortable: false, width: '120px' })
  }
  return list
})

const maxPage = computed(() => Math.max(1, Math.ceil((totalCount.value || 0) / scanjobs_per_page.value)))

const pageOptions = computed(() => {
  const mp = maxPage.value
  const current = scanjobs_page.value || 1
  if (mp <= 200) {
    return Array.from({ length: mp }, (_, i) => ({ value: i + 1, title: String(i + 1) }))
  }

  const set = new Set()
  for (let i = 1; i <= 10; i++) set.add(i)
  for (let i = Math.max(1, mp - 9); i <= mp; i++) set.add(i)
  for (let i = Math.max(1, current - 10); i <= Math.min(mp, current + 10); i++) set.add(i)

  return Array.from(set).sort((a, b) => a - b).map((n) => ({ value: n, title: String(n) }))
})
</script>

<template>
  <div class="settings table-2">
    <div class="header-with-actions">
      <h1 class="primary-heading">Задания сканирования</h1>
      <div style="display:flex; align-items:center;" v-if="authStore.isSrLogistPlus">
        <div v-if="runningAction || loading" class="header-actions header-actions-group">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <div class="header-actions header-actions-group">
          <ActionButton
            :item="{}"
            icon="fa-solid fa-plus"
            tooltip-text="Создать задание сканирования"
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
        v-model="localSearch"
        :append-inner-icon="mdiMagnify"
        label="Поиск по заданиям сканирования"
        variant="solo"
        hide-details
        :disabled="runningAction || loading"
      />
    </div>

    <v-card class="table-card">
      <v-data-table-server
        v-model:items-per-page="scanjobs_per_page"
        :items-per-page-options="itemsPerPageOptions"
        v-model:page="scanjobs_page"
        v-model:sort-by="scanjobs_sort_by"
        :headers="headers"
        :items="scanJobs"
        :items-length="totalCount"
        :loading="loading"
        item-value="id"
        density="compact"
        class="elevation-1 interlaced-table"
        fixed-header
        hide-default-footer
      >
        <template #item="{ item, columns }">
          <tr>
            <td
              v-for="col in columns"
              :key="col.key"
              :class="[
                col.class,
                col.align === 'center' ? 'text-center' : col.align === 'end' ? 'text-right' : 'text-start'
              ]"
              :data-column-key="col.key"
            >
              <template v-if="col.key === 'actions'">
                <div v-if="authStore.isSrLogistPlus" class="actions-container">
                  <ActionButton
                    :item="item"
                    icon="fa-solid fa-pen"
                    tooltip-text="Редактировать задание сканирования"
                    @click="openEditDialog"
                    :disabled="runningAction || loading"
                  />
                  <ActionButton
                    :item="item"
                    icon="fa-solid fa-trash-can"
                    tooltip-text="Удалить задание сканирования"
                    @click="deleteScanJob"
                    :disabled="runningAction || loading"
                  />
                </div>
              </template>
              <template v-else-if="col.key === 'warehouseId'">
                {{ getWarehouseName(item.warehouseId) }}
              </template>
              <template v-else-if="col.key === 'type'">
                {{ getOptionLabel(typeOptions, item.type) }}
              </template>
              <template v-else-if="col.key === 'operation'">
                {{ getOptionLabel(operationOptions, item.operation) }}
              </template>
              <template v-else-if="col.key === 'mode'">
                {{ getOptionLabel(modeOptions, item.mode) }}
              </template>
              <template v-else-if="col.key === 'status'">
                {{ getOptionLabel(statusOptions, item.status) }}
              </template>
              <template v-else>
                {{ item[col.key] }}
              </template>
            </td>
          </tr>
        </template>
      </v-data-table-server>
      <div class="v-data-table-footer">
        <PaginationFooter
          v-model:items-per-page="scanjobs_per_page"
          v-model:page="scanjobs_page"
          :items-per-page-options="itemsPerPageOptions"
          :page-options="pageOptions"
          :total-count="totalCount"
          :max-page="maxPage"
        />
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
