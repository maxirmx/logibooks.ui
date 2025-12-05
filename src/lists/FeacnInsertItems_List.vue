<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { onMounted, computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import router from '@/router'
import { useFeacnInsertItemsStore } from '@/stores/feacn.insert.items.store.js'
import ActionButton from '@/components/ActionButton.vue'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useConfirm } from 'vuetify-use-dialog'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { mdiMagnify } from '@mdi/js'
import {
  loadFeacnTooltipOnHover,
  useFeacnTooltips
} from '@/helpers/feacn.info.helpers.js'

const insertItemsStore = useFeacnInsertItemsStore()
const authStore = useAuthStore()
const alertStore = useAlertStore()
const confirm = useConfirm()

const { insertItems, loading } = storeToRefs(insertItemsStore)
const { alert } = storeToRefs(alertStore)
const runningAction = ref(false)

// Use shared FEACN tooltip cache
const feacnTooltips = useFeacnTooltips()

// Tooltip width limitation
const tooltipMaxWidth = computed(() => {
  if (typeof window !== 'undefined') {
    return `${window.innerWidth * 0.5}px`
  }
  return '400px'
})

// Custom filter function for v-data-table
function filterInsertItems(value, query, item) {
  if (query === null || item === null) {
    return false
  }
  const i = item.raw
  if (i === null) {
    return false
  }
  const q = query.toLocaleUpperCase()

  return (
    (i.code?.toLocaleUpperCase() ?? '').indexOf(q) !== -1 ||
    (i.insBefore?.toLocaleUpperCase() ?? '').indexOf(q) !== -1 ||
    (i.insAfter?.toLocaleUpperCase() ?? '').indexOf(q) !== -1
  )
}

const headers = [
  ...(authStore.isAdminOrSrLogist ? [{ title: '', align: 'center', key: 'actions', sortable: false, width: '10%' }] : []),
  { title: 'Код ТН ВЭД', key: 'code', sortable: true , width: '20%'},
  { title: 'Вставить перед', key: 'insBefore', sortable: true, width: '35%' },
  { title: 'Вставить после', key: 'insAfter', sortable: true, width: '35%' }
]

onMounted(async () => {
  await insertItemsStore.getAll()
})

function openEditDialog(item) {
  router.push(`/feacninsertitem/edit/${item.id}`)
}

function openCreateDialog() {
  router.push('/feacninsertitem/create')
}

async function deleteInsertItem(item) {
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
      content: 'Удалить фразу?'
    })

    if (confirmed) {
      try {
        await insertItemsStore.remove(item.id)
      } catch  {
        alertStore.error('Ошибка при удалении правила')
      }
    }
  } finally {
    runningAction.value = false
  }
}

// Expose for testing
defineExpose({
  openCreateDialog,
  openEditDialog,
  deleteInsertItem,
  filterInsertItems
})
</script>

<template>
  <div class="settings table-2" data-testid="feacn-insert-items-list">
    <div class="header-with-actions">
      <h1 class="primary-heading">Правила для формирования описания продукта</h1>
      <div style="display:flex; align-items:center;" v-if="authStore.isAdminOrSrLogist">
        <div v-if="runningAction || loading" class="header-actions header-actions-group">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <div class="header-actions header-actions-group">
          <ActionButton
            :item="{}"
            icon="fa-solid fa-plus"
            tooltip-text="Добавить правило"
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
        v-model="authStore.feacninsertitems_search"
        :append-inner-icon="mdiMagnify"
        label="Поиск по правилам"
        variant="solo"
        hide-details
        :disabled="runningAction || loading"
      />
    </div>

    <v-card class="table-card">
      <v-data-table
        v-model:items-per-page="authStore.feacninsertitems_per_page"
        items-per-page-text="Правил на странице"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="authStore.feacninsertitems_page"
        :headers="headers"
        :items="insertItems"
        :search="authStore.feacninsertitems_search"
        v-model:sort-by="authStore.feacninsertitems_sort_by"
        :custom-filter="filterInsertItems"
        :loading="loading"
        density="compact"
        class="elevation-1 interlaced-table"
        fixed-header
      >
        <template v-slot:[`item.code`]="{ item }">
          <v-tooltip
            location="top"
            content-class="feacn-tooltip"
            :max-width="tooltipMaxWidth"
          >
            <template v-slot:activator="{ props }">
              <span
                v-bind="props"
                class="feacn-code-tooltip"
                @mouseenter="loadFeacnTooltipOnHover(item.code)"
              >
                {{ item.code }}
              </span>
            </template>
            <span>{{ feacnTooltips[item.code]?.name|| 'Наведите для загрузки...' }}</span>
          </v-tooltip>
        </template>
        <template v-slot:[`item.actions`]="{ item }">
          <div v-if="authStore.isAdminOrSrLogist" class="actions-container">
            <ActionButton
              :item="item"
              icon="fa-solid fa-pen"
              tooltip-text="Редактировать правило"
              @click="openEditDialog"
              :disabled="runningAction || loading"
            />
            <ActionButton
              :item="item"
              icon="fa-solid fa-trash-can"
              tooltip-text="Удалить правило"
              @click="deleteInsertItem"
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
