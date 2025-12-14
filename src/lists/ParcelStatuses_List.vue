<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import router from '@/router'
import { useParcelStatusesStore } from '@/stores/parcel.statuses.store.js'
import ActionButton from '@/components/ActionButton.vue'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useConfirm } from 'vuetify-use-dialog'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { mdiMagnify } from '@mdi/js'

const parcelStatusesStore = useParcelStatusesStore()
const authStore = useAuthStore()
const alertStore = useAlertStore()
const confirm = useConfirm()

const { parcelStatuses, loading } = storeToRefs(parcelStatusesStore)
const { alert } = storeToRefs(alertStore)
const runningAction = ref(false)

// Custom filter function for v-data-table
function filterParcelStatuses(value, query, item) {
  if (query === null || item === null) {
    return false
  }
  const i = item.raw
  if (i === null) {
    return false
  }
  const q = query.toLocaleUpperCase()

  return (
    i.title?.toLocaleUpperCase().indexOf(q) !== -1
  )
}

// Table headers
const headers = [
  ...(authStore.isSrLogistPlus ? [{ title: '', align: 'center', key: 'actions', sortable: false, width: '10%' }] : []),
  { title: 'Название статуса', key: 'title', sortable: true }
]

function openEditDialog(item) {
  router.push(`/parcelstatus/edit/${item.id}`)
}

function openCreateDialog() {
  router.push('/parcelstatus/create')
}

async function deleteParcelStatus(parcelStatus) {
  if (runningAction.value) return
  runningAction.value = true
  try {
    const content = 'Удалить статус посылки "' + parcelStatus.title + '" ?'
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
        await parcelStatusesStore.remove(parcelStatus.id)
      } catch (error) {
        if (error.message?.includes('409')) {
          alertStore.error('Нельзя удалить статус посылки, у которого есть связанные записи')
        } else {
          alertStore.error('Ошибка при удалении статуса посылки')
        }
      }
    }
  } finally {
    runningAction.value = false
  }
}

// Initialize data
onMounted(async () => {
  await parcelStatusesStore.getAll()
})

// Expose functions for testing
defineExpose({
  openCreateDialog,
  openEditDialog,
  deleteParcelStatus
})
</script>

<template>
  <div class="settings table-2" data-testid="parcel-statuses-list">
    <div class="header-with-actions">
      <h1 class="primary-heading">Статусы посылок</h1>
      <div style="display:flex; align-items:center;" v-if="authStore.isSrLogistPlus">
        <div v-if="runningAction || loading" class="header-actions header-actions-group">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <div class="header-actions header-actions-group">
          <ActionButton
            :item="{}"
            icon="fa-solid fa-plus"
            tooltip-text="Зарегистрировать статус посылки"
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
        v-model="authStore.parcelstatuses_search"
        :append-inner-icon="mdiMagnify"
        label="Поиск по названию статуса"
        variant="solo"
        hide-details
        :disabled="runningAction || loading"
      />
    </div>

    <v-card class="table-card">
      <v-data-table
        v-model:items-per-page="authStore.parcelstatuses_per_page"
        items-per-page-text="Статусов на странице"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="authStore.parcelstatuses_page"
        :headers="headers"
        :items="parcelStatuses"
        :search="authStore.parcelstatuses_search"
        v-model:sort-by="authStore.parcelstatuses_sort_by"
        :custom-filter="filterParcelStatuses"
        :loading="loading"
        item-value="name"
        density="compact"
        class="elevation-1 interlaced-table"
        fixed-header
      >
        <template v-slot:[`item.actions`]="{ item }">
          <div v-if="authStore.isSrLogistPlus" class="actions-container">
            <ActionButton
              :item="item"
              icon="fa-solid fa-pen"
              tooltip-text="Редактировать статус посылки"
              @click="openEditDialog"
              :disabled="runningAction || loading"
            />
            <ActionButton
              :item="item"
              icon="fa-solid fa-trash-can"
              tooltip-text="Удалить статус посылки"
              @click="deleteParcelStatus"
              :disabled="runningAction || loading"
            />
          </div>
        </template>
      </v-data-table>
    </v-card>

    <!-- Alert -->
    <div v-if="alert" class="alert alert-dismissable mt-3 mb-0" :class="alert.type">
      <button @click="alertStore.clear()" class="btn btn-link close">×</button>
      {{ alert.message }}
    </div>
  </div>
</template>

<style scoped>
@import '@/assets/styles/scrollable-table.css';
</style>
