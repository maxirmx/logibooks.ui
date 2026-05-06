<script setup>
// Copyright (C) 2025-2026 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { onMounted, computed, ref, unref } from 'vue'
import { storeToRefs } from 'pinia'
import router from '@/router'
import { useStopWordsStore } from '@/stores/stop.words.store.js'
import ActionButton from '@/components/ActionButton.vue'
import { useWordMatchTypesStore } from '@/stores/word.match.types.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useConfirm } from 'vuetify-use-dialog'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { mdiMagnify } from '@mdi/js'

const stopWordsStore = useStopWordsStore()
const matchTypesStore = useWordMatchTypesStore()
const authStore = useAuthStore()
const alertStore = useAlertStore()
const confirm = useConfirm()

const { stopWords, loading } = storeToRefs(stopWordsStore)
const { alert } = storeToRefs(alertStore)
const runningAction = ref(false)

const procedureFilterItems = [
  { title: 'Любая', value: 'all' },
  { title: 'Экспорт из РФ', value: 'export' },
  { title: 'Импорт в РФ', value: 'import' }
]

// Custom filter function for v-data-table
function filterStopWords(value, query, item) {
  if (query === null || item === null) {
    return false
  }
  const i = item.raw
  if (i === null) {
    return false
  }
  const q = query.toLocaleUpperCase()
  const procedureText = getProcedureLabels(i).join(' ')
  const reasonText = getProhibitionReasonLines(i).join(' ')
  const matchTypeText = getMatchTypeText(i.matchTypeId)

  return (
    (i.word?.toLocaleUpperCase() ?? '').indexOf(q) !== -1 ||
    (i.explanationForExport?.toLocaleUpperCase() ?? '').indexOf(q) !== -1 ||
    (i.explanationForImport?.toLocaleUpperCase() ?? '').indexOf(q) !== -1 ||
    procedureText.toLocaleUpperCase().indexOf(q) !== -1 ||
    reasonText.toLocaleUpperCase().indexOf(q) !== -1 ||
    matchTypeText.toLocaleUpperCase().indexOf(q) !== -1
  )
}

const filteredStopWords = computed(() => {
  const procedureFilter = unref(authStore.stopwords_procedure)
  if (procedureFilter === 'export') {
    return stopWords.value.filter(word => word.forExport)
  }
  if (procedureFilter === 'import') {
    return stopWords.value.filter(word => word.forImport)
  }
  return stopWords.value
})

// Table headers
const headers = [
  ...(authStore.isSrLogistPlus ? [{ title: '', align: 'center', key: 'actions', sortable: false, width: '10%' }] : []),
  { title: 'Стоп-слово или фраза', key: 'word', sortable: true },
  { title: 'Тип соответствия', key: 'matchTypeId', sortable: true },
  { title: 'Процедура', key: 'procedure', align: 'start' },
  { title: 'Причина запрета', key: 'prohibitionReason', align: 'start', sortable: false }
]

function getMatchTypeText(id) {
  return matchTypesStore.getName(id)
}

function getProcedureLabels(item) {
  const labels = []
  if (item?.forExport) labels.push('Экспорт из РФ')
  if (item?.forImport) labels.push('Импорт в РФ')
  return labels
}

function getProcedureRows(item) {
  const rows = []
  if (item?.forExport) {
    rows.push({
      key: 'export',
      label: 'Экспорт из РФ',
      reason: item.explanationForExport || ''
    })
  }
  if (item?.forImport) {
    rows.push({
      key: 'import',
      label: 'Импорт в РФ',
      reason: item.explanationForImport || ''
    })
  }
  return rows
}

function getProhibitionReasonLines(item) {
  return getProcedureRows(item)
    .map(row => row.reason)
    .filter(Boolean)
}

function openEditDialog(item) {
  router.push(`/stopword/edit/${item.id}`)
}

function openCreateDialog() {
  router.push('/stopword/create')
}

