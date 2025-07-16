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

import { onMounted } from 'vue'
import router from '@/router'
import { storeToRefs } from 'pinia'
import { useCompaniesStore } from '@/stores/companies.store.js'
import { useCountriesStore } from '@/stores/countries.store.js'
import { useAuthStore } from '@/stores/auth.store.js'
import { useAlertStore } from '@/stores/alert.store.js'
import { useConfirm } from 'vuetify-use-dialog'
import { itemsPerPageOptions } from '@/helpers/items.per.page.js'
import { mdiMagnify } from '@mdi/js'

const companiesStore = useCompaniesStore()
const countriesStore = useCountriesStore()
const authStore = useAuthStore()
const alertStore = useAlertStore()
const confirm = useConfirm()

const { companies, loading } = storeToRefs(companiesStore)
const { countries } = storeToRefs(countriesStore)
const { alert } = storeToRefs(alertStore)

// Remove local search and itemsPerPage refs - use auth store instead

// Get country name by ISO numeric code
function getCountryName(isoNumeric) {
  const country = countries.value.find(c => c.isoNumeric === isoNumeric)
  return country ? country.nameRuOfficial : isoNumeric ? `Код: ${isoNumeric}` : ''
}

// Custom filter function for v-data-table
function filterCompanies(value, query, item) {
  if (query === null || item === null) {
    return false
  }
  const i = item.raw
  if (i === null) {
    return false
  }
  const q = query.toLocaleUpperCase()

  if (
    i.name?.toLocaleUpperCase().indexOf(q) !== -1 ||
    i.shortName?.toLocaleUpperCase().indexOf(q) !== -1 ||
    i.inn?.toLocaleUpperCase().indexOf(q) !== -1 ||
    i.kpp?.toLocaleUpperCase().indexOf(q) !== -1 ||
    i.city?.toLocaleUpperCase().indexOf(q) !== -1
  ) {
    return true
  }

  const countryName = getCountryName(i.countryIsoNumeric)
  if (countryName?.toLocaleUpperCase().indexOf(q) !== -1) {
    return true
  }
  return false
}

// Table headers
const headers = [
  { title: '', align: 'center', key: 'actions1', sortable: false, width: '5%' },
  { title: '', align: 'center', key: 'actions2', sortable: false, width: '5%' },
  { title: 'Название', key: 'displayName', sortable: false },
  { title: 'Страна', key: 'countryIsoNumeric', sortable: true },
  { title: 'Город', key: 'city', sortable: true }
]

// Helper function to get display name
function getDisplayName(company) {
  return company.shortName && company.shortName.trim() !== '' ? company.shortName : company.name
}

function openEditDialog(company) {
  router.push('/company/edit/' + company.id)
}

function openCreateDialog() {
  router.push('/company/create')
}

async function deleteCompany(company) {
  const content = 'Удалить компанию "' + company.name + '" ?'
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
      await companiesStore.remove(company.id)
    } catch (error) {
      if (error.message?.includes('409')) {
        alertStore.error('Нельзя удалить информацию о компании, у которой есть связанные записи')
      } else {
        alertStore.error('Ошибка при удалении информации о компании')
      }
    }
  }
}

// Initialize data
onMounted(async () => {
  await companiesStore.getAll()
  // Only fetch countries if not already loaded
  if (countries.value.length === 0) {
    await countriesStore.getAll()
  }
})

// Expose functions for testing
defineExpose({
  openCreateDialog,
  openEditDialog,
  deleteCompany
})
</script>

<template>
  <div class="settings table-2">
    <h1 class="primary-heading">Компании</h1>
    <hr class="hr" />

    <div class="link-crt">
      <router-link v-if="authStore.isAdmin" to="/company/create" class="link">
        <font-awesome-icon
          size="1x"
          icon="fa-solid fa-building"
          class="link"
        />&nbsp;&nbsp;&nbsp;Зарегистрировать компанию
      </router-link>
    </div>

    <!-- Alert -->
    <div v-if="alert" class="alert alert-dismissable mt-3 mb-0" :class="alert.type">
      <button @click="alertStore.clear()" class="btn btn-link close">×</button>
      {{ alert.message }}
    </div>

    <v-card>
      <v-data-table
        v-if="companies?.length"
        v-model:items-per-page="authStore.companies_per_page"
        items-per-page-text="Компаний на странице"
        :items-per-page-options="itemsPerPageOptions"
        page-text="{0}-{1} из {2}"
        v-model:page="authStore.companies_page"
        :headers="headers"
        :items="companies"
        :search="authStore.companies_search"
        v-model:sort-by="authStore.companies_sort_by"
        :custom-filter="filterCompanies"
        :loading="loading"
        item-value="name"
        density="compact"
        class="elevation-1 interlaced-table"
      >
        <template v-slot:[`item.displayName`]="{ item }">
          {{ getDisplayName(item) }}
        </template>

        <template v-slot:[`item.countryIsoNumeric`]="{ item }">
          {{ getCountryName(item.countryIsoNumeric) }}
        </template>

        <template v-slot:[`item.actions1`]="{ item }">
          <v-tooltip v-if="authStore.isAdmin" text="Редактировать информацию о компании">
            <template v-slot:activator="{ props }">
              <button @click="openEditDialog(item)" class="anti-btn" v-bind="props">
                <font-awesome-icon size="1x" icon="fa-solid fa-pen" class="anti-btn" />
              </button>
            </template>
          </v-tooltip>
        </template>

        <template v-slot:[`item.actions2`]="{ item }">
          <v-tooltip v-if="authStore.isAdmin" text="Удалить информацию о компании">
            <template v-slot:activator="{ props }">
              <button @click="deleteCompany(item)" class="anti-btn" v-bind="props">
                <font-awesome-icon size="1x" icon="fa-solid fa-trash-can" class="anti-btn" />
              </button>
            </template>
          </v-tooltip>
        </template>
      </v-data-table>

      <div v-if="!companies?.length" class="text-center m-5">Список компаний пуст</div>

      <div v-if="companies?.length">
        <v-text-field
          v-model="authStore.companies_search"
          :append-inner-icon="mdiMagnify"
          label="Поиск по любой информации о компании"
          variant="solo"
          hide-details
        />
      </div>
    </v-card>

    <div v-if="loading" class="text-center m-5">
      <span class="spinner-border spinner-border-lg align-center"></span>
    </div>
  </div>
</template>
