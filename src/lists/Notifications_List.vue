<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { onMounted, ref } from 'vue'
import router from '@/router'
import { storeToRefs } from 'pinia'
import { useNotificationsStore } from '@/stores/notifications.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useConfirm } from 'vuetify-use-dialog'
import ActionButton from '@/components/ActionButton.vue'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { formatNotificationDate } from '@/helpers/notification.helpers.js'
import { mdiMagnify } from '@mdi/js'

const notificationsStore = useNotificationsStore()
const authStore = useAuthStore()
const alertStore = useAlertStore()
const confirm = useConfirm()

const { notifications, loading } = storeToRefs(notificationsStore)
const { alert } = storeToRefs(alertStore)
const runningAction = ref(false)

function filterNotifications(value, query, item) {
  if (query === null || item === null) {
    return false
  }

  const notification = getRow(item)
  if (!notification) {
    return false
  }

  const q = query.toLocaleUpperCase()
  const firstArticle = notification.articles && notification.articles.length > 0 
    ? notification.articles[0].article 
    : ''

  return [
    firstArticle,
    notification.number,
    formatDate(notification.terminationDate),
    formatDate(notification.publicationDate),
    formatDate(notification.registrationDate)
  ]
    .some((field) => (field || '').toLocaleUpperCase().includes(q))
}

const headers = [
  ...(authStore.isSrLogistPlus ? [{ title: '', align: 'center', key: 'actions', sortable: false, width: '120px' }] : []),
  { title: 'Номер', key: 'number', sortable: true },
  { title: 'Дата регистрации', key: 'registrationDate', sortable: true },
  { title: 'Дата публикации', key: 'publicationDate', sortable: true },
  { title: 'Срок действия', key: 'terminationDate', sortable: true },
  { title: 'Артикулы', key: 'articles', sortable: true }
]

const formatDate = formatNotificationDate

function getRow(item) {
  return item && typeof item === 'object' && 'raw' in item ? item.raw : item
}

function openEditDialog(notification) {
  const row = getRow(notification)
  router.push(`/notification/edit/${row.id}`)
}

function openCreateDialog() {
  router.push('/notification/create')
}

async function deleteNotification(notification) {
  if (runningAction.value) return
  runningAction.value = true

  try {
    const row = getRow(notification)
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
      content: `Удалить нотификацию "${row.number}"?`
    })

    if (confirmed) {
      try {
        await notificationsStore.remove(row.id)
      } catch (error) {
        alertStore.error(error.message || 'Ошибка при удалении нотификации')
      }
    }
  } finally {
    runningAction.value = false
  }
}

onMounted(async () => {
  await notificationsStore.getAll()
})

defineExpose({
  openCreateDialog,
  openEditDialog,
  deleteNotification,
  formatDate,
  getRow,
})
</script>

<template>
  <div class="settings table-2">
    <div class="header-with-actions">
      <h1 class="primary-heading">Нотификации</h1>
      <div style="display:flex; align-items:center;" v-if="authStore.isSrLogistPlus">
        <div v-if="runningAction || loading" class="header-actions header-actions-group">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <div class="header-actions header-actions-group">
          <ActionButton
            :item="{}"
            icon="fa-solid fa-file-circle-plus"
            tooltip-text="Создать нотификацию"
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
        v-model="authStore.notifications_search"
        :append-inner-icon="mdiMagnify"
        label="Поиск по информации о нотификациях"
        variant="solo"
        hide-details
        :disabled="runningAction || loading"
      />
    </div>

    <v-card class="table-card">
      <v-data-table
        v-model:items-per-page="authStore.notifications_per_page"
        items-per-page-text="Нотификаций на странице"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="authStore.notifications_page"
        :headers="headers"
        :items="notifications"
        :search="authStore.notifications_search"
        v-model:sort-by="authStore.notifications_sort_by"
        :custom-filter="filterNotifications"
        :loading="loading"
        item-value="id"
        density="compact"
        class="elevation-1 interlaced-table"
        fixed-header
      >
        <template v-slot:[`item.articles`]="{ item }">
          <div v-for="article in item.articles" :key="article.id">
            {{ article.article }}
          </div>
        </template>

        <template v-slot:[`item.registrationDate`]="{ item }">
          {{ formatDate(getRow(item)?.registrationDate) }}
        </template>

        <template v-slot:[`item.publicationDate`]="{ item }">
          {{ formatDate(getRow(item)?.publicationDate) }}
        </template>

        <template v-slot:[`item.terminationDate`]="{ item }">
          {{ formatDate(getRow(item)?.terminationDate) }}
        </template>

        <template v-slot:[`item.actions`]="{ item }">
          <div v-if="authStore.isSrLogistPlus" class="actions-container">
            <ActionButton
              :item="getRow(item)"
              icon="fa-solid fa-pen"
              tooltip-text="Редактировать нотификацию"
              @click="openEditDialog"
              :disabled="runningAction || loading"
            />
            <ActionButton
              :item="getRow(item)"
              icon="fa-solid fa-trash-can"
              tooltip-text="Удалить нотификацию"
              @click="deleteNotification"
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
