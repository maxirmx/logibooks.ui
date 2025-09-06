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

const headers = [
  { title: '', align: 'center', key: 'actions', sortable: false, width: '10%' },
  { title: 'Префикс', key: 'code', align: 'start', width: '120px' },
  { title: 'Описание', key: 'description', align: 'start' },
  { title: 'Исключения', key: 'exceptions', align: 'start' }
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
  getExceptionKey
})
</script>

<template>
  <div class="settings table-3" data-testid="feacn-prefixes-list">
    <h1 class="primary-heading">Префиксы ТН ВЭД для формирования запретов</h1>
    <hr class="hr" />

    <div class="link-crt">
      <a v-if="authStore.isAdmin" @click="openCreateDialog" class="link">
        <font-awesome-icon
          size="1x"
          icon="fa-solid fa-plus"
          class="link"
        />&nbsp;&nbsp;&nbsp;Добавить префикс
      </a>
    </div>

    <v-card>
      <v-data-table
        v-if="prefixes?.length"
        :headers="headers"
        :items="prefixes"
        :loading="loading"
        density="compact"
        class="elevation-1 interlaced-table"
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
          <div v-if="authStore.isAdmin" class="actions-container">
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

      <div v-if="!prefixes?.length" class="text-center m-5">Список префиксов пуст</div>
    </v-card>

    <div v-if="loading" class="text-center m-5">
      <span class="spinner-border spinner-border-lg align-center"></span>
    </div>

    <!-- Alert -->
    <div v-if="alert" class="alert alert-dismissable mt-3 mb-0" :class="alert.type">
      <button @click="alertStore.clear()" class="btn btn-link close">×</button>
      {{ alert.message }}
    </div>
  </div>
</template>

