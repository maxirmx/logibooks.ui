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
import { onMounted, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useFeacnPrefixesStore } from '@/stores/feacn.prefix.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import ActionButton from '@/components/ActionButton.vue'
import {
  preloadFeacnInfo,
  loadFeacnTooltipOnHover,
  useFeacnTooltips
} from '@/helpers/feacn.info.helpers.js'

const prefixesStore = useFeacnPrefixesStore()
const authStore = useAuthStore()
const alertStore = useAlertStore()

const { prefixes, loading } = storeToRefs(prefixesStore)
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
  await preloadFeacnInfo(prefixes.value.map(p => p.code))
})

function openCreateDialog() {
  console.log('openCreateDialog stub')
}

function openEditDialog(item) {
  console.log('openEditDialog stub', item)
}

function deletePrefix(item) {
  console.log('deletePrefix stub', item)
}

// Expose for testing
defineExpose({
  openCreateDialog,
  openEditDialog,
  deletePrefix
})
</script>

<template>
  <div class="settings table-3" data-testid="feacn-prefixes-list">
    <h1 class="primary-heading">Префиксы ТН ВЭД</h1>
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
            <span>{{ feacnTooltips[item.code]?.name || 'Наведите для загрузки...' }}</span>
          </v-tooltip>
        </template>

        <template v-slot:[`item.description`]="{ item }">
          {{ feacnTooltips[item.code]?.name || '-' }}
        </template>

        <template v-slot:[`item.exceptions`]="{ item }">
          <span v-if="item.exceptions && item.exceptions.length">
            <span v-for="(code, index) in item.exceptions" :key="code">
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
            />
            <ActionButton
              :item="item"
              icon="fa-solid fa-trash-can"
              tooltip-text="Удалить префикс"
              @click="deletePrefix"
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

