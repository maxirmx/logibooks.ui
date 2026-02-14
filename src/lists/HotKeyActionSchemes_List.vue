<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application

import { onMounted, ref } from 'vue'
import router from '@/router'
import { storeToRefs } from 'pinia'
import { useHotKeyActionSchemesStore } from '@/stores/hotkey.action.schemes.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import ActionButton from '@/components/ActionButton.vue'
import { useConfirm } from 'vuetify-use-dialog'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { mdiMagnify } from '@mdi/js'

const hotKeyActionSchemesStore = useHotKeyActionSchemesStore()
const authStore = useAuthStore()
const alertStore = useAlertStore()
const confirm = useConfirm()

const { hotKeyActionSchemes, loading } = storeToRefs(hotKeyActionSchemesStore)
const { alert } = storeToRefs(alertStore)

const runningAction = ref(false)

function filterHotKeyActionSchemes(value, query, item) {
  if (query === null || item === null) {
    return false
  }
  const hotKeyActionScheme = item.raw
  if (hotKeyActionScheme === null) {
    return false
  }

  const q = query.toLocaleUpperCase()
  return [hotKeyActionScheme.name]
    .filter(Boolean)
    .some((field) => field.toLocaleUpperCase().includes(q))
}

const headers = [
  ...(authStore.isSrLogistPlus
    ? [{ title: '', align: 'center', key: 'actions', sortable: false, width: '120px' }]
    : []),
  { title: 'Название', key: 'name', sortable: true }
]

function openEditDialog(hotKeyActionScheme) {
  router.push(`/hotkeyactionscheme/edit/${hotKeyActionScheme.id}`)
}

function openCreateDialog() {
  router.push('/hotkeyactionscheme/create')
}

async function deleteHotKeyActionScheme(hotKeyActionScheme) {
  if (runningAction.value) return
  runningAction.value = true
  try {
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
      content: `Удалить схему "${hotKeyActionScheme.name}"?`
    })

    if (confirmed) {
      try {
        await hotKeyActionSchemesStore.remove(hotKeyActionScheme.id)
      } catch (error) {
        if (error.message?.includes('409')) {
          alertStore.error('Нельзя удалить схему, у которой есть связанные записи')
        } else {
          alertStore.error('Ошибка при удалении схемы')
        }
      }
    }
  } finally {
    runningAction.value = false
  }
}

onMounted(async () => {
  await hotKeyActionSchemesStore.getAll()
})

defineExpose({
  openCreateDialog,
  openEditDialog,
  deleteHotKeyActionScheme
})
</script>

<template>
  <div class="settings table-2">
    <div class="header-with-actions">
      <h1 class="primary-heading">Схемы настройки клавиатуры</h1>
      <div style="display:flex; align-items:center;" v-if="authStore.isSrLogistPlus">
        <div v-if="loading" class="header-actions header-actions-group">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <div class="header-actions header-actions-group">
          <ActionButton
            :item="{}"
            icon="fa-solid fa-plus"
            tooltip-text="Добавить схему"
            iconSize="2x"
            :disabled="loading"
            @click="openCreateDialog"
          />
        </div>
      </div>
    </div>

    <hr class="hr" />

    <div>
      <v-text-field
        v-model="authStore.hotkeyactionschemes_search"
        :append-inner-icon="mdiMagnify"
        label="Поиск по названию"
        variant="solo"
        hide-details
        :disabled="runningAction || loading"
      />
    </div>

    <v-card class="table-card">
      <v-data-table
        v-model:items-per-page="authStore.hotkeyactionschemes_per_page"
        items-per-page-text="Элементов на странице"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="authStore.hotkeyactionschemes_page"
        :headers="headers"
        :items="hotKeyActionSchemes"
        :search="authStore.hotkeyactionschemes_search"
        v-model:sort-by="authStore.hotkeyactionschemes_sort_by"
        :custom-filter="filterHotKeyActionSchemes"
        :loading="loading"
        item-value="id"
        density="compact"
        class="elevation-1 interlaced-table"
        fixed-header
      >
        <template v-slot:[`item.actions`]="{ item }">
          <div v-if="authStore.isSrLogistPlus" class="actions-container">
            <ActionButton
              :item="item"
              icon="fa-solid fa-pen"
              tooltip-text="Редактировать схему"
              @click="openEditDialog"
              :disabled="runningAction || loading"
            />
            <ActionButton
              :item="item"
              icon="fa-solid fa-trash-can"
              tooltip-text="Удалить схему настройки клавиатуры"
              @click="deleteHotKeyActionScheme"
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
