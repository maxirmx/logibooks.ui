<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { onMounted, ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import router from '@/router'
import { useKeyWordsStore } from '@/stores/key.words.store.js'
import ActionButton from '@/components/ActionButton.vue'
import { useWordMatchTypesStore } from '@/stores/word.match.types.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useConfirm } from 'vuetify-use-dialog'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { mdiMagnify } from '@mdi/js'
import { keywordMatchesSearch } from '@/helpers/keywords.filter.js'
import { 
  loadFeacnTooltipOnHover, 
  useFeacnTooltips, 
  clearFeacnTooltipCache 
} from '@/helpers/feacn.info.helpers.js'

const keyWordsStore = useKeyWordsStore()
const matchTypesStore = useWordMatchTypesStore()
const authStore = useAuthStore()
const alertStore = useAlertStore()
const confirm = useConfirm()

const { keyWords, loading } = storeToRefs(keyWordsStore)
const { alert } = storeToRefs(alertStore)
const runningAction = ref(false)

// File upload reference
const fileInput = ref(null)

// Use global FEACN tooltips cache
const feacnTooltips = useFeacnTooltips()

// Tooltip width limitation
const tooltipMaxWidth = computed(() => {
  if (typeof window !== 'undefined') {
    return `${window.innerWidth * 0.5}px`
  }
  return '400px' // fallback
})

// Custom filter function for v-data-table
function filterKeyWords(value, query, item) {
  if (query === null || item === null) {
    return false
  }
  const i = item.raw
  if (i === null) {
    return false
  }

  return keywordMatchesSearch(query, { word: i.word, feacnCodes: i.feacnCodes })
}

// Table headers
const headers = [
  ...(authStore.isAdminOrSrLogist ? [{ title: '', align: 'center', key: 'actions', sortable: false, width: '10%' }] : []),
  { title: 'Ключевое слово или фраза', key: 'word', sortable: true },
  { title: 'Коды ТН ВЭД', key: 'feacnCodes', sortable: true },
  { title: 'Тип соответствия', key: 'matchTypeId', sortable: true }
]

function getMatchTypeText(id) {
  return matchTypesStore.getName(id)
}

function openEditDialog(item) {
  router.push(`/keyword/edit/${item.id}`)
}

function openCreateDialog() {
  router.push('/keyword/create')
}

function openFileDialog() {
  fileInput.value?.click()
}

async function fileSelected(files) {
  alertStore.clear()
  const file = Array.isArray(files) ? files[0] : files
  if (!file) return

  try {
    await keyWordsStore.upload(file)
    await keyWordsStore.getAll() 
    // Clear cached tooltips since data may have changed
    clearFeacnTooltipCache()
  } catch (error) {
      alertStore.error('Ошибка при загрузке файла с ключевыми словами. ' + (error.message ? error.message : ""))
  } finally {
    if (fileInput.value) {
      fileInput.value.value = null
    }
  }
}

async function deleteKeyWord(keyWord) {
  if (runningAction.value) return
  runningAction.value = true
  try {
    const content = 'Удалить ключевое слово "' + keyWord.word + '" ?'
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
        await keyWordsStore.remove(keyWord.id)
      } catch (error) {
        if (error.message?.includes('409')) {
          alertStore.error('Нельзя удалить ключевое слово, у которого есть связанные записи')
        } else {
          alertStore.error('Ошибка при удалении ключевого слова')
        }
      }
    }
  } finally {
    runningAction.value = false
  }
}

// Initialize data
onMounted(async () => {
  matchTypesStore.ensureLoaded()
  await keyWordsStore.getAll()
})

// Expose functions for testing
defineExpose({
  openCreateDialog,
  openEditDialog,
  deleteKeyWord,
  getMatchTypeText,
  openFileDialog,
  fileSelected
})
</script>

<template>
  <div class="settings table-3" data-testid="key-words-list">
    <div class="header-with-actions">
      <h1 class="primary-heading">Ключевые слова и фразы для подбора ТН ВЭД</h1>
      <div class="header-actions" v-if="authStore.isAdminOrSrLogist">
        <div v-if="loading">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <ActionButton
          :item="{}"
          icon="fa-solid fa-file-import"
          tooltip-text="Загрузить файл и добавить ключевые слова"
          iconSize="2x"
          :disabled="runningAction || loading"
          @click="openFileDialog"
        />
        <ActionButton
          :item="{}"
          icon="fa-solid fa-plus"
          tooltip-text="Зарегистрировать ключевое слово или фразу"
          iconSize="2x"
          :disabled="runningAction || loading"
          @click="openCreateDialog"
        />
      </div>
    </div>

    <v-file-input
      ref="fileInput"
      style="display: none"
      accept=".xls,.xlsx,.csv,.txt"
      loading-text="Идёт загрузка файла..."
      @update:model-value="fileSelected"
    />

    <hr class="hr" />

    <div>
      <v-text-field
        v-model="authStore.keywords_search"
        :append-inner-icon="mdiMagnify"
        label="Поиск по ключевым словам и фразам"
        variant="solo"
        hide-details
        :disabled="runningAction || loading"
      />
    </div>

    <v-card class="table-card">
      <v-data-table
        v-model:items-per-page="authStore.keywords_per_page"
        items-per-page-text="Ключевых слов на странице"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="authStore.keywords_page"
        :headers="headers"
        :items="keyWords"
        :search="authStore.keywords_search"
        v-model:sort-by="authStore.keywords_sort_by"
        :custom-filter="filterKeyWords"
        :loading="loading"
        density="compact"
        class="elevation-1 interlaced-table"
        fixed-header
      >
        <template v-slot:[`item.actions`]="{ item }">
          <div v-if="authStore.isAdminOrSrLogist" class="actions-container">
            <ActionButton
              :item="item"
              icon="fa-solid fa-pen"
              tooltip-text="Редактировать ключевое слово или фразу"
              @click="openEditDialog"
              :disabled="runningAction || loading"
            />
            <ActionButton
              :item="item"
              icon="fa-solid fa-trash-can"
              tooltip-text="Удалить ключевое слово или фразу"
              @click="deleteKeyWord"
              :disabled="runningAction || loading"
            />
          </div>
        </template>

        <template v-slot:[`item.feacnCodes`]="{ item }">
          <div v-for="code in item.feacnCodes" :key="code">
            <v-tooltip 
              location="top"
              content-class="feacn-tooltip"
              :max-width="tooltipMaxWidth"
            >
              <template v-slot:activator="{ props }">
                <span 
                  v-bind="props" 
                  class="feacn-code-tooltip"
                  @mouseenter="loadFeacnTooltipOnHover(code)"
                >
                  {{ code }}
                </span>
              </template>
              <span>{{ feacnTooltips[code]?.name || 'Наведите для загрузки...' }}</span>
            </v-tooltip>
          </div>
        </template>

        <template v-slot:[`item.matchTypeId`]="{ item }">
          {{ getMatchTypeText(item.matchTypeId) }}
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
