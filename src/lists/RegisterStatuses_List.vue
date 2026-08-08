<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import PageAlertRegion from '@/components/PageAlertRegion.vue'
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import router from '@/router'
import { useRegisterStatusesStore } from '@/stores/register.statuses.store.js'
import ActionButton from '@/components/ActionButton.vue'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useAppConfirm } from '@/composables/useAppConfirm.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { mdiMagnify } from '@mdi/js'
import { runWithRetryAlert } from '@/helpers/notification.helpers.js'
import RegisterStatusIcon from '@/components/RegisterStatusIcon.vue'

const registerStatusesStore = useRegisterStatusesStore()
const authStore = useAuthStore()
const alertStore = useAlertStore()
const confirm = useAppConfirm()

const { registerStatuses, loading } = storeToRefs(registerStatusesStore)
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

  return i.title?.toLocaleUpperCase().indexOf(q) !== -1
}

// Table headers
const headers = [
  ...(authStore.isShiftLeadPlus
    ? [{ title: '', align: 'center', key: 'actions', sortable: false, width: '10%' }]
    : []),
  { title: '', align: 'center', key: 'registerStatusIcon', sortable: false, width: '56px' },
  { title: 'Название статуса', key: 'title', sortable: true },
  { title: 'Транзит', align: 'center', key: 'transit', sortable: true },
  { title: 'Изменения запрещены', align: 'center', key: 'readOnly', sortable: true }
]

function openEditDialog(item) {
  if (!authStore.isShiftLeadPlus) return
  router.push(`/registerstatus/edit/${item.id}`)
}

function openCreateDialog() {
  if (!authStore.isShiftLeadPlus) return
  router.push('/registerstatus/create')
}

async function deleteRegisterStatus(registerStatus) {
  if (!authStore.isShiftLeadPlus || runningAction.value) return
  runningAction.value = true
  try {
    const content = 'Удалить статус партии "' + registerStatus.title + '" ?'
    const confirmed = await confirm({
      title: 'Подтверждение',
      confirmationText: 'Удалить',
      cancellationText: 'Не удалять',
      content: content
    })

    if (confirmed) {
      try {
        await registerStatusesStore.remove(registerStatus.id)
      } catch (error) {
        if (error.message?.includes('409')) {
          alertStore.error('Нельзя удалить статус партии, у которого есть связанные записи')
        } else {
          alertStore.error('Ошибка при удалении статуса партии')
        }
      }
    }
  } finally {
    runningAction.value = false
  }
}

// Initialize data
onMounted(() =>
  runWithRetryAlert(() => registerStatusesStore.getAll(), {
    fallback: 'Не удалось загрузить статусы партий'
  })
)

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
      <h1 class="primary-heading">Статусы партий</h1>
      <div class="header-actions-bar" v-if="authStore.isShiftLeadPlus">
        <div v-if="runningAction || loading" class="header-actions header-actions-group">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <div class="header-actions header-actions-group">
          <ActionButton
            :item="{}"
            icon="fa-solid fa-plus"
            tooltip-text="Зарегистрировать статус партии"
            iconSize="2x"
            :disabled="runningAction || loading"
            @click="openCreateDialog"
          />
        </div>
      </div>
    </div>

    <hr class="hr" />

    <PageAlertRegion />

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
          <div v-if="authStore.isShiftLeadPlus" class="actions-container">
            <ActionButton
              :item="item"
              icon="fa-solid fa-pen"
              tooltip-text="Редактировать статус партии"
              @click="openEditDialog"
              :disabled="runningAction || loading"
            />
            <ActionButton
              :item="item"
              icon="fa-solid fa-trash-can"
              tooltip-text="Удалить статус партии"
              @click="deleteRegisterStatus"
              :disabled="runningAction || loading"
            />
          </div>
        </template>

        <template v-slot:[`item.registerStatusIcon`]="{ item }">
          <button
            type="button"
            class="status-icon-button"
            aria-label="Редактировать статус партии"
            :disabled="!authStore.isShiftLeadPlus || runningAction || loading"
            @click="openEditDialog(item)"
          >
            <RegisterStatusIcon :status="item" />
          </button>
        </template>

        <template v-slot:[`item.readOnly`]="{ item }">
          <span class="register-status-read-only">{{ item.readOnly ? 'Да' : 'Нет' }}</span>
        </template>
        <template v-slot:[`item.transit`]="{ item }">
          <span class="register-status-transit">{{ item.transit ? 'Да' : 'Нет' }}</span>
        </template>
      </v-data-table>
    </v-card>

    <!-- Alert -->
  </div>
</template>

<style scoped>
@import '@/assets/styles/scrollable-table.css';

.status-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
}

.status-icon-button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}
</style>
