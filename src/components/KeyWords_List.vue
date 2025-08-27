// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks frontend application
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 1. Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in the
//    documentation and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// ``AS IS'' AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED
// TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
// PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDERS OR CONTRIBUTORS
// BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

<script setup>

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
  const q = query.toLocaleUpperCase()

  return (
    (i.word?.toLocaleUpperCase() ?? '').indexOf(q) !== -1 ||
    (i.feacnCodes?.some(code => code.toLocaleUpperCase().includes(q)) ?? false)
  )
}

// Table headers
const headers = [
  { title: '', align: 'center', key: 'actions', sortable: false, width: '10%' },
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
  <div class="settings table-2" data-testid="key-words-list">
    <h1 class="primary-heading">Ключевые слова и фразы для подбора ТН ВЭД</h1>
    <hr class="hr" />

    <div class="link-crt d-flex upload-links">
      <a v-if="authStore.isAdmin" @click="openFileDialog" class="link">
        <font-awesome-icon
          size="1x"
          icon="fa-solid fa-file-import"
          class="link"
        />&nbsp;&nbsp;&nbsp;Загрузить файл и добавить ключевые слова
      </a>

      <v-file-input
        ref="fileInput"
        style="display: none"
        accept=".xls,.xlsx,.csv,.txt"
        loading-text="Идёт загрузка файла..."
        @update:model-value="fileSelected"
      />
    </div>

    <div class="link-crt d-flex upload-links">
      <a v-if="authStore.isAdmin" @click="openCreateDialog" class="link">
        <font-awesome-icon
          size="1x"
          icon="fa-solid fa-plus"
          class="link"
        />&nbsp;&nbsp;&nbsp;Зарегистрировать ключевое слово или фразу
      </a>
    </div>
      

    <div v-if="keyWords?.length">
      <v-text-field
        v-model="authStore.keywords_search"
        :append-inner-icon="mdiMagnify"
        label="Поиск по ключевым словам и фразам"
        variant="solo"
        hide-details
      />
    </div>

    <v-card>
      <v-data-table
        v-if="keyWords?.length"
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
      >
        <template v-slot:[`item.actions`]="{ item }">
          <div v-if="authStore.isAdmin" class="actions-container">
            <ActionButton
              :item="item"
              icon="fa-solid fa-pen"
              tooltip-text="Редактировать ключевое слово или фразу"
              @click="openEditDialog"
            />
            <ActionButton
              :item="item"
              icon="fa-solid fa-trash-can"
              tooltip-text="Удалить ключевое слово или фразу"
              @click="deleteKeyWord"
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
              <span>{{ feacnTooltips[code] || 'Наведите для загрузки...' }}</span>
            </v-tooltip>
          </div>
        </template>

        <template v-slot:[`item.matchTypeId`]="{ item }">
          {{ getMatchTypeText(item.matchTypeId) }}
        </template>
      </v-data-table>

      <div v-if="!keyWords?.length" class="text-center m-5">Список ключевых слов и фраз пуст</div>
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

