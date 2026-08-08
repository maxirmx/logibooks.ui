<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import PageAlertRegion from '@/components/PageAlertRegion.vue'
import router from '@/router'

import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useUsersStore } from '@/stores/users.store.js'
import { useWarehousesStore } from '@/stores/warehouses.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useAppConfirm } from '@/composables/useAppConfirm.js'
import ActionButton from '@/components/ActionButton.vue'
import ActionButton2L from '@/components/ActionButton2L.vue'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { mdiMagnify } from '@mdi/js'
import {
  getCredentials,
  hasAllWarehouseAccess,
  isAutomatedSystem
} from '@/helpers/user.roles.js'
import { runWithRetryAlert } from '@/helpers/notification.helpers.js'

const authStore = useAuthStore()

const usersStore = useUsersStore()
const { users, loading } = storeToRefs(usersStore)
const warehousesStore = useWarehousesStore()
const alertStore = useAlertStore()
const runningAction = ref(false)

onMounted(() =>
  runWithRetryAlert(
    () => Promise.all([usersStore.ensureLoaded(), warehousesStore.ensureLoaded()]),
    { fallback: 'Не удалось загрузить пользователей и склады' }
  )
)

const confirm = useAppConfirm()

function userSettings(item) {
  const id = item.id
  router.push(isAutomatedSystem(item) ? `/automated-system/edit/${id}` : `/user/edit/${id}`)
}

function getDisplayName(item) {
  if (isAutomatedSystem(item)) return item?.lastName ?? ''
  return [item?.lastName, item?.firstName, item?.patronymic].filter(Boolean).join(' ')
}

function getAccountTypeIcon(item) {
  return isAutomatedSystem(item) ? 'fa-solid fa-robot' : 'fa-solid fa-user'
}

function getAccountTypeLabel(item) {
  return isAutomatedSystem(item) ? 'Автоматизированная система' : 'Пользователь'
}

const createOptions = [
  {
    label: 'Зарегистрировать пользователя',
    icon: 'fa-solid fa-user',
    action: () => router.push('/register')
  },
  {
    label: 'Зарегистрировать автоматизированную систему',
    icon: 'fa-solid fa-robot',
    action: () => router.push('/automated-system/register')
  }
]

function getWarehouseNames(item) {
  if (hasAllWarehouseAccess(item)) {
    return ['Все']
  }

  return (item?.warehouseIds ?? [])
    .map((warehouseId) => warehousesStore.getWarehouseName(warehouseId))
    .filter((name) => name)
}

function filterUsers(value, query, item) {
  if (query === null || item === null) {
    return false
  }
  const i = item.raw
  if (i === null) {
    return false
  }
  const q = query.toLocaleUpperCase()

  if (
    i.lastName.toLocaleUpperCase().indexOf(q) !== -1 ||
    i.firstName.toLocaleUpperCase().indexOf(q) !== -1 ||
    i.patronymic.toLocaleUpperCase().indexOf(q) !== -1 ||
    i.email.toLocaleUpperCase().indexOf(q) !== -1
  ) {
    return true
  }

  const crd = getCredentials(i)
  if (crd.toLocaleUpperCase().indexOf(q) !== -1) {
    return true
  }

  if (getWarehouseNames(i).some((name) => name.toLocaleUpperCase().indexOf(q) !== -1)) {
    return true
  }
  return false
}

async function deleteUser(item) {
  if (runningAction.value) return
  runningAction.value = true
  try {
    const accountType = isAutomatedSystem(item)
      ? 'автоматизированную систему'
      : 'пользователя'
    const content = `Удалить ${accountType} "${getDisplayName(item)}" ?`
    const result = await confirm({
      title: 'Подтверждение',
      confirmationText: 'Удалить',
      cancellationText: 'Не удалять',
      content: content
    })

    if (result) {
      try {
        await usersStore.delete(item.id)
        await usersStore.getAll()
      } catch (error) {
        alertStore.error(error)
      }
    }
  } finally {
    runningAction.value = false
  }
}

const headers = [
  { title: '', align: 'center', key: 'actions', sortable: false, width: '120px' },
  { title: 'Пользователь / система', align: 'start', key: 'id' },
  { title: 'E-mail / идентификатор', align: 'start', key: 'email' },
  { title: 'Права', align: 'start', key: 'credentials', sortable: false },
  { title: 'Доступ к складам', align: 'start', key: 'warehouses', sortable: false }
]
</script>

<template>
  <div class="settings table-3">
    <div class="header-with-actions">
      <h1 class="primary-heading">Пользователи</h1>
      <div style="display: flex; align-items: center">
        <div v-if="runningAction || loading" class="header-actions header-actions-group">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <div class="header-actions header-actions-group">
          <ActionButton2L
            :item="{}"
            icon="fa-solid fa-user-plus"
            tooltip-text="Зарегистрировать"
            iconSize="2x"
            :disabled="runningAction || loading"
            :options="createOptions"
          />
        </div>
      </div>
    </div>

    <hr class="hr" />

    <PageAlertRegion />

    <div>
      <v-text-field
        v-model="authStore.users_search"
        :append-inner-icon="mdiMagnify"
        label="Поиск по любой информации о пользователе"
        variant="solo"
        hide-details
        :disabled="runningAction || loading"
      />
    </div>

    <v-card class="table-card">
      <v-data-table
        v-model:items-per-page="authStore.users_per_page"
        items-per-page-text="Пользователей на странице"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="authStore.users_page"
        :headers="headers"
        :items="users"
        :search="authStore.users_search"
        v-model:sort-by="authStore.users_sort_by"
        :custom-filter="filterUsers"
        item-value="name"
        density="compact"
        class="elevation-1 interlaced-table"
        fixed-header
      >
        <template v-slot:[`item.id`]="{ item }">
          <span class="account-name">
            <font-awesome-icon
              :icon="getAccountTypeIcon(item)"
              class="account-type-icon"
              role="img"
              :aria-label="getAccountTypeLabel(item)"
              :title="getAccountTypeLabel(item)"
            />
            <span>{{ getDisplayName(item) }}</span>
          </span>
        </template>

        <template v-slot:[`item.credentials`]="{ item }">
          <span v-html="getCredentials(item)"></span>
        </template>

        <template v-slot:[`item.warehouses`]="{ item }">
          <div
            v-for="(warehouseName, warehouseIndex) in getWarehouseNames(item)"
            :key="`${item.id}-${warehouseIndex}`"
          >
            {{ warehouseName }}
          </div>
        </template>

        <template v-slot:[`item.actions`]="{ item }">
          <div class="actions-container">
            <ActionButton
              :item="item"
              icon="fa-solid fa-pen"
              tooltip-text="Редактировать учетную запись"
              @click="userSettings"
              :disabled="runningAction || loading"
            />
            <ActionButton
              :item="item"
              icon="fa-solid fa-trash-can"
              tooltip-text="Удалить учетную запись"
              @click="deleteUser"
              :disabled="runningAction || loading"
            />
          </div>
        </template>
      </v-data-table>
    </v-card>
  </div>
</template>

<style scoped>
@import '@/assets/styles/scrollable-table.css';

.account-name {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.account-type-icon {
  width: 1em;
  flex: 0 0 auto;
  color: var(--primary-color);
}
</style>
