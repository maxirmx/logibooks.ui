<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { onMounted, computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import router from '@/router'
import { useFeacnPrefixesStore } from '@/stores/feacn.prefixes.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import ActionButton from '@/components/ActionButton.vue'
import { useConfirm } from 'vuetify-use-dialog'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { mdiMagnify } from '@mdi/js'
import {
  preloadFeacnInfo,
  loadFeacnTooltipOnHover,
  useFeacnTooltips
} from '@/helpers/feacn.info.helpers.js'

const prefixesStore = useFeacnPrefixesStore()
const authStore = useAuthStore()
const alertStore = useAlertStore()
const confirm = useConfirm()

const { prefixes, loading } = storeToRefs(prefixesStore)
const runningAction = ref(false)
const { alert } = storeToRefs(alertStore)

// Shared FEACN info cache
const feacnTooltips = useFeacnTooltips()

// Tooltip width limitation
const tooltipMaxWidth = computed(() => {
  if (typeof window !== 'undefined') {
    return `${window.innerWidth * 0.5}px`
  }
  return '400px'
})

// Custom filter function for v-data-table
function filterLocalPrefixes(value, query, item) {
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
    (feacnTooltips.value[i.code]?.name?.toLocaleUpperCase() ?? '').indexOf(q) !== -1 ||
    (i.exceptions?.some(exc => {
      const exceptionCode = getExceptionCode(exc)
      return exceptionCode.toLocaleUpperCase().includes(q) ||
             (feacnTooltips.value[exceptionCode]?.name?.toLocaleUpperCase() ?? '').indexOf(q) !== -1
    }) ?? false)
  )
}

const headers = [
  ...(authStore.isAdminOrSrLogist ? [{ title: '', align: 'center', key: 'actions', sortable: false }] : []),
  { title: 'Префикс', key: 'code', align: 'start' },
  { title: 'Описание', key: 'description', align: 'start' },
  { title: 'Исключения', key: 'exceptions', align: 'start' },
  { title: 'Причина запрета', key: 'comment', align: 'start' }
]

onMounted(async () => {
  await prefixesStore.getAll()
  // Extract codes for preloading, handling both string and object formats
  const codes = prefixes.value.map(p => p.code)
  const exceptionCodes = prefixes.value.flatMap(p => 
    p.exceptions ? p.exceptions.map(exc => getExceptionCode(exc)) : []
  )
  await preloadFeacnInfo([...codes, ...exceptionCodes])
})

// Helper function to get exception code from either string or FeacnPrefixExceptionDto
function getExceptionCode(exception) {
  return typeof exception === 'string' ? exception : exception.code
}

// Helper function to get unique key for exception items
function getExceptionKey(exception, index) {
  return typeof exception === 'string' ? exception : `${exception.id || index}-${exception.code}`
}

function openCreateDialog() {
  router.push('/feacn/prefix/create')
}

function openEditDialog(item) {
  router.push(`/feacn/prefix/edit/${item.id}`)
}

async function deletePrefix(item) {
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
      content: 'Удалить префикс?'
    })

    if (confirmed) {
      try {
        await prefixesStore.remove(item.id)
      } catch {
        alertStore.error('Ошибка при удалении префикса')
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
  deletePrefix,
  getExceptionCode,
  getExceptionKey,
  filterLocalPrefixes
})
</script>

<template>
  <div class="settings table-3" data-testid="feacn-prefixes-list">
    <div class="header-with-actions">
      <h1 class="primary-heading">Префиксы ТН ВЭД для формирования запретов</h1>
      <div class="header-actions" v-if="authStore.isAdminOrSrLogist">
        <div v-if="loading">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <ActionButton
          :item="{}"
          icon="fa-solid fa-plus"
          tooltip-text="Добавить префикс"
          iconSize="2x"
          :disabled="loading"
          @click="openCreateDialog"
        />
      </div>
    </div>

    <hr class="hr" />

    <div>
      <v-text-field
        v-model="authStore.feacnlocalprefixes_search"
        :append-inner-icon="mdiMagnify"
        label="Поиск по префиксам ТН ВЭД"
        variant="solo"
        hide-details
      />
    </div>

    <v-card class="table-card">
      <v-data-table
        v-model:items-per-page="authStore.feacnlocalprefixes_per_page"
        items-per-page-text="Префиксов на странице"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="authStore.feacnlocalprefixes_page"
        :headers="headers"
        :items="prefixes"
        :search="authStore.feacnlocalprefixes_search"
        v-model:sort-by="authStore.feacnlocalprefixes_sort_by"
        :custom-filter="filterLocalPrefixes"
        :loading="loading"
        density="compact"
        class="elevation-1 interlaced-table"
        fixed-header
      >
        <template v-slot:[`item.code`]="{ item }">
          <span>{{ item.code }}</span>
        </template>

        <template v-slot:[`item.description`]="{ item }">
          {{ feacnTooltips[item.code]?.name || '-' }}
        </template>

        <template v-slot:[`item.exceptions`]="{ item }">
          <span v-if="item.exceptions && item.exceptions.length">
            <span v-for="(exception, index) in item.exceptions" :key="getExceptionKey(exception, index)">
              <v-tooltip
                location="top"
                content-class="feacn-tooltip"
                :max-width="tooltipMaxWidth"
              >
                <template v-slot:activator="{ props }">
                  <span
                    v-bind="props"
                    class="feacn-code-tooltip"
                    @mouseenter="loadFeacnTooltipOnHover(getExceptionCode(exception))"
                  >
                    {{ getExceptionCode(exception) }}
                  </span>
                </template>
                <span>{{ feacnTooltips[getExceptionCode(exception)]?.name || 'Наведите для загрузки...' }}</span>
              </v-tooltip>
              <span v-if="index < item.exceptions.length - 1">, </span>
            </span>
          </span>
          <span v-else>-</span>
        </template>

        <template v-slot:[`item.actions`]="{ item }">
          <div v-if="authStore.isAdminOrSrLogist" class="actions-container">
            <ActionButton
              :item="item"
              icon="fa-solid fa-pen"
              tooltip-text="Редактировать префикс"
              @click="openEditDialog"
              :disabled="runningAction || loading"
            />
            <ActionButton
              :item="item"
              icon="fa-solid fa-trash-can"
              tooltip-text="Удалить префикс"
              @click="deletePrefix"
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