async function deleteStopWord(stopWord) {
  if (runningAction.value) return
  runningAction.value = true
  try {
    const content = 'Удалить стоп-слово "' + stopWord.word + '" ?'
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
        await stopWordsStore.remove(stopWord.id)
      } catch (error) {
        if (error.message?.includes('409')) {
          alertStore.error('Нельзя удалить стоп-слово, у которого есть связанные записи')
        } else {
          alertStore.error('Ошибка при удалении стоп слова')
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
  await stopWordsStore.getAll()
})

// Expose functions for testing
defineExpose({
  openCreateDialog,
  openEditDialog,
  deleteStopWord,
  getMatchTypeText,
  getProcedureLabels,
  getProcedureRows,
  getProhibitionReasonLines,
  procedureFilterItems,
  filteredStopWords,
  filterStopWords,
  headers
})
</script>

<template>
  <div class="settings table-3" data-testid="stop-words-list">
    <div class="header-with-actions">
      <h1 class="primary-heading">Стоп-слова и фразы</h1>
      <div class="header-actions-bar" v-if="authStore.isSrLogistPlus">
        <div v-if="runningAction || loading" class="header-actions header-actions-group">
          <span class="spinner-border spinner-border-m"></span>
        </div>
        <div class="header-actions header-actions-group">
          <ActionButton
            :item="{}"
            icon="fa-solid fa-plus"
            tooltip-text="Зарегистрировать стоп-слово или фразу"
            iconSize="2x"
            :disabled="runningAction || loading"
            @click="openCreateDialog"
          />
        </div>
      </div>
    </div>

    <hr class="hr" />

    <div class="stopwords-filter-row">
      <v-select
        v-model="authStore.stopwords_procedure"
        :items="procedureFilterItems"
        label="Таможенная процедура"
        variant="solo"
        hide-details
        :disabled="runningAction || loading"
        class="procedure-filter"
      />
      <v-text-field
        v-model="authStore.stopwords_search"
        :append-inner-icon="mdiMagnify"
        label="Поиск по стоп словам и фразам"
        variant="solo"
        hide-details
        :disabled="runningAction || loading"
      />
    </div>

    <v-card class="table-card">
      <v-data-table
        v-model:items-per-page="authStore.stopwords_per_page"
        items-per-page-text="Стоп-слов на странице"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="authStore.stopwords_page"
        :headers="headers"
        :items="filteredStopWords"
        :search="authStore.stopwords_search"
        v-model:sort-by="authStore.stopwords_sort_by"
        :custom-filter="filterStopWords"
        :loading="loading"
        density="compact"
        class="elevation-1 interlaced-table"
        fixed-header
      >
        <template v-slot:[`item.actions`]="{ item }">
          <div v-if="authStore.isSrLogistPlus" class="actions-container">
            <ActionButton
              :item="item"
              icon="fa-solid fa-pen"
              tooltip-text="Редактировать стоп-слово или фразу"
              @click="openEditDialog"
              :disabled="runningAction || loading"
            />
            <ActionButton
              :item="item"
              icon="fa-solid fa-trash-can"
              tooltip-text="Удалить стоп-слово или фразу"
              @click="deleteStopWord"
              :disabled="runningAction || loading"
            />
          </div>
        </template>

        <template v-slot:[`item.matchTypeId`]="{ item }">
          {{ getMatchTypeText(item.matchTypeId) }}
        </template>

        <template v-slot:[`item.procedure`]="{ item }">
          <template v-for="procedureRows in [getProcedureRows(item)]" :key="procedureRows.map(row => row.key).join('-')">
            <span v-if="procedureRows.length" :key="`${procedureRows.map(row => row.key).join('-')}-lines`" class="procedure-lines">
              <span
                v-for="row in procedureRows"
                :key="row.key"
                class="procedure-line"
              >
                {{ row.label }}
              </span>
            </span>
            <span v-else :key="`${procedureRows.map(row => row.key).join('-')}-empty`">-</span>
          </template>
        </template>

        <template v-slot:[`item.prohibitionReason`]="{ item }">
          <template v-for="procedureRows in [getProcedureRows(item)]" :key="procedureRows.map(row => row.key).join('-')">
            <span v-if="procedureRows.length" :key="`${procedureRows.map(row => row.key).join('-')}-lines`" class="reason-lines">
              <span
                v-for="row in procedureRows"
                :key="row.key"
                class="reason-line"
              >
                <template v-if="row.reason">{{ row.reason }}</template>
                <template v-else>&nbsp;</template>
              </span>
            </span>
            <span v-else :key="`${procedureRows.map(row => row.key).join('-')}-empty`">-</span>
          </template>
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

.stopwords-filter-row {
  display: flex;
  gap: 12px;
  align-items: stretch;
}

.stopwords-filter-row .v-text-field-stub,
.stopwords-filter-row :deep(.v-text-field) {
  flex: 1 1 auto;
}

.procedure-filter {
  flex: 0 0 200px !important;
  width: 200px;
  max-width: 200px;
  min-width: 200px;
}

.procedure-filter :deep(.v-field__input) {
  min-width: 0;
}

.procedure-line,
.reason-line {
  display: block;
  min-height: 1.35em;
  line-height: 1.35;
  white-space: nowrap;
}

@media (max-width: 700px) {
  .stopwords-filter-row {
    flex-direction: column;
  }

  .procedure-filter {
    flex-basis: auto;
  }
}
</style>
