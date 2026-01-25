<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import router from '@/router'
import { useRegisterStatusesStore } from '@/stores/register.statuses.store.js'
import ActionButton from '@/components/ActionButton.vue'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useConfirm } from 'vuetify-use-dialog'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { mdiMagnify } from '@mdi/js'

const registerStatusesStore = useRegisterStatusesStore()
const authStore = useAuthStore()
const alertStore = useAlertStore()
const confirm = useConfirm()

const { registerStatuses, loading } = storeToRefs(registerStatusesStore)
const { alert } = storeToRefs(alertStore)
const runningAction = ref(false)

// Custom filter function for v-data-table
function filterRegisterStatuses(value, query, item) {
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
  router.push(`/registerstatus/edit/${item.id}`)
}

function openCreateDialog() {
  router.push('/registerstatus/create')
}

async function deleteRegisterStatus(registerStatus) {
  if (runningAction.value) return
  runningAction.value = true
  try {
    const content = 'Удалить статус реестра "' + registerStatus.title + '" ?'
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
        await registerStatusesStore.remove(registerStatus.id)
      } catch (error) {
        if (error.message?.includes('409')) {
          alertStore.error('Нельзя удалить статус реестра, у которого есть связанные записи')
        } else {
          alertStore.error('Ошибка при удалении статуса реестра')
        }
      }
    }
  } finally {
    runningAction.value = false
  }
}

// Initialize data
onMounted(async () => {
  await registerStatusesStore.getAll()
})

// Expose functions for testing
defineExpose({
  openCreateDialog,
  openEditDialog,
  deleteRegisterStatus
})
</script>

<template>
  <div class="settings table-2" data-testid="register-statuses-list">
    <div class="header-with-actions">
      <h1 class="primary-heading">Статусы реестров</h1>
      <div style="display:flex; align-items:center;" v-if="authStore.isSrLogistPlus">
        <div v-if="runningAction || loading" class="header-actions header-actions-group">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <div class="header-actions header-actions-group">
          <ActionButton
            :item="{}"
            icon="fa-solid fa-plus"
            tooltip-text="Зарегистрировать статус реестра"
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
        v-model="authStore.registerstatuses_search"
        :append-inner-icon="mdiMagnify"
        label="Поиск по названию статуса"
        variant="solo"
        hide-details
        :disabled="runningAction || loading"
      />
    </div>

    <v-card class="table-card">
      <v-data-table
        v-model:items-per-page="authStore.registerstatuses_per_page"
        items-per-page-text="Статусов на странице"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="authStore.registerstatuses_page"
        :headers="headers"
        :items="registerStatuses"
        :search="authStore.registerstatuses_search"
        v-model:sort-by="authStore.registerstatuses_sort_by"
        :custom-filter="filterRegisterStatuses"
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
              tooltip-text="Редактировать статус реестра"
              @click="openEditDialog"
              :disabled="runningAction || loading"
            />
            <ActionButton
              :item="item"
              icon="fa-solid fa-trash-can"
              tooltip-text="Удалить статус реестра"
              @click="deleteRegisterStatus"
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
