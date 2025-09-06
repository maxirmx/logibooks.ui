<script setup>
// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks ui application 

import { onMounted, ref } from 'vue'
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

  return (
    (i.word?.toLocaleUpperCase() ?? '').indexOf(q) !== -1
  )
}

// Table headers
const headers = [
  { title: '', align: 'center', key: 'actions', sortable: false, width: '10%' },
  { title: 'Стоп-слово или фраза', key: 'word', sortable: true },
  { title: 'Тип соответствия', key: 'matchTypeId', sortable: true }
]

function getMatchTypeText(id) {
  return matchTypesStore.getName(id)
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
          alertStore.error('Ошибка при удалении стоп-слова')
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
  getMatchTypeText
})
</script>

<template>
  <div class="settings table-2" data-testid="stop-words-list">
    <h1 class="primary-heading">Стоп-слова и фразы</h1>
    <hr class="hr" />

    <div class="link-crt">
      <a v-if="authStore.isAdmin" @click="openCreateDialog" class="link">
        <font-awesome-icon
          size="1x"
          icon="fa-solid fa-plus"
          class="link"
        />&nbsp;&nbsp;&nbsp;Зарегистрировать стоп-слово или фразу
      </a>
    </div>

    <div v-if="stopWords?.length">
      <v-text-field
        v-model="authStore.stopwords_search"
        :append-inner-icon="mdiMagnify"
        label="Поиск по стоп-словам и фразам"
        variant="solo"
        hide-details
      />
    </div>

    <v-card>
      <v-data-table
        v-if="stopWords?.length"
        v-model:items-per-page="authStore.stopwords_per_page"
        items-per-page-text="Стоп-слов на странице"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="authStore.stopwords_page"
        :headers="headers"
        :items="stopWords"
        :search="authStore.stopwords_search"
        v-model:sort-by="authStore.stopwords_sort_by"
        :custom-filter="filterStopWords"
        :loading="loading"
        density="compact"
        class="elevation-1 interlaced-table"
      >
        <template v-slot:[`item.actions`]="{ item }">
          <div v-if="authStore.isAdmin" class="actions-container">
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
      </v-data-table>

      <div v-if="!stopWords?.length" class="text-center m-5">Список стоп-слов и фраз пуст</div>
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


