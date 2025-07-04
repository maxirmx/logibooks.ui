<script setup>

// Copyright (C) 2025 Maxim [maxirmx] Samsonov (www.sw.consulting)
// All rights reserved.
// This file is a part of Logibooks frontend application
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 1. Redistributions of source code must retain the above copyright
// notice, this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above copyright
// notice, this list of conditions and the following disclaimer in the
// documentation and/or other materials provided with the distribution.
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

import { watch } from 'vue'
import { useRegistersStore } from '@/stores/registers.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { mdiMagnify } from '@mdi/js'
import { storeToRefs } from 'pinia'

const registersStore = useRegistersStore()
const { items, loading, error, totalCount } = storeToRefs(registersStore)

const authStore = useAuthStore()
const { registers_per_page, registers_search, registers_sort_by, registers_page } = storeToRefs(authStore)

// Watch for changes in pagination, sorting, or search
watch([registers_page, registers_per_page, registers_sort_by, registers_search], () => {
  loadRegisters()
}, { immediate: true, deep: true })

function loadRegisters() {
  const sortBy = registers_sort_by.value?.[0]?.key || 'id'
  const sortOrder = registers_sort_by.value?.[0]?.order || 'asc'
  
  registersStore.getAll(
    registers_page.value,
    registers_per_page.value,
    sortBy,
    sortOrder,
    registers_search.value
  )
}

function openOrders(item) {
  console.log('Open orders for register', item.id)
}

function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat(navigator.language || 'ru-RU', { 
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date)
}

const headers = [
  { title: '№', key: 'id', align: 'start' },
  { title: 'Файл реестра', key: 'fileName', align: 'start' },
  { title: 'Дата загрузки', key: 'date', align: 'start' },
  { title: 'Заказы', key: 'ordersTotal', align: 'end' },
  { title: '', key: 'actions', sortable: false, align: 'center', width: '5%' }
]
</script>

<template>
  <div class="settings table-2">
    <h1 class="orange">Реестры</h1>
    <hr class="hr" />

    <v-card>
      <v-data-table-server
        v-if="items?.length || loading"
        v-model:items-per-page="registers_per_page"
        items-per-page-text="Реестров на странице"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="registers_page"
        v-model:sort-by="registers_sort_by"
        :headers="headers"
        :items="items"
        :items-length="totalCount"
        :loading="loading"
        class="elevation-1"
      >
        <template #[`item.date`]="{ item }">
          {{ formatDate(item.date) }}
        </template>
        <template #[`item.ordersTotal`]="{ item }">
          {{ item.ordersTotal }}
        </template>
        <template #[`item.actions`]="{ item }">
          <button @click="openOrders(item)" class="anti-btn">
            <font-awesome-icon size="1x" icon="fa-solid fa-list" class="anti-btn" />
          </button>
        </template>
      </v-data-table-server>
      <div v-if="!items?.length && !loading" class="text-center m-5">Список реестров пуст</div>
      <div v-if="items?.length || loading || registers_search">
        <v-text-field
          v-model="registers_search"
          :append-inner-icon="mdiMagnify"
          label="Поиск по любой информации о реестре"
          variant="solo"
          hide-details
        />
      </div>
    </v-card>
    <div v-if="loading" class="text-center m-5">
      <span class="spinner-border spinner-border-lg align-center"></span>
    </div>
    <div v-if="error" class="text-center m-5">
      <div class="text-danger">Ошибка при загрузке списка реестров: {{ error }}</div>
    </div>
  </div>
</template>
