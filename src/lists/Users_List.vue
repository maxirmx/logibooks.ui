<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import router from '@/router'

import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useUsersStore } from '@/stores/users.store.js'
import { useWarehousesStore } from '@/stores/warehouses.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useConfirm } from 'vuetify-use-dialog'
import ActionButton from '@/components/ActionButton.vue'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { mdiMagnify } from '@mdi/js'
import {
  roleAdmin,
  roleShiftLead,
  roleSrLogist,
  roleLogist,
  roleWhManager,
  roleWhOperator
} from '@/helpers/user.roles.js'

const authStore = useAuthStore()

const usersStore = useUsersStore()
const { users, loading, error } = storeToRefs(usersStore)
const warehousesStore = useWarehousesStore()
const runningAction = ref(false)
usersStore.ensureLoaded()
warehousesStore.ensureLoaded()

const alertStore = useAlertStore()
const { alert } = storeToRefs(alertStore)

const confirm = useConfirm()

function userSettings(item) {
  const id = item.id
  router.push('user/edit/' + id)
}

function getCredentials(item) {
  const crd = []
  if (item) {
    if (item.roles && item.roles.includes(roleAdmin)) {
      crd.push('Администратор')
    }
    if (item.roles && item.roles.includes(roleShiftLead)) {
      crd.push('Старший смены')
    }
    if (item.roles && item.roles.includes(roleSrLogist)) {
      crd.push('Старший логист')
    }
    if (item.roles && item.roles.includes(roleLogist)) {
      crd.push('Логист')
    }
    if (item.roles && item.roles.includes(roleWhManager)) {
      crd.push('Менеджер склада')
    }
    if (item.roles && item.roles.includes(roleWhOperator)) {
      crd.push('Оператор склада')
    }
  }
  return crd.join(', ')
}

function getWarehouseNames(item) {
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
    const content = 'Удалить пользователя "' + item.firstName + ' ' + item.lastName + '" ?'
    const result = await confirm({
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

    if (result) {
      usersStore
        .delete(item.id)
        .then(() => {
          usersStore.getAll()
        })
        .catch((error) => {
          alertStore.error(error)
        })
    }
  } finally {
    runningAction.value = false
  }
}

const headers = [
  { title: '', align: 'center', key: 'actions', sortable: false, width: '120px' },
  { title: 'Пользователь', align: 'start', key: 'id' },
  { title: 'E-mail', align: 'start', key: 'email' },
  { title: 'Права', align: 'start', key: 'credentials', sortable: false },
  { title: 'Доступ к складам', align: 'start', key: 'warehouses', sortable: false }
]
</script>

<template>
  <div class="settings table-2">
    <div class="header-with-actions">
      <h1 class="primary-heading">Пользователи</h1>
      <div style="display:flex; align-items:center;">
        <div v-if="runningAction || loading" class="header-actions header-actions-group">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <div class="header-actions header-actions-group">
          <ActionButton
            :item="{}"
            icon="fa-solid fa-user-plus"
            tooltip-text="Зарегистрировать пользователя"
            iconSize="2x"
            :disabled="runningAction || loading"
            @click="() => router.push('/register')"
          />
        </div>
      </div>
    </div>

    <hr class="hr" />

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
          {{ item['lastName'] }} {{ item['firstName'] }} {{ item['patronymic'] }}
        </template>

        <template v-slot:[`item.credentials`]="{ item }">
          <span v-html="getCredentials(item)"></span>
        </template>

        <template v-slot:[`item.warehouses`]="{ item }">
          <div v-for="(warehouseName, warehouseIndex) in getWarehouseNames(item)" :key="`${item.id}-${warehouseIndex}`">
            {{ warehouseName }}
          </div>
        </template>

        <template v-slot:[`item.actions`]="{ item }">
          <div class="actions-container">
            <ActionButton 
              :item="item" 
              icon="fa-solid fa-pen" 
              tooltip-text="Редактировать информацию о пользователе" 
              @click="userSettings" 
              :disabled="runningAction || loading" 
            />
            <ActionButton 
              :item="item" 
              icon="fa-solid fa-trash-can" 
              tooltip-text="Удалить информацию о пользователе" 
              @click="deleteUser" 
              :disabled="runningAction || loading" 
            />
          </div>
        </template>
      </v-data-table>
    </v-card>
    <div v-if="error" class="text-center m-5">
      <div class="text-danger">Ошибка при загрузке списка пользователей: {{ error }}</div>
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
