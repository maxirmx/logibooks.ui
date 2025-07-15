<script setup>

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

import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import router from '@/router'
import { useStopWordsStore } from '@/stores/stop.words.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useConfirm } from 'vuetify-use-dialog'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { mdiMagnify } from '@mdi/js'

const stopWordsStore = useStopWordsStore()
const authStore = useAuthStore()
const alertStore = useAlertStore()
const confirm = useConfirm()

const { stopWords, loading } = storeToRefs(stopWordsStore)
const { alert } = storeToRefs(alertStore)

// Reactive state
const search = ref('')
const page = ref(1)

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
    i.word?.toLocaleUpperCase().indexOf(q) !== -1
  )
}

// Table headers
const headers = [
  { title: '', align: 'center', key: 'actions1', sortable: false, width: '5%' },
  { title: '', align: 'center', key: 'actions2', sortable: false, width: '5%' },
  { title: 'Стоп-слово', key: 'word', sortable: true },
  { title: 'Тип соответствия', key: 'exactMatch', sortable: true }
]

function getMatchTypeText(exactMatch) {
  return exactMatch ? 'Точное соответствие' : 'Морфологическое соответствие'
}

function openEditDialog(item) {
  router.push(`/stopword/edit/${item.id}`)
}

function openCreateDialog() {
  router.push('/stopword/create')
}

async function deleteStopWord(stopWord) {
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
}

// Initialize data
onMounted(async () => {
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
  <v-container fluid>
    <v-row v-if="!authStore.isAdmin">
      <v-col>
        <v-alert type="warning" variant="outlined">
          Доступ к управлению стоп-словами разрешен только администраторам
        </v-alert>
      </v-col>
    </v-row>
    
    <v-row v-else>
      <v-col>
        <v-card elevation="0">
          <v-card-title class="d-flex align-center pe-2">
            <v-icon :icon="mdiMagnify"></v-icon> &nbsp; Стоп-слова
            <v-spacer></v-spacer>
            <v-btn 
              color="primary" 
              @click="openCreateDialog"
              prepend-icon="mdi-plus"
            >
              Создать
            </v-btn>
          </v-card-title>

          <v-divider></v-divider>

          <v-data-table
            v-model:page="page"
            :loading="loading"
            :headers="headers"
            :items="stopWords"
            :search="search"
            :custom-filter="filterStopWords"
            :items-per-page-options="itemsPerPageOptions"
            class="elevation-1"
            item-value="id"
          >
            <template v-slot:top>
              <v-toolbar flat>
                <v-text-field
                  v-model="search"
                  clearable
                  hide-details
                  placeholder="Поиск"
                  prepend-inner-icon="mdi-magnify"
                ></v-text-field>
              </v-toolbar>
            </template>

            <template v-slot:[`item.actions1`]="{ item }">
              <v-icon
                color="blue"
                icon="mdi-pencil"
                size="small"
                @click="openEditDialog(item)"
              ></v-icon>
            </template>

            <template v-slot:[`item.actions2`]="{ item }">
              <v-icon
                color="red"
                icon="mdi-delete"
                size="small"
                @click="deleteStopWord(item)"
              ></v-icon>
            </template>

            <template v-slot:[`item.exactMatch`]="{ item }">
              {{ getMatchTypeText(item.exactMatch) }}
            </template>

            <template v-slot:no-data>
              <v-btn color="primary" @click="stopWordsStore.getAll()">
                Перезагрузить
              </v-btn>
            </template>
          </v-data-table>
        </v-card>
      </v-col>
    </v-row>

    <v-row v-if="alert">
      <v-col>
        <v-alert
          :type="alert.type"
          :text="alert.message"
          variant="outlined"
          closable
          @click:close="alertStore.clear()"
        ></v-alert>
      </v-col>
    </v-row>
  </v-container>
</template>


